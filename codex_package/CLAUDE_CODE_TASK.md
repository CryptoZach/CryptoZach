# Stablecoin Flows Pipeline — Fed Research Exhibits

## Overview
This pipeline fetches macroeconomic and stablecoin data, then generates
publication-quality exhibits for a Federal Reserve research paper on
stablecoin flows and their relationship to monetary policy.

## Data Sources
1. **FRED** — Federal Reserve Economic Data (interest rates, RRP, balance sheet)
2. **DefiLlama** — Stablecoin market caps and chain-level supply
3. **Dune Analytics** — On-chain stablecoin transfer volumes and flows

## Pipeline Steps

### Step 1: Fetch FRED Data
```bash
python scripts/fetch_fred_graph_csv.py --start 2023-02-01 --end 2026-01-31
```
Downloads CSV data for key macro series (Fed Funds Rate, Treasury yields,
Overnight RRP, Fed balance sheet) from FRED's graph export endpoint.

### Step 2: Fetch Stablecoin Data
```bash
python scripts/fetch_stablecoins.py --start 2023-02-01 --end 2026-01-31
```
Pulls stablecoin market cap time series from DefiLlama for USDT, USDC,
DAI, BUSD, FRAX, TUSD, PYUSD, FDUSD, and others.

### Step 3: Fetch Dune Queries
```bash
python scripts/fetch_dune_queries.py --all --timeout 900
```
Executes and retrieves results from Dune Analytics queries covering
on-chain stablecoin transfer volumes, DEX volumes, and mint/burn events.
Requires DUNE_API_KEY environment variable.

### Step 4: Run Pipeline (Generate Exhibits)
```bash
python scripts/run_pipeline.py --all
```
Merges all data sources and generates the following exhibits:
- **Exhibit 1**: Total Stablecoin Supply Over Time
- **Exhibit 2**: Stablecoin Supply vs Federal Funds Rate
- **Exhibit 3**: Individual Stablecoin Market Share
- **Exhibit 4**: Stablecoin Net Supply Changes (Monthly)
- **Exhibit 5**: Stablecoin Supply vs Overnight RRP
- **Exhibit 6**: Correlation Heatmap — Macro vs Stablecoin Metrics

## Output
Charts are saved to `output/exhibits/` as PNG files.

## Notes
- FRED data does not require an API key (uses public CSV export).
- DefiLlama API is free and requires no key.
- Dune Analytics requires a paid API key set as DUNE_API_KEY.
  If unavailable, step 3 can be skipped and the pipeline will
  generate exhibits using only FRED + stablecoin data.
