# Deployment Options

This branch implements two production-ready storage/deployment paths.

## Option 1: Lightsail + SQLite (Express API)

Use a persistent VM (AWS Lightsail, Railway, Fly.io, etc.) with a single SQLite file.

### Components

- `backend/src/db/sqlite.ts` — schema + connection
- `backend/src/db/repository.ts` — queries + derived metric calculations
- `backend/src/routes/statcan.ts` — same REST API shape as before
- `import-statcan-sqlite.py` — downloads StatCan data, writes SQLite, exports static JSON

### Setup

```bash
cd backend
npm install
npm run build

# Import data (from repo root)
python import-statcan-sqlite.py

# Run API
SQLITE_PATH=./data/grocery-index.db npm start
```

### Environment

```env
SQLITE_PATH=/var/app/data/grocery-index.db
PORT=3000
```

### Lightsail deployment sketch

1. Create an Ubuntu Lightsail instance ($5–10/mo).
2. Install Node 20+, Python 3.11+, and build tools for `better-sqlite3`.
3. Clone repo, run `npm ci && npm run build` in `backend/`.
4. Set `SQLITE_PATH` to a persistent path (e.g. `/home/ubuntu/data/grocery-index.db`).
5. Run with `pm2` or systemd:
   ```bash
   SQLITE_PATH=/home/ubuntu/data/grocery-index.db pm2 start dist/server.js --name grocery-api
   ```
6. Point your frontend `NEXT_PUBLIC_API_URL` to the Lightsail public URL.
7. Schedule imports via cron or GitHub Actions SSH step:
   ```bash
   python import-statcan-sqlite.py
   cd backend && npm run warmup
   ```

### Tests

```bash
cd backend
npm test
```

---

## Option 2: Vercel + Static JSON (no runtime database)

Serve precomputed JSON from the Next.js app itself. No separate API server or database at runtime.

### Components

- `react-frontend/data/` — exported JSON payloads (fixture included for tests)
- `react-frontend/lib/staticData.js` — filesystem reader
- `react-frontend/app/api/statcan/**` — API routes mirroring the Express endpoints
- `import-statcan-sqlite.py` — also writes `react-frontend/data/` during import

### Setup

```bash
# Refresh data (writes react-frontend/data/)
python import-statcan-sqlite.py

cd react-frontend
npm install
NEXT_PUBLIC_DATA_SOURCE=static npm run build
```

### Vercel environment

```env
NEXT_PUBLIC_DATA_SOURCE=static
```

Do **not** set `NEXT_PUBLIC_API_URL` when using static mode.

### Data refresh workflow

1. GitHub Action runs `python import-statcan-sqlite.py` on schedule.
2. Commit updated `react-frontend/data/` (or upload as build artifact before deploy).
3. Vercel rebuild picks up new JSON automatically.

### Tests

```bash
cd react-frontend
npm test

# Python storage/export tests
python -m unittest tests/test_storage.py
```

---

## Choosing between them

| Concern | Lightsail + SQLite | Vercel + Static JSON |
|--------|--------------------|----------------------|
| Runtime DB | Yes (single `.db` file) | No |
| Separate API server | Yes | No |
| Cost | ~$5+/mo VM | Vercel free/hobby tier |
| Data refresh | Cron / Actions → SQLite file | Actions → commit JSON → redeploy |
| Best for | Live API, dynamic queries | Read-only dashboard, simplest ops |

Both options share the same import pipeline (`import-statcan-sqlite.py`) and keep the existing frontend API contract.
