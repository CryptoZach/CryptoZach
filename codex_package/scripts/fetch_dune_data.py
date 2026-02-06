#!/usr/bin/env python3
"""
Dune Analytics Data Fetcher for Fed Paper Exhibits

This script fetches on-chain data from Dune Analytics for exhibits A, C, and E.
Requires a Dune API key (free tier works for executing existing queries).

Usage:
    python fetch_dune_data.py --api-key YOUR_API_KEY

    Or set environment variable:
    export DUNE_API_KEY=YOUR_API_KEY
    python fetch_dune_data.py
"""

import os
import sys
import time
import json
import argparse
import requests
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

# Dune API endpoints
DUNE_API_BASE = "https://api.dune.com/api/v1"

# Output directory
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "dune"


class DuneClient:
    """Simple Dune Analytics API client."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "X-Dune-API-Key": api_key,
            "Content-Type": "application/json"
        }

    def execute_query(self, query_id: int, parameters: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Execute a Dune query and wait for results.

        Args:
            query_id: The Dune query ID to execute
            parameters: Optional query parameters

        Returns:
            Query results as dict with 'rows' and 'metadata'
        """
        # Step 1: Trigger execution
        print(f"  Executing query {query_id}...")
        execute_url = f"{DUNE_API_BASE}/query/{query_id}/execute"

        payload = {}
        if parameters:
            payload["query_parameters"] = parameters

        response = requests.post(execute_url, headers=self.headers, json=payload)

        if response.status_code == 404:
            raise ValueError(f"Query {query_id} not found. Make sure the query exists and is public.")

        response.raise_for_status()
        execution_id = response.json()["execution_id"]
        print(f"  Execution ID: {execution_id}")

        # Step 2: Poll for completion
        status_url = f"{DUNE_API_BASE}/execution/{execution_id}/status"
        results_url = f"{DUNE_API_BASE}/execution/{execution_id}/results"

        max_attempts = 60  # 5 minutes max
        attempt = 0

        while attempt < max_attempts:
            status_response = requests.get(status_url, headers=self.headers)
            status_response.raise_for_status()
            status_data = status_response.json()

            state = status_data.get("state", "UNKNOWN")
            print(f"  Status: {state} (attempt {attempt + 1}/{max_attempts})")

            if state == "QUERY_STATE_COMPLETED":
                break
            elif state in ["QUERY_STATE_FAILED", "QUERY_STATE_CANCELLED"]:
                error = status_data.get("error", "Unknown error")
                raise RuntimeError(f"Query execution failed: {error}")

            time.sleep(5)  # Wait 5 seconds between polls
            attempt += 1

        if attempt >= max_attempts:
            raise TimeoutError("Query execution timed out after 5 minutes")

        # Step 3: Fetch results
        print(f"  Fetching results...")
        results_response = requests.get(results_url, headers=self.headers)
        results_response.raise_for_status()

        return results_response.json()

    def get_latest_results(self, query_id: int) -> Dict[str, Any]:
        """
        Get the latest cached results for a query (faster, no execution).

        Args:
            query_id: The Dune query ID

        Returns:
            Query results as dict
        """
        url = f"{DUNE_API_BASE}/query/{query_id}/results"
        response = requests.get(url, headers=self.headers)

        if response.status_code == 404:
            raise ValueError(f"Query {query_id} not found or has no cached results.")

        response.raise_for_status()
        return response.json()


def save_results(data: Dict[str, Any], filename: str, output_dir: Path) -> Path:
    """Save query results to CSV and JSON."""
    import csv

    output_dir.mkdir(parents=True, exist_ok=True)

    rows = data.get("result", {}).get("rows", [])
    metadata = data.get("result", {}).get("metadata", {})

    if not rows:
        print(f"  Warning: No rows returned for {filename}")
        return None

    # Save JSON (full response)
    json_path = output_dir / f"{filename}.json"
    with open(json_path, "w") as f:
        json.dump(data, f, indent=2, default=str)

    # Save CSV
    csv_path = output_dir / f"{filename}.csv"
    columns = metadata.get("column_names", list(rows[0].keys()) if rows else [])

    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)

    print(f"  Saved {len(rows)} rows to {csv_path}")
    return csv_path


# ============================================================================
# QUERY DEFINITIONS
# ============================================================================
#
# IMPORTANT: These query IDs must be created first in Dune's web interface.
# See DUNE_SETUP_GUIDE.md for instructions on creating these queries.
#
# After creating the queries, update the IDs below:

