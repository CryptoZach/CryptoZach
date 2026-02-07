# Econometric Handoff Package — Claude Code Instructions

## Target Publication
**Paper:** "Regulating Routers: The Control Layer of Internet-Native Dollars"
**Venue:** Fifth Conference on International Roles of the U.S. Dollar (Fed Board & FRBNY)
**Date:** June 22–23, 2026

---

## Quick Start

```bash
cd handoff_package
pip install statsmodels pandas numpy matplotlib seaborn requests --break-system-packages
python scripts/run_all.py
```

For a network-free test (Task 3 only):
```bash
python scripts/run_all.py --task3-only
```

---

## Package Contents

| File | Purpose |
|------|---------|
| `CLAUDE_CODE_ECONOMETRIC_HANDOFF.md` | This file — full instructions |
| `Regulating_Routers_Fed_Paper_Final.docx` | Input document (text edits 4–7 applied) |
| `data/fred_macro.csv` | 6-variable FRED macro series (1,095+ daily obs) |
| `data/stablecoins.csv` | Stablecoin market cap by token (1,096+ daily obs) |
| `data/stablecoin_aggregate.json` | Raw DefiLlama aggregate with `totalCirculating` + `totalCirculatingUSD` |
| `data/stablecoin_usdc.json` | USDC-specific for SVB depeg decomposition |
| `scripts/task3_circ_supply.py` | Circulating supply robustness (tested, no network) |
| `scripts/task2_facility_series.py` | BTFP + Primary Credit fetch + Exhibit 1 heatmap (needs network) |
| `scripts/task1_cointegration.py` | Johansen + Engle-Granger + VECM (needs `statsmodels`) |
| `scripts/run_all.py` | Master runner: compute → apply to docx XML → verify |
| `results/task3_results.json` | Pre-computed Task 3 results (example output) |
| `docs/current_paper.md` | Markdown rendering of current paper for reference |

---

## Three Econometric Tasks

### Task 3: Circulating-Supply Robustness Check
**Status:** Tested end-to-end, PASSES
**Dependencies:** pandas, numpy (no network, no statsmodels)

**Theory:** DefiLlama reports two measures for each stablecoin:
- `totalCirculating` — quantity of tokens in circulation (at par, i.e. 1 token = $1)
- `totalCirculatingUSD` — market capitalization (quantity × market price)

For a perfectly pegged stablecoin, these are identical. During a depeg event (e.g., USDC during SVB), market cap < circulating supply because implied price < $1. This task proves the distinction is immaterial for our correlation analysis.

**What it computes:**
1. Pearson correlation between aggregate `totalCirculating` and `totalCirculatingUSD` → r ≈ 0.999992
2. Correlations of each macro variable (DFF, SOFR, RRPONTSYD, WSHOMCB) with both measures
3. Maximum absolute difference in correlations → Δ ≈ 0.0006 (threshold: < 0.02)
4. SVB depeg decomposition: USDC implied price dropped to ~$0.96, price effect represents only ~0.24% of pre-event market cap

**Pass criteria:**
- `r(circ, mcap) > 0.9999` ✓
- `max |Δcorr| < 0.02` ✓

**Prose inserts generated:**
- `footnote_robustness_check` → Section III (Data & Methodology)
- `paragraph_svb_decomposition` → Section V.B (Market Structure)

### Task 2: Fed Facility Series & Enhanced Heatmap
**Status:** Requires network
**Dependencies:** pandas, numpy, matplotlib, seaborn, requests/urllib

**Theory:** The Bank Term Funding Program (BTFP) and Primary Credit window were heavily used during the March 2023 banking stress. Including these facility-usage variables alongside the original 6 FRED series strengthens the monetary-policy transmission narrative by showing that stablecoin outflows and Fed lending facility drawdowns moved in tandem.

**What it computes:**
1. Fetches BTFP outstanding (H41RESPPALDKNWW) and Primary Credit (WLCFLPCL) from FRED
2. Merges with existing macro + stablecoin data
3. Computes full correlation matrix including facility variables
4. Generates enhanced Exhibit 1 heatmap PNG

**FRED Series IDs:**
| Series | Description |
|--------|-------------|
| H41RESPPALDKNWW | Bank Term Funding Program, Outstanding (Weekly) |
| WLCFLPCL | Primary Credit, Outstanding (Weekly) |

**Prose inserts generated:**
- `paragraph_facility_correlations` → Section V.A (Monetary Policy Transmission)

### Task 1: Cointegration & VECM
**Status:** Requires statsmodels
**Dependencies:** statsmodels, pandas, numpy

**Theory:** Simple correlations show co-movement but cannot distinguish between spurious regression (two trending series) and a genuine long-run equilibrium. Cointegration testing (Johansen, Engle-Granger) answers: *do stablecoin supply and macro variables share a stable long-run relationship, or are the correlations an artifact of common trends?*

If cointegrated, a Vector Error-Correction Model (VECM) estimates:
- **β (cointegrating vectors):** the long-run equilibrium relationship
- **α (loading/adjustment speeds):** how fast each variable corrects deviations from equilibrium

**What it computes:**
1. Prepares weekly-frequency dataset (log-transforms level variables)
2. Johansen trace + max-eigenvalue tests → cointegration rank
3. Engle-Granger two-step test → ADF on OLS residuals
4. VECM estimation → α, β, log-likelihood, AIC/BIC

