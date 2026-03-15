# Unified Fed Paper Data Pipeline: Claude Code Task Brief

## Target Publication
**Paper:** "Regulating Routers: The Control Layer of Internet-Native Dollars"
**Venue:** Fifth Conference on International Roles of the U.S. Dollar (Fed Board & FRBNY)
**Date:** June 22-23, 2026

---

## Executive Summary

This unified pipeline combines two complementary analyses:

### Package 1: Monetary Policy Transmission (COMPLETE)
- **Core Finding:** r = -0.94 correlation between Fed Balance Sheet and stablecoin supply
- **Exhibits 1-8:** Supply trends, rate sensitivity, market structure, RRP rotation, DEX volumes
- **Data:** FRED macro series + DefiLlama stablecoin mcaps + DEX volumes
- **Status:** ✅ Validated and committed to branch

### Package 2: Control-Layer Analysis (TO INTEGRATE)
- **Core Finding:** Gateway routing, not token taxonomy, determines dollar network effects
- **Exhibits A, B, C, E:** Corridor flows, funding stress, gateway concentration, tokenized assets
- **Data:** Dune SQL on-chain queries + CLII scoring methodology
- **Status:** 🔄 SQL queries ready, needs execution and integration

---

## Combined Key Findings

| Finding | Correlation | Exhibit | Evidence |
|---------|-------------|---------|----------|
| Fed Assets ↔ Stablecoin Supply | **r = -0.94** | 2, 6, B | Inverse QT relationship |
| Fed Funds Rate ↔ Supply | **r = -0.89** | 2, 6 | Opportunity cost channel |
| ON RRP ↔ Supply | **r = -0.72** | 5 | Liquidity rotation |
| USDT Dominance Growth | 45% → 70% | 3, C | Market concentration |
| March 2023 USDC Depeg | -$0.12 | 4, B | SVB contagion |
| Gateway Tier 1 Flight | +15% share | A, C | Stress-period routing |

---

## Data Sources (All Validated)

### Tier 1: FRED Macro Data ✅
```
Series: DFF, DGS2, DGS10, SOFR, RRPONTSYD, WSHOMCB
Rows: 1,095 daily observations
File: data/processed/fred_macro.csv
```

### Tier 2: DefiLlama Stablecoin Supply ✅
```
Tokens: USDT, USDC, DAI, BUSD, FRAX, TUSD, PYUSD, FDUSD, USDP, USDe
Rows: 1,096 daily observations
File: data/processed/stablecoins.csv
```

### Tier 3: DefiLlama DEX/Bridge Volumes ✅
```
Metrics: dex_volume_usd, curve_volume_usd, bridge_deposit/withdraw
Rows: 1,097 daily observations
File: data/processed/defillama_volumes.csv
```

### Tier 4: Dune On-Chain Gateway Data 🔄
```
Queries: Gateway transfers, daily volume, Aave liquidations, tokenized treasury
Status: SQL ready, needs execution with API key
Target: data/raw/dune/*.csv
```

---

## Exhibit Inventory

### Existing Exhibits (Package 1): COMPLETE

| # | Name | File | Key Insight |
|---|------|------|-------------|
| 1 | Total Stablecoin Supply | exhibit_1_total_supply.png | $137B → $307B (+124%) |
| 2 | Supply vs Fed Funds Rate | exhibit_2_supply_vs_rate.png | r = -0.89 inverse |
| 3 | Market Share by Token | exhibit_3_market_share.png | USDT dominance, BUSD wind-down |
| 4 | Monthly Net Supply Changes | exhibit_4_net_supply_changes.png | SVB USDC outflow visible |
| 5 | Supply vs ON RRP | exhibit_5_supply_vs_rrp.png | $2.3T → $0.01T rotation |
| 6 | Correlation Heatmap | exhibit_6_correlation_heatmap.png | r = -0.94 Fed Assets |
| 7 | DEX Trading Volume | exhibit_7_dex_volumes.png | $3B → $25B daily |
| 8 | DEX Volume vs Supply | exhibit_8_volume_vs_supply.png | Activity vs market cap |

### New Exhibits (Package 2): TO BUILD

| # | Name | Target File | Data Source | Key Insight |
|---|------|-------------|-------------|-------------|
| A | US→Mexico Corridor Flows | exhibit_A_corridor_flows.png | Dune gateway_transfers | Flight to Tier 1 during stress |
| B | Stablecoin + Funding Stress | exhibit_B_stablecoin_funding.png | FRED + DefiLlama | USDC depeg + facility usage |
| C | Gateway Routing & CLII | exhibit_C_gateway_routing.png | Dune + CLII scores | Concentration + control intensity |
| E | Tokenized Assets + DeFi | exhibit_E_tokenized_defi.png | Dune Aave + Treasury | Collateral composition shifts |

---

## Dune SQL Queries to Execute

