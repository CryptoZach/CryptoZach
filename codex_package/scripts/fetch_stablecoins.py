#!/usr/bin/env python3
"""Fetch stablecoin market-cap time series from the DefiLlama API."""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
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


def ts_to_date(ts):
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def fetch_stablecoin_chart(token_id: str, name: str, start_ts: int, end_ts: int,
                           retries: int = 3) -> pd.DataFrame:
    """Fetch historical market-cap data for a single stablecoin from DefiLlama."""
    url = f"https://stablecoins.llama.fi/stablecoincharts/all?stablecoin={token_id}"
    for attempt in range(retries):
        try:
            print(f"  Fetching {name} (id={token_id}, attempt {attempt + 1})...")
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            # Save raw JSON
            raw_path = RAW_DIR / f"stablecoin_{name.lower()}.json"
            raw_path.write_text(json.dumps(data, indent=2))

            rows = []
            for entry in data:
                ts = int(entry.get("date", 0))
                if ts < start_ts or ts > end_ts:
                    continue
                circ = entry.get("totalCirculating", {})
                mcap = circ.get("peggedUSD", 0) if isinstance(circ, dict) else 0
                rows.append({
                    "date": ts_to_date(ts),
                    f"{name.lower()}_mcap": mcap,
                })
            df = pd.DataFrame(rows)
            if not df.empty:
                df["date"] = pd.to_datetime(df["date"])
            print(f"  ✓ {name}: {len(df)} data points")
            return df
        except Exception as exc:
            print(f"  ✗ {name} attempt {attempt + 1} failed: {exc}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    print(f"  ✗ {name}: all retries exhausted")
    return pd.DataFrame()


def fetch_all_stablecoins_summary(retries: int = 3) -> pd.DataFrame:
    """Fetch aggregate stablecoin chart (all stablecoins combined)."""
    url = "https://stablecoins.llama.fi/stablecoincharts/all"
    for attempt in range(retries):
        try:
            print("  Fetching aggregate stablecoin supply...")
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            raw_path = RAW_DIR / "stablecoin_aggregate.json"
            raw_path.write_text(json.dumps(data, indent=2))
            rows = []
            for entry in data:
                ts = int(entry.get("date", 0))
                circ = entry.get("totalCirculating", {})
                mcap = circ.get("peggedUSD", 0) if isinstance(circ, dict) else 0
                rows.append({"date": ts_to_date(ts), "total_stablecoin_mcap": mcap})
            df = pd.DataFrame(rows)
            if not df.empty:
                df["date"] = pd.to_datetime(df["date"])
            print(f"  ✓ Aggregate: {len(df)} data points")
            return df
        except Exception as exc:
            print(f"  ✗ Aggregate attempt {attempt + 1} failed: {exc}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    return pd.DataFrame()


def main():
    parser = argparse.ArgumentParser(description="Fetch stablecoin data from DefiLlama")
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", required=True, help="End date YYYY-MM-DD")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)

    start_dt = datetime.strptime(args.start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_dt = datetime.strptime(args.end, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    start_ts = int(start_dt.timestamp())
    end_ts = int(end_dt.timestamp())

    cfg = load_config()
    tokens = cfg["stablecoins"]["tokens"]

    # Fetch aggregate
    agg_df = fetch_all_stablecoins_summary()
    if not agg_df.empty:
        agg_df = agg_df[(agg_df["date"] >= args.start) & (agg_df["date"] <= args.end)]

    # Fetch individual stablecoins
    frames = {}
    for token in tokens:
        tid, name = token["id"], token["name"]
        df = fetch_stablecoin_chart(tid, name, start_ts, end_ts)
        if not df.empty:
            frames[name] = df
        time.sleep(0.3)

    if not frames and agg_df.empty:
        print("ERROR: No stablecoin data fetched.")
        sys.exit(1)

    # Merge all on date
    merged = agg_df if not agg_df.empty else None
    for name, df in frames.items():
        if merged is None:
            merged = df
        else:
            merged = pd.merge(merged, df, on="date", how="outer")
    merged.sort_values("date", inplace=True)

    out_path = ROOT / "data" / "processed" / "stablecoins.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(out_path, index=False)
    print(f"\nStablecoin data saved to {out_path} ({len(merged)} rows)")


if __name__ == "__main__":
    main()
