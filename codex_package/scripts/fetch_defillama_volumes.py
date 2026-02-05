#!/usr/bin/env python3
"""Fetch DEX volumes, bridge flows, and Curve stablecoin data from DefiLlama.

This replaces the Dune Analytics fetch for on-chain volume data.
All endpoints are free and require no API key.
"""

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
PROC_DIR = ROOT / "data" / "processed"

ENDPOINTS = {
    "dex_volumes": {
        "url": "https://api.llama.fi/overview/dexs",
        "description": "Total DEX trading volume (all chains)",
    },
    "curve_dex": {
        "url": "https://api.llama.fi/summary/dexs/curve-dex",
        "description": "Curve DEX volume (stablecoin-focused)",
    },
    "bridge_volumes": {
        "url": "https://bridges.llama.fi/bridgevolume/all",
        "description": "Cross-chain bridge volumes",
    },
    "eth_stablecoin_flows": {
        "url": "https://stablecoins.llama.fi/stablecoincharts/ethereum",
        "description": "Ethereum stablecoin minting/bridging",
    },
}


def ts_to_date(ts):
    """Convert Unix timestamp to date string."""
    return datetime.utcfromtimestamp(int(ts)).strftime("%Y-%m-%d")


def fetch_dex_volumes(start_ts: int, end_ts: int) -> pd.DataFrame:
    """Fetch overall DEX trading volume."""
    print("  Fetching DEX volumes...")
    try:
        resp = requests.get(ENDPOINTS["dex_volumes"]["url"], timeout=60)
        resp.raise_for_status()
        data = resp.json()

        # Save raw data
        raw_path = RAW_DIR / "defillama_dex_volumes.json"
        raw_path.write_text(json.dumps(data, indent=2))

        # Parse totalDataChart: [[timestamp, volume], ...]
        chart = data.get("totalDataChart", [])
        rows = []
        for entry in chart:
            ts, vol = entry[0], entry[1]
            if start_ts <= ts <= end_ts:
                rows.append({"date": ts_to_date(ts), "dex_volume_usd": vol})

        df = pd.DataFrame(rows)
        print(f"  ✓ DEX volumes: {len(df)} data points")
        return df
    except Exception as e:
        print(f"  ✗ DEX volumes failed: {e}")
        return pd.DataFrame()


def fetch_curve_volumes(start_ts: int, end_ts: int) -> pd.DataFrame:
    """Fetch Curve DEX volume (stablecoin-focused)."""
    print("  Fetching Curve DEX volumes...")
    try:
        resp = requests.get(ENDPOINTS["curve_dex"]["url"], timeout=60)
        resp.raise_for_status()
        data = resp.json()

        raw_path = RAW_DIR / "defillama_curve_dex.json"
        raw_path.write_text(json.dumps(data, indent=2))

        chart = data.get("totalDataChart", [])
        rows = []
        for entry in chart:
            ts, vol = entry[0], entry[1]
            if start_ts <= ts <= end_ts:
                rows.append({"date": ts_to_date(ts), "curve_volume_usd": vol})

        df = pd.DataFrame(rows)
        print(f"  ✓ Curve DEX: {len(df)} data points")
        return df
    except Exception as e:
        print(f"  ✗ Curve DEX failed: {e}")
        return pd.DataFrame()


def fetch_bridge_volumes(start_ts: int, end_ts: int) -> pd.DataFrame:
    """Fetch cross-chain bridge volumes."""
    print("  Fetching bridge volumes...")
    try:
        resp = requests.get(ENDPOINTS["bridge_volumes"]["url"], timeout=60)
        resp.raise_for_status()
        data = resp.json()

        raw_path = RAW_DIR / "defillama_bridge_volumes.json"
        raw_path.write_text(json.dumps(data, indent=2))

        rows = []
        for entry in data:
            ts = int(entry.get("date", 0))
            if start_ts <= ts <= end_ts:
                rows.append({
                    "date": ts_to_date(ts),
                    "bridge_deposit_usd": entry.get("depositUSD", 0),
                    "bridge_withdraw_usd": entry.get("withdrawUSD", 0),
                    "bridge_net_flow": entry.get("depositUSD", 0) - entry.get("withdrawUSD", 0),
                })

        df = pd.DataFrame(rows)
        print(f"  ✓ Bridge volumes: {len(df)} data points")
        return df
    except Exception as e:
        print(f"  ✗ Bridge volumes failed: {e}")
        return pd.DataFrame()


