import Database from 'better-sqlite3';
import { initSchema } from '../src/db/sqlite';
import {
  calculateAndStorePriceChanges,
  getPriceChangesByGeo,
  getStreaksByGeo,
  getTopGainers,
  getTopLosers,
} from '../src/db/repository';
import { seedTestDatabase, resetTestDatabase } from './helpers/seed';

describe('SQLite repository', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = seedTestDatabase();
  });

  afterEach(() => {
    db.close();
    resetTestDatabase();
  });

  test('calculateAndStorePriceChanges computes gainers and losers', () => {
    const gainers = getTopGainers('Canada', 5);
    const losers = getTopLosers('Canada', 5);

    expect(gainers[0].product).toBe('Apples');
    expect(gainers[0].changePercent).toBeGreaterThan(0);
    expect(losers[0].product).toBe('Bananas');
    expect(losers[0].changePercent).toBeLessThan(0);
  });

  test('calculateAndStorePriceChanges stores streak metadata', () => {
    const streaks = getStreaksByGeo('Canada', 5);
    expect(streaks.length).toBeGreaterThan(0);
    expect(streaks[0].streakLength).toBeGreaterThan(1);
    expect(Array.isArray(streaks[0].data)).toBe(true);
  });

  test('schema can be initialized on a fresh database', () => {
    const freshDb = new Database(':memory:');
    initSchema(freshDb);
    const tables = freshDb
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name ASC")
      .all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(['price_changes', 'price_streaks', 'source_prices'])
    );
    freshDb.close();
  });

  test('getPriceChangesByGeo returns one row per product', () => {
    const rows = getPriceChangesByGeo('Canada');
    expect(rows).toHaveLength(2);
    expect(calculateAndStorePriceChanges('Canada')).toBe(2);
  });
});
