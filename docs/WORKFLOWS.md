# Workflows

This project has three operational workflows:

1. **Data ingestion (scraper/import)**
2. **Derived metrics refresh (price changes + streaks)**
3. **Frontend data delivery**

## 1) Data ingestion workflow

Entry point:

- `import-statcan-data.py`

What it does:

1. Fetches latest StatCan table download URL
2. Downloads and extracts CSV
3. Reads required columns (`REF_DATE`, `GEO`, `Products`, `VECTOR`, `VALUE`)
4. Upserts into `table_18100245`
5. Recalculates derived collections (`price_changes`, `price_streaks`)
6. Cleans temporary files

Run manually:

```bash
python import-statcan-data.py
```

Required environment variable:

- `MONGODB_URI`

Optional behavior:

- `RECALCULATE_PRICE_CHANGES` in script (currently enabled by default)

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

- `MONGODB_URI`
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

Secrets needed in repository settings:

- `MONGODB_URI`
- `API_BASE_URL` (for backend warmup endpoint)

Execution order:

1. Setup Python + dependencies
2. Setup Node + backend dependencies
3. Run `python import-statcan-data.py`
4. Run `npm run warmup` in `backend`

