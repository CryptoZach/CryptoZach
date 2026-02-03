#!/usr/bin/env python3
"""Generate Fed research exhibits from fetched macro + stablecoin data."""

import argparse
import sys
import warnings
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd
import seaborn as sns
import yaml

warnings.filterwarnings("ignore", category=FutureWarning)

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config" / "settings.yaml"
PROC_DIR = ROOT / "data" / "processed"
EXHIBITS_DIR = ROOT / "output" / "exhibits"

# Publication styling
plt.rcParams.update({
    "figure.dpi": 150,
    "savefig.dpi": 150,
    "font.family": "sans-serif",
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.labelsize": 11,
    "legend.fontsize": 9,
    "figure.figsize": (12, 7),
    "axes.grid": True,
    "grid.alpha": 0.3,
    "axes.spines.top": False,
    "axes.spines.right": False,
})

COLORS = {
    "usdt": "#26A17B",
    "usdc": "#2775CA",
    "dai": "#F5AC37",
    "busd": "#F0B90B",
    "frax": "#000000",
    "tusd": "#002868",
    "pyusd": "#0070E0",
    "fdusd": "#25B770",
    "usdp": "#00522C",
    "usde": "#7C3AED",
    "total": "#1a1a2e",
    "fed_rate": "#D62828",
    "rrp": "#457B9D",
}


def load_data():
    """Load processed CSVs into DataFrames."""
    data = {}

    fred_path = PROC_DIR / "fred_macro.csv"
    if fred_path.exists():
        df = pd.read_csv(fred_path, parse_dates=["date"])
        data["fred"] = df
        print(f"  Loaded FRED data: {len(df)} rows, columns: {list(df.columns)}")
    else:
        print("  WARNING: No FRED data found.")

    sc_path = PROC_DIR / "stablecoins.csv"
    if sc_path.exists():
        df = pd.read_csv(sc_path, parse_dates=["date"])
        data["stablecoins"] = df
        print(f"  Loaded stablecoin data: {len(df)} rows, columns: {list(df.columns)}")
    else:
        print("  WARNING: No stablecoin data found.")

    dune_path = PROC_DIR / "dune_stablecoin_volumes.csv"
    if dune_path.exists():
        df = pd.read_csv(dune_path)
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"])
        data["dune"] = df
        print(f"  Loaded Dune data: {len(df)} rows")

    return data


def exhibit1_total_supply(data: dict):
    """Exhibit 1: Total Stablecoin Supply Over Time."""
    sc = data.get("stablecoins")
    if sc is None or "total_stablecoin_mcap" not in sc.columns:
        print("  SKIP exhibit 1: no total_stablecoin_mcap column")
        return

    fig, ax = plt.subplots()
    df = sc.dropna(subset=["total_stablecoin_mcap"]).copy()
    df["total_B"] = df["total_stablecoin_mcap"] / 1e9

    ax.fill_between(df["date"], df["total_B"], alpha=0.3, color=COLORS["total"])
    ax.plot(df["date"], df["total_B"], color=COLORS["total"], linewidth=2)

    ax.set_title("Exhibit 1: Total Stablecoin Market Capitalization")
    ax.set_xlabel("Date")
    ax.set_ylabel("Market Cap ($ Billions)")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    fig.autofmt_xdate()

    out = EXHIBITS_DIR / "exhibit_1_total_supply.png"
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    print(f"  ✓ {out.name}")