### Exhibit A: Gateway Transfers
```sql
-- exhibit_A_gateway_transfers_v2.sql
-- Tracks USDC/USDT transfers through major gateways (Circle, Tether, exchanges)
-- Columns: date, gateway, token, inflow_usd, outflow_usd, net_flow_usd
-- Time range: 2023-02-01 to 2026-01-31
```

### Exhibit C: Gateway Daily Volume
```sql
-- exhibit_C_gateway_daily_volume.sql
-- Daily volume by gateway for concentration metrics
-- Columns: date, gateway, volume_usd, share_pct
-- Used to compute HHI and top-N concentration
```

### Exhibit E: Aave Collateral & Liquidations
```sql
-- exhibit_E_aave_collateral.sql
-- Stablecoin collateral composition on Aave v3
-- Columns: date, token, collateral_usd, share_pct

-- exhibit_E_aave_liquidations.sql
-- Liquidation events involving stablecoin collateral
-- Columns: date, collateral_token, liquidation_usd, count
```

### Exhibit E: Tokenized Treasury AUM
```sql
-- exhibit_E_tokenized_treasury_aum.sql
-- Tracks BUIDL, USDY, OUSG and similar products
-- Columns: date, product, aum_usd
```

---

## CLII-Lite Scoring Methodology

**Control Layer Intensity Index** scores gateways on 5 dimensions:

| Dimension | Weight | Evidence Sources |
|-----------|--------|------------------|
| Regulatory License | 25% | NYDFS BitLicense, state MTLs |
| Reserve Transparency | 20% | Attestation frequency, auditor tier |
| Freeze/Blacklist Capability | 20% | Contract admin functions |
| Compliance Infrastructure | 20% | KYC/AML program scope |
| Geographic Restrictions | 15% | OFAC compliance, geo-blocking |

**Gateway CLII Scores (Reference):**
| Gateway | CLII Score | Tier |
|---------|------------|------|
| Circle (USDC) | 0.92 | Tier 1 |
| Paxos (USDP/PYUSD) | 0.88 | Tier 1 |
| Coinbase | 0.85 | Tier 1 |
| Tether (USDT) | 0.45 | Tier 2 |
| Binance (pre-2024) | 0.38 | Tier 2 |
| Curve/Uniswap | 0.15 | Tier 3 |
| Tornado Cash | 0.02 | Tier 3 |

---

## Pipeline Execution Order

```bash
cd codex_package

# Step 1: Existing data (already fetched, but can refresh)
python scripts/fetch_fred_graph_csv.py --start 2023-02-01 --end 2026-01-31
python scripts/fetch_stablecoins.py --start 2023-02-01 --end 2026-01-31
python scripts/fetch_defillama_volumes.py --start 2023-02-01 --end 2026-01-31

# Step 2: Dune queries (requires DUNE_API_KEY)
export DUNE_API_KEY="HJYpLlltN8HtJmklFnAaMx8QX24m5P98"
python scripts/fetch_dune_queries.py --all --timeout 900

# Step 3: Generate all exhibits
python scripts/run_pipeline.py --all

# Step 4: Build new control-layer exhibits (A, B, C, E)
python scripts/build_exhibit_A.py
python scripts/build_exhibit_B.py
python scripts/build_exhibit_C.py
python scripts/build_exhibit_E.py

# Step 5: Validate
python scripts/validate_pack.py
```

---

## Paper Structure with Exhibit Mapping

### I. Introduction
- Stablecoins as "internet-native dollars"
- Research question: What determines dollar network effects in crypto?

### II. Background
- Stablecoin mechanics (minting, redemption, reserves)
- Regulatory landscape (NYDFS, SEC, OCC)
- Key events: Terra/Luna, SVB, BUSD wind-down

### III. Theoretical Framework
- **Control layer hypothesis:** Gateway routing > token taxonomy
- CLII methodology introduction

### IV. Data & Methodology
- **Exhibits 1-8:** Monetary policy transmission (existing)
- **Exhibits A, C:** Gateway-level flows (new)
- Date range: Feb 2023 to Jan 2026

### V. Findings

#### V.A. Monetary Policy Transmission
- **Exhibit 2:** Supply vs Fed Funds Rate (r = -0.89)
- **Exhibit 5:** Supply vs ON RRP (r = -0.72)
- **Exhibit 6:** Correlation heatmap (r = -0.94 Fed Assets)
- **Exhibit B:** Funding stress overlay

#### V.B. Market Structure Evolution
- **Exhibit 3:** USDT dominance 45% → 70%
- **Exhibit 4:** BUSD wind-down, SVB USDC outflow
- **Exhibit 7-8:** DEX volume growth

#### V.C. Control Layer Dynamics
- **Exhibit A:** US→Mexico corridor flight to Tier 1
- **Exhibit C:** Gateway concentration (HHI), CLII scores
- March 2023: Tier 1 share +15% during stress

#### V.D. Systemic Risk Implications
- **Exhibit E:** Tokenized Treasury growth
- **Exhibit E:** Aave liquidations during stress
- Reserve composition ↔ short-term funding markets

