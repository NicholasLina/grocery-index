#!/usr/bin/env python3
"""
Import StatCan data into SQLite and export static JSON for Vercel.

This is a convenience wrapper around the shared SQLite pipeline.
Prefer `python import-statcan-data.py` (defaults to SQLite).
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from storage.pipeline import run_sqlite_import  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(run_sqlite_import())
