-- Exhibit C: Gateway Daily Volume for Concentration Metrics
-- Computes HHI and top-N share for gateway routing analysis

WITH gateway_volumes AS (
    SELECT
        date_trunc('day', block_time) as date,
        CASE
            WHEN "to" IN (SELECT address FROM gateway_addresses WHERE tier = 'Tier1')
                OR "from" IN (SELECT address FROM gateway_addresses WHERE tier = 'Tier1')
            THEN 'Tier1_Regulated'
            WHEN "to" IN (SELECT address FROM gateway_addresses WHERE tier = 'Tier2')
                OR "from" IN (SELECT address FROM gateway_addresses WHERE tier = 'Tier2')
            THEN 'Tier2_Offshore'
            ELSE 'Tier3_DeFi'
        END as tier,
        SUM(amount_usd) as volume_usd
    FROM erc20_ethereum.evt_Transfer
    WHERE symbol IN ('USDC', 'USDT')
        AND block_time >= DATE '2023-02-01'
        AND block_time < DATE '2026-02-01'
    GROUP BY 1, 2
),

daily_totals AS (
    SELECT date, SUM(volume_usd) as total_volume
    FROM gateway_volumes
    GROUP BY 1
)

SELECT
    gv.date,
    gv.tier,
    gv.volume_usd,
    gv.volume_usd / dt.total_volume as share_pct,
    -- HHI component (share squared)
    POWER(gv.volume_usd / dt.total_volume, 2) as hhi_component
FROM gateway_volumes gv
JOIN daily_totals dt ON gv.date = dt.date
ORDER BY gv.date, gv.tier