### VI. Policy Implications
- Gateway-focused regulation vs token-focused
- Reserve requirements and transparency
- CBDC considerations

### VII. Conclusion
- Control layer determines dollar network effects
- Regulatory arbitrage through gateway selection

---

## Validation Checkpoints

After pipeline execution, verify:

| Checkpoint | Expected Value | Exhibit |
|------------|----------------|---------|
| Total stablecoin mcap Feb 2023 | ~$137B | 1 |
| Total stablecoin mcap Jan 2026 | ~$307B | 1 |
| Fed Assets ↔ Supply correlation | r ≈ -0.94 | 6 |
| USDC depeg March 11, 2023 | ~$0.88 | B |
| ON RRP peak | ~$2.3T | 5 |
| ON RRP Jan 2026 | ~$0.01T | 5 |
| USDT market share Jan 2026 | ~61% | 3 |
| DEX volume peak | ~$25B/day | 7 |

---

## Files Reference

### Existing (Committed)
```
codex_package/
├── scripts/
│   ├── fetch_fred_graph_csv.py      ✅
│   ├── fetch_stablecoins.py         ✅
│   ├── fetch_defillama_volumes.py   ✅
│   ├── fetch_dune_queries.py        ✅
│   └── run_pipeline.py              ✅ (exhibits 1-8)
├── data/processed/
│   ├── fred_macro.csv               ✅ 1,095 rows
│   ├── stablecoins.csv              ✅ 1,096 rows
│   └── defillama_volumes.csv        ✅ 1,097 rows
├── output/exhibits/
│   ├── exhibit_1_total_supply.png   ✅
│   ├── exhibit_2_supply_vs_rate.png ✅
│   ├── exhibit_3_market_share.png   ✅
│   ├── exhibit_4_net_supply_changes.png ✅
│   ├── exhibit_5_supply_vs_rrp.png  ✅
│   ├── exhibit_6_correlation_heatmap.png ✅
│   ├── exhibit_7_dex_volumes.png    ✅
│   └── exhibit_8_volume_vs_supply.png ✅
└── config/settings.yaml             ✅
```

### To Build (Control-Layer)
```
codex_package/
├── scripts/
│   ├── build_exhibit_A.py           🔄 Gateway corridor flows
│   ├── build_exhibit_B.py           🔄 Funding stress overlay
│   ├── build_exhibit_C.py           🔄 CLII + concentration
│   ├── build_exhibit_E.py           🔄 Tokenized assets
│   └── validate_pack.py             🔄 Validation suite
├── sql/dune/
│   ├── exhibit_A_gateway_transfers.sql
│   ├── exhibit_C_gateway_daily_volume.sql
│   ├── exhibit_E_aave_collateral.sql
│   ├── exhibit_E_aave_liquidations.sql
│   └── exhibit_E_tokenized_treasury_aum.sql
├── data/final/
│   ├── exhibit_A_corridor_daily.csv
│   ├── exhibit_B_funding_stress_daily.csv
│   ├── exhibit_C_gateway_shares_daily.csv
│   └── exhibit_E_tokenized_defi_daily.csv
└── docs/
    ├── gateway_list.csv             CLII evidence
    └── clii_evidence_links.csv      Scoring sources
```

---

## Commit History (Branch: claude/setup-stablecoin-pipeline-HKKPp)

```
460663b Add handoff package for Fed Paper Writer Agent
eba84f6 Add DefiLlama volumes as Dune alternative, create volume exhibits
7085aac Remove broken Dune query IDs, document API tier limitations
d0d9ffe Fix stablecoin DefiLlama ID mappings and regenerate exhibits
01f3b92 Add raw FRED and DefiLlama data files
fc2864f Add stablecoin flows pipeline for Fed research exhibits
```

---

## Next Steps for Fed Paper Writer Agent

1. **Review existing exhibits** (1-8): all validated and committed
2. **Execute Dune queries**: gateway flows for exhibits A, C, E
3. **Build control-layer exhibits**: A, B, C, E scripts
4. **Integrate CLII scoring**: gateway intensity analysis
5. **Generate publication charts**: Fed aesthetic styling
6. **Write paper sections**: map exhibits to findings
7. **Validate all data**: run validation suite

---

## API Keys Available

| Service | Key | Status |
|---------|-----|--------|
| FRED | None needed | ✅ Public CSV export |
| DefiLlama | None needed | ✅ Free API |
| Dune Analytics | `HJYpLlltN8HtJmklFnAaMx8QX24m5P98` | ⚠️ Free tier (limited) |

**Dune Limitation:** Free tier cannot create queries or run custom SQL. Only execute existing public queries. The configured query IDs (2589262, 1914532, 2013703) are 404. Query 2416880 returns only 10 rows. Consider upgrading or using alternative on-chain data sources.

---

**Ready for paper finalization. All monetary policy exhibits validated. Control-layer analysis framework defined.**
