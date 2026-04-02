# Data Schema

This project stores source and derived data in MongoDB.

## Database

- **Database name**: `statcan`
- **Primary source collection**: `table_18100245` (configurable via `STATCAN_COLLECTION`)

## Collection: `table_18100245` (source from StatCan)

| Field      | Type                 | Description |
|------------|----------------------|-------------|
| `REF_DATE` | `string` (`YYYY-MM`) | Reference month for a value |
| `GEO`      | `string`             | Geographic region (Canada, provinces, territories) |
| `Products` | `string`             | Product label from StatCan |
| `VECTOR`   | `string`             | StatCan vector identifier |
| `VALUE`    | `number \| string`   | Price/index value from source data |

### Indexes

- Unique compound index on: `REF_DATE`, `GEO`, `Products`

This index is created by `import-statcan-data.py` and prevents duplicate source rows.

## Collection: `price_changes` (derived)

Precomputed month-over-month values for fast frontend/API responses.

| Field          | Type                 | Description |
|----------------|----------------------|-------------|
| `product`      | `string`             | Product name |
| `geo`          | `string`             | Region |
| `currentPrice` | `number`             | Latest price |
| `previousPrice`| `number`             | Previous month price |
| `change`       | `number`             | Absolute MoM change |
| `changePercent`| `number`             | Percent MoM change |
| `currentDate`  | `string` (`YYYY-MM`) | Latest month |
| `previousDate` | `string` (`YYYY-MM`) | Previous month |
| `lastUpdated`  | `Date`               | Last calculation timestamp |

## Collection: `price_streaks` (derived)

Current streak of consecutive increases or decreases per product and region.

| Field          | Type                          | Description |
|----------------|-------------------------------|-------------|
| `product`      | `string`                      | Product name |
| `geo`          | `string`                      | Region |
| `streakLength` | `number`                      | Number of consecutive changes in same direction |
| `streakType`   | `'increase' \| 'decrease'`    | Direction of streak |
| `data`         | `Array<{ REF_DATE, VALUE }>`  | Price points included in the streak |
| `lastUpdated`  | `Date`                        | Last calculation timestamp |

### Indexes

- `{ geo: 1, streakLength: -1 }`
- `{ product: 1, geo: 1 }`
