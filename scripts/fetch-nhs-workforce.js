/**
 * fetch-nhs-workforce.js
 * Updates _workforce_annual in data/nhs.json from the NHS Digital
 * Workforce Statistics monthly publication.
 *
 * Source: https://digital.nhs.uk/data-and-information/publications/statistical/nhs-workforce-statistics
 * File:   "NHS HCHS Workforce Statistics, Trusts and core organisations - CSV data files"
 *
 * The ZIP (~30MB) contains Core 1 CSV with monthly headcount by staff group.
 * We use the September snapshot each year as the annual data point.
 *
 * Run quarterly via GitHub Actions — a new annual data point only appears
 * once a year (November, when September figures are published).
 */

import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const NHS_DIGITAL_BASE = 'https://digital.nhs.uk';
const WORKFORCE_INDEX  = `${NHS_DIGITAL_BASE}/data-and-information/publications/statistical/nhs-workforce-statistics`;

const MONTHS = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

// ── Scraping ────────────────────────────────────────────────────────────────

/**
 * Fetches a publication page and returns the URL of the Core organisations
 * CSV ZIP file, or null if the page isn't published yet (no ZIP link present).
 */
async function findZipUrl(publicationUrl) {
  const res = await fetch(publicationUrl);
  if (!res.ok) return null;
  const html = await res.text();
  // Matches: https://files.digital.nhs.uk/.../...Trusts and core organisations...zip
  const m = html.match(/https:\/\/files\.digital\.nhs\.uk\/[^"]*Trusts[^"]*\.zip/i);
  return m ? m[0] : null;
}

/**
 * Scrapes the workforce index and finds the most recently *published*
 * publication (i.e. one that actually has a ZIP download available).
 * Walks back from the newest until a valid ZIP URL is found.
 */
async function findLatestPublishedZipUrl() {
  const res = await fetch(WORKFORCE_INDEX);
  if (!res.ok) throw new Error(`Workforce index error ${res.status}`);
  const html = await res.text();

  const re = /href="(\/data-and-information\/publications\/statistical\/nhs-workforce-statistics\/([a-z]+-\d{4}))"/g;
  const matches = [];
  for (const m of html.matchAll(re)) {
    const [, path, slug] = m;
    const [month, year] = slug.split('-');
    if (MONTHS[month]) matches.push({ path, year: parseInt(year, 10), month: MONTHS[month] });
  }

  if (matches.length === 0) throw new Error('No workforce publication links found');
  matches.sort((a, b) => b.year - a.year || b.month - a.month);

  for (const pub of matches) {
    const pubUrl = `${NHS_DIGITAL_BASE}${pub.path}`;
    console.log(`  Checking: ${pubUrl}`);
    const zipUrl = await findZipUrl(pubUrl);
    if (zipUrl) return { pubUrl, zipUrl };
  }

  throw new Error('No published workforce ZIP found across all listed publications');
}

// ── Download & process ──────────────────────────────────────────────────────

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download error ${res.status}: ${url}`);
  const dest = createWriteStream(destPath);
  await pipeline(res.body, dest);
}

/**
 * Processes the Core 1 CSV (extracted from the ZIP) and returns annual
 * workforce headcount series using the September snapshot each year.
 */
function processCore1Csv(csvPath) {
  const text = readFileSync(csvPath, 'utf8');
  const lines = text.split('\n');
  const headers = lines[0].split(',');

  const data = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < headers.length) continue;

    const row = Object.fromEntries(headers.map((h, j) => [h, cols[j]?.trim() ?? '']));

    const date = row['DATA_MONTH'];
    if (!date || date[5] !== '0' || date[6] !== '9') continue; // September only
    if (row['DATA_LEVEL'] !== 'National') continue;
    if (row['ORG_NAME'] !== 'All organisations') continue;

    const yr  = parseInt(date.slice(0, 4), 10);
    const fy  = `${yr}/${String(yr + 1).slice(2)}`;
    const main = row['MAIN_STAFF_GROUP'];
    const sub  = row['STAFF_GROUP_1'];
    const hc   = parseInt(row['HEADCOUNT'], 10);
    if (isNaN(hc)) continue;

    data[fy] ??= {};
    if (main === 'All staff groups' && sub === 'All staff groups') data[fy].total   = hc;
    if (sub === 'HCHS doctors - All grades')                        data[fy].doctors = hc;
    if (sub === 'Nurses & health visitors')                         data[fy].nurses  = hc;
  }

  return Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, d]) => ({ period, ...d }))
    .filter(d => d.total && d.doctors && d.nurses);
}

// ── Update nhs.json ─────────────────────────────────────────────────────────

function updateWorkforceInNHSFile(series) {
  const filepath = join(dataDir, 'nhs.json');
  const current  = JSON.parse(readFileSync(filepath, 'utf8'));

  const existing = JSON.stringify(current._workforce_annual.series);
  const updated  = JSON.stringify(series);

  if (existing === updated) {
    console.log('– No changes in _workforce_annual');
    return;
  }

  console.log(`  _workforce_annual: ${current._workforce_annual.series.length} → ${series.length} years`);
  current._workforce_annual.series = series;
  current._meta.last_updated = new Date().toISOString().split('T')[0];
  writeFileSync(filepath, JSON.stringify(current, null, 2));
  console.log('✓ Updated nhs.json');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching NHS workforce data...\n');

  const tmpDir = mkdtempSync(join(tmpdir(), 'nhs-workforce-'));

  try {
    console.log('Finding latest published ZIP...');
    const { pubUrl, zipUrl } = await findLatestPublishedZipUrl();
    console.log(`  Publication: ${pubUrl}`);
    console.log(`  ZIP: ${decodeURIComponent(zipUrl)}`);

    const zipPath = join(tmpDir, 'workforce.zip');
    console.log('  Downloading ZIP (~30MB)...');
    await downloadFile(zipUrl, zipPath);
    console.log('  Downloaded.');

    console.log('  Extracting Core 1 CSV...');
    // Extract only the Core 1 file (staff group by England/region/org)
    execSync(
      `unzip -p "${zipPath}" "Core 1. Staff group - England, NHSE region, ICS and org, "*.csv > "${join(tmpDir, 'core1.csv')}"`,
      { shell: '/bin/bash' }
    );

    console.log('  Processing...');
    const series = processCore1Csv(join(tmpDir, 'core1.csv'));
    console.log(`  ${series.length} annual data points`);
    for (const d of series.slice(-3)) {
      console.log(`    ${d.period}: total=${d.total.toLocaleString()}, doctors=${d.doctors.toLocaleString()}, nurses=${d.nurses.toLocaleString()}`);
    }

    updateWorkforceInNHSFile(series);
    console.log('\nDone.');

  } catch (err) {
    console.error('\nFetch error:', err.message);
    process.exit(1);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
