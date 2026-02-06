#!/usr/bin/env python3
"""Fetch macro time-series CSVs from FRED's public graph-export endpoint."""

import argparse
import os
import sys
import time
from pathlib import Path

import pandas as pd
import requests
import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config" / "settings.yaml"
RAW_DIR = ROOT / "data" / "raw"


def load_config():
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def fetch_series(series_id: str, start: str, end: str, retries: int = 3) -> pd.DataFrame:
    """Download a single FRED series as CSV."""
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv"
    params = {"id": series_id, "cosd": start, "coed": end}
    for attempt in range(retries):
        try:
            print(f"  Fetching {series_id} (attempt {attempt + 1})...")
            resp = requests.get(url, params=params, timeout=30)
            resp.raise_for_status()
            # Write raw CSV
            out_path = RAW_DIR / f"fred_{series_id}.csv"
            out_path.write_text(resp.text)
            # Parse into DataFrame
            df = pd.read_csv(out_path)
            # FRED uses "observation_date" as the date column
            date_col = "observation_date" if "observation_date" in df.columns else "DATE"
            df[date_col] = pd.to_datetime(df[date_col])
            df.rename(columns={date_col: "date", series_id: series_id.lower()}, inplace=True)
            # FRED uses "." for missing values
            df.replace(".", pd.NA, inplace=True)
            for col in df.columns:
                if col != "date":
                    df[col] = pd.to_numeric(df[col], errors="coerce")
            print(f"  ✓ {series_id}: {len(df)} rows")
            return df
        except Exception as exc:
            print(f"  ✗ {series_id} attempt {attempt + 1} failed: {exc}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    print(f"  ✗ {series_id}: all retries exhausted, returning empty DataFrame")
    return pd.DataFrame()


def main():
    parser = argparse.ArgumentParser(description="Fetch FRED graph CSVs")
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", required=True, help="End date YYYY-MM-DD")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)

    cfg = load_config()
    series_list = cfg["fred"]["series"]

    frames = {}
    for s in series_list:
        sid = s["id"]
        df = fetch_series(sid, args.start, args.end)
        if not df.empty:
            frames[sid] = df
        time.sleep(0.5)  # be polite to FRED

    if not frames:
        print("ERROR: No FRED data fetched.")
        sys.exit(1)

    # Merge all series on date
    merged = None
    for sid, df in frames.items():
        if merged is None:
            merged = df
        else:
            merged = pd.merge(merged, df, on="date", how="outer")
    merged.sort_values("date", inplace=True)

    out_path = ROOT / "data" / "processed" / "fred_macro.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(out_path, index=False)
    print(f"\nMerged FRED data saved to {out_path} ({len(merged)} rows)")


if __name__ == "__main__":
    main()
