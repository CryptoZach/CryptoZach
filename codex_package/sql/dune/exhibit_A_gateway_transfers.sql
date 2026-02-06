-- Exhibit A: Gateway Transfers (US→Mexico Corridor Focus)
-- Tracks USDC/USDT transfers through major gateways
-- NOTE: This query requires Dune paid tier for custom SQL execution
-- Alternative: Use DefiLlama bridge volumes as proxy

WITH gateway_addresses AS (
    -- Tier 1: Regulated US Gateways
    SELECT 'circle_treasury' as gateway, 0x55fe002aeff02f77364de339a1292923a15844b8 as address, 'Tier1' as tier
    UNION ALL SELECT 'coinbase_custody', 0x71660c4005ba85c37ccec55d0c4493e66fe775d3, 'Tier1'
    UNION ALL SELECT 'paxos_treasury', 0x36a4104dbefdd0b56bbdc54826c5b6c3a3e93c7b, 'Tier1'
    -- Tier 2: Offshore/Less Regulated
    UNION ALL SELECT 'tether_treasury', 0x5754284f345afc66a98fbb0a0afe71e0f007b949, 'Tier2'
    UNION ALL SELECT 'binance_hot', 0x28c6c06298d514db089934071355e5743bf21d60, 'Tier2'
    -- Tier 3: DEX/DeFi
    UNION ALL SELECT 'uniswap_v3', 0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45, 'Tier3'
    UNION ALL SELECT 'curve_3pool', 0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7, 'Tier3'
),

daily_transfers AS (
    SELECT
        date_trunc('day', block_time) as date,
        g.gateway,
        g.tier,
        t.symbol as token,
        SUM(CASE WHEN t."to" = g.address THEN amount_usd ELSE 0 END) as inflow_usd,
        SUM(CASE WHEN t."from" = g.address THEN amount_usd ELSE 0 END) as outflow_usd
    FROM erc20_ethereum.evt_Transfer t
    JOIN gateway_addresses g ON t."to" = g.address OR t."from" = g.address
    WHERE t.symbol IN ('USDC', 'USDT')
        AND block_time >= DATE '2023-02-01'
        AND block_time < DATE '2026-02-01'
    GROUP BY 1, 2, 3, 4
)

SELECT
    date,
    gateway,
    tier,
    token,
    inflow_usd,
    outflow_usd,
    inflow_usd - outflow_usd as net_flow_usd
FROM daily_transfers
ORDER BY date, gateway, token
