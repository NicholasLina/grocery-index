import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export const DEFAULT_SQLITE_PATH = path.join(process.cwd(), 'data', 'grocery-index.db');

export function getSqlitePath(): string {
  return process.env.SQLITE_PATH || DEFAULT_SQLITE_PATH;
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_prices (
      ref_date TEXT NOT NULL,
      geo TEXT NOT NULL,
      product TEXT NOT NULL,
      vector TEXT,
      value REAL,
      PRIMARY KEY (ref_date, geo, product)
    );

    CREATE TABLE IF NOT EXISTS price_changes (
      product TEXT NOT NULL,
      geo TEXT NOT NULL,
      current_price REAL NOT NULL,
      previous_price REAL NOT NULL,
      change REAL NOT NULL,
      change_percent REAL NOT NULL,
      current_date TEXT NOT NULL,
      previous_date TEXT NOT NULL,
      last_updated TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (product, geo)
    );

    CREATE TABLE IF NOT EXISTS price_streaks (
      product TEXT NOT NULL,
      geo TEXT NOT NULL,
      streak_length INTEGER NOT NULL,
      streak_type TEXT NOT NULL,
      data_json TEXT NOT NULL,
      last_updated TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (product, geo)
    );

    CREATE INDEX IF NOT EXISTS idx_source_geo_product ON source_prices (geo, product, ref_date);
    CREATE INDEX IF NOT EXISTS idx_price_changes_geo_percent ON price_changes (geo, change_percent);
    CREATE INDEX IF NOT EXISTS idx_price_streaks_geo_length ON price_streaks (geo, streak_length DESC);
  `);
}

export function openDatabase(dbPath?: string): Database.Database {
  const resolved = dbPath ?? getSqlitePath();
  const directory = path.dirname(resolved);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  return db;
}

let sharedDb: Database.Database | null | undefined = undefined;

export function getDatabase(): Database.Database {
  if (sharedDb === undefined) {
    sharedDb = openDatabase();
  }
  if (sharedDb === null) {
    throw new Error('Database unavailable');
  }
  return sharedDb;
}

export function setDatabase(db: Database.Database | null): void {
  sharedDb = db;
}

export function closeDatabase(): void {
  if (sharedDb && sharedDb !== null) {
    sharedDb.close();
  }
  sharedDb = undefined;
}

export function isDatabaseReady(): boolean {
  if (sharedDb === null) {
    return false;
  }
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
