-- Exhibit E: Aave V3 Liquidations Involving Stablecoin Collateral
-- Tracks liquidation events where stablecoins were used as collateral

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
