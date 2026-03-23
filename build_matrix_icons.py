#!/usr/bin/env python3
"""Build white-silhouette matrix icons for cryptozach.com hero animation."""

import os
import re
import struct
import subprocess
import sys
import time
from datetime import datetime
from io import BytesIO

# Ensure Homebrew cairo is discoverable by cairocffi (macOS arm64).
_brew_lib = "/opt/homebrew/lib"
if os.path.isdir(_brew_lib):
    os.environ.setdefault("DYLD_LIBRARY_PATH", _brew_lib)

import requests
from PIL import Image

# ── Manifests ──────────────────────────────────────────────────────────────

CRYPTO = {
    "btc":  ("bitcoin",     [],                   "btc"),
    "eth":  ("ethereum",    [],                   "eth"),
    "sol":  ("solana",      [],                   "sol"),
    "usdc": ("usdc",        [],                   "usdc"),
    "usdt": ("tether",      [],                   "usdt"),
    "dai":  ("dai",         [],                   "dai"),
    "hnt":  ("helium",      [],                   "hnt"),
    "fil":  ("filecoin",    [],                   "fil"),
    "uni":  ("uniswap",     [],                   "uni"),
    "aave": ("aave",        [],                   "aave"),
    "xrp":  ("xrp",         [],                   "xrp"),
    "ada":  ("cardano",     [],                   "ada"),
    "avax": ("avalanche",   [],                   "avax"),
    "dot":  ("polkadot",    [],                   "dot"),
    "atom": ("cosmos",      [],                   "atom"),
    "ltc":  ("litecoin",    [],                   "ltc"),
    "link": ("chainlink",   [],                   "link"),
    "xlm":  ("stellar",     [],                   "xlm"),
    "doge": ("dogecoin",    [],                   "doge"),
    "trx":  ("tron",        [],                   "trx"),
    "bnb":  ("binance",     [],                   "bnb"),
    "op":   ("optimism",    [],                   None),
    "arb":  ("arbitrum",    [],                   None),
    "near": ("near",        [],                   "near"),
    "apt":  ("aptos",       [],                   None),
    "sui":  ("sui",         [],                   None),
    "inj":  ("injective",   [],                   None),
    "hyperliquid": ("hyperliquid", [],           None),
    "tia":  ("celestia",    [],                   None),  # bundled build-sources/tia.png in npm manifest
    "xmr":  ("monero",      [],                   "xmr"),
    "zec":  ("zcash",       [],                   "zec"),
    "crv":  ("curvedao",    ["curvefi", "curve"], None),
    "ldo":  ("lido",        [],                   None),  # bundled build-sources/ldo.png in npm manifest
    "stx":  ("stacks",      [],                   "stx"),
    "mkr":  ("maker",       [],                   "mkr"),
    "xtz":  ("tezos",       [],                   "xtz"),
    "algo": ("algorand",    [],                   "algo"),
    "hbar": ("hedera",      [],                   "hbar"),
    "ton":  ("ton",         [],                   None),
    "sei":  ("sei",         [],                   None),  # bundled build-sources/sei.png in npm manifest
    "wld":  ("worldcoin",   [],                   None),
    "rndr": ("render",      [],                   "rndr"),
    "tao":  ("bittensor",   [],                   None),
    "kraken": ("kraken",     [],                   None),
    "metamask": ("metamask", [],                   None),
    "layerzero": ("layerzero", [],                 None),
    "wormhole": ("wormhole", [],                   None),
    "ondo": ("ondo", [],                           None),
    "zrx": ("0x", [],                             "zrx"),
    "base": ("base", [],                         None),
    "ink": ("ink", [],                           None),
    "arc": ("arc", [],                           None),
    "circle": ("circle", [],                     None),  # bundled Circle-logo.svg -> build-sources/circle.svg
    "m0": ("m0", [],                            None),
    "1inch": ("1inch", [],                     None),  # bundled build-sources/1inch.webp in npm manifest
    "busd": ("binanceusd", [],                 None),  # bundled build-sources/busd.svg (repo binance-usd-busd-logo.svg)
    "wlfi": ("worldlibertyfinancial", [],      None),  # bundled build-sources/wlfi.svg (square crop from World_Liberty_Logo.svg)
    "usdp": ("paxdollar", [],                  None),  # bundled build-sources/usdp.png (from repo USDP.jpeg; bg removed for matrix)
}

