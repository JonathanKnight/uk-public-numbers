/**
 * validate.js
 * Sanity-checks all data files before they are committed or deployed.
 * Run automatically by GitHub Actions before every build.
 * If any check fails, the workflow errors and no bad data goes live.
 *
 * Philosophy: it is better to show slightly stale correct data than
 * fresh incorrect data. A failed validation halts the pipeline.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

let errors = 0;
let warnings = 0;

function fail(file, key, message) {
  console.error(`  ✗ [${file}] ${key}: ${message}`);
  errors++;
}

function warn(file, key, message) {
  console.warn(`  ⚠ [${file}] ${key}: ${message}`);
  warnings++;
}

function pass(file, key, message) {
  console.log(`  ✓ [${file}] ${key}: ${message}`);
}

function loadJSON(filename) {
  const filepath = join(dataDir, filename);
  return JSON.parse(readFileSync(filepath, 'utf8'));
}

// ── NHS ──
console.log('\nValidating nhs.json...');
try {
  const nhs = loadJSON('nhs.json');

  // A&E 4hr rate: must be between 0 and 100
  const ae = nhs.ae_4hr_target.value;
  if (ae < 0 || ae > 100) fail('nhs', 'ae_4hr_target', `${ae}% is out of range (0–100)`);
  else if (ae > 98) warn('nhs', 'ae_4hr_target', `${ae}% seems unusually high — verify`);
  else pass('nhs', 'ae_4hr_target', `${ae}% is plausible`);

  // Waiting list: must be between 1m and 20m
  const wl = nhs.elective_waiting_list.value;
  if (wl < 1_000_000 || wl > 20_000_000) fail('nhs', 'elective_waiting_list', `${wl} is out of plausible range`);
  else pass('nhs', 'elective_waiting_list', `${(wl/1e6).toFixed(1)}m is plausible`);

  // 18-week wait: must be between 0 and 100
  const w18 = nhs.waiting_over_18_weeks.value;
  if (w18 < 0 || w18 > 100) fail('nhs', 'waiting_over_18_weeks', `${w18}% is out of range`);
  else pass('nhs', 'waiting_over_18_weeks', `${w18}% is plausible`);

  // GP annual series: plausibility checks on each row
  const gpSeries = nhs._gp_annual?.series ?? [];
  pass('nhs', '_gp_annual.series', `${gpSeries.length} year(s) of GP data`);
  for (const d of gpSeries) {
    if (d.qualified_fte != null && (d.qualified_fte < 15_000 || d.qualified_fte > 50_000))
      fail('nhs', `_gp_annual[${d.period}].qualified_fte`, `${d.qualified_fte} FTE is out of plausible range (15k–50k)`);
    if (d.trainee_fte != null && (d.trainee_fte < 1_000 || d.trainee_fte > 30_000))
      fail('nhs', `_gp_annual[${d.period}].trainee_fte`, `${d.trainee_fte} FTE is out of plausible range (1k–30k)`);
    if (d.patients_per_gp != null && (d.patients_per_gp < 1_000 || d.patients_per_gp > 5_000))
      fail('nhs', `_gp_annual[${d.period}].patients_per_gp`, `${d.patients_per_gp} is out of plausible range (1k–5k)`);
  }

} catch (e) { fail('nhs.json', '_load', e.message); }

// ── ECONOMY ──
console.log('\nValidating economy.json...');
try {
  const econ = loadJSON('economy.json');

  // Debt as % GDP: plausible range 50–200%
  const debt = econ.national_debt_pct_gdp.value;
  if (debt < 50 || debt > 200) fail('economy', 'national_debt_pct_gdp', `${debt}% is implausible`);
  else pass('economy', 'national_debt_pct_gdp', `${debt}% GDP is plausible`);

  // Annual borrowing: plausible range £0–500bn
  const borrow = econ.annual_borrowing.value;
  if (borrow < 0 || borrow > 500_000_000_000) fail('economy', 'annual_borrowing', `£${(borrow/1e9).toFixed(0)}bn is implausible`);
  else pass('economy', 'annual_borrowing', `£${(borrow/1e9).toFixed(0)}bn is plausible`);

} catch (e) { fail('economy.json', '_load', e.message); }

// ── CRIME ──
console.log('\nValidating crime.json...');
try {
  const crime = loadJSON('crime.json');

  // Charge rate: must be between 0 and 100
  const cr = crime.charge_rate.value;
  if (cr < 0 || cr > 100) fail('crime', 'charge_rate', `${cr}% is out of range`);
  else if (cr > 30) warn('crime', 'charge_rate', `${cr}% seems high — recent rates are 5–7%`);
  else pass('crime', 'charge_rate', `${cr}% is plausible`);

  // Crown court backlog: plausible range 10k–200k
  const backlog = crime.crown_court_backlog.value;
  if (backlog < 10_000 || backlog > 200_000) fail('crime', 'crown_court_backlog', `${backlog} cases is implausible`);
  else pass('crime', 'crown_court_backlog', `${backlog.toLocaleString()} cases is plausible`);

} catch (e) { fail('crime.json', '_load', e.message); }

// ── JOBS ──
console.log('\nValidating jobs.json...');
try {
  const jobs = loadJSON('jobs.json');

  const unemp = jobs.unemployment_rate.value;
  if (unemp < 0 || unemp > 30) fail('jobs', 'unemployment_rate', `${unemp}% is implausible`);
  else pass('jobs', 'unemployment_rate', `${unemp}% is plausible`);

  const inact = jobs.economic_inactivity.value;
  if (inact < 10 || inact > 40) fail('jobs', 'economic_inactivity', `${inact}% is implausible`);
  else pass('jobs', 'economic_inactivity', `${inact}% is plausible`);

} catch (e) { fail('jobs.json', '_load', e.message); }

// ── NHS ACTIVITY ──
console.log('\nValidating nhs-activity.json...');
try {
  const act = loadJSON('nhs-activity.json');
  const hesSeries = act._hes_annual?.series ?? [];
  pass('nhs-activity', '_hes_annual.series', `${hesSeries.length} year(s) of HES data`);
  for (const d of hesSeries) {
    if (d.total_fce != null && (d.total_fce < 5_000_000 || d.total_fce > 40_000_000))
      fail('nhs-activity', `_hes_annual[${d.period}].total_fce`, `${(d.total_fce/1e6).toFixed(1)}M is implausible (5M–40M)`);
    if (d.fce_with_procedure != null && d.fce_with_procedure > d.total_fce)
      fail('nhs-activity', `_hes_annual[${d.period}].fce_with_procedure`, `exceeds total_fce`);
    if (d.emergency_fce != null && d.emergency_fce > d.total_fce)
      fail('nhs-activity', `_hes_annual[${d.period}].emergency_fce`, `exceeds total_fce`);
  }
} catch (e) { fail('nhs-activity.json', '_load', e.message); }

// ── RESULT ──
console.log(`\n─────────────────────────────`);
if (errors > 0) {
  console.error(`\n✗ Validation failed: ${errors} error(s), ${warnings} warning(s).`);
  console.error('  Pipeline halted. Fix data issues before deploying.\n');
  process.exit(1);
} else {
  console.log(`\n✓ All checks passed (${warnings} warning(s)).\n`);
}
