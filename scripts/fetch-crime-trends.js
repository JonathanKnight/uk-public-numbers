/**
 * fetch-crime-trends.js
 * Updates crime-trends.json with the latest figures from:
 *   - ONS CSEW crime incidents (via ONS API)
 *   - Home Office police workforce (via GOV.UK statistics page)
 *   - MoJ Criminal Justice Statistics (manual seed — no public API)
 *   - MoJ Offender Management Statistics (manual seed — no public API)
 *
 * The ONS API provides annual CSEW headline estimates. Police officer
 * headcount is published by the Home Office each July and covers 31 March.
 * MoJ prosecution, prison, and reoffending data have no stable API and
 * are seeded manually in crime-trends.json; this script updates what it can.
 *
 * Run annually (October, after July police data and ONS annual release).
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const filepath = join(dataDir, 'crime-trends.json');

// ── ONS API ──────────────────────────────────────────────────────────────────
// CSEW headline: total incidents excl. fraud/cyber, dataset 'crime', series 'C5AI'
// Full timeseries data via ONS time series API
const ONS_BASE = 'https://api.ons.gov.uk/v1';

async function fetchOnsTimeseries(dataset, series) {
  const url = `${ONS_BASE}/dataset/${dataset}/timeseries/${series}/data`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ONS API error ${res.status}: ${url}`);
  return res.json();
}

// ── Police workforce ─────────────────────────────────────────────────────────
// The Home Office publishes a summary table on GOV.UK each July.
// We scrape the latest headline figure from the statistical release page.
const POLICE_WORKFORCE_URL = 'https://www.gov.uk/government/statistics/police-workforce-england-and-wales-31-march-2024';

async function fetchLatestPoliceHeadcount() {
  // Try to find the latest police workforce bulletin
  const indexUrl = 'https://www.gov.uk/government/collections/police-workforce-england-and-wales';
  const indexRes = await fetch(indexUrl);
  if (!indexRes.ok) return null;
  const indexHtml = await indexRes.text();

  // Find the most recent annual "Police workforce, England and Wales, 31 March YYYY" link
  const yearMatch = indexHtml.match(/href="(\/government\/statistics\/police-workforce-england-and-wales-31-march-(\d{4}))"/);
  if (!yearMatch) return null;

  const pubPath = yearMatch[1];
  const pubYear = parseInt(yearMatch[2], 10);
  const pubRes = await fetch(`https://www.gov.uk${pubPath}`);
  if (!pubRes.ok) return null;
  const pubHtml = await pubRes.text();

  // Look for headline figure: "NNN,NNN police officers"
  const figMatch = pubHtml.match(/(\d{1,3},\d{3})\s+(?:full[- ]time equivalent\s+)?police officers/i);
  if (!figMatch) return null;

  const headcount = parseInt(figMatch[1].replace(',', ''), 10);
  return { period: `Mar ${pubYear}`, headcount };
}

// ── Merge helpers ─────────────────────────────────────────────────────────────

function upsertSeries(series, key, newPoint) {
  const idx = series.findIndex(d => d[key] === newPoint[key]);
  if (idx >= 0) series[idx] = { ...series[idx], ...newPoint };
  else series.push(newPoint);
  series.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Updating crime-trends.json...\n');

  const data = JSON.parse(readFileSync(filepath, 'utf8'));
  let changed = false;

  // ── 1. Police workforce headcount ──
  console.log('Fetching police workforce headcount...');
  try {
    const pt = await fetchLatestPoliceHeadcount();
    if (pt) {
      const before = JSON.stringify(data._police_officers.series);
      upsertSeries(data._police_officers.series, 'period', pt);
      if (JSON.stringify(data._police_officers.series) !== before) {
        console.log(`  Updated: ${pt.period} → ${pt.headcount.toLocaleString()} officers`);
        changed = true;
      } else {
        console.log(`  No change (${pt.period} already present)`);
      }
    } else {
      console.log('  Could not parse headline figure from GOV.UK — skipping');
    }
  } catch (err) {
    console.warn(`  Warning: ${err.message}`);
  }

  // ── 2. Note about ONS CSEW ──
  // The ONS API does not expose CSEW incidents as a standard timeseries —
  // CSEW estimates are published in Appendix Tables Excel files. Manual update
  // is required when ONS publishes new CSEW data (usually January each year).
  console.log('\nNote: CSEW incidents require manual update from ONS Appendix Tables.');
  console.log('  Source: https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/crimeinenglandandwalesappendixtables');

  if (changed) {
    data._meta.last_updated = new Date().toISOString().split('T')[0];
    writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log('\n✓ Updated crime-trends.json');
  } else {
    console.log('\n– No changes to commit');
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('\nFetch error:', err.message);
  process.exit(1);
});
