import Database from 'better-sqlite3';
import { initSchema, setDatabase } from '../../src/db/sqlite';
import {
  calculateAndStorePriceChanges,
  getDistinctProducts,
  getTopGainers,
  querySourcePrices,
} from '../../src/db/repository';

export function seedTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  initSchema(db);
  setDatabase(db);

  const insertSource = db.prepare(
    `INSERT INTO source_prices (ref_date, geo, product, vector, value)
     VALUES (?, ?, ?, ?, ?)`
  );

  const rows: Array<[string, string, string, string, number]> = [
    ['2024-01', 'Canada', 'Apples', 'v1', 100],
    ['2024-02', 'Canada', 'Apples', 'v1', 110],
    ['2024-03', 'Canada', 'Apples', 'v1', 120],
    ['2024-01', 'Canada', 'Bananas', 'v2', 80],
    ['2024-02', 'Canada', 'Bananas', 'v2', 75],
    ['2024-03', 'Canada', 'Bananas', 'v2', 70],
    ['2024-01', 'Ontario', 'Apples', 'v1', 101],
    ['2024-02', 'Ontario', 'Apples', 'v1', 102],
  ];

  rows.forEach((row) => insertSource.run(...row));
  calculateAndStorePriceChanges('Canada');
  calculateAndStorePriceChanges('Ontario');

  return db;
}

export function resetTestDatabase(): void {
  setDatabase(null);
}
