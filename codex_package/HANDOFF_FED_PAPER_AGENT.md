# Handoff Package: Stablecoin Flows Fed Research Paper

## For: Claude Opus 4.5 Fed Paper Writer Agent
## From: Data Pipeline Setup Agent
## Date: 2026-02-05
## Branch: `claude/setup-stablecoin-pipeline-HKKPp`

---

## Executive Summary

A complete data pipeline has been built to support a Federal Reserve research paper analyzing stablecoin flows and their relationship to U.S. monetary policy. The pipeline fetches macroeconomic data from FRED, stablecoin market cap data from DefiLlama, and DEX trading volume data, then generates 8 publication-quality exhibits.

**Key Finding:** Strong negative correlations exist between stablecoin supply and Fed monetary policy indicators:
- Fed Balance Sheet Assets vs Total Stablecoin Supply: **r = -0.94**
- Federal Funds Rate vs Total Stablecoin Supply: **r = -0.89**
- Overnight RRP vs Total Stablecoin Supply: **r = -0.72**

---

## Data Sources (All Validated)

### 1. FRED Macro Data (`data/processed/fred_macro.csv`)
| Series | Description | Rows |
|--------|-------------|------|
| DFF | Federal Funds Effective Rate | 1,095 |
| DGS2 | 2-Year Treasury Constant Maturity | 783 |
| DGS10 | 10-Year Treasury Constant Maturity | 783 |
| SOFR | Secured Overnight Financing Rate | 783 |
| RRPONTSYD | Overnight Reverse Repo Outstanding | 783 |
| WSHOMCB | Federal Reserve Total Assets | 157 |

**Date Range:** Feb 2023 – Jan 2026

### 2. Stablecoin Market Caps (`data/processed/stablecoins.csv`)
| Token | Feb 2023 | Jan 2025 | Jan 2026 |
|-------|----------|----------|----------|
| **Total** | $136.9B | $206.0B | $307.0B |
| USDT | $67.8B | $137.8B | $187.3B |
| USDC | $41.9B | $43.9B | $75.3B |
| BUSD | $16.1B | $0.07B | $0.06B |
| DAI | $5.1B | $4.4B | $4.5B |
| USDe | — | $5.9B | $6.3B |
| PYUSD | — | $0.5B | $3.6B |

**Source:** DefiLlama Stablecoin API (free, no key required)
**Rows:** 1,096 daily observations

### 3. DEX & Bridge Volumes (`data/processed/defillama_volumes.csv`)
| Metric | Description |
|--------|-------------|
| dex_volume_usd | Total daily DEX trading volume (all chains) |
| curve_volume_usd | Curve DEX volume (stablecoin-focused) |
| bridge_deposit_usd | Cross-chain bridge inflows |
| bridge_withdraw_usd | Cross-chain bridge outflows |
| eth_stablecoin_supply | Ethereum stablecoin supply |
| eth_stablecoin_minted | Cumulative minting on Ethereum |

**Source:** DefiLlama APIs (free, no key required)
**Rows:** 1,097 daily observations

---

## Generated Exhibits

### Exhibit 1: Total Stablecoin Market Capitalization
**File:** `output/exhibits/exhibit_1_total_supply.png`
**Key Insight:** Total stablecoin supply grew from $137B (Feb 2023) to $307B (Jan 2026), a 124% increase over 3 years. Notable trough at $122B in late 2023 before sustained growth resumed.

### Exhibit 2: Stablecoin Supply vs Federal Funds Rate
**File:** `output/exhibits/exhibit_2_supply_vs_rate.png`
**Key Insight:** Inverse relationship (r = -0.89). Stablecoin supply grew modestly during the 5.25-5.50% rate plateau, then accelerated sharply as rate cuts began in Sep 2024. This suggests stablecoin demand is sensitive to the opportunity cost of holding non-yielding digital dollars.

### Exhibit 3: Stablecoin Market Capitalization by Token
**File:** `output/exhibits/exhibit_3_market_share.png`
**Key Insight:** USDT dominance increased from 50% to 61% of market. USDC recovered from post-SVB lows. BUSD wound down completely following Paxos enforcement action. New entrants (USDe, PYUSD) gained traction in 2024-2025.

### Exhibit 4: Monthly Net Supply Changes
**File:** `output/exhibits/exhibit_4_net_supply_changes.png`
**Key Insight:** Sharp USDC outflow (~$9.5B) in March 2023 following SVB collapse and brief de-peg. USDT captured outflows with consistent net minting throughout the period. USDC net inflows resumed strongly in late 2024.

### Exhibit 5: Stablecoin Supply vs Overnight Reverse Repo
**File:** `output/exhibits/exhibit_5_supply_vs_rrp.png`
**Key Insight:** Clear inverse relationship (r = -0.72). As ON RRP drained from $2.3T to near zero, stablecoins grew. This suggests some liquidity rotation from traditional money markets into crypto-native dollar instruments, though causality requires further analysis.

### Exhibit 6: Correlation Heatmap
**File:** `output/exhibits/exhibit_6_correlation_heatmap.png`
**Key Correlations:**
- Fed Assets ↔ Total Supply: **-0.94** (strongest)
- SOFR ↔ Total Supply: **-0.87**
- Fed Funds Rate ↔ Total Supply: **-0.89**
- ON RRP ↔ Total Supply: **-0.72**
- 10Y Treasury ↔ Total Supply: **-0.21** (weak — long rates less relevant)
- USDT ↔ USDC: **+0.92** (move together)

