"""
Export SQLite-derived API payloads to static JSON for Vercel deployment.
"""

from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, UTC
from pathlib import Path


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower())
    return slug.strip("-")


def year_ago_month(ref_date: str) -> str | None:
    """
    Return YYYY-MM exactly 12 months before ref_date.

    Accepts YYYY-MM or YYYY-MM-DD. Returns None when the value cannot be parsed.
    """
    if not ref_date:
        return None
    month_value = str(ref_date)[:7]
    try:
        current = datetime.strptime(month_value, "%Y-%m")
    except ValueError:
        return None
    return f"{current.year - 1:04d}-{current.month:02d}"


def _fetch_price_changes(conn: sqlite3.Connection, geo: str, limit: int, direction: str):
    comparator = ">" if direction == "gainers" else "<"
    order = "DESC" if direction == "gainers" else "ASC"
    # Quote "current_date" — bare current_date is SQLite's CURRENT_DATE function.
    rows = conn.execute(
        f"""
        SELECT product, geo, current_price, previous_price, change, change_percent,
               "current_date", previous_date, last_updated
        FROM price_changes
        WHERE geo = ? AND change_percent {comparator} 0
        ORDER BY change_percent {order}
        LIMIT ?
        """,
        (geo, limit),
    ).fetchall()

    results = []
    for row in rows:
        history = conn.execute(
            """
            SELECT ref_date, value
            FROM source_prices
            WHERE geo = ? AND product = ?
            ORDER BY ref_date ASC
            """,
            (geo, row[0]),
        ).fetchall()
        results.append(
            {
                "product": row[0],
                "geo": row[1],
                "currentPrice": row[2],
                "previousPrice": row[3],
                "change": row[4],
                "changePercent": row[5],
                "currentDate": row[6],
                "previousDate": row[7],
                "lastUpdated": row[8],
                "history": [
                    {"REF_DATE": point[0], "VALUE": point[1]}
                    for point in history[-12:]
                ],
            }
        )
    return results


def export_static_json(conn: sqlite3.Connection, output_dir: str | Path) -> dict:
    root = Path(output_dir)
    by_region = root / "by-region"
    prices_dir = root / "prices"
    by_region.mkdir(parents=True, exist_ok=True)
    prices_dir.mkdir(parents=True, exist_ok=True)

    products = [
        row[0]
        for row in conn.execute(
            "SELECT DISTINCT product FROM source_prices ORDER BY product ASC"
        ).fetchall()
    ]
    geos = [
        row[0]
        for row in conn.execute(
            "SELECT DISTINCT geo FROM source_prices ORDER BY geo ASC"
        ).fetchall()
    ]

    (root / "products.json").write_text(
        json.dumps({"products": products, "count": len(products)}, indent=2),
        encoding="utf-8",
    )
    (root / "regions.json").write_text(
        json.dumps({"regions": geos, "count": len(geos)}, indent=2),
        encoding="utf-8",
    )

    for geo in geos:
        geo_slug = slugify(geo)
        region_dir = by_region / geo_slug
        region_dir.mkdir(parents=True, exist_ok=True)

        gainers = _fetch_price_changes(conn, geo, 50, "gainers")
        losers = _fetch_price_changes(conn, geo, 50, "losers")
        (region_dir / "price-changes.json").write_text(
            json.dumps(
                {
                    "geo": geo,
                    "gainers": gainers,
                    "losers": losers,
                    "totalGainers": len(gainers),
                    "totalLosers": len(losers),
                    "trendPoints": 12,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        streak_rows = conn.execute(
            """
            SELECT product, geo, streak_length, streak_type, data_json, last_updated
            FROM price_streaks
            WHERE geo = ?
            ORDER BY streak_length DESC
            """,
            (geo,),
        ).fetchall()
        streaks = [
            {
                "product": row[0],
                "geo": row[1],
                "streakLength": row[2],
                "streakType": row[3],
                "data": json.loads(row[4]),
                "lastUpdated": row[5],
            }
            for row in streak_rows
        ]
        (region_dir / "streaks.json").write_text(
            json.dumps({"geo": geo, "streaks": streaks}, indent=2),
            encoding="utf-8",
        )

        all_changes = conn.execute(
            """
            SELECT product, geo, current_price, previous_price, change, change_percent,
                   "current_date", previous_date
            FROM price_changes
            WHERE geo = ?
            ORDER BY product ASC
            """,
            (geo,),
        ).fetchall()

        products_payload = []
        for row in all_changes:
            year_ago_price = None
            year_ago_percent = None
            year_ago_change = None
            year_ago_date = year_ago_month(row[6]) if row[6] else None
            if year_ago_date:
                year_row = conn.execute(
                    """
                    SELECT value FROM source_prices
                    WHERE geo = ? AND product = ? AND ref_date = ?
                    LIMIT 1
                    """,
                    (geo, row[0], year_ago_date),
                ).fetchone()
                if year_row and year_row[0] is not None:
                    year_ago_price = year_row[0]
                    year_ago_change = row[2] - year_ago_price
                    if year_ago_price != 0:
                        year_ago_percent = (year_ago_change / year_ago_price) * 100

            products_payload.append(
                {
                    "product": row[0],
                    "geo": row[1],
                    "currentPrice": row[2],
                    "previousPrice": row[3],
                    "change": row[4],
                    "changePercent": row[5],
                    "currentDate": row[6],
                    "previousDate": row[7],
                    "yearAgoPrice": year_ago_price,
                    "yearAgoChange": year_ago_change,
                    "yearAgoPercent": year_ago_percent,
                }
            )

        (region_dir / "all-price-changes.json").write_text(
            json.dumps({"geo": geo, "products": products_payload}, indent=2),
            encoding="utf-8",
        )

        trend_products = [item["product"] for item in gainers[:6]] + [
            item["product"] for item in losers[:6]
        ]
        unique_trend_products = list(dict.fromkeys(trend_products))
        trends = {}
        for product in unique_trend_products:
            history = conn.execute(
                """
                SELECT ref_date, value
                FROM source_prices
                WHERE geo = ? AND product = ?
                ORDER BY ref_date ASC
                """,
                (geo, product),
            ).fetchall()
            trends[product] = [
                {"REF_DATE": point[0], "VALUE": point[1]} for point in history[-12:]
            ]

        (region_dir / "product-trends.json").write_text(
            json.dumps(
                {
                    "geo": geo,
                    "trends": trends,
                    "count": len(trends),
                    "months": 12,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        geo_prices_dir = prices_dir / geo_slug
        geo_prices_dir.mkdir(parents=True, exist_ok=True)
        for product in products:
            rows = conn.execute(
                """
                SELECT ref_date, geo, product, vector, value
                FROM source_prices
                WHERE geo = ? AND product = ?
                ORDER BY ref_date ASC
                """,
                (geo, product),
            ).fetchall()
            if not rows:
                continue
            payload = [
                {
                    "REF_DATE": row[0],
                    "GEO": row[1],
                    "Products": row[2],
                    "VECTOR": row[3],
                    "VALUE": row[4],
                }
                for row in rows
            ]
            (geo_prices_dir / f"{slugify(product)}.json").write_text(
                json.dumps(payload, indent=2),
                encoding="utf-8",
            )

    manifest = {
        "generatedAt": datetime.now(UTC).replace(tzinfo=None).isoformat(),
        "regions": geos,
        "products": products,
        "regionSlugs": {geo: slugify(geo) for geo in geos},
        "productSlugs": {product: slugify(product) for product in products},
    }
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return {
        "regions": len(geos),
        "products": len(products),
        "outputDir": str(root),
    }
