import type Database from 'better-sqlite3';
import { getDatabase } from './sqlite';

export type SourcePriceRow = {
  REF_DATE: string;
  GEO: string;
  Products: string;
  VECTOR: string | null;
  VALUE: number;
};

export type PriceChangeRow = {
  product: string;
  geo: string;
  currentPrice: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  currentDate: string;
  previousDate: string;
  lastUpdated: string;
};

export type PriceStreakRow = {
  product: string;
  geo: string;
  streakLength: number;
  streakType: 'increase' | 'decrease';
  data: Array<{ REF_DATE: string; VALUE: number }>;
  lastUpdated: string;
};

const getDb = (): Database.Database => getDatabase();

export function getDistinctProducts(): string[] {
  const rows = getDb()
    .prepare('SELECT DISTINCT product AS product FROM source_prices ORDER BY product ASC')
    .all() as Array<{ product: string }>;
  return rows.map((row) => row.product);
}

export function getDistinctGeos(): string[] {
  const rows = getDb()
    .prepare('SELECT DISTINCT geo AS geo FROM source_prices ORDER BY geo ASC')
    .all() as Array<{ geo: string }>;
  return rows.map((row) => row.geo);
}

export function countSourceRows(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS count FROM source_prices').get() as { count: number };
  return row.count;
}

export function getSampleSourceRows(limit: number): SourcePriceRow[] {
  return getDb()
    .prepare(
      `SELECT ref_date AS REF_DATE, geo AS GEO, product AS Products, vector AS VECTOR, value AS VALUE
       FROM source_prices
       ORDER BY ref_date ASC
       LIMIT ?`
    )
    .all(limit) as SourcePriceRow[];
}

export function querySourcePrices(filters: {
  date?: string;
  geo?: string;
  product?: string;
  limit?: number;
}): SourcePriceRow[] {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.date) {
    clauses.push('ref_date = ?');
    params.push(filters.date);
  }
  if (filters.geo) {
    clauses.push('geo = ?');
    params.push(filters.geo);
  }
  if (filters.product) {
    clauses.push('product = ?');
    params.push(filters.product);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const orderBy = filters.geo && filters.product && !filters.date ? 'ORDER BY ref_date ASC' : '';
  const limitClause = filters.limit ? 'LIMIT ?' : '';
  if (filters.limit) {
    params.push(filters.limit);
  }

  const sql = `
    SELECT ref_date AS REF_DATE, geo AS GEO, product AS Products, vector AS VECTOR, value AS VALUE
    FROM source_prices
    ${where}
    ${orderBy}
    ${limitClause}
  `;

  return getDb().prepare(sql).all(...params) as SourcePriceRow[];
}

export function countSourceByGeo(geo: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS count FROM source_prices WHERE geo = ?')
    .get(geo) as { count: number };
  return row.count;
}

export function countSourceByProduct(product: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS count FROM source_prices WHERE product = ?')
    .get(product) as { count: number };
  return row.count;
}

export function getPriceChangesByGeo(geo: string): PriceChangeRow[] {
  return getDb()
    .prepare(
      `SELECT product, geo,
              current_price AS currentPrice,
              previous_price AS previousPrice,
              change,
              change_percent AS changePercent,
              current_date AS currentDate,
              previous_date AS previousDate,
              last_updated AS lastUpdated
       FROM price_changes
       WHERE geo = ?`
    )
    .all(geo) as PriceChangeRow[];
}

export function getTopGainers(geo: string, limit: number): PriceChangeRow[] {
  return getDb()
    .prepare(
      `SELECT product, geo,
              current_price AS currentPrice,
              previous_price AS previousPrice,
              change,
              change_percent AS changePercent,
              current_date AS currentDate,
              previous_date AS previousDate,
              last_updated AS lastUpdated
       FROM price_changes
       WHERE geo = ? AND change_percent > 0
       ORDER BY change_percent DESC
       LIMIT ?`
    )
    .all(geo, limit) as PriceChangeRow[];
}

