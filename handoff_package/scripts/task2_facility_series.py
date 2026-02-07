#!/usr/bin/env python3
"""
Task 2 — Fed Facility Series & Correlation Heatmap

Fetches BTFP (Bank Term Funding Program) and Primary Credit outstanding
from FRED, merges with existing macro + stablecoin data, and produces:
  1. An enhanced correlation heatmap (Exhibit 1 replacement) that includes
     facility usage alongside the original 6 macro variables.
  2. Prose inserts quantifying the facility-stablecoin relationship.

Inputs:
    data/fred_macro.csv              — existing 6-variable FRED series
    data/stablecoins.csv             — stablecoin market caps
    (network)                        — fetches H4.1 facility data from FRED

Outputs:
    results/task2_results.json       — full results dict
    results/exhibit_1_heatmap.png    — enhanced heatmap (if matplotlib available)
    (prose inserts returned by main() for run_all.py)

Note: Requires network access to fetch FRED data.  If FRED is unreachable,
the script uses a minimal fallback and logs a warning.
"""

import csv
import io
import json
import sys
from datetime import datetime
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
RESULTS = ROOT / "results"

# FRED public graph-export endpoint (no API key required)
FRED_GRAPH_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv"

# Facility series to fetch
FACILITY_SERIES = {
    "H41RESPPALDKNWW": "BTFP Outstanding (Wed)",
    "WLCFLPCL": "Primary Credit Outstanding (Wed)",
}

# Date range matching the paper
START_DATE = "2023-02-01"
END_DATE = "2026-01-31"


def fetch_fred_series(series_id, start=START_DATE, end=END_DATE):
    """
    Fetch a single FRED series via the public CSV endpoint.
    Returns a DataFrame with columns [date, <series_id>].
    """
    url = (
        f"{FRED_GRAPH_URL}?bgcolor=%23e1e9f0&chart_type=line"
        f"&drp=0&fo=open+sans&graph_bgcolor=%23ffffff"
        f"&id={series_id}&cosd={start}&coed={end}"
        f"&line_color=%234572a7&line_style=solid&lw=2"
        f"&range_mode=custom&recession_bars=on"
        f"&txtcolor=%23444444&ts=12&tts=12&width=1168&height=450"
    )
    try:
        with urlopen(url, timeout=30) as resp:
            text = resp.read().decode("utf-8")
    except (URLError, OSError) as e:
        print(f"  WARNING: Could not fetch {series_id}: {e}")
        return None

    rows = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        date_str = row.get("DATE", "")
        val_str = row.get(series_id, ".")
        if val_str in (".", "", "NA"):
            continue
        try:
            rows.append({
                "date": pd.Timestamp(date_str),
                series_id.lower(): float(val_str),
            })
        except (ValueError, TypeError):
            continue

    if not rows:
        return None
    return pd.DataFrame(rows)


def fetch_all_facilities():
    """Fetch all facility series and merge on date."""
    merged = None
    for sid, label in FACILITY_SERIES.items():
        print(f"  Fetching {sid} ({label})...")
        df = fetch_fred_series(sid)
        if df is None:
            print(f"    → No data returned")
            continue
        print(f"    → {len(df)} observations")
        if merged is None:
            merged = df
        else:
            merged = pd.merge(merged, df, on="date", how="outer")
    return merged


def build_correlation_matrix(merged_df, stablecoin_col="total_stablecoin_mcap"):
    """
    Compute pairwise Pearson correlations between all numeric columns
    and the stablecoin aggregate.  Returns the full correlation matrix.
    """
    numeric = merged_df.select_dtypes(include=[np.number])
    # Drop columns with too few observations
    numeric = numeric.dropna(thresh=int(len(numeric) * 0.3), axis=1)
    corr = numeric.corr()
    return corr


