/**
 * fetch-nhs.js
 * Fetches A&E waiting time data from NHS England statistical releases.
 * NHS England publishes monthly CSVs at:
 *   https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/
 *
 * There is no stable JSON API — the script scrapes the current financial year
 * page to find the latest CSV, downloads it, and calculates the 4-hour
 * performance from the raw attendance figures in the TOTAL row.
 *
 * This script is triggered by GitHub Actions the Friday after the second
 * Thursday of each month (NHS publication cadence).
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const NHS_STATS_BASE = 'https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity';

/**
 * Returns the NHS England financial year slug for a given date.
 * The NHS financial year runs April–March, e.g. 2025-26.
 */
function financialYearSlug(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/**
 * Fetch the NHS stats page for a given financial year and return the URL
 * of the most recently published monthly CSV.
 */
async function findLatestCsvUrl(fySlug) {
  const pageUrl = `${NHS_STATS_BASE}/ae-attendances-and-emergency-admissions-${fySlug}/`;
  console.log(`  Fetching index: ${pageUrl}`);

  const res = await fetch(pageUrl);
  if (!res.ok) throw new Error(`NHS stats page error ${res.status} for ${fySlug}`);

  const html = await res.text();

  // CSV links follow the pattern: /statistics/wp-content/uploads/.../*.csv
  const csvRegex = /href="(https:\/\/www\.england\.nhs\.uk\/statistics\/wp-content\/uploads\/[^"]+\.csv)"/gi;
  const matches = [...html.matchAll(csvRegex)].map(m => m[1]);

  if (matches.length === 0) throw new Error(`No CSV links found on NHS page for ${fySlug}`);

  // Links are listed newest-first on the page
  return matches[0];
}

/**
 * Download an NHS A&E monthly CSV and return the 4-hour performance
 * calculated from the national TOTAL row.
 *
 * The CSV has one row per trust plus a TOTAL row at the end.
 * There is no pre-calculated percentage — we derive it from:
 *   Type 1 + Type 2 + Other attendances  vs  over-4hr counts.
 * Booked appointment columns are excluded (consistent with NHS England reporting).
 */
async function parseAECsv(csvUrl) {
  console.log(`  Downloading: ${csvUrl}`);
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`CSV download error ${res.status}`);
  const text = await res.text();

  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  let totalRow = null;
  for (let i = lines.length - 1; i >= 1; i--) {
    const cols = lines[i].split(',');
    if (cols[0]?.trim().toUpperCase() === 'TOTAL') {
      totalRow = Object.fromEntries(headers.map((h, j) => [h, cols[j]?.trim() ?? '']));
      break;
    }
  }
  if (!totalRow) throw new Error('TOTAL row not found in NHS CSV');

  const num = key => parseInt(totalRow[key]?.replace(/"/g, '') || '0', 10);

  // Attendances (excluding booked appointments)
  const attendances =
    num('A&E attendances Type 1') +
    num('A&E attendances Type 2') +
    num('A&E attendances Other A&E Department');

  // Over-4hr breaches (excluding booked appointments)
  const over4hrs =
    num('Attendances over 4hrs Type 1') +
    num('Attendances over 4hrs Type 2') +
    num('Attendances over 4hrs Other Department');

  if (attendances === 0) throw new Error('Zero attendances in TOTAL row — CSV format may have changed');

  const pct4hr = parseFloat((((attendances - over4hrs) / attendances) * 100).toFixed(1));

  // Derive the period label from the CSV filename, e.g. "March-2026-CSV-..." → "March 2026"
  const filenameMatch = csvUrl.match(/\/([A-Za-z]+-\d{4})-CSV/i);
  const period = filenameMatch
    ? filenameMatch[1].replace('-', ' ')
    : new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return { pct4hr, period, attendances };
}

function updateNHSFile({ pct4hr, period }) {
  const filepath = join(dataDir, 'nhs.json');
  const current = JSON.parse(readFileSync(filepath, 'utf8'));
  let changed = false;

  if (current.ae_4hr_target.value !== pct4hr) {
    console.log(`  ae_4hr_target: ${current.ae_4hr_target.value} → ${pct4hr}`);
    current.ae_4hr_target.value = pct4hr;
    current.ae_4hr_target.period = period;
    changed = true;
  }

  if (changed) {
    current._meta.last_updated = new Date().toISOString().split('T')[0];
    writeFileSync(filepath, JSON.stringify(current, null, 2));
    console.log('✓ Updated nhs.json');
  } else {
    console.log('– No changes in nhs.json');
  }
}

async function main() {
  console.log('Fetching NHS A&E data...\n');

  try {
    const fySlug = financialYearSlug();
    console.log(`Financial year: ${fySlug}`);

    let csvUrl;
    try {
      csvUrl = await findLatestCsvUrl(fySlug);
    } catch {
      // If the current FY page isn't up yet (e.g. early April), fall back to previous year
      const prevDate = new Date();
      prevDate.setFullYear(prevDate.getFullYear() - 1);
      const prevSlug = financialYearSlug(prevDate);
      console.log(`  Falling back to previous year: ${prevSlug}`);
      csvUrl = await findLatestCsvUrl(prevSlug);
    }

    const data = await parseAECsv(csvUrl);
    console.log(`  Period: ${data.period}, 4hr performance: ${data.pct4hr}%, attendances: ${data.attendances.toLocaleString()}`);

    updateNHSFile(data);
    console.log('\nDone.');
  } catch (err) {
    console.error('\nFetch error:', err.message);
    process.exit(1);
  }
}

main();