# Iconify paths when Simple Icons and cryptocurrency-icons miss (see scripts/build-matrix-icons.mjs).
ICONIFY_CRYPTO_PATHS = {
    "kraken": ["logos/kraken", "token-branded/kraken"],
    # Bundled build-sources/metamask.png in npm manifest; Iconify paths are fallback (wordmark is wide at 32px).
    "metamask": ["token-branded/metamask", "logos/metamask"],
    "base": ["token/base", "token-branded/base"],
    "ink": ["token/ink", "token-branded/ink"],
    "arc": ["token/arc", "token-branded/arc", "arcticons/arc"],
    "1inch": ["token/1inch", "simple-icons/1inch"],
}

# Before Simple Icons: correct mark (SI has no usdc slug; "circle" is the wrong brand).
# USDC / DAI: bundled build-sources/usdc.svg and dai.svg (glyph + ring, no filled brand disk) in Phase 0 first; then these.
# cashapp: bundled cashapp.svg (squircle ring + $ subpath; full SI path is muddy at 32px).
# link: bundled build-sources/link.svg (two overlapping rings; SI chainlink hex reads as faceted smear in matrix trail at ~20px).
# hbar: bundled hbar.svg (SI Hedera is a filled circle + H that whiten() reads as a blank disk at 20px).
# hnt: bundled build-sources/helium-hnt-logo.svg (full Helium mark; legacy stroke-only hnt.svg removed).
# hyperliquid: bundled build-sources/hyperliquid.svg (clean inline-fill version of hyper-foundation.svg); Phase 0 rasterizes to hyperliquid.png.
# bnb: bundled build-sources/bnb.svg (BNB Chain mark from bnb-chain-binance-smart-chain-logo.svg); Binance_Logo.svg.png in build-sources is reference only.
# ondo: bundled build-sources/ondo.png (CoinGecko ONDO token image; https://www.coingecko.com/en/coins/ondo-finance ; no SI slug).
# zrx: bundled build-sources/zrx.svg (Iconify token/zrx).
# mstr: bundled strategy-logo-2025.png from Strategy_logo_(2025).svg.png (SI microstrategy is legacy vertical bars).
# rndr: bundled build-sources/rndr.svg (center dot + C-arc + corner dot from render-token-logo.svg; red circle background omitted).
# arb: bundled arb.svg (bold ARB text; Iconify mark stacks fills and stroke hex + A was faint at 20px).
# avax: bundled WebP avalanche-avax-fill-3ll8qiqg376l2e5i4vv6ti.webp in build-sources (replaces AVAX text SVG).
# 1inch: bundled build-sources/1inch.webp (1-inch-network WebP; dashed unicorn outline).
# ltc: bundled ltc.svg (SI litecoin is a filled coin; whiten() reads as a blank puck at 20px).
# coinbase: bundled build-sources/coinbase.svg (Iconify token/coinbase C arc).
# jpm: bundled jpm.svg (Chase octagon; SI has no jpmorgan slug in v16).
# wfc: authoritative PNG at icons/matrix/wordmark-option-1/wfc.png (matrix-maintained; no build-sources SVG or PNG).
# facebook: authoritative PNG only at icons/matrix/facebook.png (matrix-maintained; custom f mark).
# gs: bundled gs.svg (Wikimedia Commons Goldman Sachs.svg wordmark paths; blue plate stripped for matrix).
# amd: bundled amd.svg (SI wordmark paths; ticker text retired).
# op: bundled op.svg (Iconify token-branded optimism paths; no OP text ticker).
# apt: Iconify token/aptos (coin mark; bundled APT text retired).
# near: bundled near.svg (SI ribbon whiten() reads as stacked horizontal smears at matrix size).
# sui: bundled sui.svg (token/sui organic paths mush when whiten()d at 20px).
# sei: bundled sei.svg (token/sei waves read as stripe smears at 20px).
# doge: bundled doge.svg (SI coin is a filled disk; 20px + blur reads as a blank green puck).
# wld: Iconify arcticons/worldcoin (orb mark; bundled WLD text retired).
# dot: bundled dot.svg (thick Polkadot ring reads as a filled circle when blurred).
# uni: Iconify token/uniswap (unicorn silhouette; bundled UNI text retired).
# aave: bundled aave.svg (color disk reads as a large blank green circle at 20px).
# crv: bundled build-sources/crv.png (from repo-root Curve_logo.png; Phase 0b raster; old crv.svg removed).
# tao: bundled tao.svg (Iconify token/tao path mark; no TAO text ticker).
# bac: bundled bac.svg (BoA monospace label; SI bankofamerica mark is a tiny flag blob at 32px).
# m0: bundled build-sources/m0.png in npm manifest (no Iconify slug for M0 Labs in common matrix sets).
# base / ink: bundled base.svg, ink.svg (BASE/INK tickers; Iconify token/base is a plain square silhouette).
# arc: bundled arc.svg from Arc-logo.svg (not monospace ARC text). circle: Circle-logo.svg -> build-sources/circle.svg.
ICONIFY_CRYPTO_PREF = {
    "usdc": ["token/usdc", "cryptocurrency-color/usdc"],
    "uni": ["token/uniswap", "token-branded/uniswap"],
    "apt": ["token/aptos", "token-branded/aptos"],
    "wld": ["arcticons/worldcoin"],
    "op": ["token-branded/optimism", "token/optimism"],
    "arb": ["token-branded/arbitrum", "token/arbitrum"],
    "ton": ["token-branded/ton", "token/ton", "simple-icons/ton"],
    "wormhole": ["arcticons/wormhole", "arcticons/wormhole-2"],
    "1inch": ["token/1inch", "simple-icons/1inch"],
}

