#!/usr/bin/env python3
"""
Fetch Dune data using Analyst tier API.
Creates queries, executes them, and saves results.
"""

import os
import sys
import time
import json
import csv
import requests
from pathlib import Path

API_KEY = "HJYpLlltN8HtJmklFnAaMx8QX24m5P98"
BASE_URL = "https://api.dune.com/api/v1"
HEADERS = {
    "X-Dune-API-Key": API_KEY,
    "Content-Type": "application/json"
}

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "dune"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# SQL for each exhibit
EXHIBIT_A_SQL = """
-- Exhibit A: Gateway Corridor Flows
WITH gateway_addresses AS (
    SELECT address, name, tier FROM (VALUES
        (0x55fe002aeff02f77364de339a1292923a15844b8, 'Circle', 'Tier1'),
        (0x5f65f7b609678448494De4C87521CdF6cEf1e932, 'Paxos', 'Tier1'),
        (0x71660c4005ba85c37ccec55d0c4493e66fe775d3, 'Coinbase', 'Tier1'),
        (0x21a31ee1afc51d94c2efccaa2092ad1028285549, 'Gemini', 'Tier1'),
        (0x5754284f345afc66a98fbb0a0afe71e0f007b949, 'Tether Treasury', 'Tier2'),
        (0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503, 'Binance', 'Tier2'),
        (0xda9dfa130df4de4673b89022ee50ff26f6ea73cf, 'Kraken', 'Tier2'),
        (0x6262998ced04146fa42253a5c0af90ca02dfd2a3, 'OKX', 'Tier2'),
        (0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45, 'Uniswap Router', 'Tier3'),
        (0xdef1c0ded9bec7f1a1670819833240f027b25eff, '0x Exchange', 'Tier3'),
        (0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7, 'Curve 3pool', 'Tier3'),
        (0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2, 'Aave V3 Pool', 'Tier3')
    ) AS t(address, name, tier)
),
transfers AS (
    SELECT
        date_trunc('day', evt_block_time) as date,
        COALESCE(gw_from.name, gw_to.name) as gateway,
        COALESCE(gw_from.tier, gw_to.tier) as tier,
        CASE
            WHEN t.contract_address = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 THEN 'USDC'
            ELSE 'USDT'
        END as token,
        CASE WHEN gw_to.address IS NOT NULL THEN CAST(value AS DOUBLE) / 1e6 ELSE 0 END as inflow,
        CASE WHEN gw_from.address IS NOT NULL THEN CAST(value AS DOUBLE) / 1e6 ELSE 0 END as outflow
    FROM erc20_ethereum.evt_Transfer t
    LEFT JOIN gateway_addresses gw_from ON t."from" = gw_from.address
    LEFT JOIN gateway_addresses gw_to ON t."to" = gw_to.address
    WHERE t.contract_address IN (
        0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48,
        0xdac17f958d2ee523a2206206994597c13d831ec7
    )
    AND evt_block_time >= TIMESTAMP '2023-02-01'
    AND evt_block_time < TIMESTAMP '2026-02-01'
    AND (gw_from.address IS NOT NULL OR gw_to.address IS NOT NULL)
)
SELECT
    date,
    gateway,
    tier,
    token,
    SUM(inflow) as inflow_usd,
    SUM(outflow) as outflow_usd,
    SUM(inflow) - SUM(outflow) as net_flow_usd
FROM transfers
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 4
"""

EXHIBIT_C_SQL = """
-- Exhibit C: Gateway Concentration (HHI)
WITH gateway_addresses AS (
    SELECT address, name, tier FROM (VALUES
        (0x55fe002aeff02f77364de339a1292923a15844b8, 'Circle', 'Tier1'),
        (0x5f65f7b609678448494De4C87521CdF6cEf1e932, 'Paxos', 'Tier1'),
        (0x71660c4005ba85c37ccec55d0c4493e66fe775d3, 'Coinbase', 'Tier1'),
        (0x21a31ee1afc51d94c2efccaa2092ad1028285549, 'Gemini', 'Tier1'),
        (0x5754284f345afc66a98fbb0a0afe71e0f007b949, 'Tether Treasury', 'Tier2'),
        (0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503, 'Binance', 'Tier2'),
        (0xda9dfa130df4de4673b89022ee50ff26f6ea73cf, 'Kraken', 'Tier2'),
        (0x6262998ced04146fa42253a5c0af90ca02dfd2a3, 'OKX', 'Tier2'),
        (0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45, 'Uniswap Router', 'Tier3'),
        (0xdef1c0ded9bec7f1a1670819833240f027b25eff, '0x Exchange', 'Tier3'),
        (0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7, 'Curve 3pool', 'Tier3'),
        (0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2, 'Aave V3 Pool', 'Tier3')
    ) AS t(address, name, tier)
),
stablecoin_transfers AS (
    SELECT
        date_trunc('day', evt_block_time) as date,
        COALESCE(gw_from.tier, gw_to.tier) as tier,
        CAST(value AS DOUBLE) / 1e6 as amount_usd
    FROM erc20_ethereum.evt_Transfer t
    LEFT JOIN gateway_addresses gw_from ON t."from" = gw_from.address
    LEFT JOIN gateway_addresses gw_to ON t."to" = gw_to.address
    WHERE t.contract_address IN (
        0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48,
        0xdac17f958d2ee523a2206206994597c13d831ec7
    )
    AND evt_block_time >= TIMESTAMP '2023-02-01'
    AND evt_block_time < TIMESTAMP '2026-02-01'
    AND (gw_from.address IS NOT NULL OR gw_to.address IS NOT NULL)
),
tier_volumes AS (
    SELECT date, tier, SUM(amount_usd) as volume_usd
    FROM stablecoin_transfers
    GROUP BY 1, 2
),
daily_totals AS (
    SELECT date, SUM(volume_usd) as total_volume
    FROM tier_volumes
    GROUP BY 1
)
SELECT
    tv.date,
    tv.tier,
    tv.volume_usd,
    ROUND(100.0 * tv.volume_usd / dt.total_volume, 2) as share_pct,
    ROUND(POWER(100.0 * tv.volume_usd / dt.total_volume, 2), 2) as hhi_component
FROM tier_volumes tv
JOIN daily_totals dt ON tv.date = dt.date
WHERE dt.total_volume > 0
ORDER BY tv.date, tv.tier
"""

