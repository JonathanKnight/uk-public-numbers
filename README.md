# UK Public Numbers

> Government statistics, unspun.

A public-interest website presenting official UK government statistics in a clear, hard-to-spin format. Every number comes from an authoritative source. Every source is linked. The code and data are fully public.

**Live site:** [your-username.github.io/uk-public-numbers](https://your-username.github.io/uk-public-numbers)

---

## Why this exists

Politicians and journalists frequently cite government statistics selectively, out of context, or incorrectly. This site aims to make the authoritative numbers easy to find, verify, and share — reducing the ability to mislead through selective citation.

---

## Metrics covered

| Area | Source | Update frequency |
|---|---|---|
| NHS & Health | NHS England Statistical Release | Monthly |
| Spending & Debt | ONS Public Sector Finances / OBR | Monthly / Twice yearly |
| Crime & Justice | ONS Crime Survey for England and Wales | Quarterly |
| Education | Department for Education / OECD PISA | Annual / 3-yearly |
| Jobs & Economy | ONS Labour Force Survey | Monthly |

---

## Data sources

All data is fetched from official UK government or independent statistical bodies:

- **ONS** (Office for National Statistics) — [api.ons.gov.uk](https://api.ons.gov.uk)
- **NHS England** — [opendata.nhsengland.nhs.uk](https://opendata.nhsengland.nhs.uk)
- **Department for Education** — [gov.uk statistical releases](https://www.gov.uk/government/organisations/department-for-education/about/statistics)
- **OBR** (Office for Budget Responsibility) — [obr.uk](https://obr.uk)

Full methodology for each metric is documented in [`data/sources.json`](data/sources.json).

---

## How data stays up to date

GitHub Actions workflows run automatically and fetch fresh data from official APIs:

- `.github/workflows/fetch-ons.yml` — runs every Tuesday (ONS publication cadence)
- `.github/workflows/fetch-nhs.yml` — runs the Friday after the second Thursday (NHS publication day)

When data changes, the workflow commits updated JSON files to this repo. **The git history is the audit trail** — you can see exactly when any number changed and by how much.

Before any data is committed or the site is deployed, `scripts/validate.js` runs sanity checks (plausible ranges, no missing fields). If a check fails, the pipeline halts and no bad data goes live.

---

## Repo structure

```
uk-public-numbers/
├── .github/workflows/    # Automated data fetching and deployment
├── data/                 # JSON data files (the source of truth)
│   ├── nhs.json
│   ├── economy.json
│   ├── crime.json
│   ├── education.json
│   ├── jobs.json
│   └── sources.json      # Methodology and provenance for every metric
├── scripts/
│   ├── fetch-ons.js      # ONS API fetcher
│   ├── fetch-nhs.js      # NHS England API fetcher
│   └── validate.js       # Data sanity checks
└── src/                  # Astro site source
```

---

## Disputed numbers

If you believe a number on this site is incorrect, out of date, or misleading, please [open a GitHub Issue](https://github.com/your-username/uk-public-numbers/issues). Include a link to the authoritative source you believe we should be using.

We will not change a number without a clear link to an official source.

---

## Running locally

```bash
npm install
npm run dev
```

To fetch live data (requires internet access to ONS/NHS APIs):

```bash
npm run fetch-all
npm run validate
```

---

## Licence

Data is Crown Copyright / Open Government Licence. Site code is MIT.