# Crypto names that must use symbol only (no bundled ticker-text SVG).
CRYPTO_SYMBOL_ONLY_SKIP_BUNDLED = {"arb", "sei", "near", "sui", "dot", "doge"}

# Company marks shipped only as icons/matrix/<name>.png (no build-sources/<name>.svg or .png).
MATRIX_MAINTAINED_PNG = frozenset({"wfc", "facebook"})

# Prefer these Iconify SVGs before Simple Icons (matrix readability / correct mark).
ICONIFY_COMPANY_PATHS = {
    "coinbase": ["token/coinbase", "simple-icons/coinbase"],
    "visa": ["simple-icons/visa", "logos/visa"],
    "pypl": ["logos/paypal", "simple-icons/paypal"],
    "intc": ["simple-icons/intel", "logos/intel"],
    # "fidelity" removed: arcticons/fidelity is a plain capital F, no distinctive mark.
    "venmo": ["fa7-brands/venmo-v"],
    "wmt": ["tabler/brand-walmart", "arcticons/walmart"],
}

# msft/amzn/orcl/dis/ibm: Node build uses prefersIconify + logos/* before SI (see scripts/build-matrix-icons.mjs).
COMPANIES = {
    "aapl": ("apple",            []),
    "msft": ("microsoft",        []),
    "jpm":  ("jpmorgan",         ["jpmorganchase", "chase"]),  # bundled Chase octagon build-sources/jpm.svg; SI has no jpmorgan
    "citi": ("citibank",         []),
    # "fidelity" removed: plain F glyph, not a distinctive mark.
    "gs":   ("goldmansachs",     []),
    "coinbase": ("coinbase",     []),
    "kinexys": ("kinexys",       []),
    "sq":   ("square",           ["block"]),
    "visa": ("visa",             []),
    "ma":   ("mastercard",       []),
    "googl":("google",           ["alphabet"]),
    "amzn": ("amazon",           []),
    "meta": ("meta",             []),
    "x":    ("x",                []),
    "wmt":  ("walmart",          []),
    "nvda": ("nvidia",           []),
    "tsla": ("tesla",            []),
    "amd":  ("amd",              []),
    "nflx": ("netflix",          []),
    "bac":  ("bankofamerica",    []),
    "wfc":  ("wellsfargo",       []),
    "schw": ("charlesschwab",    ["schwab"]),
    "pypl": ("paypal",           []),
    "facebook": ("facebook",     []),
    "venmo": ("venmo",           []),
    "cashapp": ("cashapp",       []),
    "intc": ("intel",            []),
    "csco": ("cisco",            []),
    "orcl": ("oracle",           []),  # bundled build-sources/orcl.svg (oracle.svg) in npm manifest
    "dis":  ("waltdisney",       ["disney", "waltdisneyworld"]),
    "mstr": ("microstrategy",    ["strategy"]),  # bundled strategy-logo-2025.png (Strategy 2025 wordmark raster)
    "hood": ("robinhood",        []),
    "ibm":  ("ibm",              []),
    "nasdaq": ("nasdaq",         []),
    "nyse": ("nyse",             []),
    "ice": ("ice",               []),
    "ko":   ("cocacola",         ["coca-cola"]),
    "stripe": ("stripe",         []),
    "revolut": ("revolut",       []),
    "block": ("square",          ["block"]),  # Block Inc: SI slug is square
    "blk":  ("blackrock",        []),         # bundled BR monogram build-sources/blk.svg (SI has no slug)
    "securitize": ("securitize", []),         # bundled build-sources/securitize.svg
    "bakkt": ("bakkt",           []),         # bundled build-sources/bakkt.svg (repo BKKT.svg)
    # "fed" removed: seal reads as ambiguous blob at matrix size.
    # "fed":  ("federalreserve",   []),
    # "frbny" removed: building pattern reads as ambiguous "F" at matrix size.
    # "frbny": ("federalreservebankofnewyork", []),
    "fidelity": ("fidelity", []),  # bundled build-sources/fidelity.svg (starburst mark)
    "cantor": ("cantor", []),  # bundled build-sources/cantor.svg (no SI slug)
    "clearstreet": ("clearstreet", []),  # bundled build-sources/clearstreet.svg (no SI slug)
    "wu": ("westernunion", []),
    "moneygram": ("moneygram", []),
    "wise": ("wise", []),  # bundled build-sources/wise.svg (Lineicons path; MIT)
}

