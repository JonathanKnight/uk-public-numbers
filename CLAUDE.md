# CLAUDE.md — UK Public Numbers

This file gives Claude Code the context needed to work on this project effectively.

---

## Project mission

A public-interest website presenting official UK government statistics in a clear, spin-resistant format. Every number must be sourced from an authoritative body. The goal is to make it harder for politicians and journalists to misrepresent the state of public services and spending.

**The overriding principle:** accuracy and transparency over speed. Never add, change, or remove a data value without a corresponding official source URL.

---

## Stack

| Layer | Technology |
|---|---|
| Site framework | Astro (static output) |
| Hosting | GitHub Pages |
| Data pipeline | GitHub Actions (scheduled) |
| Data storage | Plain JSON files in `/data/` |
| Styling | Plain CSS (no Tailwind, no CSS-in-JS) |
| Charts | Observable Plot or Chart.js (not yet implemented) |
| Package manager | npm |

---

## Repo structure

```
uk-public-numbers/
├── .github/workflows/      # GitHub Actions — deploy, fetch-ons, fetch-nhs
├── data/                   # JSON data files — the canonical source of truth
│   ├── nhs.json
│   ├── economy.json
│   ├── crime.json
│   ├── education.json
│   ├── jobs.json
│   └── sources.json        # Methodology and provenance for every metric
├── scripts/
│   ├── fetch-ons.js        # Fetches from ONS API
│   ├── fetch-nhs.js        # Fetches from NHS England Open Data
│   └── validate.js         # Sanity checks — runs before every deploy
├── src/
│   ├── layouts/Base.astro  # Shared HTML shell, header, footer, nav
│   ├── components/
│   │   └── MetricCard.astro # Reusable metric display component
│   └── pages/
│       └── index.astro     # Homepage — overview of all five areas
└── public/
    └── styles/global.css   # All CSS — uses CSS custom properties throughout
```

---

## Data conventions

### JSON schema for each metric

Every metric in a data file must follow this structure:

```json
{
  "metric_key": {
    "label": "Human-readable label (short, shown on card)",
    "value": 73.4,
    "unit": "%",
    "direction": "higher_is_better | lower_is_better | neutral",
    "target": 95,
    "target_label": "NHS target: 95%",
    "period": "December 2023",
    "note": "One sentence of plain-English context. No spin."
  }
}
```

Required fields: `label`, `value`, `unit`, `direction`, `period`, `note`.
Optional fields: `target`, `target_label` (only when an official target exists).

### `_meta` block

Every data file must have a `_meta` block at the top with:
- `source` — name of the publishing body
- `source_url` — direct URL to the statistical release or dataset
- `last_updated` — ISO date string (YYYY-MM-DD), updated by fetch scripts
- `methodology` — plain English explanation of how the number is measured

### Units

Use these unit strings consistently:
- `"%"` for percentages
- `"£"` for pound amounts (the MetricCard component handles bn/tn formatting)
- `"people"` for headcounts
- `"incidents"` for crime counts
- `"cases"` for court backlogs
- `"out of N"` for rankings

### Do not invent data

If a fetch script cannot retrieve a value, it must fail loudly (exit code 1) rather than silently writing a stale or estimated value. The pipeline halting is the correct behaviour.

---

## Validation rules

`scripts/validate.js` runs before every build and data commit. It checks:
- All values are within defined plausible ranges
- No required fields are missing
- Files are valid JSON

If you add a new metric, you **must** add a corresponding validation check in `validate.js`. Use the existing checks as a pattern. Plausible ranges should be conservative — the point is to catch obviously wrong values, not to constrain legitimate fluctuations.

---

## Data sources

| Area | Source | API |
|---|---|---|
| Economy / debt | ONS Public Sector Finances | `https://api.ons.gov.uk/v1/dataset/{id}/timeseries/{series}/data` |
| Labour market | ONS Labour Force Survey | Same ONS API |
| Crime | ONS Crime Survey for England and Wales | Same ONS API |
| NHS waiting times | NHS England Open Data | `https://opendata.nhsengland.nhs.uk/api/v2/nodes/` |
| Education | DfE statistical releases | Scraped — no stable API |
| OBR forecasts | OBR Economic and Fiscal Outlook | Manual update — no API |

ONS timeseries IDs used so far:
- `pusf / HF6X` — national debt as % GDP
- `pusf / J5II` — annual public sector net borrowing
- `lms / MGSX` — unemployment rate (ILO)
- `lms / LF2S` — economic inactivity rate

---

## GitHub Actions

Three workflows:

- **`deploy.yml`** — triggers on every push to `main`. Runs `validate.js`, builds the Astro site, deploys to GitHub Pages. Uses `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` to stay ahead of the Node 20 deprecation.
- **`fetch-ons.yml`** — runs every Tuesday at 09:00 UTC. Fetches ONS data, validates, commits if changed.
- **`fetch-nhs.yml`** — runs on the Friday following the second Thursday of each month (NHS publication cadence). Fetches NHS data, validates, commits if changed.

Automated commits use the message format: `data: update {source} figures [automated]`

The git history is the public audit trail. Every data change must be traceable to a specific commit with a clear message.

---

## CSS conventions

All styles live in `public/styles/global.css`. CSS custom properties are defined on `:root` and used throughout — do not hardcode colours or fonts anywhere.

Key variables:
```css
--ink, --ink-muted, --ink-faint   /* text colours */
--paper, --paper-warm, --paper-rule /* background colours */
--accent          /* red — used for targets missed, header border */
--accent-amber    /* amber — neutral/warning */
--good            /* green — target met */
--bad             /* red — target missed */
--mono            /* JetBrains Mono — labels, metadata, code */
--serif           /* Source Serif 4 — body text */
--display         /* Playfair Display — headlines, metric values */
```

The aesthetic is editorial — think FT data desk, not a SaaS dashboard. Avoid rounded corners, gradients, shadows, and generic sans-serif fonts.

---

## Metric card status logic

The `MetricCard.astro` component assigns a status class (`good`, `bad`, or `neutral`) based on the metric's `direction` field and whether it has a `target`:

- `higher_is_better` + has target → `good` if value ≥ target, else `bad`
- `lower_is_better` → always `neutral` (we don't show bad/good for these without a clear threshold)
- `neutral` → always `neutral`

This is intentionally conservative. We don't editorially colour metrics red unless there is a clear official target being missed.

---

## Adding a new metric — checklist

1. Add the metric object to the appropriate `data/*.json` file following the schema above
2. Add a source entry in `data/sources.json` if the source is new
3. Add a validation check in `scripts/validate.js`
4. Add a `<MetricCard>` in the relevant page in `src/pages/`
5. If a new fetch script is needed, add it to `scripts/` and wire up a GitHub Actions workflow

---

## What this project is not

- Not a commentary site — no opinion, no framing beyond the numbers
- Not a news site — we don't update in response to political events, only when official data updates
- Not a visualisation-first site (yet) — clarity of the number takes priority over chart complexity
- Not a database — JSON files in the repo are the data layer; no database, no server

---

## Owner context

The owner can read and review code but is not writing it. Explain non-obvious decisions clearly in comments. Prefer explicit, readable code over clever abstractions. When in doubt, do less and make it obvious.
