# Dune Analytics Setup Guide

This guide walks through setting up Dune Analytics to fetch on-chain data for Fed Paper exhibits A, C, and E.

## Overview

**Exhibits requiring Dune data:**
| Exhibit | Description | SQL File |
|---------|-------------|----------|
| A | Gateway corridor flows | `exhibit_A_gateway_transfers.sql` |
| C | Gateway concentration (HHI) | `exhibit_C_gateway_daily_volume.sql` |
| E | Aave liquidations | `exhibit_E_aave_liquidations.sql` |

**Why Dune?** These exhibits require direct blockchain data (ERC-20 transfers, DEX trades, lending protocol events) that DefiLlama doesn't provide at the address level.

---

## Step 1: Get a Dune API Key

1. Go to [dune.com](https://dune.com) and create an account (free tier works)
2. Navigate to **Settings → API** or go directly to: https://dune.com/settings/api
3. Click **Create new API key**
4. Copy and save your API key securely

**Your API key:** `HJYpLlltN8HtJmklFnAaMx8QX24m5P98` (from previous session)

---

## Step 2: Create Queries in Dune Web UI

The free API tier cannot create queries programmatically. You must create them manually in the Dune web interface.

### 2.1 Create Exhibit A Query (Gateway Transfers)

1. Go to https://dune.com/queries
2. Click **New Query**
3. Copy the SQL from `sql/dune/exhibit_A_gateway_transfers.sql`:

```sql
-- Exhibit A: Gateway Corridor Flows
-- Tracks USDC/USDT transfers through major gateway addresses

WITH gateway_addresses AS (
    SELECT address, name, tier FROM (VALUES
        -- Tier 1: Regulated US entities
        (0x55fe002aeff02f77364de339a1292923a15844b8, 'Circle', 'Tier1'),
        (0x5f65f7b609678448494De4C87521CdF6cEf1e932, 'Paxos', 'Tier1'),
        (0x71660c4005ba85c37ccec55d0c4493e66fe775d3, 'Coinbase', 'Tier1'),
        (0x21a31ee1afc51d94c2efccaa2092ad1028285549, 'Gemini', 'Tier1'),

        -- Tier 2: Offshore / less regulated
        (0x5754284f345afc66a98fbb0a0afe71e0f007b949, 'Tether Treasury', 'Tier2'),
        (0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503, 'Binance', 'Tier2'),
        (0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2, 'FTX', 'Tier2'),
        (0xda9dfa130df4de4673b89022ee50ff26f6ea73cf, 'Kraken', 'Tier2'),

        -- Tier 3: DeFi protocols (routers)
        (0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45, 'Uniswap Router', 'Tier3'),
        (0xdef1c0ded9bec7f1a1670819833240f027b25eff, '0x Exchange', 'Tier3'),
        (0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7, 'Curve 3pool', 'Tier3')
    ) AS t(address, name, tier)
),

usdc_transfers AS (
    SELECT
        date_trunc('day', evt_block_time) as date,
        CASE
            WHEN "from" IN (SELECT address FROM gateway_addresses) THEN 'outflow'
            WHEN "to" IN (SELECT address FROM gateway_addresses) THEN 'inflow'
        END as direction,
        COALESCE(gw_from.name, gw_to.name) as gateway,
        COALESCE(gw_from.tier, gw_to.tier) as tier,
        value / 1e6 as amount_usd
    FROM erc20_ethereum.evt_Transfer
    LEFT JOIN gateway_addresses gw_from ON "from" = gw_from.address
    LEFT JOIN gateway_addresses gw_to ON "to" = gw_to.address
    WHERE contract_address = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48  -- USDC
        AND evt_block_time >= DATE '2023-02-01'
        AND evt_block_time < DATE '2026-02-01'
        AND ("from" IN (SELECT address FROM gateway_addresses)
             OR "to" IN (SELECT address FROM gateway_addresses))
),

usdt_transfers AS (
    SELECT
        date_trunc('day', evt_block_time) as date,
        CASE
            WHEN "from" IN (SELECT address FROM gateway_addresses) THEN 'outflow'
            WHEN "to" IN (SELECT address FROM gateway_addresses) THEN 'inflow'
        END as direction,
        COALESCE(gw_from.name, gw_to.name) as gateway,
        COALESCE(gw_from.tier, gw_to.tier) as tier,
        value / 1e6 as amount_usd
    FROM erc20_ethereum.evt_Transfer
    LEFT JOIN gateway_addresses gw_from ON "from" = gw_from.address
    LEFT JOIN gateway_addresses gw_to ON "to" = gw_to.address
    WHERE contract_address = 0xdac17f958d2ee523a2206206994597c13d831ec7  -- USDT
        AND evt_block_time >= DATE '2023-02-01'
        AND evt_block_time < DATE '2026-02-01'
        AND ("from" IN (SELECT address FROM gateway_addresses)
             OR "to" IN (SELECT address FROM gateway_addresses))
)

SELECT
    date,
    gateway,
    tier,
    'USDC' as token,
    SUM(CASE WHEN direction = 'inflow' THEN amount_usd ELSE 0 END) as inflow_usd,
    SUM(CASE WHEN direction = 'outflow' THEN amount_usd ELSE 0 END) as outflow_usd,
    SUM(CASE WHEN direction = 'inflow' THEN amount_usd ELSE -amount_usd END) as net_flow_usd
FROM usdc_transfers
WHERE gateway IS NOT NULL
GROUP BY 1, 2, 3

UNION ALL

SELECT
    date,
    gateway,
    tier,
    'USDT' as token,
    SUM(CASE WHEN direction = 'inflow' THEN amount_usd ELSE 0 END) as inflow_usd,
    SUM(CASE WHEN direction = 'outflow' THEN amount_usd ELSE 0 END) as outflow_usd,
    SUM(CASE WHEN direction = 'inflow' THEN amount_usd ELSE -amount_usd END) as net_flow_usd
FROM usdt_transfers
WHERE gateway IS NOT NULL
GROUP BY 1, 2, 3

ORDER BY 1, 2, 4
```

4. Click **Run** to test the query
5. Click **Save** → Name it: `Fed Paper - Exhibit A Gateway Transfers`
6. Make sure visibility is set to **Public**
7. **Copy the query ID** from the URL (e.g., `https://dune.com/queries/1234567` → ID is `1234567`)

### 2.2 Create Exhibit C Query (Gateway Concentration)

1. Click **New Query**
2. Copy the SQL from `sql/dune/exhibit_C_gateway_daily_volume.sql`:

```sql
-- Exhibit C: Gateway Daily Volume and Concentration
-- Calculates HHI (Herfindahl-Hirschman Index) for gateway concentration

WITH gateway_addresses AS (
    SELECT address, name, tier FROM (VALUES
        (0x55fe002aeff02f77364de339a1292923a15844b8, 'Circle', 'Tier1'),
        (0x5f65f7b609678448494De4C87521CdF6cEf1e932, 'Paxos', 'Tier1'),
        (0x71660c4005ba85c37ccec55d0c4493e66fe775d3, 'Coinbase', 'Tier1'),
        (0x21a31ee1afc51d94c2efccaa2092ad1028285549, 'Gemini', 'Tier1'),
        (0x5754284f345afc66a98fbb0a0afe71e0f007b949, 'Tether Treasury', 'Tier2'),
        (0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503, 'Binance', 'Tier2'),
        (0xda9dfa130df4de4673b89022ee50ff26f6ea73cf, 'Kraken', 'Tier2'),
        (0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45, 'Uniswap Router', 'Tier3'),
        (0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7, 'Curve 3pool', 'Tier3')
    ) AS t(address, name, tier)
),

daily_volumes AS (
    SELECT
        date_trunc('day', evt_block_time) as date,
        gw.tier,
        SUM(value / 1e6) as volume_usd
    FROM erc20_ethereum.evt_Transfer t
    JOIN gateway_addresses gw ON t."to" = gw.address OR t."from" = gw.address
    WHERE contract_address IN (
        0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48,  -- USDC
        0xdac17f958d2ee523a2206206994597c13d831ec7   -- USDT
    )
    AND evt_block_time >= DATE '2023-02-01'
    AND evt_block_time < DATE '2026-02-01'
    GROUP BY 1, 2
),

daily_totals AS (
    SELECT date, SUM(volume_usd) as total_volume
    FROM daily_volumes
    GROUP BY 1
)

SELECT
    v.date,
    v.tier,
    v.volume_usd,
    ROUND(100.0 * v.volume_usd / t.total_volume, 2) as share_pct,
    ROUND(POWER(100.0 * v.volume_usd / t.total_volume, 2), 2) as hhi_component
FROM daily_volumes v
JOIN daily_totals t ON v.date = t.date
WHERE t.total_volume > 0
ORDER BY 1, 2
```

3. Click **Run**, then **Save** as `Fed Paper - Exhibit C Gateway Concentration`
4. Set visibility to **Public**
5. Copy the query ID

### 2.3 Create Exhibit E Query (Aave Liquidations)

1. Click **New Query**
2. Copy the SQL from `sql/dune/exhibit_E_aave_liquidations.sql`:

```sql
-- Exhibit E: Aave V3 Liquidations Involving Stablecoin Collateral

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
WHERE evt_block_time >= DATE '2023-02-01'
    AND evt_block_time < DATE '2026-02-01'
    AND collateralAsset IN (
        0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48,  -- USDC
        0xdac17f958d2ee523a2206206994597c13d831ec7,  -- USDT
        0x6b175474e89094c44da98b954eedeac495271d0f   -- DAI
    )
GROUP BY 1, 2
ORDER BY 1, 2
```

3. Click **Run**, then **Save** as `Fed Paper - Exhibit E Aave Liquidations`
4. Set visibility to **Public**
5. Copy the query ID

---

## Step 3: Update the Fetch Script

After creating all three queries, update `scripts/fetch_dune_data.py` with your query IDs:

```python
QUERIES = {
    "exhibit_A_gateway_transfers": {
        "query_id": 1234567,  # <-- Replace with your Exhibit A query ID
        ...
    },
    "exhibit_C_gateway_concentration": {
        "query_id": 2345678,  # <-- Replace with your Exhibit C query ID
        ...
    },
    "exhibit_E_aave_liquidations": {
        "query_id": 3456789,  # <-- Replace with your Exhibit E query ID
        ...
    }
}
```

---

## Step 4: Run the Fetch Script

### Option A: Using environment variable

```bash
export DUNE_API_KEY="HJYpLlltN8HtJmklFnAaMx8QX24m5P98"
cd codex_package
python scripts/fetch_dune_data.py
```

### Option B: Using command line argument

```bash
cd codex_package
python scripts/fetch_dune_data.py --api-key "HJYpLlltN8HtJmklFnAaMx8QX24m5P98"
```

### Option C: Fetch cached results (faster, no execution wait)

```bash
python scripts/fetch_dune_data.py --cache
```

### Option D: Fetch a single exhibit

```bash
python scripts/fetch_dune_data.py --query exhibit_E_aave_liquidations
```

---

## Step 5: Verify Output

After running, check the output in `data/dune/`:

```
data/dune/
├── exhibit_A_gateway_transfers.csv
├── exhibit_A_gateway_transfers.json
├── exhibit_C_gateway_concentration.csv
├── exhibit_C_gateway_concentration.json
├── exhibit_E_aave_liquidations.csv
└── exhibit_E_aave_liquidations.json
```

Each CSV contains the query results ready for analysis.

---

## Troubleshooting

### "Query not found" (404 error)
- Ensure the query is saved and set to **Public**
- Double-check the query ID in the URL

### "Query execution failed"
- The query may have syntax errors
- Run it manually in Dune web UI to see the error message

### "Rate limit exceeded"
- Free tier: 10 requests/minute, 500/day
- Wait and retry, or upgrade to paid tier

### Query runs but returns empty
- Check date ranges in the WHERE clause
- Verify the contract addresses are correct

---

## Alternative: Direct Web Export

If the API isn't working, you can manually export data from Dune:

1. Run each query in the web UI
2. Click **Export** → **CSV**
3. Save to `data/dune/exhibit_X.csv`
4. The pipeline can still use these files

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Dune Dashboard | https://dune.com |
| API Settings | https://dune.com/settings/api |
| API Documentation | https://dune.com/docs/api |
| Query Editor | https://dune.com/queries |

---

## Next Steps

After fetching Dune data:

1. Run the full pipeline:
   ```bash
   python scripts/run_pipeline.py
   ```

2. The pipeline will generate all 12 exhibits, including:
   - Exhibits 1-8 (FRED + DefiLlama data)
   - Exhibits A, C, E (Dune data)

3. Review outputs in `exhibits/` directory
