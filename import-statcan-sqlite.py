#!/usr/bin/env python3
"""
Import StatCan data into SQLite and export static JSON for Vercel.

Usage:
  python import-statcan-sqlite.py

Environment variables:
  SQLITE_PATH              Path to SQLite database (default: backend/data/grocery-index.db)
  STATIC_JSON_OUTPUT_DIR   Path for JSON export (default: react-frontend/data)
  RECALCULATE_PRICE_CHANGES  true/false (default: true)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import importlib.util  # noqa: E402

from storage.sqlite_store import (  # noqa: E402
    connect,
    get_most_recent_date,
    recalculate_all_price_changes,
    upsert_source_records,
)
from storage.static_json_export import export_static_json  # noqa: E402

IMPORTER_PATH = ROOT / "import-statcan-data.py"
spec = importlib.util.spec_from_file_location("import_statcan_data", IMPORTER_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load importer module from {IMPORTER_PATH}")
import_statcan_data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(import_statcan_data)

TABLE_ID = import_statcan_data.TABLE_ID
build_http_session = import_statcan_data.build_http_session
download_with_retries = import_statcan_data.download_with_retries
find_statcan_data_csv = import_statcan_data.find_statcan_data_csv
HTTP_CONNECT_TIMEOUT_SECONDS = import_statcan_data.HTTP_CONNECT_TIMEOUT_SECONDS
HTTP_MAX_RETRIES = import_statcan_data.HTTP_MAX_RETRIES
HTTP_READ_TIMEOUT_SECONDS = import_statcan_data.HTTP_READ_TIMEOUT_SECONDS

import pandas as pd  # noqa: E402
import shutil  # noqa: E402
import zipfile  # noqa: E402


def main() -> int:
    sqlite_path = os.getenv("SQLITE_PATH", str(ROOT / "backend" / "data" / "grocery-index.db"))
    static_output = os.getenv("STATIC_JSON_OUTPUT_DIR", str(ROOT / "react-frontend" / "data"))
    recalculate = os.getenv("RECALCULATE_PRICE_CHANGES", "true").lower() != "false"

    api_url = f"https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/{TABLE_ID}/en"
    http_session = build_http_session(HTTP_MAX_RETRIES)

    print("🚀 Starting StatCan SQLite + static JSON import")
    print(f"📁 SQLite path: {sqlite_path}")
    print(f"📁 Static JSON output: {static_output}")

    response = http_session.get(
        api_url,
        timeout=(HTTP_CONNECT_TIMEOUT_SECONDS, HTTP_READ_TIMEOUT_SECONDS),
    )
    response.raise_for_status()
    payload = response.json()
    download_url = payload.get("object")
    if not download_url:
        raise RuntimeError("No download link found in StatCan response")

    zip_filename = f"statcan_{TABLE_ID}.csv"
    download_with_retries(http_session, download_url, zip_filename)

    extract_dir = f"statcan_{TABLE_ID}_extracted"
    with zipfile.ZipFile(zip_filename, "r") as archive:
        archive.extractall(extract_dir)

    csv_file = find_statcan_data_csv(extract_dir, TABLE_ID)
    if not csv_file:
        raise FileNotFoundError("No CSV file found in extracted archive")

    usecols = ["REF_DATE", "GEO", "Products", "VECTOR", "VALUE"]
    frame = pd.read_csv(csv_file, usecols=usecols, encoding="utf-8-sig", low_memory=False)
    records = frame.to_dict(orient="records")

    conn = connect(sqlite_path)
    most_recent = get_most_recent_date(conn)
    if most_recent:
        records = [record for record in records if record.get("REF_DATE", "") > most_recent]

    upserted = 0
    if records:
        upserted = upsert_source_records(conn, records)
        print(f"✅ Upserted {upserted:,} source records")
    else:
        print("✨ Database already up to date")

    if recalculate and (upserted > 0 or not most_recent):
        total = recalculate_all_price_changes(conn)
        print(f"✅ Recalculated derived metrics for {total:,} products")

    export_summary = export_static_json(conn, static_output)
    print(
        "✅ Exported static JSON:",
        f"{export_summary['regions']} regions, {export_summary['products']} products",
    )

    conn.close()

    if os.path.exists(extract_dir):
        shutil.rmtree(extract_dir)
    if os.path.exists(zip_filename):
        os.remove(zip_filename)

    print("🎉 SQLite + static JSON import completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