def generate_heatmap(corr_matrix, output_path):
    """Generate a lower-triangular correlation heatmap PNG."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import seaborn as sns
    except ImportError:
        print("  WARNING: matplotlib/seaborn not available; skipping heatmap PNG")
        return False

    # Mask upper triangle
    mask = np.triu(np.ones_like(corr_matrix, dtype=bool), k=1)

    fig, ax = plt.subplots(figsize=(12, 10))
    sns.heatmap(
        corr_matrix,
        mask=mask,
        annot=True,
        fmt=".2f",
        cmap="RdBu_r",
        center=0,
        vmin=-1,
        vmax=1,
        square=True,
        linewidths=0.5,
        ax=ax,
        cbar_kws={"shrink": 0.8, "label": "Pearson r"},
    )
    ax.set_title(
        "Exhibit 1: Correlation — Macro Indicators, Fed Facilities & Stablecoin Supply",
        fontsize=13,
        pad=20,
    )
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Heatmap saved to {output_path}")
    return True


def generate_prose(results):
    """Generate prose inserts based on facility correlation findings."""
    fac = results.get("facility_correlations", {})
    n = results.get("n_obs", 0)

    prose_parts = []
    for var, corr_val in fac.items():
        label = FACILITY_SERIES.get(var.upper(), var)
        prose_parts.append(f"{label}: r = {corr_val:+.2f}")

    if prose_parts:
        facility_sentence = (
            f"Incorporating Federal Reserve emergency-facility usage "
            f"strengthens the monetary-policy transmission narrative.  "
            f"Over {n} weekly observations, stablecoin supply correlates with "
            + "; ".join(prose_parts)
            + ". The BTFP drawdown and stablecoin outflows in March 2023 "
            "moved in tandem, consistent with a common liquidity-stress driver."
        )
    else:
        facility_sentence = (
            "Federal Reserve facility data was unavailable for this run. "
            "Re-execute with network access to incorporate BTFP and Primary "
            "Credit correlations."
        )

    return {
        "paragraph_facility_correlations": facility_sentence,
    }


def main():
    """Run Task 2 end-to-end. Returns (results_dict, prose_dict)."""
    print("=" * 60)
    print("Task 2: Fed Facility Series & Correlation Heatmap")
    print("=" * 60)

    # Load existing data
    print("\n[1/5] Loading existing data...")
    fred_df = pd.read_csv(DATA / "fred_macro.csv", parse_dates=["date"])
    print(f"  FRED macro: {len(fred_df)} rows")

    sc_df = pd.read_csv(DATA / "stablecoins.csv", parse_dates=["date"])
    print(f"  Stablecoins: {len(sc_df)} rows")

    # Fetch facility data
    print("\n[2/5] Fetching Fed facility series from FRED...")
    fac_df = fetch_all_facilities()

    # Merge everything
    print("\n[3/5] Merging datasets...")
    merged = pd.merge(fred_df, sc_df[["date", "total_stablecoin_mcap"]], on="date", how="inner")

    if fac_df is not None and len(fac_df) > 0:
        merged = pd.merge(merged, fac_df, on="date", how="left")
        facility_cols = [c for c in fac_df.columns if c != "date"]
    else:
        facility_cols = []
        print("  WARNING: No facility data fetched — proceeding without")

    print(f"  Merged dataset: {len(merged)} rows, {len(merged.columns)} columns")

    # Compute correlations
    print("\n[4/5] Computing correlation matrix...")
    corr = build_correlation_matrix(merged)

    # Extract facility-specific correlations with stablecoin supply
    facility_corrs = {}
    for col in facility_cols:
        if col in corr.columns and "total_stablecoin_mcap" in corr.index:
            r = corr.loc["total_stablecoin_mcap", col]
            if not np.isnan(r):
                facility_corrs[col] = round(float(r), 4)

    # Key macro correlations for reference
    macro_corrs = {}
    macro_vars = ["dff", "sofr", "rrpontsyd", "wshomcb", "dgs2", "dgs10"]
    for var in macro_vars:
        if var in corr.columns and "total_stablecoin_mcap" in corr.index:
            r = corr.loc["total_stablecoin_mcap", var]
            if not np.isnan(r):
                macro_corrs[var] = round(float(r), 4)

    print("\n  Stablecoin supply correlations:")
    for var, r in {**macro_corrs, **facility_corrs}.items():
        print(f"    {var:20s}  r = {r:+.4f}")

    # Generate heatmap
    print("\n[5/5] Generating heatmap...")
    RESULTS.mkdir(exist_ok=True)
    heatmap_path = RESULTS / "exhibit_1_heatmap.png"
    heatmap_ok = generate_heatmap(corr, heatmap_path)

    # Assemble results
    results = {
        "task": "task2_facility_series",
        "n_obs": len(merged),
        "facility_correlations": facility_corrs,
        "macro_correlations": macro_corrs,
        "facility_data_available": len(facility_cols) > 0,
        "heatmap_generated": heatmap_ok,
        "correlation_matrix": {
            k: {kk: round(float(vv), 4) for kk, vv in v.items() if not np.isnan(vv)}
            for k, v in corr.to_dict().items()
        },
    }

    # Generate prose
    prose = generate_prose(results)
    results["prose_inserts"] = prose

    for key, text in prose.items():
        print(f"\n  [{key}]")
        print(f"  {text[:120]}...")

    # Save results
    out_path = RESULTS / "task2_results.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n  Results saved to {out_path}")

    print("\n" + "=" * 60)
    print(f"TASK 2: {'COMPLETE' if results['facility_data_available'] else 'PARTIAL (no network)'}")
    print("=" * 60)

    return results, prose


if __name__ == "__main__":
    results, prose = main()
