/**
 * fetch-nhs.js
 * Fetches NHS A&E performance, annual attendance totals, and bed availability
 * data from NHS England statistical releases.
 *
 * Data sources:
 *   A&E monthly CSVs:  https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/
 *   Beds (KH03 CSV):   https://www.england.nhs.uk/statistics/statistical-work-areas/bed-availability-and-occupancy/bed-data-overnight/
 *
 * Note: _workforce_annual is sourced from NHS Digital Workforce Statistics
 * (monthly 30MB ZIP at https://digital.nhs.uk/nhs-workforce-statistics).
 * It is not auto-updated here due to file size; update manually when needed.
 *
 * This script is triggered by GitHub Actions on the Friday after the second
 * Thursday of each month (NHS publication cadence).
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const NHS_STATS_BASE = 'https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity';
const NHS_BEDS_PAGE  = 'https://www.england.nhs.uk/statistics/statistical-work-areas/bed-availability-and-occupancy/bed-data-overnight/';

const MONTHS = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the NHS financial year slug for a given date (April–March).
 * e.g. date in Jan 2026 → "2025-26"
 */
function financialYearSlug(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/**
 * Returns the financial year label for a slug, e.g. "2025-26" → "2025/26".
 */
function slugToLabel(slug) {
  return slug.replace('-', '/');
}

/**
 * Extracts a period label ("March 2026") from an NHS CSV URL.
 * Handles patterns: "March-2026-CSV-...", "March-2026-revised-...", "Monthly-AE-March-2026..."
 */
function periodFromUrl(url) {
  const m = url.match(/(?:Monthly-AE-)?([A-Za-z]+)-(\d{4})(?:-(?:CSV|revised|csv)|-\d)/i);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}`;
  return null;
}

// ── A&E monthly CSVs ────────────────────────────────────────────────────────

async function findCsvUrls(fySlug) {
  const pageUrl = `${NHS_STATS_BASE}/ae-attendances-and-emergency-admissions-${fySlug}/`;
  const res = await fetch(pageUrl);
  if (!res.ok) throw new Error(`NHS stats page error ${res.status} for ${fySlug}`);
  const html = await res.text();
  const re = /href="(https:\/\/www\.england\.nhs\.uk\/statistics\/wp-content\/uploads\/[^"]+\.csv)"/gi;
  return [...html.matchAll(re)].map(m => m[1]);
}

async function parseAECsv(csvUrl) {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`CSV download error ${res.status}: ${csvUrl}`);
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
  if (!totalRow) throw new Error(`TOTAL row not found in ${csvUrl}`);

  const num = key => parseInt(totalRow[key]?.replace(/"/g, '') || '0', 10);

  const attendances =
    num('A&E attendances Type 1') +
    num('A&E attendances Type 2') +
    num('A&E attendances Other A&E Department');

  const over4hrs =
    num('Attendances over 4hrs Type 1') +
    num('Attendances over 4hrs Type 2') +
    num('Attendances over 4hrs Other Department');

  if (attendances === 0) throw new Error('Zero attendances in TOTAL row — CSV format may have changed');

  return {
    pct4hr:      parseFloat((((attendances - over4hrs) / attendances) * 100).toFixed(1)),
    attendances,
    period:      periodFromUrl(csvUrl),
  };
}

// ── Beds (KH03) ─────────────────────────────────────────────────────────────

/**
 * Scrapes the beds page for the latest KH03 "Available Overnight" CSV URL.
 */
async function findBedsCSVUrl() {
  const res = await fetch(NHS_BEDS_PAGE);
  if (!res.ok) throw new Error(`Beds page error ${res.status}`);
  const html = await res.text();
  // KH03 available overnight CSV
  const m = html.match(/href="(https:\/\/[^"]+KH03-Available-Overnight-only[^"]*\.csv)"/i);
  if (!m) throw new Error('KH03 beds CSV link not found on beds page');
  return m[1];
}

/**
 * Downloads the KH03 beds CSV and returns annual totals keyed by FY label.
 * Uses the December snapshot as the annual marker.
 */
async function fetchBedsAnnual(csvUrl) {
  console.log(`  Downloading beds CSV: ${csvUrl}`);
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Beds CSV download error ${res.status}`);
  const text = await res.text();

  const lines = text.split('\n').slice(1); // skip header
  const yearly = {};

  for (const line of lines) {
    const cols = line.split(',');
    if (cols.length < 4) continue;
    const dateStr = cols[3]?.trim(); // Effective_Snapshot_Date: DD/MM/YYYY
    if (!dateStr) continue;
    const parts = dateStr.split('/');
    if (parts.length !== 3) continue;
    const month = parseInt(parts[1], 10);
    if (month !== 12) continue; // December snapshot only
    const year = parseInt(parts[2], 10);
    const fy = `${year}/${String(year + 1).slice(2)}`;
    const beds = parseFloat(cols[2]?.trim() || '0');
    yearly[fy] = (yearly[fy] || 0) + beds;
  }

  return Object.entries(yearly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, total]) => ({ period, value: Math.round(total) }));
}

// ── A&E annual series ────────────────────────────────────────────────────────