export function getTopLosers(geo: string, limit: number): PriceChangeRow[] {
  return getDb()
    .prepare(
      `SELECT product, geo,
              current_price AS currentPrice,
              previous_price AS previousPrice,
              change,
              change_percent AS changePercent,
              current_date AS currentDate,
              previous_date AS previousDate,
              last_updated AS lastUpdated
       FROM price_changes
       WHERE geo = ? AND change_percent < 0
       ORDER BY change_percent ASC
       LIMIT ?`
    )
    .all(geo, limit) as PriceChangeRow[];
}

export function getRecentPriceHistoryByProduct(
  geo: string,
  products: string[],
  points: number
): Map<string, Array<{ REF_DATE: string; VALUE: number }>> {
  const result = new Map<string, Array<{ REF_DATE: string; VALUE: number }>>();
  if (products.length === 0 || points <= 0) {
    return result;
  }

  const placeholders = products.map(() => '?').join(', ');
  const rows = getDb()
    .prepare(
      `SELECT product, ref_date AS REF_DATE, value AS VALUE
       FROM source_prices
       WHERE geo = ? AND product IN (${placeholders})
       ORDER BY product ASC, ref_date ASC`
    )
    .all(geo, ...products) as Array<{ product: string; REF_DATE: string; VALUE: number }>;

  const grouped = new Map<string, Array<{ REF_DATE: string; VALUE: number }>>();
  rows.forEach((row) => {
    const existing = grouped.get(row.product) ?? [];
    existing.push({ REF_DATE: row.REF_DATE, VALUE: row.VALUE });
    grouped.set(row.product, existing);
  });

  grouped.forEach((history, product) => {
    result.set(product, history.slice(-points));
  });

  return result;
}

export function getProductTrends(geo: string, products: string[], months: number) {
  const history = getRecentPriceHistoryByProduct(geo, products, months);
  return Object.fromEntries(history.entries());
}

export function getStreaksByGeo(geo: string, limit: number): PriceStreakRow[] {
  const rows = getDb()
    .prepare(
      `SELECT product, geo, streak_length AS streakLength, streak_type AS streakType,
              data_json AS dataJson, last_updated AS lastUpdated
       FROM price_streaks
       WHERE geo = ?
       ORDER BY streak_length DESC
       LIMIT ?`
    )
    .all(geo, limit) as Array<{
    product: string;
    geo: string;
    streakLength: number;
    streakType: 'increase' | 'decrease';
    dataJson: string;
    lastUpdated: string;
  }>;

  return rows.map((row) => ({
    product: row.product,
    geo: row.geo,
    streakLength: row.streakLength,
    streakType: row.streakType,
    data: JSON.parse(row.dataJson) as Array<{ REF_DATE: string; VALUE: number }>,
    lastUpdated: row.lastUpdated,
  }));
}

export function getYearAgoPrices(
  geo: string,
  keys: Array<{ product: string; yearAgoDate: string }>
): Map<string, number> {
  const result = new Map<string, number>();
  if (keys.length === 0) {
    return result;
  }

  const stmt = getDb().prepare(
    `SELECT value
     FROM source_prices
     WHERE geo = ? AND product = ? AND ref_date = ?
     LIMIT 1`
  );

  keys.forEach(({ product, yearAgoDate }) => {
    const row = stmt.get(geo, product, yearAgoDate) as { value: number } | undefined;
    if (row && Number.isFinite(row.value)) {
      result.set(`${product}::${yearAgoDate}`, row.value);
    }
  });

  return result;
}

