/**
 * fetch-hospital-activity.js
 * Updates _hes_annual in data/nhs-activity.json from NHS Digital Hospital
 * Admitted Patient Care Activity (Hospital Episode Statistics).
 *
 * Source: https://digital.nhs.uk/data-and-information/publications/statistical/hospital-admitted-patient-care-activity
 *
 * Downloads the specialty-level Excel file (~167KB) for each financial year
 * from 2003-04 to present, aggregates FCEs into broad specialty groups,
 * and updates nhs-activity.json.
 *
 * Run annually (September, when prior-year data is published).
 */

import { writeFileSync, readFileSync, mkdtempSync, rmSync, createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { tmpdir } from 'os';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const NHS_DIGITAL_BASE = 'https://digital.nhs.uk';
const HES_INDEX = `${NHS_DIGITAL_BASE}/data-and-information/publications/statistical/hospital-admitted-patient-care-activity`;

// Financial years to fetch. Start 2003-04 as agreed baseline.
// Script detects the latest available year automatically and adds it.
const START_YEAR = 2003;

// ── Specialty group mapping ────────────────────────────────────────────────
// Maps TRETSPEF (treatment specialty code) to a broad group label.
// Codes from NHS Data Dictionary: https://www.datadictionary.nhs.uk/

function specialtyGroup(code) {
  const n = parseInt(code, 10);
  if (isNaN(n)) return 'other';
  if (n >= 700 && n <= 750) return 'mental_health';
  if ((n >= 370 && n <= 371) || (n >= 800 && n <= 830)) return 'oncology';
  if ((n >= 130 && n <= 133) || (n >= 500 && n <= 519)) return 'obs_gynae';
  if ((n >= 420 && n <= 424) || (n >= 520 && n <= 560)) return 'paediatrics';
  if (n >= 400 && n <= 415) return 'neurology';
  if (n >= 180 && n <= 191) return 'emergency';
  if (n >= 300 && n <= 399) return 'medicine';
  if (n >= 100 && n <= 179) return 'surgery';
  return 'other';
}

const GROUP_LABELS = {
  surgery:      'Surgery',
  medicine:     'Medicine',
  emergency:    'Emergency Medicine',
  neurology:    'Neurology & Neurosurgery',
  obs_gynae:    'Obs & Gynaecology',
  paediatrics:  'Paediatrics',
  mental_health:'Mental Health',
  oncology:     'Oncology',
  other:        'Other',
};

// ── Scraping ────────────────────────────────────────────────────────────────

/**
 * Scrapes the HES index page and returns all financial year slugs (e.g. "2023-24")
 * sorted newest-first, starting from START_YEAR.
 */
async function findYearSlugs() {
  const res = await fetch(HES_INDEX);
  if (!res.ok) throw new Error(`HES index error ${res.status}`);
  const html = await res.text();

  // Links: /...hospital-admitted-patient-care-activity/2023-24
  const re = /href="\/data-and-information\/publications\/statistical\/hospital-admitted-patient-care-activity\/(\d{4}-\d{2})"/g;
  const slugs = [];
  for (const m of html.matchAll(re)) {
    const slug = m[1];
    const year = parseInt(slug.split('-')[0], 10);
    if (year >= START_YEAR) slugs.push(slug);
  }

  // Deduplicate and sort newest-first
  return [...new Set(slugs)].sort((a, b) => b.localeCompare(a));
}

/**
 * Fetches the publication page for a year slug and returns the URL of the
 * specialty-level summary Excel file, or null if not found.
 */
async function findSpecialtyXlsxUrl(yearSlug) {
  const url = `${HES_INDEX}/${yearSlug}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const html = await res.text();

  // Match: hosp-epis-stat-admi-spec-YYYY-YY-tab.xlsx (with possible variations)
  const m = html.match(/https:\/\/files\.digital\.nhs\.uk\/[^"]*hosp-epis-stat-admi-spec[^"]*\.xlsx/i);
  return m ? m[0] : null;
}

// ── Download ────────────────────────────────────────────────────────────────

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download error ${res.status}: ${url}`);
  const dest = createWriteStream(destPath);
  await pipeline(res.body, dest);
}

// ── Excel parsing ────────────────────────────────────────────────────────────

/**
 * Parses the HES specialty Excel file and returns aggregated FCEs by
 * specialty group for the given financial year.
 *
 * Actual structure (2024-25):
 *   Sheet "Treatment Specialty", headers at row ~10
 *   Col 0: specialty code (numeric, or '&' for aggregate rows to skip)
 *   Col 1: specialty description
 *   Col 7: 'Finished Consultant Episodes'
 *   Col 12: 'Emergency \n(FAE)'
 *   Col 45: 'Day case \n(FCE)'
 * Headers are NOT in row 1 — must scan for them.
 */