/**
 * Updates the _ae_annual series by re-fetching only the current and previous
 * financial year (in case of revisions), then merging into the existing series.
 * This avoids re-fetching all ~195 historical CSVs on every run.
 */
async function fetchAEAnnual(existingSeries) {
  const now = new Date();
  const currentSlug = financialYearSlug(now);
  const prevDate = new Date(now);
  prevDate.setFullYear(prevDate.getFullYear() - 1);
  const prevSlug = financialYearSlug(prevDate);

  // Start from the existing series as a base
  const byPeriod = Object.fromEntries(existingSeries.map(d => [d.period, d.value]));

  for (const slug of [prevSlug, currentSlug]) {
    const label = slugToLabel(slug);
    console.log(`  A&E annual: fetching ${label}...`);
    try {
      const urls = await findCsvUrls(slug);
      let total = 0;
      let count = 0;
      for (const url of urls) {
        try {
          const { attendances } = await parseAECsv(url);
          total += attendances;
          count++;
        } catch {
          // Skip malformed individual CSVs
        }
      }
      if (count >= 10) {
        byPeriod[label] = parseFloat((total / 1_000_000).toFixed(1));
        console.log(`    ${label}: ${byPeriod[label]}M (${count} months)`);
      } else {
        console.log(`    ${label}: only ${count} months — skipping`);
      }
    } catch {
      console.log(`    ${label}: page not found — skipping`);
    }
  }

  return Object.entries(byPeriod)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ period, value }));
}

// ── Write nhs.json ───────────────────────────────────────────────────────────

function updateNHSFile(monthly, aeAnnual, bedsAnnual) {
  const filepath = join(dataDir, 'nhs.json');
  const current = JSON.parse(readFileSync(filepath, 'utf8'));
  let changed = false;

  // Monthly 4hr performance
  if (current.ae_4hr_target.value !== monthly.pct4hr) {
    console.log(`  ae_4hr_target: ${current.ae_4hr_target.value} → ${monthly.pct4hr}`);
    current.ae_4hr_target.value = monthly.pct4hr;
    current.ae_4hr_target.period = monthly.period;
    changed = true;
  }

  // Monthly history
  const history = current.ae_4hr_target.history ?? [];
  if (!history.some(h => h.period === monthly.period)) {
    history.push({ period: monthly.period, value: monthly.pct4hr });
    current.ae_4hr_target.history = history;
    changed = true;
    console.log(`  History: added ${monthly.period}`);
  }

  // A&E annual series
  if (aeAnnual.length > 0) {
    const existing = JSON.stringify(current._ae_annual.series);
    const updated  = JSON.stringify(aeAnnual);
    if (existing !== updated) {
      current._ae_annual.series = aeAnnual;
      changed = true;
      console.log(`  _ae_annual: updated (${aeAnnual.length} years)`);
    } else {
      console.log(`  _ae_annual: no changes`);
    }
  }

  // Beds annual series
  if (bedsAnnual.length > 0) {
    const existing = JSON.stringify(current._beds_annual.series);
    const updated  = JSON.stringify(bedsAnnual);
    if (existing !== updated) {
      current._beds_annual.series = bedsAnnual;
      changed = true;
      console.log(`  _beds_annual: updated (${bedsAnnual.length} years)`);
    } else {
      console.log(`  _beds_annual: no changes`);
    }
  }

  if (changed) {
    current._meta.last_updated = new Date().toISOString().split('T')[0];
    writeFileSync(filepath, JSON.stringify(current, null, 2));
    console.log('✓ Updated nhs.json');
  } else {
    console.log('– No changes in nhs.json');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching NHS data...\n');

  try {
    // ── Monthly A&E performance ──
    console.log('Monthly A&E performance...');
    const fySlug = financialYearSlug();
    let csvUrl;
    try {
      const urls = await findCsvUrls(fySlug);
      csvUrl = urls[0];
    } catch {
      const prevDate = new Date();
      prevDate.setFullYear(prevDate.getFullYear() - 1);
      const urls = await findCsvUrls(financialYearSlug(prevDate));
      csvUrl = urls[0];
    }
    console.log(`  Downloading: ${csvUrl}`);
    const monthly = await parseAECsv(csvUrl);
    console.log(`  Period: ${monthly.period}, 4hr: ${monthly.pct4hr}%, attendances: ${monthly.attendances.toLocaleString()}`);

    // ── A&E annual totals ──
    console.log('\nA&E annual totals...');
    const currentData = JSON.parse(readFileSync(join(dataDir, 'nhs.json'), 'utf8'));
    const aeAnnual = await fetchAEAnnual(currentData._ae_annual.series);

    // ── Beds annual ──
    console.log('\nBeds (KH03)...');
    const bedsCsvUrl = await findBedsCSVUrl();
    const bedsAnnual = await fetchBedsAnnual(bedsCsvUrl);
    console.log(`  ${bedsAnnual.length} years of beds data`);

    // ── Write ──
    console.log('\nWriting nhs.json...');
    updateNHSFile(monthly, aeAnnual, bedsAnnual);

    console.log('\nDone.');
  } catch (err) {
    console.error('\nFetch error:', err.message);
    process.exit(1);
  }
}

main();