def exhibit2_supply_vs_fed_rate(data: dict):
    """Exhibit 2: Stablecoin Supply vs Federal Funds Rate."""
    sc = data.get("stablecoins")
    fred = data.get("fred")
    if sc is None or fred is None:
        print("  SKIP exhibit 2: missing data")
        return

    if "total_stablecoin_mcap" not in sc.columns:
        print("  SKIP exhibit 2: no total_stablecoin_mcap")
        return

    rate_col = "dff" if "dff" in fred.columns else None
    if rate_col is None:
        print("  SKIP exhibit 2: no federal funds rate column")
        return

    # Merge on date (use nearest day)
    sc_daily = sc[["date", "total_stablecoin_mcap"]].dropna().copy()
    sc_daily["date"] = pd.to_datetime(sc_daily["date"]).dt.normalize()
    fred_daily = fred[["date", rate_col]].dropna().copy()
    fred_daily["date"] = pd.to_datetime(fred_daily["date"]).dt.normalize()

    merged = pd.merge_asof(
        sc_daily.sort_values("date"),
        fred_daily.sort_values("date"),
        on="date",
        direction="nearest",
    )

    fig, ax1 = plt.subplots()
    ax2 = ax1.twinx()

    merged["total_B"] = merged["total_stablecoin_mcap"] / 1e9

    ax1.plot(merged["date"], merged["total_B"], color=COLORS["total"],
             linewidth=2, label="Total Stablecoin Supply")
    ax2.plot(merged["date"], merged[rate_col], color=COLORS["fed_rate"],
             linewidth=2, linestyle="--", label="Fed Funds Rate")

    ax1.set_xlabel("Date")
    ax1.set_ylabel("Stablecoin Market Cap ($ Billions)", color=COLORS["total"])
    ax2.set_ylabel("Federal Funds Rate (%)", color=COLORS["fed_rate"])
    ax2.spines["right"].set_visible(True)

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")

    ax1.set_title("Exhibit 2: Stablecoin Supply vs Federal Funds Rate")
    ax1.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax1.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    fig.autofmt_xdate()

    out = EXHIBITS_DIR / "exhibit_2_supply_vs_rate.png"
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    print(f"  ✓ {out.name}")


def exhibit3_market_share(data: dict):
    """Exhibit 3: Individual Stablecoin Market Share (Stacked Area)."""
    sc = data.get("stablecoins")
    if sc is None:
        print("  SKIP exhibit 3: no stablecoin data")
        return

    mcap_cols = [c for c in sc.columns if c.endswith("_mcap") and c != "total_stablecoin_mcap"]
    if not mcap_cols:
        print("  SKIP exhibit 3: no individual stablecoin columns")
        return

    df = sc[["date"] + mcap_cols].dropna(subset=mcap_cols, how="all").copy()
    df = df.fillna(0)

    # Convert to billions
    for col in mcap_cols:
        df[col + "_B"] = df[col] / 1e9

    b_cols = [c + "_B" for c in mcap_cols]
    labels = [c.replace("_mcap", "").upper() for c in mcap_cols]

    colors = []
    for col in mcap_cols:
        token = col.replace("_mcap", "")
        colors.append(COLORS.get(token, "#888888"))

    fig, ax = plt.subplots()
    ax.stackplot(df["date"], *[df[c] for c in b_cols], labels=labels, colors=colors, alpha=0.85)

    ax.set_title("Exhibit 3: Stablecoin Market Capitalization by Token")
    ax.set_xlabel("Date")
    ax.set_ylabel("Market Cap ($ Billions)")
    ax.legend(loc="upper left", ncol=3, fontsize=8)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    fig.autofmt_xdate()

    out = EXHIBITS_DIR / "exhibit_3_market_share.png"
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    print(f"  ✓ {out.name}")


