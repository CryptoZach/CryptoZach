#!/usr/bin/env python3
"""Fetch on-chain stablecoin analytics from Dune Analytics API.

Requires DUNE_API_KEY environment variable. If not set, the script
writes stub CSVs so the pipeline can still produce exhibits from
FRED + DefiLlama data alone.
"""

import argparse
import json
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
PROC_DIR = ROOT / "data" / "processed"


def load_config():
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def execute_query(api_key: str, query_id: int, timeout: int = 300) -> dict:
    """Execute a Dune query and poll for results."""
    headers = {"X-DUNE-API-KEY": api_key}
    base = "https://api.dune.com/api/v1"

    # Execute
    print(f"    Executing query {query_id}...")
    resp = requests.post(f"{base}/query/{query_id}/execute", headers=headers, timeout=30)
    resp.raise_for_status()
    execution_id = resp.json()["execution_id"]

    # Poll for completion
    elapsed = 0
    poll_interval = 5
    while elapsed < timeout:
        time.sleep(poll_interval)
        elapsed += poll_interval
        status_resp = requests.get(
            f"{base}/execution/{execution_id}/status", headers=headers, timeout=30
        )
        status_resp.raise_for_status()
        state = status_resp.json().get("state", "")
        if state == "QUERY_STATE_COMPLETED":
            break
        if state == "QUERY_STATE_FAILED":
            raise RuntimeError(f"Query {query_id} failed")
        print(f"    ... waiting ({elapsed}s, state={state})")
    else:
        raise TimeoutError(f"Query {query_id} timed out after {timeout}s")

    # Fetch results
    results_resp = requests.get(
        f"{base}/execution/{execution_id}/results", headers=headers, timeout=60
    )
    results_resp.raise_for_status()
    return results_resp.json()


def fetch_query(api_key: str, query_name: str, query_id: int, timeout: int) -> pd.DataFrame:
    """Fetch a single Dune query and return as DataFrame."""
    try:
        result = execute_query(api_key, query_id, timeout)
        rows = result.get("result", {}).get("rows", [])
        raw_path = RAW_DIR / f"dune_{query_name}.json"
        raw_path.write_text(json.dumps(result, indent=2))
        df = pd.DataFrame(rows)
        print(f"  ✓ {query_name}: {len(df)} rows")
        return df
    except Exception as exc:
        print(f"  ✗ {query_name} (query_id={query_id}) failed: {exc}")
        return pd.DataFrame()


def write_stub_csvs():
    """Write empty stub CSVs so the pipeline can proceed without Dune data."""
    PROC_DIR.mkdir(parents=True, exist_ok=True)
    stub_path = PROC_DIR / "dune_stablecoin_volumes.csv"
    if not stub_path.exists():
        pd.DataFrame(columns=["date", "transfer_volume_usd", "dex_volume_usd"]).to_csv(
            stub_path, index=False
        )
        print(f"  Wrote stub: {stub_path}")


def main():
    parser = argparse.ArgumentParser(description="Fetch Dune Analytics stablecoin queries")
    parser.add_argument("--all", action="store_true", help="Run all configured queries")
    parser.add_argument("--timeout", type=int, default=300, help="Per-query timeout in seconds")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROC_DIR.mkdir(parents=True, exist_ok=True)

    api_key = os.environ.get("DUNE_API_KEY", "")
    if not api_key:
        print("WARNING: DUNE_API_KEY not set. Writing stub CSVs for pipeline compatibility.")
        write_stub_csvs()
        print("Dune step skipped (no API key). Pipeline will use FRED + DefiLlama data only.")
        return

    cfg = load_config()
    queries = cfg["dune"]["queries"]

    all_frames = {}
    for qname, qcfg in queries.items():
        qid = qcfg["query_id"]
        print(f"  [{qcfg['name']}]")
        df = fetch_query(api_key, qname, qid, args.timeout)
        if not df.empty:
            all_frames[qname] = df
        time.sleep(1)

    if not all_frames:
        print("WARNING: No Dune data retrieved. Writing stubs.")
        write_stub_csvs()
        return

    # Save individual query results
    for qname, df in all_frames.items():
        out = PROC_DIR / f"dune_{qname}.csv"
        df.to_csv(out, index=False)
        print(f"  Saved {out}")

    # Try to build a combined volume dataset
    vol_df = all_frames.get("stablecoin_transfer_volume")
    if vol_df is not None and not vol_df.empty:
        out = PROC_DIR / "dune_stablecoin_volumes.csv"
        vol_df.to_csv(out, index=False)
        print(f"  Combined volume data saved to {out}")
    else:
        write_stub_csvs()

    print("\nDune data fetch complete.")


if __name__ == "__main__":
    main()