### Exhibit 7: DEX Trading Volume
**File:** `output/exhibits/exhibit_7_dex_volumes.png`
**Key Insight:** DEX volumes grew from ~$3B/day (early 2023) to peaks of $25B/day (early 2025). Curve DEX (stablecoin-focused) remained relatively flat at $0.3-0.5B/day, suggesting stablecoin-to-stablecoin swaps are a small fraction of total DEX activity.

### Exhibit 8: DEX Volume vs Stablecoin Supply
**File:** `output/exhibits/exhibit_8_volume_vs_supply.png`
**Key Insight:** Both metrics show strong growth, but DEX volume is far more volatile. Volume spikes correlate with broader crypto market rallies. The ratio of daily volume to supply (velocity proxy) varied significantly.

---

## Key Findings for Paper

### 1. Monetary Policy Transmission
- Stablecoin supply shows strong negative correlation with Fed policy rates
- This suggests stablecoins compete with traditional money market instruments
- When rates rise, opportunity cost of holding non-yielding stablecoins increases
- When rates fall, stablecoins become more attractive relative to T-bills/MMFs

### 2. Liquidity Rotation
- Inverse relationship between ON RRP and stablecoin supply
- As Fed drained liquidity via QT, some capital rotated into crypto
- Stablecoins may serve as a "shadow" money market for crypto-native users

### 3. Market Structure Evolution
- USDT dominance increased despite regulatory concerns
- USDC suffered from SVB contagion but recovered
- BUSD regulatory action removed a major player
- New entrants (USDe, PYUSD) show demand for alternatives

### 4. Systemic Risk Considerations
- $307B in stablecoins represents significant dollar-denominated liabilities
- Reserve composition (T-bills, repo, cash) creates links to traditional finance
- Rapid redemption scenarios could stress short-term funding markets

---

## Suggested Paper Structure

### I. Introduction
- Growth of stablecoins as crypto-native money market instruments
- Research question: How do stablecoin flows interact with Fed monetary policy?

### II. Background
- Stablecoin mechanics (minting, redemption, reserve backing)
- Regulatory landscape (NYDFS, SEC, OCC guidance)
- Key events: Terra/Luna collapse, SVB crisis, BUSD wind-down

### III. Data & Methodology
- FRED macro data (rates, RRP, balance sheet)
- DefiLlama stablecoin supply data
- Correlation and time-series analysis
- Date range: Feb 2023 – Jan 2026

### IV. Findings
- Exhibit 1-2: Supply growth and rate sensitivity
- Exhibit 3-4: Market structure and competitive dynamics
- Exhibit 5-6: Liquidity rotation and correlations
- Exhibit 7-8: On-chain activity metrics

### V. Policy Implications
- Stablecoins as unregulated money market funds
- Reserve requirements and transparency
- Potential for Fed stablecoin oversight
- CBDC considerations

### VI. Conclusion
- Summary of monetary policy transmission channel
- Areas for future research

---

## Technical Details

### Running the Pipeline
```bash
cd codex_package
pip install -r requirements.txt

# Fetch data
python scripts/fetch_fred_graph_csv.py --start 2023-02-01 --end 2026-01-31
python scripts/fetch_stablecoins.py --start 2023-02-01 --end 2026-01-31
python scripts/fetch_defillama_volumes.py --start 2023-02-01 --end 2026-01-31

# Generate exhibits
python scripts/run_pipeline.py --all
```

### Repository Structure
```
codex_package/
├── config/settings.yaml          # Data source configuration
├── scripts/
│   ├── fetch_fred_graph_csv.py   # FRED macro data
│   ├── fetch_stablecoins.py      # DefiLlama stablecoin mcaps
│   ├── fetch_defillama_volumes.py # DEX/bridge volumes
│   └── run_pipeline.py           # Generate 8 exhibits
├── data/
│   ├── raw/                      # Original API responses
│   └── processed/                # Merged CSVs for analysis
└── output/exhibits/              # 8 PNG charts
```

### Data Validation Performed
- FRED rates validated against known FOMC decisions
- Stablecoin mcaps validated against CoinGecko/CMC
- DefiLlama IDs corrected (8 of 10 were wrong initially)
- All exhibit values cross-checked for plausibility

---

## Files to Reference

| File | Purpose |
|------|---------|
| `data/processed/fred_macro.csv` | All FRED macro series merged |
| `data/processed/stablecoins.csv` | Daily stablecoin mcaps by token |
| `data/processed/defillama_volumes.csv` | DEX and bridge volume data |
| `output/exhibits/*.png` | All 8 publication-ready charts |
| `config/settings.yaml` | Data source configuration |
| `CLAUDE_CODE_TASK.md` | Original pipeline documentation |

---

## Commit History
```
eba84f6 Add DefiLlama volumes as Dune alternative, create volume exhibits
7085aac Remove broken Dune query IDs, document API tier limitations
d0d9ffe Fix stablecoin DefiLlama ID mappings and regenerate exhibits
01f3b92 Add raw FRED and DefiLlama data files
fc2864f Add stablecoin flows pipeline for Fed research exhibits
```

---

## Contact / Handoff Notes

- All data is fetched from free, public APIs (no keys required except optional Dune)
- Exhibits are 150 DPI, suitable for publication
- Raw JSON/CSV preserved in `data/raw/` for reproducibility
- Pipeline is idempotent — re-running will refresh data

**Ready for paper writing. All exhibits validated and committed.**