EXHIBIT_E_SQL = """
-- Exhibit E: Aave V3 Stablecoin Liquidations
SELECT
    date_trunc('day', evt_block_time) as date,
    CASE
        WHEN collateralAsset = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 THEN 'USDC'
        WHEN collateralAsset = 0xdac17f958d2ee523a2206206994597c13d831ec7 THEN 'USDT'
        WHEN collateralAsset = 0x6b175474e89094c44da98b954eedeac495271d0f THEN 'DAI'
        ELSE 'Other'
    END as collateral_token,
    SUM(liquidatedCollateralAmount / 1e6) as liquidation_usd,
    COUNT(*) as liquidation_count
FROM aave_v3_ethereum.Pool_evt_LiquidationCall
WHERE evt_block_time >= TIMESTAMP '2023-02-01'
    AND evt_block_time < TIMESTAMP '2026-02-01'
    AND collateralAsset IN (
        0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48,
        0xdac17f958d2ee523a2206206994597c13d831ec7,
        0x6b175474e89094c44da98b954eedeac495271d0f
    )
GROUP BY 1, 2
ORDER BY 1, 2
"""

QUERIES = [
    ("exhibit_A_gateway_transfers", "Fed Paper - Exhibit A Gateway Transfers", EXHIBIT_A_SQL),
    ("exhibit_C_gateway_concentration", "Fed Paper - Exhibit C Gateway Concentration", EXHIBIT_C_SQL),
    ("exhibit_E_aave_liquidations", "Fed Paper - Exhibit E Aave Liquidations", EXHIBIT_E_SQL),
]


def create_query(name: str, sql: str) -> int:
    """Create a query in Dune and return query_id."""
    print(f"  Creating query: {name}")

    response = requests.post(
        f"{BASE_URL}/query",
        headers=HEADERS,
        json={
            "name": name,
            "query_sql": sql,
            "is_private": False
        }
    )

    if response.status_code != 200:
        print(f"  Error creating query: {response.text}")
        raise Exception(f"Failed to create query: {response.text}")

    data = response.json()
    query_id = data.get("query_id")
    print(f"  Created query ID: {query_id}")
    return query_id


def execute_query(query_id: int) -> str:
    """Execute a query and return execution_id."""
    print(f"  Executing query {query_id}...")

    response = requests.post(
        f"{BASE_URL}/query/{query_id}/execute",
        headers=HEADERS
    )

    if response.status_code != 200:
        print(f"  Error executing query: {response.text}")
        raise Exception(f"Failed to execute query: {response.text}")

    data = response.json()
    execution_id = data.get("execution_id")
    print(f"  Execution ID: {execution_id}")
    return execution_id


def wait_for_results(execution_id: str, max_wait: int = 600) -> dict:
    """Poll for query results."""
    print(f"  Waiting for results...")

    start_time = time.time()
    while time.time() - start_time < max_wait:
        response = requests.get(
            f"{BASE_URL}/execution/{execution_id}/status",
            headers=HEADERS
        )

        if response.status_code != 200:
            print(f"  Error checking status: {response.text}")
            time.sleep(5)
            continue

        data = response.json()
        state = data.get("state", "UNKNOWN")

        if state == "QUERY_STATE_COMPLETED":
            print(f"  Query completed!")
            # Fetch results
            results_response = requests.get(
                f"{BASE_URL}/execution/{execution_id}/results",
                headers=HEADERS
            )
            return results_response.json()

        elif state in ["QUERY_STATE_FAILED", "QUERY_STATE_CANCELLED"]:
            error = data.get("error", "Unknown error")
            raise Exception(f"Query failed: {error}")

        elapsed = int(time.time() - start_time)
        print(f"  Status: {state} (elapsed: {elapsed}s)")
        time.sleep(10)

    raise TimeoutError("Query execution timed out")


def save_results(filename: str, data: dict):
    """Save results to CSV."""
    rows = data.get("result", {}).get("rows", [])

    if not rows:
        print(f"  Warning: No rows returned")
        return

    csv_path = OUTPUT_DIR / f"{filename}.csv"
    columns = list(rows[0].keys())

    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)

    print(f"  Saved {len(rows)} rows to {csv_path}")

    # Also save JSON
    json_path = OUTPUT_DIR / f"{filename}.json"
    with open(json_path, "w") as f:
        json.dump(data, f, indent=2, default=str)


def main():
    print("=" * 60)
    print("Dune Analytics Data Fetcher (Analyst Tier)")
    print("=" * 60)

    results = {}

    for filename, query_name, sql in QUERIES:
        print(f"\n[{filename}]")

        try:
            # Create query
            query_id = create_query(query_name, sql)

            # Execute query
            execution_id = execute_query(query_id)

            # Wait for results
            data = wait_for_results(execution_id)

            # Save results
            save_results(filename, data)

            results[filename] = "SUCCESS"

        except Exception as e:
            print(f"  ERROR: {e}")
            results[filename] = f"FAILED: {e}"

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    for name, status in results.items():
        print(f"  {name}: {status}")


if __name__ == "__main__":
    main()
