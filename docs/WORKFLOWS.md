# Workflows

This project has three operational workflows:

1. **Data ingestion (scraper/import)**
2. **Derived metrics refresh (price changes + streaks)**
3. **Frontend data delivery**

## 1) Data ingestion workflow

Entry point:

- `import-statcan-data.py` (default: SQLite + static JSON export)
- `import-statcan-sqlite.py` (thin wrapper around the same SQLite pipeline)

What it does:

1. Fetches latest StatCan table download URL
2. Downloads and extracts CSV
3. Reads required columns (`REF_DATE`, `GEO`, `Products`, `VECTOR`, `VALUE`)
4. Upserts into SQLite (`source_prices` table)
5. Recalculates derived tables (`price_changes`, `price_streaks`)
6. Exports static JSON to `react-frontend/data/` for Vercel
7. Cleans temporary files

Run manually:

```bash
python import-statcan-data.py
```

Environment variables:

- `STORAGE_BACKEND` — `sqlite` (default) or `mongodb` (legacy)
- `SQLITE_PATH` — SQLite database file (default: `backend/data/grocery-index.db`)
- `STATIC_JSON_OUTPUT_DIR` — JSON export directory (default: `react-frontend/data`)
- `EXPORT_STATIC_JSON` — `true`/`false` (default: `true`)
- `RECALCULATE_PRICE_CHANGES` — `true`/`false` (default: `true`)
- `MONGODB_URI` — only required when `STORAGE_BACKEND=mongodb`

## 2) Derived metrics refresh workflow

Backend route entry points:

- `POST /api/statcan/calculate-changes` (single region)
- `GET /api/statcan/calculate-all` (all regions in DB)

Script entry point:

- `backend/scripts/cache-warmup.js` (iterates known regions, recalculates and pre-fetches endpoint data)

Run manually:

```bash
cd backend
npm run warmup
```

Required environment variables:

- `API_BASE_URL` (defaults to `http://localhost:3000/api/statcan`)

## 3) Frontend data delivery workflow

The frontend uses **server-first data fetching** for core pages and then performs client fetches only when needed.

### Home page

- Server fetch in `react-frontend/app/page.js` for default region (`Canada`)
- Revalidated every 24h (`revalidate = 86400`)
- Client fetch only when user switches to another region

### Product page

- `generateStaticParams` pre-renders first product subset for fast startup
- Initial product data fetched server-side where available
- Client fetch only when user changes region or server did not provide initial data

### Region state

- Centralized via `RegionProvider`
- No custom window events
- Persisted in `localStorage`

## Scheduled execution (GitHub Actions)

Workflow file:

- `.github/workflows/scheduled-scraper.yml`

Default trigger:

- Daily at `05:00 UTC`
- Manual trigger (`workflow_dispatch`)
- Runs in GitHub Actions environment: `Scraper`

Execution order:

1. Setup Python + dependencies
2. Setup Node + backend dependencies
3. Run `python import-statcan-data.py` (SQLite + static JSON export)
4. Run Python storage unit tests
5. Run `npm run warmup` in `backend` (optional, when `API_BASE_URL` is set)
6. Upload SQLite DB and static JSON artifacts

Required GitHub Actions variable:

- `API_BASE_URL` (optional; for backend warmup against a deployed API)

Optional notification secret:

- `SLACK_WEBHOOK_URL` (for failure notifications)

Failure handling:

- On failure, the workflow uploads any discovered log files as an artifact named
  `scheduled-scraper-logs`.
- If `SLACK_WEBHOOK_URL` is configured in repository secrets, a Slack alert is sent with
  a direct link to the failed run logs.

How to set up notifications:

1. In GitHub repository settings, add `SLACK_WEBHOOK_URL` under **Settings → Secrets and variables → Actions**.
2. Use a Slack incoming webhook URL for the channel you want alerts in.
3. Trigger the workflow once via **Actions → Scheduled StatCan Scraper → Run workflow** to verify alerts.