# ── Conversion helpers ─────────────────────────────────────────────────────

def svg_to_white_png(svg_bytes: bytes, size: int = 32) -> bytes | None:
    """Convert SVG to white-on-transparent PNG."""
    svg_text = svg_bytes.decode("utf-8")

    # Force all fills to white, but preserve fill="none" (transparent areas).
    svg_text = re.sub(r'fill="(?!none)[^"]*"', 'fill="#FFFFFF"', svg_text)
    # Handle currentColor (used by some Iconify SVGs)
    svg_text = svg_text.replace('currentColor', '#FFFFFF')
    # Handle style-based fills (inline CSS)
    svg_text = re.sub(r'fill:\s*#[0-9a-fA-F]{3,8}', 'fill:#FFFFFF', svg_text)
    svg_text = re.sub(r'fill:\s*rgb[^;)]+[;)]', 'fill:#FFFFFF;', svg_text)
    # If no fill attribute exists on any element, set a default on <svg> so
    # paths that rely on the SVG default (black) render white instead.
    # But only when there are NO existing fill attributes at all — otherwise
    # a root fill="#FFFFFF" floods the entire canvas as a white rectangle.
    if 'fill=' not in svg_text:
        svg_text = svg_text.replace('<svg ', '<svg fill="#FFFFFF" ', 1)

    try:
        import cairosvg
        png_data = cairosvg.svg2png(
            bytestring=svg_text.encode("utf-8"),
            output_width=size,
            output_height=size,
        )
        return png_data
    except (ImportError, OSError):
        pass

    # Fallback: try rsvg-convert via subprocess
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".svg", delete=False, mode="w") as f:
        f.write(svg_text)
        svg_path = f.name
    png_path = svg_path.replace(".svg", ".png")
    try:
        subprocess.run(
            ["rsvg-convert", "-w", str(size), "-h", str(size), svg_path, "-o", png_path],
            check=True, capture_output=True,
        )
        with open(png_path, "rb") as f:
            return f.read()
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    finally:
        for p in [svg_path, png_path]:
            if os.path.exists(p):
                os.unlink(p)

    return None


