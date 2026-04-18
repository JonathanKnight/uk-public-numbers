/**
 * fetch-gp-workforce.js
 * Updates _gp_annual in data/nhs.json from NHS Digital General Practice
 * Workforce Statistics and Patient Registration data.
 *
 * Sources:
 *   GP Workforce:  https://digital.nhs.uk/data-and-information/publications/statistical/general-and-personal-medical-services
 *   Patients:      https://digital.nhs.uk/data-and-information/publications/statistical/patients-registered-at-a-gp-practice
 *
 * Uses September snapshot each year as the annual data point.
 * Individual CSV format (GPWIndividualCSV) available from July 2021.
 * Pre-2021 data cannot be fetched from this source — seed manually.
 *
 * Run annually in October/November via GitHub Actions, when September data is published.
 */

import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { pipeline } from 'stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const NHS_DIGITAL_BASE      = 'https://digital.nhs.uk';
const GP_WORKFORCE_INDEX    = `${NHS_DIGITAL_BASE}/data-and-information/publications/statistical/general-and-personal-medical-services`;
const PATIENTS_INDEX        = `${NHS_DIGITAL_BASE}/data-and-information/publications/statistical/patients-registered-at-a-gp-practice`;

// STAFF_ROLE value that identifies GP trainees (registrars ST1–ST4 + F1/F2)
const TRAINEE_STAFF_ROLE = 'GPs in Training Grades';

// ── Scraping helpers ────────────────────────────────────────────────────────

/**
 * Scrapes an NHS Digital publication index page and returns all
 * september-YYYY publication links sorted newest-first.
 */
async function findSeptemberPublications(indexUrl) {
  const res = await fetch(indexUrl);
  if (!res.ok) throw new Error(`Index page error ${res.status}: ${indexUrl}`);
  const html = await res.text();

  // URLs are in the form /...general-and-personal-medical-services/30-september-2024
  const re = /href="(\/data-and-information\/publications\/statistical\/[^"]*\/\d{1,2}-september-(\d{4}))"/gi;
  const pubs = [];
  for (const m of html.matchAll(re)) {
    pubs.push({ pageUrl: `${NHS_DIGITAL_BASE}${m[1]}`, year: parseInt(m[2], 10) });
  }
  // Deduplicate by year (same URL may appear multiple times)
  const seen = new Set();
  return pubs
    .filter(p => { if (seen.has(p.year)) return false; seen.add(p.year); return true; })
    .sort((a, b) => b.year - a.year);
}

/**
 * Finds the September publication page URL for a given year from an index page.
 * URLs are in the form: /.../<DD>-september-<YYYY>
 */
async function findSeptemberPageUrl(indexUrl, year) {
  const res = await fetch(indexUrl);
  if (!res.ok) return null;
  const html = await res.text();
  const re = new RegExp(
    `href="(\\/data-and-information\\/publications\\/statistical\\/[^"]*\\/\\d{1,2}-september-${year})"`,
    'i'
  );
  const m = html.match(re);
  return m ? `${NHS_DIGITAL_BASE}${m[1]}` : null;
}

/**
 * Scrapes a GP Workforce publication page and returns the URL of the
 * Individual-level CSV ZIP, or null if not found.
 */
async function findIndividualCsvZipUrl(publicationUrl) {
  const res = await fetch(publicationUrl);
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/https:\/\/files\.digital\.nhs\.uk\/[^"]*GPWIndividualCSV[^"]*\.zip/i);
  return m ? m[0] : null;
}

/**
 * Scrapes a Patients Registered publication page and returns the URL of the
 * practice-level totals CSV, or null if not found.
 */
async function findPatientTotalsCsvUrl(publicationUrl) {
  const res = await fetch(publicationUrl);
  if (!res.ok) return null;
  const html = await res.text();
  // Practice-level totals CSV: typically named gp-reg-pat-prac-*totals* or similar
  const m = html.match(/https:\/\/files\.digital\.nhs\.uk\/[^"]*gp-reg-pat-prac[^"]*\.csv/i);
  return m ? m[0] : null;
}

