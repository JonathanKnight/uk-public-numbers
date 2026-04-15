/**
 * fetch-nhs.js
 * Fetches A&E waiting time and elective care data from NHS England Open Data.
 * NHS Open Data Portal: https://opendata.nhsengland.nhs.uk/
 *
 * NHS England publishes A&E stats monthly, typically the second Thursday.
 * This script is triggered by GitHub Actions the following Friday.
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

// NHS England Open Data API
// A&E Attendances dataset ID on NHS England open data portal
const NHS_AE_DATASET = 'https://opendata.nhsengland.nhs.uk/api/v2/nodes/monthly-ae-attendances-and-emergency-admissions';

async function fetchNHSAEData() {
  const res = await fetch(`${NHS_AE_DATASET}?$top=1&$orderby=Period desc`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) throw new Error(`NHS API error: ${res.status}`);
  const json = await res.json();

  // The NHS API response structure varies — this is a stub
  // In stage 2 we will map the actual field names from the API response
  // See: https://opendata.nhsengland.nhs.uk/getting-started
  const latest = json.value?.[0];
  if (!latest) throw new Error('No data returned from NHS API');

  return {
    ae_4hr_pct: latest.Percentage_within_4hrs || latest['% within 4 hours'],
    period: latest.Period,
    total_attendances: latest.Total_attendances,
  };
}

function updateNHSFile(data) {
  const filepath = join(dataDir, 'nhs.json');
  const current = JSON.parse(readFileSync(filepath, 'utf8'));
  let changed = false;

  if (current.ae_4hr_target.value !== data.ae_4hr_pct) {
    console.log(`  ae_4hr_target: ${current.ae_4hr_target.value} → ${data.ae_4hr_pct}`);
    current.ae_4hr_target.value = data.ae_4hr_pct;
    current.ae_4hr_target.period = data.period;
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
  console.log('Fetching NHS data...\n');

  try {
    const data = await fetchNHSAEData();
    updateNHSFile(data);
    console.log('\nDone.');
  } catch (err) {
    console.error('\nFetch error:', err.message);
    console.error('Note: NHS API field mapping may need updating — check https://opendata.nhsengland.nhs.uk/');
    process.exit(1);
  }
}

main();