def exhibit4_net_supply_changes(data: dict):
    """Exhibit 4: Monthly Net Supply Changes for Major Stablecoins."""
    sc = data.get("stablecoins")
    if sc is None:
        print("  SKIP exhibit 4: no stablecoin data")
        return

    mcap_cols = [c for c in sc.columns if c.endswith("_mcap") and c != "total_stablecoin_mcap"]
    if not mcap_cols:
        print("  SKIP exhibit 4: no individual stablecoin columns")
        return

    df = sc[["date"] + mcap_cols].dropna(subset=mcap_cols, how="all").copy()
    df = df.fillna(0)
    df.set_index("date", inplace=True)

    # Resample to monthly and compute diff
    monthly = df.resample("MS").last()
    changes = monthly.diff().dropna()

    # Select top stablecoins by average market cap
    avg_mcap = monthly.mean().sort_values(ascending=False)
    top_cols = avg_mcap.head(6).index.tolist()

    labels = [c.replace("_mcap", "").upper() for c in top_cols]
    colors = [COLORS.get(c.replace("_mcap", ""), "#888888") for c in top_cols]

    fig, ax = plt.subplots()
    x = changes.index
    bar_width = 15  # days

    for i, (col, label, color) in enumerate(zip(top_cols, labels, colors)):
        offset = (i - len(top_cols) / 2) * bar_width / len(top_cols)
        vals = changes[col] / 1e9
        ax.bar(x + pd.Timedelta(days=offset), vals, width=bar_width / len(top_cols),
               label=label, color=color, alpha=0.8)

    ax.axhline(y=0, color="black", linewidth=0.5)
    ax.set_title("Exhibit 4: Monthly Net Supply Changes — Major Stablecoins")
    ax.set_xlabel("Date")
    ax.set_ylabel("Net Change ($ Billions)")
    ax.legend(loc="best", fontsize=8)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    fig.autofmt_xdate()

    out = EXHIBITS_DIR / "exhibit_4_net_supply_changes.png"
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    print(f"  ✓ {out.name}")


def exhibit5_supply_vs_rrp(data: dict):
    """Exhibit 5: Stablecoin Supply vs Overnight Reverse Repo Facility."""
    sc = data.get("stablecoins")
    fred = data.get("fred")
    if sc is None or fred is None:
        print("  SKIP exhibit 5: missing data")
        return

    if "total_stablecoin_mcap" not in sc.columns:
        print("  SKIP exhibit 5: no total_stablecoin_mcap")
        return

    rrp_col = "rrpontsyd" if "rrpontsyd" in fred.columns else None
    if rrp_col is None:
        print("  SKIP exhibit 5: no RRPONTSYD column")
        return

    sc_daily = sc[["date", "total_stablecoin_mcap"]].dropna().copy()
    sc_daily["date"] = pd.to_datetime(sc_daily["date"]).dt.normalize()
    fred_daily = fred[["date", rrp_col]].dropna().copy()
    fred_daily["date"] = pd.to_datetime(fred_daily["date"]).dt.normalize()

    merged = pd.merge_asof(
        sc_daily.sort_values("date"),
        fred_daily.sort_values("date"),
        on="date",
        direction="nearest",
    )

    fig, ax1 = plt.subplots()
    ax2 = ax1.twinx()

    merged["total_B"] = merged["total_stablecoin_mcap"] / 1e9
    merged["rrp_B"] = merged[rrp_col] / 1  # FRED RRP is already in billions

    ax1.plot(merged["date"], merged["total_B"], color=COLORS["total"],
             linewidth=2, label="Total Stablecoin Supply")
    ax2.plot(merged["date"], merged["rrp_B"], color=COLORS["rrp"],
             linewidth=2, linestyle="--", label="ON RRP Outstanding")

    ax1.set_xlabel("Date")
    ax1.set_ylabel("Stablecoin Market Cap ($ Billions)", color=COLORS["total"])
    ax2.set_ylabel("ON RRP ($ Billions)", color=COLORS["rrp"])
    ax2.spines["right"].set_visible(True)

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")

    ax1.set_title("Exhibit 5: Stablecoin Supply vs Overnight Reverse Repo")
    ax1.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax1.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    fig.autofmt_xdate()

    out = EXHIBITS_DIR / "exhibit_5_supply_vs_rrp.png"
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    print(f"  ✓ {out.name}")


