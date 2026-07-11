"""
SQLite storage backend for StatCan grocery data.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, UTC
from pathlib import Path
from typing import Iterable


SCHEMA_SQL = """
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
"""


def connect(db_path: str | Path) -> sqlite3.Connection:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA_SQL)
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def get_most_recent_date(conn: sqlite3.Connection) -> str | None:
    row = conn.execute(
        "SELECT ref_date FROM source_prices ORDER BY ref_date DESC LIMIT 1"
    ).fetchone()
    return row[0] if row else None


def upsert_source_records(conn: sqlite3.Connection, records: Iterable[dict]) -> int:
    insert_sql = """
        INSERT INTO source_prices (ref_date, geo, product, vector, value)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(ref_date, geo, product) DO UPDATE SET
          vector = excluded.vector,
          value = excluded.value
    """
    upserted = 0
    for record in records:
        conn.execute(
            insert_sql,
            (
                record.get("REF_DATE"),
                record.get("GEO"),
                record.get("Products"),
                record.get("VECTOR"),
                float(record.get("VALUE")) if record.get("VALUE") is not None else None,
            ),
        )
        upserted += 1
    conn.commit()
    return upserted


def calculate_and_store_price_changes(conn: sqlite3.Connection, geo: str) -> int:
    products = [
        row[0]
        for row in conn.execute(
            "SELECT DISTINCT product FROM source_prices WHERE geo = ? ORDER BY product ASC",
            (geo,),
        ).fetchall()
    ]

    processed = 0
    now = datetime.now(UTC).replace(tzinfo=None).isoformat()

    for product in products:
        rows = conn.execute(
            """
            SELECT ref_date, value
            FROM source_prices
            WHERE geo = ? AND product = ?
            ORDER BY ref_date ASC
            """,
            (geo, product),
        ).fetchall()

        if len(rows) < 2:
            continue

        current_date, current_value = rows[-1]
        previous_date, previous_value = rows[-2]
        if current_value is None or previous_value is None or previous_value == 0:
            continue

        change = current_value - previous_value
        change_percent = (change / previous_value) * 100

        conn.execute(
            """
            INSERT INTO price_changes (
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
              last_updated = excluded.last_updated
            """,
            (
                product,
                geo,
                current_value,
                previous_value,
                change,
                change_percent,
                current_date,
                previous_date,
                now,
            ),
        )

        current_streak = 1
        streak_type = None
        streak_start_idx = len(rows) - 1

        for index in range(len(rows) - 1, 0, -1):
            current_val = rows[index][1]
            previous_val = rows[index - 1][1]
            if current_val is None or previous_val is None:
                break
            diff = current_val - previous_val
            if diff > 0:
                if streak_type in (None, "increase"):
                    current_streak += 1
                    streak_type = "increase"
                    streak_start_idx = index - 1
                else:
                    break
            elif diff < 0:
                if streak_type in (None, "decrease"):
                    current_streak += 1
                    streak_type = "decrease"
                    streak_start_idx = index - 1
                else:
                    break
            else:
                break

        if current_streak > 1 and streak_type:
            streak_data = [
                {"REF_DATE": ref_date, "VALUE": value}
                for ref_date, value in rows[streak_start_idx:]
            ]
            conn.execute(
                """
                INSERT INTO price_streaks (product, geo, streak_length, streak_type, data_json, last_updated)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(product, geo) DO UPDATE SET
                  streak_length = excluded.streak_length,
                  streak_type = excluded.streak_type,
                  data_json = excluded.data_json,
                  last_updated = excluded.last_updated
                """,
                (
                    product,
                    geo,
                    current_streak,
                    streak_type,
                    json.dumps(streak_data),
                    now,
                ),
            )
        else:
            conn.execute(
                "DELETE FROM price_streaks WHERE product = ? AND geo = ?",
                (product, geo),
            )

        processed += 1

    conn.commit()
    return processed


def recalculate_all_price_changes(conn: sqlite3.Connection) -> int:
    geos = [
        row[0]
        for row in conn.execute("SELECT DISTINCT geo FROM source_prices ORDER BY geo ASC").fetchall()
    ]
    total = 0
    for geo in geos:
        total += calculate_and_store_price_changes(conn, geo)
    return total
