-- Exhibit A: Gateway Corridor Flows
-- Tracks USDC/USDT transfers through major gateway addresses by tier
-- Platform: Dune Analytics (DuneSQL)
-- Date range: Feb 2023 - Feb 2026

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
        (0xda9dfa130df4de4673b89022ee50ff26f6ea73cf, 'Kraken', 'Tier2'),
        (0x6262998ced04146fa42253a5c0af90ca02dfd2a3, 'OKX', 'Tier2'),

        -- Tier 3: DeFi protocols (routers)
        (0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45, 'Uniswap Router', 'Tier3'),
        (0xdef1c0ded9bec7f1a1670819833240f027b25eff, '0x Exchange', 'Tier3'),
        (0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7, 'Curve 3pool', 'Tier3'),
        (0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2, 'Aave V3 Pool', 'Tier3')
    ) AS t(address, name, tier)
),

-- USDC transfers (6 decimals)
usdc_flows AS (
    SELECT
        date_trunc('day', evt_block_time) as date,
        CASE
            WHEN gw."from".address IS NOT NULL THEN gw."from".name
            ELSE gw."to".name
        END as gateway,
        CASE
            WHEN gw."from".address IS NOT NULL THEN gw."from".tier
            ELSE gw."to".tier
        END as tier,
        'USDC' as token,
        CASE WHEN gw."to".address IS NOT NULL THEN CAST(value AS DOUBLE) / 1e6 ELSE 0 END as inflow,
        CASE WHEN gw."from".address IS NOT NULL THEN CAST(value AS DOUBLE) / 1e6 ELSE 0 END as outflow
    FROM erc20_ethereum.evt_Transfer t
    LEFT JOIN gateway_addresses gw."from" ON t."from" = gw."from".address
    LEFT JOIN gateway_addresses gw."to" ON t."to" = gw."to".address
    WHERE t.contract_address = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48  -- USDC
        AND evt_block_time >= TIMESTAMP '2023-02-01'
        AND evt_block_time < TIMESTAMP '2026-02-01'
        AND (gw."from".address IS NOT NULL OR gw."to".address IS NOT NULL)
),

-- USDT transfers (6 decimals)
usdt_flows AS (
    SELECT
        date_trunc('day', evt_block_time) as date,
        CASE
            WHEN gw."from".address IS NOT NULL THEN gw."from".name
            ELSE gw."to".name
        END as gateway,
        CASE
            WHEN gw."from".address IS NOT NULL THEN gw."from".tier
            ELSE gw."to".tier
        END as tier,
        'USDT' as token,
        CASE WHEN gw."to".address IS NOT NULL THEN CAST(value AS DOUBLE) / 1e6 ELSE 0 END as inflow,
        CASE WHEN gw."from".address IS NOT NULL THEN CAST(value AS DOUBLE) / 1e6 ELSE 0 END as outflow
    FROM erc20_ethereum.evt_Transfer t
    LEFT JOIN gateway_addresses gw."from" ON t."from" = gw."from".address
    LEFT JOIN gateway_addresses gw."to" ON t."to" = gw."to".address
    WHERE t.contract_address = 0xdac17f958d2ee523a2206206994597c13d831ec7  -- USDT
        AND evt_block_time >= TIMESTAMP '2023-02-01'
        AND evt_block_time < TIMESTAMP '2026-02-01'
        AND (gw."from".address IS NOT NULL OR gw."to".address IS NOT NULL)
),

combined AS (
    SELECT * FROM usdc_flows
    UNION ALL
    SELECT * FROM usdt_flows
)

SELECT
    date,
    gateway,
    tier,
    token,
    SUM(inflow) as inflow_usd,
    SUM(outflow) as outflow_usd,
    SUM(inflow) - SUM(outflow) as net_flow_usd
FROM combined
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 4