function parseSpecialtyXlsx(filePath, yearSlug) {
  const workbook = xlsxRead(readFileSync(filePath));

  // Prefer the "Treatment Specialty" sheet (TRETSPEF codes); fall back to last sheet
  const sheetName =
    workbook.SheetNames.find(n => /treatment/i.test(n)) ??
    workbook.SheetNames[workbook.SheetNames.length - 1];
  const sheet = workbook.Sheets[sheetName];

  // Read all rows as raw arrays (header: 1 = no key mapping)
  const rows = xlsxUtils.sheet_to_json(sheet, { header: 1, defval: null });
  if (rows.length === 0) throw new Error(`Empty sheet "${sheetName}" in ${filePath}`);

  // Find the header row by locating 'Finished Consultant Episodes'
  const headerIdx = rows.findIndex(row =>
    Array.isArray(row) && row.some(c => typeof c === 'string' && c.includes('Finished Consultant Episodes'))
  );
  if (headerIdx === -1) throw new Error(
    `Header row not found in sheet "${sheetName}". ` +
    `First row sample: ${JSON.stringify(rows[0]?.slice(0, 5))}`
  );

  const headers = rows[headerIdx];

  // Locate key columns by content — resilient to year-to-year layout shifts
  const fceCol      = headers.findIndex(h => h === 'Finished Consultant Episodes');
  const dayCaseCol  = headers.findIndex(h => typeof h === 'string' && h.includes('Day case'));
  const emergCol    = headers.findIndex(h => typeof h === 'string' && h.includes('Emergency'));

  console.log(`  Sheet: "${sheetName}", headerRow: ${headerIdx + 1}, ` +
    `FCE[${fceCol}], DayCase[${dayCaseCol}], Emerg[${emergCol}]`);

  if (fceCol === -1) throw new Error(
    `FCE column not found. First 10 headers: ${headers.slice(0, 10).join(' | ')}`
  );

  // Initialise group accumulators
  const groups = Object.fromEntries(Object.keys(GROUP_LABELS).map(g => [g, 0]));
  let total_fce = 0, emergency_fce = 0, day_case_fce = 0;

  // Data rows start two after headerIdx (one blank row separates them)
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c == null)) continue;

    const code = row[0];
    // Skip aggregate rows ('&'), blank codes, or non-numeric strings
    if (code == null || code === '&') continue;
    if (typeof code === 'string' && isNaN(parseInt(code, 10))) continue;

    const fce     = Number(row[fceCol])    || 0;
    if (fce === 0) continue;

    const dayCase = dayCaseCol >= 0 ? (Number(row[dayCaseCol]) || 0) : 0;
    const emerg   = emergCol   >= 0 ? (Number(row[emergCol])   || 0) : 0;

    total_fce     += fce;
    day_case_fce  += dayCase;
    emergency_fce += emerg;

    const grp = specialtyGroup(String(code));
    groups[grp] = (groups[grp] || 0) + fce;
  }

  const startYear = parseInt(yearSlug.split('-')[0], 10);
  const period    = `${startYear}/${String(startYear + 1).slice(2)}`;

  return {
    period,
    total_fce:          Math.round(total_fce),
    fce_with_procedure: null,
    emergency_fce:      Math.round(emergency_fce),
    day_case_fce:       Math.round(day_case_fce),
    elective_fce:       Math.round(total_fce - emergency_fce),
    by_group:           Object.fromEntries(
      Object.keys(GROUP_LABELS).map(g => [g, Math.round(groups[g] || 0)])
    ),
  };
}

// ── Update nhs-activity.json ─────────────────────────────────────────────────

function updateActivityFile(newPoints) {
  const filepath = join(dataDir, 'nhs-activity.json');
  const current  = JSON.parse(readFileSync(filepath, 'utf8'));

  const byPeriod = Object.fromEntries(current._hes_annual.series.map(d => [d.period, d]));
  for (const pt of newPoints) byPeriod[pt.period] = pt;

  const updated = Object.values(byPeriod).sort((a, b) => a.period.localeCompare(b.period));

  if (JSON.stringify(current._hes_annual.series) === JSON.stringify(updated)) {
    console.log('\n– No changes in _hes_annual');
    return false;
  }

  console.log(`\n  _hes_annual: ${current._hes_annual.series.length} → ${updated.length} years`);
  current._hes_annual.series = updated;
  current._meta.last_updated = new Date().toISOString().split('T')[0];
  writeFileSync(filepath, JSON.stringify(current, null, 2));
  console.log('✓ Updated nhs-activity.json');
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching NHS Hospital Activity data...\n');

  const tmpDir = mkdtempSync(join(tmpdir(), 'hes-activity-'));

  try {
    console.log('Finding available financial years...');
    const slugs = await findYearSlugs();
    console.log(`  Found: ${slugs.join(', ')}`);

    if (slugs.length === 0) throw new Error('No year slugs found on HES index');

    const newPoints = [];

    for (const slug of slugs) {
      process.stdout.write(`  ${slug}: `);

      const xlsxUrl = await findSpecialtyXlsxUrl(slug);
      if (!xlsxUrl) {
        console.log('no specialty Excel found — skipping');
        continue;
      }

      const dest = join(tmpDir, `spec-${slug}.xlsx`);
      try {
        await downloadFile(xlsxUrl, dest);
        const point = parseSpecialtyXlsx(dest, slug);
        console.log(`${(point.total_fce / 1e6).toFixed(2)}M FCEs`);
        newPoints.push(point);
      } catch (err) {
        console.log(`error — ${err.message}`);
      }
    }

    if (newPoints.length === 0) throw new Error('No data points retrieved');

    console.log(`\n  ${newPoints.length} years processed`);

    // Print last 3 years
    for (const d of newPoints.slice(0, 3)) {
      console.log(
        `    ${d.period}: ${(d.total_fce / 1e6).toFixed(2)}M total FCEs, ` +
        `${(d.fce_with_procedure / 1e6).toFixed(2)}M with procedure`
      );
    }

    updateActivityFile(newPoints);
    console.log('\nDone.');

  } catch (err) {
    console.error('\nFetch error:', err.message);
    process.exit(1);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
