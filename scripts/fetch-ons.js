/**
 * fetch-ons.js
 * Fetches economy, crime, and jobs data from the ONS API.
 * ONS API docs: https://developer.ons.gov.uk/
 *
 * This script is run by GitHub Actions on a schedule.
 * If data has changed, it writes updated JSON files to /data/
 * The commit is then made by the workflow, creating a public audit trail.
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

// ONS API base URL
const ONS_API = 'https://api.ons.gov.uk/v1';

// ONS website URI paths for each timeseries (dataset/series → full URI)
// The ONS API uses GET /data?uri=<path> rather than path segments
// multiplier: optional scale factor applied to the raw API value before storing
const ONS_URIS = {
  'pusf/HF6X': { uri: '/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6x/pusf' },
  'pusf/J5II':  { uri: '/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/j5ii/pusf', periodType: 'years', multiplier: -1_000_000 }, // API returns £m as negative; negate to positive borrowing figure
  'lms/MGSX':  { uri: '/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms' },
  'lms/LF2S':  { uri: '/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf2s/lms' },
};

/**
 * Fetch a single timeseries value from the ONS API.
 * @param {string} datasetId - ONS dataset ID (e.g. 'pusf')
 * @param {string} timeseriesId - ONS timeseries ID (e.g. 'HF6X')
 * @returns {Promise<{value: number, period: string}>}
 */
async function fetchONSTimeseries(datasetId, timeseriesId) {
  const entry = ONS_URIS[`${datasetId}/${timeseriesId}`];
  if (!entry) throw new Error(`No ONS URI mapping for ${datasetId}/${timeseriesId}`);

  const url = `${ONS_API}/data?uri=${entry.uri}`;
  console.log(`${url}\n`);
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`ONS API error ${res.status} for ${datasetId}/${timeseriesId}`);
  }

  const json = await res.json();

  // ONS returns period arrays sorted ascending — take the last (most recent)
  const periodType = entry.periodType || 'months';
  const periods = json[periodType] || [];
  if (periods.length === 0) throw new Error(`No ${periodType} data for ${timeseriesId}`);

  const latest = periods[periods.length - 1];
  const raw = parseFloat(latest.value);
  return {
    value: entry.multiplier ? raw * entry.multiplier : raw,
    period: latest.label,
  };
}

/**
 * Load current data file, update values, write back.
 * Only writes if data has actually changed (keeps git history clean).
 */
function updateDataFile(filename, updates) {
  const filepath = join(dataDir, filename);
  const current = JSON.parse(readFileSync(filepath, 'utf8'));
  let changed = false;

  for (const [key, { value, period }] of Object.entries(updates)) {
    if (current[key] && current[key].value !== value) {
      console.log(`  ${key}: ${current[key].value} → ${value}`);
      current[key].value = value;
      current[key].period = period;
      changed = true;
    }
  }

  if (changed) {
    current._meta.last_updated = new Date().toISOString().split('T')[0];
    writeFileSync(filepath, JSON.stringify(current, null, 2));
    console.log(`✓ Updated ${filename}`);
  } else {
    console.log(`– No changes in ${filename}`);
  }

  return changed;
}

async function main() {
  console.log('Fetching ONS data...\n');

  try {
    // ── ECONOMY / PUBLIC FINANCES ──
    // National debt as % GDP — ONS dataset: pusf, series: HF6X
    // Borrowing — ONS dataset: pusf, series: J5II
    // These are the correct ONS timeseries IDs for public sector finances
    console.log('Economy / public finances...');
    const [debtPctGdp, annualBorrowing] = await Promise.all([
      fetchONSTimeseries('pusf', 'HF6X'),
      fetchONSTimeseries('pusf', 'J5II'),
    ]);

    updateDataFile('economy.json', {
      national_debt_pct_gdp: debtPctGdp,
      annual_borrowing: annualBorrowing,
    });

    // ── LABOUR MARKET ──
    // Unemployment rate — ONS dataset: lms, series: MGSX
    // Economic inactivity rate — ONS dataset: lms, series: LF2S
    // Real wages — ONS dataset: emp, series: KAB9
    console.log('\nLabour market...');
    const [unemployment, inactivity] = await Promise.all([
      fetchONSTimeseries('lms', 'MGSX'),
      fetchONSTimeseries('lms', 'LF2S'),
    ]);

    updateDataFile('jobs.json', {
      unemployment_rate: unemployment,
      economic_inactivity: inactivity,
    });

    console.log('\nDone.');

  } catch (err) {
    console.error('\nFetch error:', err.message);
    // Exit with error code so the GitHub Action fails visibly
    process.exit(1);
  }
}

main();
