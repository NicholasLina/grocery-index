# Data Schema

This branch supports two storage modes:

1. **SQLite** (Lightsail / persistent Node server)
2. **Static JSON** (Vercel / Next.js API routes)

Both are produced by `import-statcan-sqlite.py`.

## SQLite database

- **Default path**: `backend/data/grocery-index.db`
- **Override**: `SQLITE_PATH` environment variable

### Table: `source_prices`

| Column     | Type   | Description |
|------------|--------|-------------|
| `ref_date` | `TEXT` | Reference month (`YYYY-MM`) |
| `geo`      | `TEXT` | Geographic region |
| `product`  | `TEXT` | Product label from StatCan |
| `vector`   | `TEXT` | StatCan vector identifier |
| `value`    | `REAL` | Price/index value |

**Primary key**: (`ref_date`, `geo`, `product`)

### Table: `price_changes` (derived)

| Column           | Type   | Description |
|------------------|--------|-------------|
| `product`        | `TEXT` | Product name |
| `geo`            | `TEXT` | Region |
| `current_price`  | `REAL` | Latest price |
| `previous_price` | `REAL` | Previous month price |
| `change`         | `REAL` | Absolute MoM change |
| `change_percent` | `REAL` | Percent MoM change |
| `current_date`   | `TEXT` | Latest month |
| `previous_date`  | `TEXT` | Previous month |
| `last_updated`   | `TEXT` | Last calculation timestamp |

**Primary key**: (`product`, `geo`)

### Table: `price_streaks` (derived)

| Column          | Type   | Description |
|-----------------|--------|-------------|
| `product`       | `TEXT` | Product name |
| `geo`           | `TEXT` | Region |
| `streak_length` | `INT`  | Consecutive months in same direction |
| `streak_type`   | `TEXT` | `increase` or `decrease` |
| `data_json`     | `TEXT` | JSON array of `{ REF_DATE, VALUE }` |
| `last_updated`  | `TEXT` | Last calculation timestamp |

**Primary key**: (`product`, `geo`)

## Static JSON layout

Root: `react-frontend/data/`

| File / directory | Purpose |
|------------------|---------|
| `manifest.json` | Region/product slug map + generation timestamp |
| `products.json` | Product list endpoint payload |
| `regions.json` | Region list endpoint payload |
| `by-region/{slug}/price-changes.json` | Gainers/losers per region |
| `by-region/{slug}/streaks.json` | Streak leaderboard per region |
| `by-region/{slug}/all-price-changes.json` | Full product table per region |
| `by-region/{slug}/product-trends.json` | Chart series per region |
| `prices/{geo-slug}/{product-slug}.json` | Full price history per product |

These files mirror the existing Express API response shapes consumed by the frontend.