QUERIES = {
    "exhibit_A_gateway_transfers": {
        "query_id": None,  # UPDATE THIS after creating query in Dune
        "description": "Gateway corridor flows (USDC/USDT transfers by tier)",
        "sql_file": "exhibit_A_gateway_transfers.sql"
    },
    "exhibit_C_gateway_concentration": {
        "query_id": None,  # UPDATE THIS after creating query in Dune
        "description": "Gateway concentration metrics (HHI)",
        "sql_file": "exhibit_C_gateway_daily_volume.sql"
    },
    "exhibit_E_aave_liquidations": {
        "query_id": None,  # UPDATE THIS after creating query in Dune
        "description": "Aave V3 stablecoin collateral liquidations",
        "sql_file": "exhibit_E_aave_liquidations.sql"
    }
}


def fetch_all_exhibits(client: DuneClient, use_cache: bool = False) -> Dict[str, Path]:
    """
    Fetch all exhibit data from Dune.

    Args:
        client: DuneClient instance
        use_cache: If True, use cached results instead of executing

    Returns:
        Dict mapping exhibit names to output file paths
    """
    results = {}

    for name, config in QUERIES.items():
        query_id = config["query_id"]

        if query_id is None:
            print(f"\n[SKIP] {name}: Query ID not configured")
            print(f"       Create query using: sql/dune/{config['sql_file']}")
            print(f"       Then update QUERIES['{name}']['query_id'] in this script")
            continue

        print(f"\n[{name}]")
        print(f"  Description: {config['description']}")

        try:
            if use_cache:
                data = client.get_latest_results(query_id)
            else:
                data = client.execute_query(query_id)

            output_path = save_results(data, name, OUTPUT_DIR)
            if output_path:
                results[name] = output_path

        except ValueError as e:
            print(f"  Error: {e}")
        except Exception as e:
            print(f"  Error: {e}")

    return results


def validate_api_key(client: DuneClient) -> bool:
    """Test API key validity by fetching a known public query."""
    try:
        # Query 4 is a simple public test query
        response = requests.get(
            f"{DUNE_API_BASE}/query/4/results",
            headers=client.headers
        )
        if response.status_code == 200:
            print("API key validated successfully")
            return True
        elif response.status_code == 401:
            print("Error: Invalid API key")
            return False
        else:
            print(f"Warning: Unexpected status {response.status_code}")
            return True  # Proceed anyway
    except Exception as e:
        print(f"Warning: Could not validate API key: {e}")
        return True  # Proceed anyway


def main():
    parser = argparse.ArgumentParser(
        description="Fetch Dune Analytics data for Fed Paper exhibits"
    )
    parser.add_argument(
        "--api-key", "-k",
        default=os.environ.get("DUNE_API_KEY"),
        help="Dune API key (or set DUNE_API_KEY env var)"
    )
    parser.add_argument(
        "--cache", "-c",
        action="store_true",
        help="Use cached results instead of executing queries"
    )
    parser.add_argument(
        "--query", "-q",
        choices=list(QUERIES.keys()),
        help="Fetch only a specific exhibit"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test API key and exit"
    )

    args = parser.parse_args()

    if not args.api_key:
        print("Error: Dune API key required")
        print("  Set DUNE_API_KEY environment variable, or")
        print("  Pass --api-key YOUR_KEY")
        print("\nGet your API key at: https://dune.com/settings/api")
        sys.exit(1)

    client = DuneClient(args.api_key)

    if args.test:
        if validate_api_key(client):
            print("\nAPI key is valid. Ready to fetch data.")
            print("\nNext steps:")
            print("1. Create queries in Dune web UI using SQL files in sql/dune/")
            print("2. Update query IDs in this script")
            print("3. Run: python fetch_dune_data.py")
        sys.exit(0)

    print("=" * 60)
    print("Dune Analytics Data Fetcher for Fed Paper")
    print("=" * 60)

    if not validate_api_key(client):
        sys.exit(1)

    if args.query:
        # Fetch single exhibit
        config = QUERIES[args.query]
        if config["query_id"] is None:
            print(f"\nError: Query ID not configured for {args.query}")
            print(f"Create query using: sql/dune/{config['sql_file']}")
            sys.exit(1)

        print(f"\nFetching {args.query}...")
        try:
            if args.cache:
                data = client.get_latest_results(config["query_id"])
            else:
                data = client.execute_query(config["query_id"])
            save_results(data, args.query, OUTPUT_DIR)
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
    else:
        # Fetch all exhibits
        results = fetch_all_exhibits(client, use_cache=args.cache)

        print("\n" + "=" * 60)
        print("Summary")
        print("=" * 60)

        if results:
            print(f"\nSuccessfully fetched {len(results)} exhibits:")
            for name, path in results.items():
                print(f"  - {name}: {path}")
        else:
            print("\nNo exhibits fetched. See errors above.")
            print("\nMake sure to:")
            print("1. Create queries in Dune web UI")
            print("2. Update query IDs in this script")


if __name__ == "__main__":
    main()
