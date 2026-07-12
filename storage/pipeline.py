"""
Shared StatCan import pipeline for SQLite and static JSON export.
"""

from __future__ import annotations

import os
import shutil
import sys
import zipfile
from pathlib import Path

import pandas as pd

from storage.sqlite_store import (
    connect,
    get_most_recent_date,
    recalculate_all_price_changes,
    upsert_source_records,
)
from storage.static_json_export import export_static_json

ROOT = Path(__file__).resolve().parent.parent


def _load_download_helpers():
    import importlib.util

    importer_path = ROOT / "import-statcan-data.py"
    spec = importlib.util.spec_from_file_location("import_statcan_data", importer_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load importer helpers from {importer_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def download_statcan_records():
    helpers = _load_download_helpers()
    table_id = helpers.TABLE_ID
    api_url = f"https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/{table_id}/en"
    http_session = helpers.build_http_session(helpers.HTTP_MAX_RETRIES)

    response = http_session.get(
        api_url,
        timeout=(helpers.HTTP_CONNECT_TIMEOUT_SECONDS, helpers.HTTP_READ_TIMEOUT_SECONDS),
    )
    response.raise_for_status()
    payload = response.json()
    download_url = payload.get("object")
    if not download_url:
        raise RuntimeError("No download link found in StatCan response")

    zip_filename = f"statcan_{table_id}.csv"
    extract_dir = f"statcan_{table_id}_extracted"
    helpers.download_with_retries(http_session, download_url, zip_filename)

    with zipfile.ZipFile(zip_filename, "r") as archive:
        archive.extractall(extract_dir)

    csv_file = helpers.find_statcan_data_csv(extract_dir, table_id)
    if not csv_file:
        raise FileNotFoundError("No CSV file found in extracted archive")

    usecols = ["REF_DATE", "GEO", "Products", "VECTOR", "VALUE"]
    frame = pd.read_csv(csv_file, usecols=usecols, encoding="utf-8-sig", low_memory=False)
    records = frame.to_dict(orient="records")
    return records, zip_filename, extract_dir


def cleanup_download_artifacts(zip_filename: str, extract_dir: str) -> None:
    if os.path.exists(extract_dir):
        shutil.rmtree(extract_dir)
    if os.path.exists(zip_filename):
        os.remove(zip_filename)


def run_sqlite_import() -> int:
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))

    sqlite_path = os.getenv("SQLITE_PATH", str(ROOT / "backend" / "data" / "grocery-index.db"))
    static_output = os.getenv("STATIC_JSON_OUTPUT_DIR", str(ROOT / "react-frontend" / "data"))
    export_static = os.getenv("EXPORT_STATIC_JSON", "true").lower() != "false"
    recalculate = os.getenv("RECALCULATE_PRICE_CHANGES", "true").lower() != "false"

    print("🚀 Starting StatCan SQLite import")
    print(f"📁 SQLite path: {sqlite_path}")
    if export_static:
        print(f"📁 Static JSON output: {static_output}")

    zip_filename = ""
    extract_dir = ""
    try:
        records, zip_filename, extract_dir = download_statcan_records()
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

        if export_static:
            export_summary = export_static_json(conn, static_output)
            print(
                "✅ Exported static JSON:",
                f"{export_summary['regions']} regions, {export_summary['products']} products",
            )

        conn.close()
        print("🎉 SQLite import completed")
        return 0
    finally:
        if zip_filename or extract_dir:
            cleanup_download_artifacts(zip_filename, extract_dir)
