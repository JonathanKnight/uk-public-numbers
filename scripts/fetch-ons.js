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

/**
 * Fetch a single timeseries value from the ONS API.
 * @param {string} datasetId - ONS dataset ID (e.g. 'cpih01')
 * @param {string} timeseriesId - ONS timeseries ID (e.g. 'l55o')
 * @returns {Promise<{value: number, period: string}>}
 */
async function fetchONSTimeseries(datasetId, timeseriesId) {
  const url = `${ONS_API}/dataset/${datasetId}/timeseries/${timeseriesId}/data`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`ONS API error ${res.status} for ${datasetId}/${timeseriesId}`);
  }

  const json = await res.json();

  // ONS returns months array sorted ascending — take the last (most recent)
  const months = json.months || [];
  if (months.length === 0) throw new Error(`No monthly data for ${timeseriesId}`);

  const latest = months[months.length - 1];
  return {
    value: parseFloat(latest.value),
    period: latest.label, // e.g. "2023 DEC"
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