def color_png_to_white(png_bytes: bytes, size: int = 32) -> bytes:
    """Replace all non-transparent pixels with white."""
    img = Image.open(BytesIO(png_bytes)).convert("RGBA").resize((size, size), Image.LANCZOS)
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a > 0:
                pixels[x, y] = (255, 255, 255, a)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def ensure_rgba(png_data: bytes) -> bytes:
    """Ensure PNG is RGBA (fix grayscale+alpha etc.)."""
    img = Image.open(BytesIO(png_data))
    if img.mode != "RGBA":
        img = img.convert("RGBA")
        buf = BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    return png_data


def validate_png(path):
    """Check file is valid PNG, 32x32, has alpha."""
    with open(path, "rb") as f:
        header = f.read(33)
    if header[:8] != b'\x89PNG\r\n\x1a\n':
        return "NOT_PNG"
    w = struct.unpack(">I", header[16:20])[0]
    h = struct.unpack(">I", header[20:24])[0]
    if w != 32 or h != 32:
        return f"WRONG_SIZE_{w}x{h}"
    color_type = header[25]
    if color_type != 6:  # RGBA
        return f"NO_ALPHA_ct{color_type}"
    return "OK"


# ── HTTP helper ────────────────────────────────────────────────────────────

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "cryptozach-icon-builder/1.0"})


def fetch_url(url: str) -> bytes | None:
    """GET url, return bytes if 200, else None."""
    try:
        r = SESSION.get(url, timeout=15)
        if r.status_code == 200 and len(r.content) > 50:
            return r.content
    except requests.RequestException:
        pass
    return None


# ── Main build ─────────────────────────────────────────────────────────────

