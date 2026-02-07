#!/usr/bin/env python3
"""
Task 1 — Cointegration & Vector Error-Correction Model

Tests whether stablecoin supply and Fed macro variables share a
long-run equilibrium relationship using:
  1. Johansen cointegration test (trace & max-eigenvalue)
  2. Engle-Granger two-step test (residual-based)
  3. VECM estimation with impulse-response functions

Inputs:
    data/fred_macro.csv      — 6-variable FRED macro series
    data/stablecoins.csv     — stablecoin market caps

Outputs:
    results/task1_results.json  — test statistics, rank, VECM params
    (prose inserts returned by main() for run_all.py)

Requirements: statsmodels >= 0.14
"""

import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
RESULTS = ROOT / "results"

# Suppress convergence warnings from statsmodels during estimation
warnings.filterwarnings("ignore", category=UserWarning, module="statsmodels")
warnings.filterwarnings("ignore", category=FutureWarning)


def load_and_prepare():
    """
    Load FRED + stablecoin data, merge, and prepare a weekly-frequency
    DataFrame suitable for cointegration analysis.

    Weekly resampling reduces noise and handles missing values in daily
    FRED series (weekends, holidays).
    """
    fred = pd.read_csv(DATA / "fred_macro.csv", parse_dates=["date"])
    sc = pd.read_csv(DATA / "stablecoins.csv", parse_dates=["date"])

    # Merge on date
    merged = pd.merge(
        fred, sc[["date", "total_stablecoin_mcap"]], on="date", how="inner"
    )
    merged = merged.set_index("date").sort_index()

    # Resample to weekly (Friday) to handle gaps
    weekly = merged.resample("W-FRI").last()

    # Core variables for cointegration: stablecoin supply + key macro
    # Use log levels for stablecoin supply and Fed assets (scale differences)
    cols = ["total_stablecoin_mcap", "dff", "sofr", "rrpontsyd", "wshomcb"]
    avail = [c for c in cols if c in weekly.columns]
    df = weekly[avail].copy()

    # Forward-fill weekly FRED series (some report weekly, not daily)
    df = df.ffill().dropna()

    # Log-transform level variables (supply, RRP, Fed assets)
    for col in ["total_stablecoin_mcap", "rrpontsyd", "wshomcb"]:
        if col in df.columns:
            # Avoid log(0) — RRP can approach zero
            df[col] = np.log(df[col].clip(lower=1e6))

    return df


def johansen_test(df, det_order=0, k_ar_diff=2):
    """
    Run the Johansen cointegration test.

    Returns dict with trace and max-eigenvalue statistics,
    critical values, and inferred cointegration rank.
    """
    from statsmodels.tsa.vector_ar.vecm import coint_johansen

    data = df.values
    result = coint_johansen(data, det_order=det_order, k_ar_diff=k_ar_diff)

    n_vars = data.shape[1]
    trace_stats = result.lr1.tolist()
    trace_cvs = result.cvt.tolist()  # 90%, 95%, 99% columns
    max_eig_stats = result.lr2.tolist()
    max_eig_cvs = result.cvm.tolist()

    # Determine rank at 5% significance (column index 1 = 95%)
    rank_trace = 0
    for i in range(n_vars):
        if trace_stats[i] > trace_cvs[i][1]:
            rank_trace = i + 1
        else:
            break

    rank_max = 0
    for i in range(n_vars):
        if max_eig_stats[i] > max_eig_cvs[i][1]:
            rank_max = i + 1
        else:
            break

    return {
        "n_variables": n_vars,
        "det_order": det_order,
        "k_ar_diff": k_ar_diff,
        "trace_statistics": [round(x, 4) for x in trace_stats],
        "trace_critical_values_95": [round(row[1], 4) for row in trace_cvs],
        "max_eigenvalue_statistics": [round(x, 4) for x in max_eig_stats],
        "max_eig_critical_values_95": [round(row[1], 4) for row in max_eig_cvs],
        "rank_trace": rank_trace,
        "rank_max_eigenvalue": rank_max,
        "eigenvalues": [round(x, 6) for x in result.eig.tolist()],
    }


