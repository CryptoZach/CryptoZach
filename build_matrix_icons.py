#!/usr/bin/env python3
"""Build white-silhouette matrix icons for cryptozach.com hero animation."""

import os
import re
import struct
import time
from datetime import datetime
from io import BytesIO

import requests
from PIL import Image

# ── Manifests ──────────────────────────────────────────────────────────────

CRYPTO = {
    "btc":  ("bitcoin",     [],                   "btc"),
    "eth":  ("ethereum",    [],                   "eth"),
    "sol":  ("solana",      [],                   "sol"),
    "usdc": ("circle",      ["usdc"],             "usdc"),
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
    "tia":  ("celestia",    [],                   None),
    "xmr":  ("monero",      [],                   "xmr"),
    "zec":  ("zcash",       [],                   "zec"),
    "crv":  ("curvedao",    ["curvefi", "curve"], None),
    "ldo":  ("lido",        [],                   None),
    "stx":  ("stacks",      [],                   "stx"),
    "mkr":  ("maker",       [],                   "mkr"),
    "xtz":  ("tezos",       [],                   "xtz"),
    "algo": ("algorand",    [],                   "algo"),
    "hbar": ("hedera",      [],                   "hbar"),
    "ton":  ("ton",         [],                   None),
    "sei":  ("sei",         [],                   None),
    "wld":  ("worldcoin",   [],                   None),
    "rndr": ("render",      [],                   "rndr"),
    "tao":  ("bittensor",   [],                   None),
}

COMPANIES = {
    "aapl": ("apple",            []),
    "msft": ("microsoft",        []),
    "jpm":  ("jpmorgan",         ["jpmorganchase", "chase"]),
    "gs":   ("goldmansachs",     []),
    "coin": ("coinbase",         []),
    "sq":   ("square",           ["block"]),
    "visa": ("visa",             []),
    "ma":   ("mastercard",       []),
    "googl":("google",           ["alphabet"]),
    "amzn": ("amazon",           []),
    "meta": ("meta",             []),
    "nvda": ("nvidia",           []),
    "tsla": ("tesla",            []),
    "amd":  ("amd",              []),
    "nflx": ("netflix",          []),
    "bac":  ("bankofamerica",    []),
    "wfc":  ("wellsfargo",       []),
    "schw": ("charlesschwab",    ["schwab"]),
    "pypl": ("paypal",           []),
    "intc": ("intel",            []),
    "csco": ("cisco",            []),
    "orcl": ("oracle",           []),
    "dis":  ("waltdisney",       ["disney", "waltdisneyworld"]),
    "mstr": ("microstrategy",    ["strategy"]),
    "hood": ("robinhood",        []),
    "ibm":  ("ibm",              []),
    "ko":   ("cocacola",         ["coca-cola"]),
}

# ── Conversion helpers ─────────────────────────────────────────────────────

def svg_to_white_png(svg_bytes: bytes, size: int = 32) -> bytes | None:
    """Convert SVG to white-on-transparent PNG."""
    svg_text = svg_bytes.decode("utf-8")

    # Force all fills to white
    svg_text = re.sub(r'fill="[^"]*"', 'fill="#FFFFFF"', svg_text)
    # Add fill="white" to <svg> if no fill on paths
    if 'fill=' not in svg_text.split('</svg>')[0].split('<path')[0]:
        svg_text = svg_text.replace('<svg ', '<svg fill="#FFFFFF" ', 1)
    # Also handle style-based fills
    svg_text = re.sub(r'fill:\s*#[0-9a-fA-F]{3,8}', 'fill:#FFFFFF', svg_text)
    svg_text = re.sub(r'fill:\s*rgb[^;)]+[;)]', 'fill:#FFFFFF;', svg_text)
    # Handle currentColor
    svg_text = svg_text.replace('currentColor', '#FFFFFF')

    try:
        import cairosvg
        png_data = cairosvg.svg2png(
            bytestring=svg_text.encode("utf-8"),
            output_width=size,
            output_height=size,
        )
        return png_data
    except ImportError:
        pass

    # Fallback: try rsvg-convert via subprocess
    import subprocess
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
        "mstr": "https://www.microstrategy.com",
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