def main():
    outdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons", "matrix")
    os.makedirs(outdir, exist_ok=True)

    sourced = {}   # name -> (source_desc, file_size)
    missed = {}    # name -> list of tried sources
    all_names = {}

    # Merge manifests
    for name, (primary, alts, ticker) in CRYPTO.items():
        all_names[name] = ("crypto", primary, alts, ticker)
    for name, (primary, alts) in COMPANIES.items():
        all_names[name] = ("company", primary, alts, None)

    total = len(all_names)
    print(f"Building {total} matrix icons...\n")

    for i, (name, (kind, primary, alts, ticker)) in enumerate(all_names.items(), 1):
        out_path = os.path.join(outdir, f"{name}.png")
        slugs_tried = []
        found = False

        # ── Phase 0: bundled SVG in build-sources/<name>.svg ──
        bundled_svg = os.path.join(outdir, "build-sources", f"{name}.svg")
        skip_bundled = kind == "crypto" and name in CRYPTO_SYMBOL_ONLY_SKIP_BUNDLED
        if not skip_bundled and os.path.isfile(bundled_svg):
            slugs_tried.append(f"local:build-sources/{name}.svg")
            with open(bundled_svg, "rb") as sf:
                svg_data = sf.read()
            png_data = svg_to_white_png(svg_data)
            if png_data:
                png_data = ensure_rgba(png_data)
                with open(out_path, "wb") as f:
                    f.write(png_data)
                fsize = len(png_data)
                sourced[name] = (f"bundled SVG (build-sources/{name}.svg)", fsize)
                found = True
                print(f"  [{i:2d}/{total}] {name}.png <- local {name}.svg [{fsize}B]")

        if found:
            continue

        # ── Phase 0b: bundled PNG in build-sources/<name>.png (same whiten as CC-PNG path) ──
        bundled_png = os.path.join(outdir, "build-sources", f"{name}.png")
        if not found and os.path.isfile(bundled_png):
            slugs_tried.append(f"local:build-sources/{name}.png")
            with open(bundled_png, "rb") as pf:
                raw = pf.read()
            white_data = color_png_to_white(raw, 32)
            white_data = ensure_rgba(white_data)
            with open(out_path, "wb") as f:
                f.write(white_data)
            fsize = len(white_data)
            sourced[name] = (f"bundled PNG (build-sources/{name}.png)", fsize)
            found = True
            print(f"  [{i:2d}/{total}] {name}.png <- local {name}.png [{fsize}B]")

        if found:
            continue

        # ── Phase 0b WebP: bundled WebP in build-sources/<name>.webp (same whiten as PNG) ──
        bundled_webp = os.path.join(outdir, "build-sources", f"{name}.webp")
        if not found and os.path.isfile(bundled_webp):
            slugs_tried.append(f"local:build-sources/{name}.webp")
            with open(bundled_webp, "rb") as pf:
                raw = pf.read()
            white_data = color_png_to_white(raw, 32)
            white_data = ensure_rgba(white_data)
            with open(out_path, "wb") as f:
                f.write(white_data)
            fsize = len(white_data)
            sourced[name] = (f"bundled WebP (build-sources/{name}.webp)", fsize)
            found = True
            print(f"  [{i:2d}/{total}] {name}.png <- local {name}.webp [{fsize}B]")

        if found:
            continue

        # ── Phase 0c: matrix-maintained PNG at icons/matrix/<name>.png only (no build-sources copy) ──
        if not found and name in MATRIX_MAINTAINED_PNG:
            if name == "wfc":
                maintained_png = os.path.join(outdir, "wordmark-option-1", "wfc.png")
                maintained_label = "icons/matrix/wordmark-option-1/wfc.png"
            else:
                maintained_png = os.path.join(outdir, f"{name}.png")
                maintained_label = f"icons/matrix/{name}.png"
            if os.path.isfile(maintained_png):
                slugs_tried.append(f"local:{maintained_label}")
                with open(maintained_png, "rb") as pf:
                    raw = pf.read()
                white_data = color_png_to_white(raw, 32)
                white_data = ensure_rgba(white_data)
                with open(out_path, "wb") as f:
                    f.write(white_data)
                fsize = len(white_data)
                sourced[name] = (f"bundled PNG ({maintained_label})", fsize)
                found = True
                print(f"  [{i:2d}/{total}] {name}.png <- local {maintained_label} [{fsize}B]")

        if found:
            continue

        # ── Phase 0.5a: Iconify (crypto marks SI does not ship or would mis-resolve) ──
        if kind == "crypto" and name in ICONIFY_CRYPTO_PREF:
            for path in ICONIFY_CRYPTO_PREF[name]:
                url = f"https://api.iconify.design/{path}.svg"
                slugs_tried.append(f"IconifyPref:{path}")
                svg_data = fetch_url(url)
                if svg_data:
                    png_data = svg_to_white_png(svg_data)
                    if png_data:
                        png_data = ensure_rgba(png_data)
                        with open(out_path, "wb") as f:
                            f.write(png_data)
                        fsize = len(png_data)
                        sourced[name] = (f"Iconify ({path})", fsize)
                        found = True
                        print(f"  [{i:2d}/{total}] {name}.png <- IconifyPref:{path} [{fsize}B]")
                        break
                time.sleep(0.1)

        if found:
            continue

        # ── Phase 0.5: Iconify (preferred marks for some companies) ──
        if kind == "company" and name in ICONIFY_COMPANY_PATHS:
            for path in ICONIFY_COMPANY_PATHS[name]:
                url = f"https://api.iconify.design/{path}.svg"
                slugs_tried.append(f"Iconify:{path}")
                svg_data = fetch_url(url)
                if svg_data:
                    png_data = svg_to_white_png(svg_data)
                    if png_data:
                        png_data = ensure_rgba(png_data)
                        with open(out_path, "wb") as f:
                            f.write(png_data)
                        fsize = len(png_data)
                        sourced[name] = (f"Iconify ({path})", fsize)
                        found = True
                        print(f"  [{i:2d}/{total}] {name}.png <- Iconify:{path} [{fsize}B]")
                        break
                time.sleep(0.1)

        if found:
            continue

        # ── Phase 1: Simple Icons ──
        all_slugs = [primary] + alts
        for slug in all_slugs:
            url = f"https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/{slug}.svg"
            slugs_tried.append(f"SI:{slug}")
            svg_data = fetch_url(url)
            if svg_data:
                png_data = svg_to_white_png(svg_data)
                if png_data:
                    png_data = ensure_rgba(png_data)
                    with open(out_path, "wb") as f:
                        f.write(png_data)
                    fsize = len(png_data)
                    sourced[name] = (f"Simple Icons ({slug})", fsize)
                    found = True
                    print(f"  [{i:2d}/{total}] {name}.png <- SI:{slug} [{fsize}B]")
                    break
            time.sleep(0.1)

        if found:
            continue

        # ── Phase 2: cryptocurrency-icons (crypto only) ──
        if kind == "crypto" and ticker:
            # Try SVG
            url = f"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/{ticker}.svg"
            slugs_tried.append(f"CC-SVG:{ticker}")
            svg_data = fetch_url(url)
            if svg_data:
                png_data = svg_to_white_png(svg_data)
                if png_data:
                    png_data = ensure_rgba(png_data)
                    with open(out_path, "wb") as f:
                        f.write(png_data)
                    fsize = len(png_data)
                    sourced[name] = (f"cryptocurrency-icons SVG ({ticker})", fsize)
                    found = True
                    print(f"  [{i:2d}/{total}] {name}.png <- CC-SVG:{ticker} [{fsize}B]")
                    time.sleep(0.1)

            if not found:
                # Try PNG (uppercase ticker)
                url = f"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/{ticker.upper()}.png"
                slugs_tried.append(f"CC-PNG:{ticker.upper()}")
                png_data = fetch_url(url)
                if png_data:
                    white_data = color_png_to_white(png_data)
                    white_data = ensure_rgba(white_data)
                    with open(out_path, "wb") as f:
                        f.write(white_data)
                    fsize = len(white_data)
                    sourced[name] = (f"cryptocurrency-icons PNG ({ticker.upper()})", fsize)
                    found = True
                    print(f"  [{i:2d}/{total}] {name}.png <- CC-PNG:{ticker.upper()} [{fsize}B]")
                    time.sleep(0.1)

        # ── Phase 2b: Iconify (crypto only, SI/CC miss) ──
        if not found and kind == "crypto" and name in ICONIFY_CRYPTO_PATHS:
            for path in ICONIFY_CRYPTO_PATHS[name]:
                url = f"https://api.iconify.design/{path}.svg"
                slugs_tried.append(f"Iconify:{path}")
                svg_data = fetch_url(url)
                if svg_data:
                    png_data = svg_to_white_png(svg_data)
                    if png_data:
                        png_data = ensure_rgba(png_data)
                        with open(out_path, "wb") as f:
                            f.write(png_data)
                        fsize = len(png_data)
                        sourced[name] = (f"Iconify ({path})", fsize)
                        found = True
                        print(f"  [{i:2d}/{total}] {name}.png <- Iconify:{path} [{fsize}B]")
                        break
                time.sleep(0.1)

        if not found:
            missed[name] = slugs_tried
            print(f"  [{i:2d}/{total}] {name}.png <- MISS (tried: {', '.join(slugs_tried)})")

    # ── Phase 3: Validation ──
    print(f"\n{'='*60}")
    print("Validation")
    print('='*60)

    results = {}
    for f in sorted(os.listdir(outdir)):
        if f.endswith(".png"):
            fpath = os.path.join(outdir, f)
            results[f] = validate_png(fpath)
            # Fix non-RGBA
            if results[f].startswith("NO_ALPHA"):
                with open(fpath, "rb") as fh:
                    data = fh.read()
                fixed = ensure_rgba(data)
                with open(fpath, "wb") as fh:
                    fh.write(fixed)
                results[f] = validate_png(fpath)

    ok = sum(1 for v in results.values() if v == "OK")
    bad = {k: v for k, v in results.items() if v != "OK"}
    print(f"\nValidation: {ok}/{len(results)} OK")
    if bad:
        print("ISSUES:")
        for k, v in bad.items():
            print(f"  {k}: {v}")

    # ── Phase 4: Report ──
    print(f"\n{'='*60}")
    print("=== Matrix Icon Build Report ===")
    print(f"Date: {datetime.now().isoformat()}")
    print(f"Total: {total}")
    print(f"\nSOURCED ({len(sourced)}):")
    for name in sorted(sourced):
        src, fsize = sourced[name]
        print(f"  {name}.png  <- {src}  [{fsize} bytes]")

    print(f"\nMISSING ({len(missed)}):")

    # Media kit URLs for manual sourcing
    media_kits = {
        "jpm":  "https://www.jpmorgan.com (Chase octagon mark)",
        "gs":   "https://www.goldmansachs.com/media-relations",
        "bac":  "https://about.bankofamerica.com",
        "wfc":  "https://www.wellsfargo.com",
        "schw": "https://www.schwab.com",
        "dis":  "https://thewaltdisneycompany.com/media",
        "mstr": "https://www.strategy.com (formerly MicroStrategy)",
        "ko":   "https://www.coca-colacompany.com/media",
    }

    for name in sorted(missed):
        tried = ', '.join(missed[name])
        print(f"  {name}.png  <- Tried: {tried}")

    if missed:
        print(f"\nMANUAL SOURCING NEEDED:")
        for name in sorted(missed):
            hint = media_kits.get(name, "Search brand media kit for logomark SVG")
            print(f"  {name}  -> {hint}")

    # Write BUILD_REPORT.md
    report_path = os.path.join(outdir, "BUILD_REPORT.md")
    with open(report_path, "w") as f:
        f.write(f"# Matrix Icon Build Report\n\n")
        f.write(f"**Date:** {datetime.now().isoformat()}  \n")
        f.write(f"**Total:** {total}  \n")
        f.write(f"**Sourced:** {len(sourced)}  \n")
        f.write(f"**Missing:** {len(missed)}  \n\n")

        f.write(f"## Sourced ({len(sourced)})\n\n")
        f.write("| File | Source | Size |\n|------|--------|------|\n")
        for name in sorted(sourced):
            src, fsize = sourced[name]
            f.write(f"| `{name}.png` | {src} | {fsize}B |\n")

        f.write(f"\n## Missing ({len(missed)})\n\n")
        f.write("| File | Tried |\n|------|-------|\n")
        for name in sorted(missed):
            tried = ', '.join(missed[name])
            f.write(f"| `{name}.png` | {tried} |\n")

        if missed:
            f.write(f"\n## Manual Sourcing Needed\n\n")
            for name in sorted(missed):
                hint = media_kits.get(name, "Search brand media kit for logomark SVG")
                f.write(f"- **{name}** → {hint}\n")

    print(f"\nReport written to {report_path}")
    print(f"\nDone: {len(sourced)} sourced, {len(missed)} missing.")


if __name__ == "__main__":
    main()
