import unittest
import json
import tempfile
from pathlib import Path

from storage.sqlite_store import (
    connect,
    calculate_and_store_price_changes,
    recalculate_all_price_changes,
    upsert_source_records,
)
from storage.static_json_export import export_static_json


class SqliteStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test.db"
        self.conn = connect(self.db_path)

    def tearDown(self):
        self.conn.close()
        self.temp_dir.cleanup()

    def test_upsert_and_calculate_price_changes(self):
        records = [
            {"REF_DATE": "2024-01", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 100},
            {"REF_DATE": "2024-02", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 110},
            {"REF_DATE": "2024-03", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 120},
            {"REF_DATE": "2024-01", "GEO": "Canada", "Products": "Bananas", "VECTOR": "v2", "VALUE": 80},
            {"REF_DATE": "2024-02", "GEO": "Canada", "Products": "Bananas", "VECTOR": "v2", "VALUE": 75},
            {"REF_DATE": "2024-03", "GEO": "Canada", "Products": "Bananas", "VECTOR": "v2", "VALUE": 70},
        ]
        upserted = upsert_source_records(self.conn, records)
        self.assertEqual(upserted, 6)

        processed = calculate_and_store_price_changes(self.conn, "Canada")
        self.assertEqual(processed, 2)

        gainers = self.conn.execute(
            "SELECT product FROM price_changes WHERE geo = ? AND change_percent > 0",
            ("Canada",),
        ).fetchall()
        losers = self.conn.execute(
            "SELECT product FROM price_changes WHERE geo = ? AND change_percent < 0",
            ("Canada",),
        ).fetchall()
        self.assertEqual(gainers[0][0], "Apples")
        self.assertEqual(losers[0][0], "Bananas")

    def test_recalculate_all_regions(self):
        records = [
            {"REF_DATE": "2024-01", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 100},
            {"REF_DATE": "2024-02", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 110},
            {"REF_DATE": "2024-01", "GEO": "Ontario", "Products": "Apples", "VECTOR": "v1", "VALUE": 101},
            {"REF_DATE": "2024-02", "GEO": "Ontario", "Products": "Apples", "VECTOR": "v1", "VALUE": 102},
        ]
        upsert_source_records(self.conn, records)
        total = recalculate_all_price_changes(self.conn)
        self.assertEqual(total, 2)

    def test_export_static_json(self):
        records = [
            {"REF_DATE": "2024-01", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 100},
            {"REF_DATE": "2024-02", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 110},
        ]
        upsert_source_records(self.conn, records)
        recalculate_all_price_changes(self.conn)

        output_dir = Path(self.temp_dir.name) / "static"
        summary = export_static_json(self.conn, output_dir)
        self.assertEqual(summary["regions"], 1)
        self.assertTrue((output_dir / "manifest.json").exists())
        self.assertTrue((output_dir / "by-region" / "canada" / "price-changes.json").exists())

        payload = json.loads((output_dir / "products.json").read_text(encoding="utf-8"))
        self.assertEqual(payload["products"], ["Apples"])

    def test_export_includes_year_over_year_change(self):
        records = [
            {"REF_DATE": "2024-03", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 100},
            {"REF_DATE": "2024-04", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 105},
            {"REF_DATE": "2025-03", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 120},
            {"REF_DATE": "2025-04", "GEO": "Canada", "Products": "Apples", "VECTOR": "v1", "VALUE": 130},
        ]
        upsert_source_records(self.conn, records)
        recalculate_all_price_changes(self.conn)

        output_dir = Path(self.temp_dir.name) / "static-yoy"
        export_static_json(self.conn, output_dir)

        payload = json.loads(
            (output_dir / "by-region" / "canada" / "all-price-changes.json").read_text(encoding="utf-8")
        )
        product = payload["products"][0]
        self.assertEqual(product["currentDate"], "2025-04")
        self.assertEqual(product["yearAgoPrice"], 105)
        self.assertAlmostEqual(product["yearAgoChange"], 25)
        self.assertAlmostEqual(product["yearAgoPercent"], (25 / 105) * 100)

    def test_year_ago_month_helper(self):
        from storage.static_json_export import year_ago_month

        self.assertEqual(year_ago_month("2026-05"), "2025-05")
        self.assertEqual(year_ago_month("2026-01"), "2025-01")
        self.assertEqual(year_ago_month("2026-07-15"), "2025-07")
        self.assertIsNone(year_ago_month("bad"))


if __name__ == "__main__":
    unittest.main()