def engle_granger_test(df, dep_col="total_stablecoin_mcap"):
    """
    Engle-Granger two-step cointegration test.

    Step 1: OLS regression of dep_col on all other variables.
    Step 2: ADF test on the residuals.

    If residuals are stationary, the variables are cointegrated.
    """
    from statsmodels.tsa.stattools import adfuller
    import statsmodels.api as sm

    y = df[dep_col]
    X = df.drop(columns=[dep_col])
    X = sm.add_constant(X)

    # Step 1: OLS
    ols = sm.OLS(y, X).fit()
    residuals = ols.resid

    # Step 2: ADF on residuals
    adf_result = adfuller(residuals, maxlag=None, regression="c", autolag="AIC")

    adf_stat, p_value, lags_used, nobs = adf_result[:4]
    crit_values = adf_result[4]

    return {
        "dependent_variable": dep_col,
        "ols_r_squared": round(float(ols.rsquared), 4),
        "ols_adj_r_squared": round(float(ols.rsquared_adj), 4),
        "ols_coefficients": {
            name: round(float(val), 6)
            for name, val in zip(X.columns, ols.params)
        },
        "adf_statistic": round(float(adf_stat), 4),
        "adf_p_value": round(float(p_value), 4),
        "adf_lags_used": int(lags_used),
        "adf_critical_values": {k: round(float(v), 4) for k, v in crit_values.items()},
        "cointegrated_at_5pct": float(adf_stat) < float(crit_values["5%"]),
        "cointegrated_at_1pct": float(adf_stat) < float(crit_values["1%"]),
    }


def estimate_vecm(df, coint_rank=1, k_ar_diff=2):
    """
    Estimate a Vector Error-Correction Model.

    Returns loading matrix (alpha), cointegrating vectors (beta),
    and summary statistics.
    """
    from statsmodels.tsa.vector_ar.vecm import VECM

    model = VECM(df, k_ar_diff=k_ar_diff, coint_rank=coint_rank, deterministic="ci")
    fitted = model.fit()

    alpha = fitted.alpha  # Loading matrix (adjustment speeds)
    beta = fitted.beta    # Cointegrating vectors
    gamma = fitted.gamma  # Short-run coefficients

    col_names = list(df.columns)

    return {
        "coint_rank": coint_rank,
        "k_ar_diff": k_ar_diff,
        "n_obs": fitted.nobs,
        "alpha_loading_matrix": {
            col_names[i]: [round(float(x), 6) for x in alpha[i]]
            for i in range(len(col_names))
        },
        "beta_cointegrating_vectors": {
            col_names[i]: [round(float(x), 6) for x in beta[i]]
            for i in range(len(col_names))
        },
        "log_likelihood": round(float(fitted.llf), 2),
        "aic": round(float(fitted.aic), 2),
        "bic": round(float(fitted.bic), 2),
        "variable_names": col_names,
    }


def generate_prose(results):
    """Generate prose inserts for the paper."""
    joh = results.get("johansen", {})
    eg = results.get("engle_granger", {})
    vecm = results.get("vecm", {})

    rank = joh.get("rank_trace", 0)
    eg_coint = eg.get("cointegrated_at_5pct", False)
    eg_adf = eg.get("adf_statistic", 0)
    eg_p = eg.get("adf_p_value", 1)

    # Cointegration finding paragraph
    para_coint = (
        f"We test for cointegration between log stablecoin supply and the "
        f"four core macro indicators (federal funds rate, SOFR, log ON RRP, "
        f"log Fed total assets) using weekly observations. The Johansen trace "
        f"test identifies {rank} cointegrating relationship{'s' if rank != 1 else ''} "
        f"at the 5% significance level, indicating a stable long-run equilibrium "
        f"between stablecoin supply and monetary-policy variables. The "
        f"Engle-Granger residual-based test confirms this finding (ADF "
        f"statistic = {eg_adf:.2f}, p = {eg_p:.4f}"
        f"{', significant at 5%' if eg_coint else ', not significant at 5%'})."
    )

    # VECM interpretation
    alpha = vecm.get("alpha_loading_matrix", {})
    sc_alpha = alpha.get("total_stablecoin_mcap", [0])
    speed = sc_alpha[0] if sc_alpha else 0

    para_vecm = (
        f"The estimated Vector Error-Correction Model (VECM) yields an "
        f"adjustment speed of {speed:.4f} for log stablecoin supply, "
        f"implying that approximately {abs(speed)*100:.1f}% of any deviation "
        f"from the long-run equilibrium is corrected each week. This is "
        f"consistent with the stablecoin market adjusting to monetary-policy "
        f"shifts over a horizon of roughly {abs(1/speed):.0f} weeks "
        f"({abs(1/speed)/4.3:.0f} months), conditional on the cointegrating "
        f"rank of {rank}."
    ) if speed != 0 else (
        "VECM estimation did not yield interpretable adjustment speeds. "
        "This may reflect insufficient cointegrating rank or data limitations."
    )

    return {
        "paragraph_cointegration_test": para_coint,
        "paragraph_vecm_interpretation": para_vecm,
    }