def fetch_eth_stablecoin_flows(start_ts: int, end_ts: int) -> pd.DataFrame:
    """Fetch Ethereum stablecoin minting and bridging data."""
    print("  Fetching Ethereum stablecoin flows...")
    try:
        resp = requests.get(ENDPOINTS["eth_stablecoin_flows"]["url"], timeout=60)
        resp.raise_for_status()
        data = resp.json()

        raw_path = RAW_DIR / "defillama_eth_stablecoin_flows.json"
        raw_path.write_text(json.dumps(data, indent=2))

        rows = []
        for entry in data:
            ts = int(entry.get("date", 0))
            if start_ts <= ts <= end_ts:
                circ = entry.get("totalCirculatingUSD", {})
                minted = entry.get("totalMintedUSD", {})
                bridged = entry.get("totalBridgedToUSD", {})
                rows.append({
                    "date": ts_to_date(ts),
                    "eth_stablecoin_supply": circ.get("peggedUSD", 0) if isinstance(circ, dict) else 0,
                    "eth_stablecoin_minted": minted.get("peggedUSD", 0) if isinstance(minted, dict) else 0,
                    "eth_stablecoin_bridged": bridged.get("peggedUSD", 0) if isinstance(bridged, dict) else 0,
                })

        df = pd.DataFrame(rows)
        print(f"  ✓ ETH stablecoin flows: {len(df)} data points")
        return df
    except Exception as e:
        print(f"  ✗ ETH stablecoin flows failed: {e}")
        return pd.DataFrame()


def main():
    parser = argparse.ArgumentParser(description="Fetch DefiLlama volume data")
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", required=True, help="End date YYYY-MM-DD")
    args = parser.parse_args()

    # Convert dates to timestamps
    start_ts = int(datetime.strptime(args.start, "%Y-%m-%d").timestamp())
    end_ts = int(datetime.strptime(args.end, "%Y-%m-%d").timestamp()) + 86400  # Include end date

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROC_DIR.mkdir(parents=True, exist_ok=True)

    print("Fetching DefiLlama volume data...")

    # Fetch all data sources
    dex_df = fetch_dex_volumes(start_ts, end_ts)
    time.sleep(0.5)
    curve_df = fetch_curve_volumes(start_ts, end_ts)
    time.sleep(0.5)
    bridge_df = fetch_bridge_volumes(start_ts, end_ts)
    time.sleep(0.5)
    eth_flows_df = fetch_eth_stablecoin_flows(start_ts, end_ts)

    # Merge all dataframes on date
    merged = None
    for df in [dex_df, curve_df, bridge_df, eth_flows_df]:
        if df.empty:
            continue
        if merged is None:
            merged = df
        else:
            merged = pd.merge(merged, df, on="date", how="outer")

    if merged is None or merged.empty:
        print("\nERROR: No volume data fetched.")
        sys.exit(1)

    merged.sort_values("date", inplace=True)
    merged["date"] = pd.to_datetime(merged["date"])

    out_path = PROC_DIR / "defillama_volumes.csv"
    merged.to_csv(out_path, index=False)
    print(f"\nDefiLlama volume data saved to {out_path}")
    print(f"  Rows: {len(merged)}")
    print(f"  Columns: {list(merged.columns)}")
    print(f"  Date range: {merged['date'].min().date()} to {merged['date'].max().date()}")


if __name__ == "__main__":
    main()
