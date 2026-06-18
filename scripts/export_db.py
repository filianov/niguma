#!/usr/bin/env python3
"""
Export the Niguma SQLite back-office to CSV files (backup / GDPR export).

Usage:
    python3 scripts/export_db.py [path/to/niguma.db] [out_dir]

Defaults: bot/niguma.db -> ./export/<table>.csv
For a single person's GDPR request, grep the exported CSVs by telegram_id,
or run the bot's /delete flow for erasure.
"""
import csv
import sqlite3
import sys
from pathlib import Path

DB = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("bot/niguma.db")
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("export")

TABLES = ["lead", "member", "subscription", "payment", "practice_log", "seed_log", "message_log"]


def main() -> None:
    if not DB.exists():
        sys.exit(f"DB not found: {DB}")
    OUT.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    for t in TABLES:
        try:
            rows = con.execute(f"SELECT * FROM {t}").fetchall()
        except sqlite3.OperationalError:
            continue
        path = OUT / f"{t}.csv"
        with open(path, "w", newline="", encoding="utf-8") as f:
            if rows:
                w = csv.DictWriter(f, fieldnames=rows[0].keys())
                w.writeheader()
                w.writerows([dict(r) for r in rows])
        print(f"{t:14} -> {path} ({len(rows)} rows)")
    con.close()
    print(f"\nDone. Exported to {OUT.resolve()}")


if __name__ == "__main__":
    main()