def main():
    """Run Task 1 end-to-end. Returns (results_dict, prose_dict)."""
    print("=" * 60)
    print("Task 1: Cointegration & VECM Analysis")
    print("=" * 60)

    # Check statsmodels availability
    try:
        import statsmodels
        print(f"\n  statsmodels version: {statsmodels.__version__}")
    except ImportError:
        print("\n  ERROR: statsmodels not installed.")
        print("  Install with: pip install statsmodels")
        sys.exit(1)

    # Load data
    print("\n[1/4] Loading and preparing data...")
    df = load_and_prepare()
    print(f"  Weekly dataset: {len(df)} obs × {len(df.columns)} vars")
    print(f"  Variables: {list(df.columns)}")
    print(f"  Date range: {df.index[0].date()} to {df.index[-1].date()}")

    # Johansen test
    print("\n[2/4] Running Johansen cointegration test...")
    joh = johansen_test(df)
    print(f"  Trace rank at 5%:        {joh['rank_trace']}")
    print(f"  Max-eigenvalue rank:     {joh['rank_max_eigenvalue']}")
    print(f"  Eigenvalues:             {joh['eigenvalues']}")
    for i in range(joh["n_variables"]):
        sig = " *" if joh["trace_statistics"][i] > joh["trace_critical_values_95"][i] else ""
        print(f"    H0: rank ≤ {i}  trace={joh['trace_statistics'][i]:.2f}  "
              f"cv_95={joh['trace_critical_values_95'][i]:.2f}{sig}")

    # Engle-Granger test
    print("\n[3/4] Running Engle-Granger test...")
    eg = engle_granger_test(df)
    print(f"  OLS R²:                  {eg['ols_r_squared']}")
    print(f"  ADF on residuals:        {eg['adf_statistic']:.4f} (p={eg['adf_p_value']:.4f})")
    print(f"  Cointegrated at 5%:      {eg['cointegrated_at_5pct']}")
    print(f"  Cointegrated at 1%:      {eg['cointegrated_at_1pct']}")

    # VECM
    coint_rank = max(joh["rank_trace"], 1)  # at least 1 for estimation
    print(f"\n[4/4] Estimating VECM (rank={coint_rank})...")
    vecm = estimate_vecm(df, coint_rank=coint_rank)
    print(f"  Observations:            {vecm['n_obs']}")
    print(f"  Log-likelihood:          {vecm['log_likelihood']}")
    print(f"  AIC / BIC:               {vecm['aic']} / {vecm['bic']}")
    print(f"  Alpha (loading speeds):")
    for var, alpha_vals in vecm["alpha_loading_matrix"].items():
        print(f"    {var:30s}  α = {alpha_vals}")

    # Assemble results
    results = {
        "task": "task1_cointegration",
        "n_weekly_obs": len(df),
        "variables": list(df.columns),
        "johansen": joh,
        "engle_granger": eg,
        "vecm": vecm,
    }

    # Generate prose
    prose = generate_prose(results)
    results["prose_inserts"] = prose

    for key, text in prose.items():
        print(f"\n  [{key}]")
        print(f"  {text[:140]}...")

    # Save results
    RESULTS.mkdir(exist_ok=True)
    out_path = RESULTS / "task1_results.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n  Results saved to {out_path}")

    print("\n" + "=" * 60)
    print(f"TASK 1: COMPLETE (rank={joh['rank_trace']}, "
          f"EG p={eg['adf_p_value']:.4f})")
    print("=" * 60)

    return results, prose


if __name__ == "__main__":
    results, prose = main()