def exhibit6_correlation_heatmap(data: dict):
    """Exhibit 6: Correlation Heatmap — Macro Indicators vs Stablecoin Supply."""
    sc = data.get("stablecoins")
    fred = data.get("fred")
    if sc is None or fred is None:
        print("  SKIP exhibit 6: missing data")
        return

    # Merge stablecoin and macro data
    sc_daily = sc.copy()
    sc_daily["date"] = pd.to_datetime(sc_daily["date"]).dt.normalize()
    fred_daily = fred.copy()
    fred_daily["date"] = pd.to_datetime(fred_daily["date"]).dt.normalize()

    merged = pd.merge_asof(
        sc_daily.sort_values("date"),
        fred_daily.sort_values("date"),
        on="date",
        direction="nearest",
    )

    # Select numeric columns of interest
    rename_map = {}
    for col in merged.columns:
        if col == "total_stablecoin_mcap":
            rename_map[col] = "Total Stablecoin Supply"
        elif col.endswith("_mcap"):
            rename_map[col] = col.replace("_mcap", "").upper()
        elif col == "dff":
            rename_map[col] = "Fed Funds Rate"
        elif col == "dgs2":
            rename_map[col] = "2Y Treasury"
        elif col == "dgs10":
            rename_map[col] = "10Y Treasury"
        elif col == "sofr":
            rename_map[col] = "SOFR"
        elif col == "rrpontsyd":
            rename_map[col] = "ON RRP"
        elif col == "wshomcb":
            rename_map[col] = "Fed Assets"

    numeric_cols = [c for c in rename_map.keys() if c in merged.columns]
    if len(numeric_cols) < 3:
        print("  SKIP exhibit 6: not enough numeric columns for correlation")
        return

    corr_df = merged[numeric_cols].rename(columns=rename_map)
    # Limit to columns with enough non-null values
    valid_cols = [c for c in corr_df.columns if corr_df[c].notna().sum() > 10]
    corr_df = corr_df[valid_cols]
    corr_matrix = corr_df.corr()

    fig, ax = plt.subplots(figsize=(10, 8))
    mask = np.triu(np.ones_like(corr_matrix, dtype=bool), k=1)
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
        cbar_kws={"shrink": 0.8},
    )
    ax.set_title("Exhibit 6: Correlation — Macro Indicators vs Stablecoin Supply")

    out = EXHIBITS_DIR / "exhibit_6_correlation_heatmap.png"
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    print(f"  ✓ {out.name}")


def main():
    parser = argparse.ArgumentParser(description="Generate Fed research exhibits")
    parser.add_argument("--all", action="store_true", help="Generate all exhibits")
    parser.add_argument("--exhibit", type=int, help="Generate specific exhibit number")
    args = parser.parse_args()

    EXHIBITS_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading data...")
    data = load_data()

    if not data:
        print("ERROR: No data available. Run fetch scripts first.")
        sys.exit(1)

    exhibit_funcs = {
        1: exhibit1_total_supply,
        2: exhibit2_supply_vs_fed_rate,
        3: exhibit3_market_share,
        4: exhibit4_net_supply_changes,
        5: exhibit5_supply_vs_rrp,
        6: exhibit6_correlation_heatmap,
    }

    if args.all:
        targets = list(exhibit_funcs.keys())
    elif args.exhibit:
        targets = [args.exhibit]
    else:
        targets = list(exhibit_funcs.keys())

    print(f"\nGenerating {len(targets)} exhibit(s)...")
    for n in targets:
        func = exhibit_funcs.get(n)
        if func:
            func(data)
        else:
            print(f"  Unknown exhibit: {n}")

    # Summary
    generated = list(EXHIBITS_DIR.glob("*.png"))
    print(f"\n{'='*50}")
    print(f"Pipeline complete. {len(generated)} exhibit(s) in {EXHIBITS_DIR}/")
    for f in sorted(generated):
        print(f"  • {f.name}")


if __name__ == "__main__":
    main()