export function upsertPriceChange(row: PriceChangeRow): void {
  getDb()
    .prepare(
      `INSERT INTO price_changes (
         product, geo, current_price, previous_price, change, change_percent,
         current_date, previous_date, last_updated
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(product, geo) DO UPDATE SET
         current_price = excluded.current_price,
         previous_price = excluded.previous_price,
         change = excluded.change,
         change_percent = excluded.change_percent,
         current_date = excluded.current_date,
         previous_date = excluded.previous_date,
         last_updated = excluded.last_updated`
    )
    .run(
      row.product,
      row.geo,
      row.currentPrice,
      row.previousPrice,
      row.change,
      row.changePercent,
      row.currentDate,
      row.previousDate,
      row.lastUpdated
    );
}

export function upsertPriceStreak(row: PriceStreakRow): void {
  getDb()
    .prepare(
      `INSERT INTO price_streaks (product, geo, streak_length, streak_type, data_json, last_updated)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(product, geo) DO UPDATE SET
         streak_length = excluded.streak_length,
         streak_type = excluded.streak_type,
         data_json = excluded.data_json,
         last_updated = excluded.last_updated`
    )
    .run(
      row.product,
      row.geo,
      row.streakLength,
      row.streakType,
      JSON.stringify(row.data),
      row.lastUpdated
    );
}

export function deletePriceStreak(product: string, geo: string): void {
  getDb().prepare('DELETE FROM price_streaks WHERE product = ? AND geo = ?').run(product, geo);
}

export function getProductPriceSeries(geo: string, product: string): SourcePriceRow[] {
  return getDb()
    .prepare(
      `SELECT ref_date AS REF_DATE, geo AS GEO, product AS Products, vector AS VECTOR, value AS VALUE
       FROM source_prices
       WHERE geo = ? AND product = ?
       ORDER BY ref_date ASC`
    )
    .all(geo, product) as SourcePriceRow[];
}

export function calculateAndStorePriceChanges(geo: string): number {
  const products = getDb()
    .prepare('SELECT DISTINCT product FROM source_prices WHERE geo = ?')
    .all(geo) as Array<{ product: string }>;

  let processedCount = 0;
  const now = new Date().toISOString();

  products.forEach(({ product }) => {
    const priceData = getProductPriceSeries(geo, product);
    if (priceData.length < 2) {
      return;
    }

    const current = priceData[priceData.length - 1];
    const previous = priceData[priceData.length - 2];
    const currentPrice = Number(current.VALUE);
    const previousPrice = Number(previous.VALUE);

    if (!Number.isFinite(currentPrice) || !Number.isFinite(previousPrice) || previousPrice === 0) {
      return;
    }

    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;

    upsertPriceChange({
      product,
      geo,
      currentPrice,
      previousPrice,
      change,
      changePercent,
      currentDate: current.REF_DATE,
      previousDate: previous.REF_DATE,
      lastUpdated: now,
    });

    let currentStreak = 1;
    let streakType: 'increase' | 'decrease' | null = null;
    let streakStartIdx = priceData.length - 1;

    for (let i = priceData.length - 1; i > 0; i -= 1) {
      const currentValue = Number(priceData[i].VALUE);
      const previousValue = Number(priceData[i - 1].VALUE);
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
        break;
      }

      const diff = currentValue - previousValue;
      if (diff > 0) {
        if (streakType === 'increase' || streakType === null) {
          currentStreak += 1;
          streakType = 'increase';
          streakStartIdx = i - 1;
        } else {
          break;
        }
      } else if (diff < 0) {
        if (streakType === 'decrease' || streakType === null) {
          currentStreak += 1;
          streakType = 'decrease';
          streakStartIdx = i - 1;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (currentStreak > 1 && streakType) {
      upsertPriceStreak({
        product,
        geo,
        streakLength: currentStreak,
        streakType,
        data: priceData.slice(streakStartIdx).map((point) => ({
          REF_DATE: point.REF_DATE,
          VALUE: Number(point.VALUE),
        })),
        lastUpdated: now,
      });
    } else {
      deletePriceStreak(product, geo);
    }

    processedCount += 1;
  });

  return processedCount;
}