**Variable transformations:**
- `total_stablecoin_mcap` → log (level variable, large scale)
- `rrpontsyd` → log (level variable, large scale, clip at 1e6 to avoid log(0))
- `wshomcb` → log (level variable, large scale)
- `dff`, `sofr` → untransformed (already in percentage points)

**Prose inserts generated:**
- `paragraph_cointegration_test` → Section III (Data & Methodology)
- `paragraph_vecm_interpretation` → Section V.A (Monetary Policy Transmission)

---

## Insertion Points (Docx XML)

The `run_all.py` script searches for text fragments in the Word document XML to locate where each prose paragraph should be inserted:

| Prose Key | Search Fragment | Target Section |
|-----------|----------------|----------------|
| `footnote_robustness_check` | "Twelve exhibits support" | IV. Data & Methodology |
| `paragraph_svb_decomposition` | "SVB crisis" | V.B. Market Structure |
| `paragraph_facility_correlations` | "Exhibit 6" | V.A. Monetary Policy |
| `paragraph_cointegration_test` | "Data sources span three tiers" | IV. Data & Methodology |
| `paragraph_vecm_interpretation` | "Exhibit B overlays" | V.A. Monetary Policy |

If a fragment is not found, the script falls back to inserting before "Conclusion".

---

## Constraints & Design Decisions

### Data Integrity
- All data files are committed to the package — no external fetches required for Task 3
- FRED macro data uses public CSV export (no API key)
- Stablecoin data from DefiLlama (free, no API key)
- Raw JSON preserves both `totalCirculating` and `totalCirculatingUSD` fields

### Statistical Rigor
- Weekly resampling for cointegration (handles FRED gaps — weekends, holidays)
- Log transformation for level variables (stablecoin supply, RRP, Fed assets)
- Rate variables (DFF, SOFR) left in percentage-point form
- Johansen test uses `det_order=0` (no deterministic term in cointegrating equation)
- VECM lag order `k_ar_diff=2` (standard for weekly macro data)
- Engle-Granger ADF uses AIC-selected lag length

### Docx Manipulation
- Document is treated as a ZIP archive (standard OOXML)
- Prose is inserted as `<w:p><w:r><w:t>` elements in `word/document.xml`
- A `.docx.bak` backup is created before any modification
- Exhibit verification scans for "Exhibit N:" patterns post-insertion

### No Overwriting
- Each task writes its own `results/taskN_results.json`
- The master runner writes `results/run_all_summary.json`
- Pre-computed `results/task3_results.json` is included as a reference

---

## Expected Output (Task 3 — Pre-computed)

```
Task 3: PASS
  r(circ, mcap)        ≈ 0.999992
  Max |Δcorr|          ≈ 0.0006
  SVB trough date:     2023-03-12
  USDC implied price:  ~$0.96
  Total mcap decline:  ~$4.1B
  Supply effect:       ~61% of decline
  Price effect / mcap: ~0.24% of pre-event cap
```

---

## Execution Order & Dependencies

```
Task 3 (no deps)  ─────────────────────→  ╲
Task 2 (network)  ─────────────────────→   ╲→  Apply to docx  →  Verify exhibits
Task 1 (statsmodels) ─────────────────→   ╱
```

Task 3 can always run. Tasks 1 and 2 may fail gracefully (errors are logged, other tasks continue).

---

## Key Paper Findings (Context for Prose Inserts)

| Finding | Statistic | Source |
|---------|-----------|--------|
| Fed Assets ↔ Stablecoin Supply | r = −0.94 | Exhibit 6 |
| Fed Funds Rate ↔ Supply | r = −0.89 | Exhibit 2 |
| ON RRP ↔ Supply | r = −0.72 | Exhibit 5 |
| SOFR ↔ Supply | r = −0.87 | Exhibit 6 |
| Circ vs Mcap correlation | r = 0.999992 | Task 3 |
| Max macro corr difference | Δ = 0.0006 | Task 3 |
| USDC SVB trough price | ~$0.96 | Task 3 |
| Stablecoin growth (3yr) | $137B → $307B (+124%) | Exhibit 1 |
| USDT dominance | 50% → 61% | Exhibit 3 |

---

## Troubleshooting

**`ModuleNotFoundError: statsmodels`**
→ `pip install statsmodels --break-system-packages`

**Task 2 fails with network error**
→ Run with `--task3-only` flag; Task 2 requires FRED access

**Docx not updating**
→ Check that `Regulating_Routers_Fed_Paper_Final.docx` exists in the package root
→ Use `--skip-docx` to compute results without modifying the document

**Exhibit verification shows missing exhibits**
→ Exhibits A, B, C, E are pending (planned for Dune integration phase)
→ Exhibits 1–8 should all be present in the current document

---

## File Sizes (Reference)

| File | Approximate Size |
|------|-----------------|
| `fred_macro.csv` | ~85 KB |
| `stablecoins.csv` | ~180 KB |
| `stablecoin_aggregate.json` | ~3.5 MB |
| `stablecoin_usdc.json` | ~1.6 MB |
| `Regulating_Routers_Fed_Paper_Final.docx` | ~1.3 MB |
| `task3_results.json` | ~4 KB |