// ── Download ────────────────────────────────────────────────────────────────

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download error ${res.status}: ${url}`);
  const dest = createWriteStream(destPath);
  await pipeline(res.body, dest);
}

// ── CSV parsing ─────────────────────────────────────────────────────────────

/**
 * Parses a GP Workforce Individual CSV and returns national qualified and
 * trainee FTE totals.
 *
 * CSV schema (from NHS Digital September 2025 publication):
 *   YEAR, Month, COMM_REGION_CODE, COMM_REGION_NAME, ICB_CODE, ICB_NAME,
 *   SUB_ICB_CODE, SUB_ICB_NAME, DATA_SOURCE, UNIQUE_IDENTIFIER, STAFF_GROUP,
 *   DETAILED_STAFF_ROLE, STAFF_ROLE, COUNTRY_QUALIFICATION_AREA,
 *   COUNTRY_QUALIFICATION_GROUP, AGE_BAND, AGE_YEARS, GENDER, FTE
 *
 * - STAFF_GROUP = 'GP' selects all GP staff (qualified + trainees)
 * - STAFF_ROLE  = 'GPs in Training Grades' identifies trainees (ST1–ST4, F1/F2)
 * - FTE is per-row; each row = one individual
 */
function parseIndividualCsv(csvPath) {
  const text = readFileSync(csvPath, 'utf8');
  const lines = text.split('\n');
  const raw   = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const hdr   = raw.map(h => h.toUpperCase());

  const staffGroupCol = hdr.findIndex(h => h === 'STAFF_GROUP');
  const staffRoleCol  = hdr.findIndex(h => h === 'STAFF_ROLE');
  const fteCol        = hdr.findIndex(h => h === 'FTE');

  if (staffGroupCol === -1 || fteCol === -1) {
    throw new Error(
      `Required columns not found in GP Individual CSV.\n` +
      `Looking for: STAFF_GROUP, FTE.\n` +
      `Found: ${raw.join(', ')}`
    );
  }

  console.log(`  Columns found: STAFF_GROUP[${staffGroupCol}], STAFF_ROLE[${staffRoleCol}], FTE[${fteCol}]`);

  let qualified_fte = 0, trainee_fte = 0;
  let qualified_hc  = 0, trainee_hc  = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');

    const staffGroup = cols[staffGroupCol]?.trim().replace(/"/g, '');
    if (staffGroup !== 'GP') continue;

    const fte = parseFloat(cols[fteCol]?.trim().replace(/"/g, '') || '0');
    if (isNaN(fte)) continue;

    const staffRole = staffRoleCol >= 0
      ? cols[staffRoleCol]?.trim().replace(/"/g, '')
      : '';

    if (staffRole === TRAINEE_STAFF_ROLE) {
      trainee_fte += fte;
      trainee_hc++;
    } else {
      qualified_fte += fte;
      qualified_hc++;
    }
  }

  return {
    qualified_fte: Math.round(qualified_fte * 10) / 10,
    trainee_fte:   Math.round(trainee_fte   * 10) / 10,
    qualified_hc,
    trainee_hc,
    total_patients: null, // not in this CSV; fetched separately
  };
}

/**
 * Parses a practice-level patients registered CSV and returns the
 * national total of registered patients.
 */
function parsePatientsCsv(csvPath) {
  const text = readFileSync(csvPath, 'utf8');
  const lines = text.split('\n');
  const raw   = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const hdr   = raw.map(h => h.toUpperCase());

  // Find the "total" patients column — several naming conventions used
  const totalCol = hdr.findIndex(h =>
    h === 'NUMBER_OF_PATIENTS' || h === 'TOTAL_ALL' || h === 'ALL_PATIENTS' ||
    h === 'TOTAL_PATIENTS' || h === 'PATIENT_COUNT' || h === 'PATIENTS'
  );
  const sexCol = hdr.findIndex(h => h === 'SEX' || h === 'GENDER');

  if (totalCol === -1) {
    throw new Error(
      `Patient total column not found in patients CSV.\nFound: ${raw.join(', ')}`
    );
  }

  console.log(`  Patients CSV: total=${raw[totalCol]}${sexCol >= 0 ? ', sex=' + raw[sexCol] : ''}`);

  let total = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    // If sex column exists, only count rows for 'ALL' (or rows without sex breakdowns)
    if (sexCol >= 0) {
      const sex = cols[sexCol]?.trim().replace(/"/g, '').toUpperCase();
      if (sex && sex !== 'ALL') continue;
    }
    const n = parseInt(cols[totalCol]?.trim().replace(/"/g, '') || '0', 10);
    if (!isNaN(n) && n > 0) total += n;
  }
  return total;
}

// ── Main data fetch ─────────────────────────────────────────────────────────

async function fetchGpDataForYear(year, gpPageUrl, tmpDir) {
  console.log(`\n  Year: September ${year}`);

  // ── GP Workforce Individual CSV ──
  console.log(`  GP page: ${gpPageUrl}`);
  const zipUrl = await findIndividualCsvZipUrl(gpPageUrl);
  if (!zipUrl) {
    console.log(`  No Individual CSV ZIP found — skipping ${year}`);
    return null;
  }
  console.log(`  ZIP: ${decodeURIComponent(zipUrl)}`);

  const zipPath = join(tmpDir, `gpw-${year}.zip`);
  await downloadFile(zipUrl, zipPath);
  console.log(`  Downloaded GP ZIP.`);

  // Extract the Individual Level CSV from ZIP (filename varies by year)
  const csvPath = join(tmpDir, `gpw-${year}.csv`);
  try {
    execSync(
      `unzip -p "${zipPath}" "*.csv" > "${csvPath}"`,
      { shell: '/bin/bash' }
    );
  } catch {
    console.log(`  Failed to extract CSV from ZIP — skipping ${year}`);
    return null;
  }

  let gp;
  try {
    gp = parseIndividualCsv(csvPath);
    console.log(`  Qualified FTE: ${gp.qualified_fte.toLocaleString()}, Trainee FTE: ${gp.trainee_fte.toLocaleString()}`);
  } catch (err) {
    console.log(`  CSV parse error: ${err.message} — skipping ${year}`);
    return null;
  }

  // ── Patient registration totals ──
  let total_patients = gp.total_patients;

  if (!total_patients) {
    // Fall back to dedicated patient registration publication
    // Find the correct September page URL (format: DD-september-YYYY)
    const ptPageUrl = await findSeptemberPageUrl(PATIENTS_INDEX, year);
    if (!ptPageUrl) {
      console.log(`  No patient registration September page found for ${year}`);
    } else {
      console.log(`  Fetching patient data: ${ptPageUrl}`);
      const ptCsvUrl = await findPatientTotalsCsvUrl(ptPageUrl);
      if (ptCsvUrl) {
        const ptPath = join(tmpDir, `patients-${year}.csv`);
        try {
          await downloadFile(ptCsvUrl, ptPath);
          total_patients = parsePatientsCsv(ptPath);
          console.log(`  Total registered patients: ${total_patients.toLocaleString()}`);
        } catch (err) {
          console.log(`  Patient CSV error: ${err.message}`);
        }
      } else {
        console.log(`  No patient CSV found for ${year}`);
      }
    }
  }

  const patients_per_gp = total_patients && gp.qualified_fte > 0
    ? Math.round(total_patients / gp.qualified_fte)
    : null;

  if (patients_per_gp) console.log(`  Patients per qualified GP: ${patients_per_gp}`);

  return {
    period:         `${year}/${String(year + 1).slice(2)}`,
    qualified_fte:  gp.qualified_fte,
    trainee_fte:    gp.trainee_fte,
    patients_per_gp,
  };
}

// ── Update nhs.json ─────────────────────────────────────────────────────────

function updateGpAnnualInNHSFile(newPoints) {
  const filepath = join(dataDir, 'nhs.json');
  const current  = JSON.parse(readFileSync(filepath, 'utf8'));

  const existing = current._gp_annual.series;
  const byPeriod = Object.fromEntries(existing.map(d => [d.period, d]));

  for (const pt of newPoints) {
    byPeriod[pt.period] = { ...byPeriod[pt.period], ...pt };
  }

  const updated = Object.values(byPeriod).sort((a, b) => a.period.localeCompare(b.period));

  if (JSON.stringify(existing) === JSON.stringify(updated)) {
    console.log('\n– No changes in _gp_annual');
    return;
  }

  console.log(`\n  _gp_annual: ${existing.length} → ${updated.length} years`);
  current._gp_annual.series = updated;
  current._meta.last_updated = new Date().toISOString().split('T')[0];
  writeFileSync(filepath, JSON.stringify(current, null, 2));
  console.log('✓ Updated nhs.json');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching GP workforce data...\n');

  const tmpDir = mkdtempSync(join(tmpdir(), 'gp-workforce-'));

  try {
    console.log('Finding September GP Workforce publications...');
    const pubs = await findSeptemberPublications(GP_WORKFORCE_INDEX);
    console.log(`  Found ${pubs.length} September publications: ${pubs.map(p => p.year).join(', ')}`);

    if (pubs.length === 0) throw new Error('No September publications found');

    const newPoints = [];
    for (const pub of pubs) {
      try {
        const pt = await fetchGpDataForYear(pub.year, pub.pageUrl, tmpDir);
        if (pt) newPoints.push(pt);
      } catch (err) {
        console.log(`  Error for ${pub.year}: ${err.message}`);
      }
    }

    if (newPoints.length === 0) throw new Error('No data points retrieved');

    console.log(`\n  Retrieved ${newPoints.length} annual data points.`);
    for (const d of newPoints.slice(-3)) {
      console.log(
        `    ${d.period}: qualified=${d.qualified_fte?.toLocaleString() ?? 'n/a'} FTE, ` +
        `trainees=${d.trainee_fte?.toLocaleString() ?? 'n/a'} FTE, ` +
        `patients/GP=${d.patients_per_gp ?? 'n/a'}`
      );
    }

    updateGpAnnualInNHSFile(newPoints);
    console.log('\nDone.');

  } catch (err) {
    console.error('\nFetch error:', err.message);
    process.exit(1);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
