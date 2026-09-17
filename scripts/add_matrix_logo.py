#!/usr/bin/env python3
"""Add or rebuild a white-on-transparent matrix rain mark as lossless WebP.

This is the rain-mark adder. Do not use `npm run build:matrix-icons` (that
path writes 32x32 PNGs). Do not outline a mark that has interior counters,
overlap etching, or compound holes.

Worked failure (2026-09-15): PayPal. The official overlapping double-P has a
light crescent etched between the two P bowls. Flattening every SVG fill to
#FFFFFF unions the two P's into one fat silhouette. `outline()` of that union
then throws away the etch and leaves a hollow P. Correct treatment: keep both
P fills, punch near-white interior pixels as holes, never outline.

Rules:
  Overlapping two-tone fills (PayPal P): preserve light gaps as holes. Do not
    union-whiten. Do not outline.
  Compound counters (letter bowls): keep holes (even-odd / light punch-out).
  Filled disk with an inner glyph: drop the plate; keep the glyph.
  True solid blob with no interior: outline only with --outline.
  Token-project name lockup: crop to the mark, square canvas, not WORDMARK.
  Company wordmark: keep landscape if aspect >= 1.6.

Default output is 128x128 square, or 256x64 landscape when the ink box is
wide. Oversample 4x and BOX-downsample. Unlink a dest symlink before write
so a preview tree does not overwrite the site clone.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import tempfile
from collections import deque
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageFilter

LANDSCAPE_AR = 1.6
SQUARE = 128
LANDSCAPE = (256, 64)
OVERSAMPLE = 4
LUMA_HOLE_MIN = 210  # near-white interior (PayPal etch) becomes a hole
ALPHA_INK_MIN = 40


def _luma_arr(im: Image.Image):
    import numpy as np

    arr = np.asarray(im.convert("RGBA"))
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    a = arr[:, :, 3].astype(np.float32)
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    return arr, luma, a


def image_to_white_mark(
    im: Image.Image,
    luma_hole_min: int = LUMA_HOLE_MIN,
    alpha_min: int = ALPHA_INK_MIN,
) -> tuple[Image.Image, bool]:
    """White ink on transparent. Light interior pixels stay holes.

    Opaque black-on-white art (PayPal's official P) has no alpha holes; the
    etch is white RGB. Treating every opaque pixel as ink unions that etch
    away. Punch near-white pixels out instead.

    White-on-transparent SVG rips (typical rain marks) are the other case:
    ink luma is ~255, so a luma punch would erase the glyph. If the canvas
    is not fully opaque, trust alpha and keep the ink.
    """
    import numpy as np

    arr, luma, a = _luma_arr(im)
    opaque = a >= alpha_min
    opaque_frac = float((a >= 250).mean())
    dark = opaque & (luma < 180)
    light = opaque & (luma >= luma_hole_min)
    # Fully opaque art (PayPal PNG) OR a colored plate with a light glyph
    # (Tether shield: teal body, white T, transparent corners). Punch light
    # as holes. Do not punch white-on-transparent SVG ink (that is all light).
    luma_punched = opaque_frac > 0.95 or (
        float(dark.mean()) > 0.02 and float(light.mean()) > 0.02
    )
    if luma_punched:
        ink = opaque & (luma < luma_hole_min)
    else:
        ink = opaque
    out = np.zeros(arr.shape, dtype=np.uint8)
    out[:, :, 0:3] = 255
    out[:, :, 3] = np.where(ink, 255, 0).astype(np.uint8)
    return Image.fromarray(out, "RGBA"), luma_punched


def has_interior_holes(im: Image.Image, alpha_min: int = ALPHA_INK_MIN) -> bool:
    """True when transparent pixels are enclosed by ink (counters / etching)."""
    import numpy as np

    a = np.asarray(im.convert("RGBA"))[:, :, 3]
    trans = a < alpha_min
    h, w = trans.shape
    vis = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        if trans[0, x]:
            vis[0, x] = True
            q.append((0, x))
        if trans[h - 1, x]:
            vis[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if trans[y, 0] and not vis[y, 0]:
            vis[y, 0] = True
            q.append((y, 0))
        if trans[y, w - 1] and not vis[y, w - 1]:
            vis[y, w - 1] = True
            q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and trans[ny, nx] and not vis[ny, nx]:
                vis[ny, nx] = True
                q.append((ny, nx))
    return bool((trans & ~vis).any())


def outline_solid(im: Image.Image, thickness: int = 5) -> Image.Image:
    """Edge-only white. Callers must refuse this when interior holes exist."""
    mask = im.split()[3]
    rad = thickness if thickness % 2 == 1 else thickness + 1
    eroded = mask.filter(ImageFilter.MinFilter(rad))
    edge = Image.new("L", mask.size)
    import numpy as np

    m = np.asarray(mask)
    e = np.asarray(eroded)
    edge_a = np.clip(m.astype(np.int16) - e.astype(np.int16), 0, 255).astype(np.uint8)
    thick = Image.fromarray(edge_a, "L").filter(ImageFilter.MaxFilter(3))
    out = Image.new("RGBA", im.size, (255, 255, 255, 0))
    out.putalpha(thick)
    return out


def distinct_svg_fills(svg_text: str) -> set[str]:
    fills = set(re.findall(r'fill="([^"]+)"', svg_text, flags=re.I))
    fills |= set(re.findall(r"fill:\s*([^;\"']+)", svg_text, flags=re.I))
    skip = {"none", "transparent", "currentcolor", "inherit"}
    out = set()
    for f in fills:
        key = f.strip().lower()
        if key in skip or not key:
            continue
        out.add(key)
    return out


def render_svg(svg_bytes: bytes, min_px: int = 1024, recolor_white: bool = True) -> Image.Image:
    svg_text = svg_bytes.decode("utf-8", errors="replace")
    fills = distinct_svg_fills(svg_text)
    # Two or more brand fills (PayPal navy + cyan): recoloring both to white
    # unions overlapping shapes and destroys etching. Render native colors,
    # then luminance-punch.
    if len(fills) >= 2:
        recolor_white = False
    if recolor_white:
        svg_text = re.sub(r'fill="(?!none)[^"]*"', 'fill="#FFFFFF"', svg_text, flags=re.I)
        svg_text = svg_text.replace("currentColor", "#FFFFFF").replace("currentcolor", "#FFFFFF")
        svg_text = re.sub(r"fill:\s*#[0-9a-fA-F]{3,8}", "fill:#FFFFFF", svg_text)
        if "fill=" not in svg_text:
            svg_text = svg_text.replace("<svg ", '<svg fill="#FFFFFF" ', 1)
    with tempfile.TemporaryDirectory() as td:
        svg_path = os.path.join(td, "in.svg")
        png_path = os.path.join(td, "out.png")
        Path(svg_path).write_text(svg_text, encoding="utf-8")
        subprocess.run(
            ["rsvg-convert", "-w", str(min_px), svg_path, "-o", png_path],
            check=True,
            capture_output=True,
        )
        return Image.open(png_path).convert("RGBA")


def crop_ink(im: Image.Image, pad_frac: float = 0.08) -> Image.Image:
    bbox = im.split()[3].getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    pad = max(2, int(round(max(w, h) * pad_frac)))
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def fit_canvas(
    im: Image.Image,
    square: int = SQUARE,
    landscape: tuple[int, int] = LANDSCAPE,
    oversample: int = OVERSAMPLE,
    landscape_if_wide: bool = True,
) -> Image.Image:
    w, h = im.size
    ar = w / max(h, 1)
    if landscape_if_wide and ar >= LANDSCAPE_AR:
        tw, th = landscape
    else:
        tw = th = square
    # Hi-res 1-bit rips (PayPal PNG, SVG at 1024): integer 4x then BOX.
    # Already-small rasters (old 128 bill): LANCZOS to target. NEAREST 4x
    # turns those into blocks that BOX then smears.
    if min(w, h) >= 180:
        ow, oh = tw * oversample, th * oversample
        scale = min(ow / w, oh / h)
        nw = max(1, int(round(w * scale)))
        nh = max(1, int(round(h * scale)))
        scaled = im.resize((nw, nh), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (ow, oh), (255, 255, 255, 0))
        canvas.paste(scaled, ((ow - nw) // 2, (oh - nh) // 2), scaled)
        return canvas.resize((tw, th), Image.Resampling.BOX)
    scale = min(tw / w, th / h) * 0.92
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    scaled = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (tw, th), (255, 255, 255, 0))
    canvas.paste(scaled, ((tw - nw) // 2, (th - nh) // 2), scaled)
    return canvas


def unlink_dest(path: Path) -> None:
    if path.is_symlink() or path.exists():
        path.unlink()


def load_source(src: Path) -> Image.Image:
    raw = src.read_bytes()
    if src.suffix.lower() == ".svg" or raw.lstrip()[:5] == b"<svg" or b"<svg" in raw[:200]:
        return render_svg(raw)
    im = Image.open(BytesIO(raw)).convert("RGBA")
    if max(im.size) <= 48:
        raise SystemExit(
            f"{src} is {im.size[0]}x{im.size[1]}. Do not upscale a 32x32 bake; pass an SVG or hi-res PNG."
        )
    return im


def convert_mark(
    src: Path,
    outline: bool = False,
    force_outline: bool = False,
    square: int = SQUARE,
    pad_frac: float = 0.08,
    force_square: bool = False,
) -> tuple[Image.Image, dict]:
    rendered = load_source(src)
    mark, luma_punched = image_to_white_mark(rendered)
    mark = crop_ink(mark, pad_frac=pad_frac)
    holes = False
    meta = {
        "src": str(src),
        "holes": holes,
        "luma_punched": luma_punched,
        "ink_box": mark.size,
        "outlined": False,
    }
    if outline:
        # PayPal's crescent opens to the exterior, so a closed-hole walk
        # misses it. Luma-punch (opaque black-on-white) is the etching case.
        holes = has_interior_holes(mark)
        meta["holes"] = holes
        if (holes or luma_punched) and not force_outline:
            raise SystemExit(
                f"{src} has interior holes or light etching. Refusing --outline "
                "(that is the PayPal regression). Pass --force-outline only for a true solid blob."
            )
        mark = outline_solid(mark)
        mark = crop_ink(mark, pad_frac=pad_frac)
        meta["outlined"] = True
    fitted = fit_canvas(
        mark, square=square, landscape_if_wide=not force_square
    )
    meta["out_size"] = fitted.size
    return fitted, meta


def save_webp(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    unlink_dest(dest)
    im.save(dest, "WEBP", lossless=True, quality=100)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--src", required=True, type=Path, help="SVG or hi-res PNG/WebP")
    p.add_argument("--out", required=True, type=Path, help="Dest .webp (symlink unlinked first)")
    p.add_argument("--outline", action="store_true", help="Edge only; refused when the mark has holes")
    p.add_argument("--force-outline", action="store_true")
    p.add_argument("--square", type=int, default=SQUARE)
    p.add_argument("--pad-frac", type=float, default=0.08, help="Padding around ink as a fraction of the ink box")
    p.add_argument("--force-square", action="store_true", help="Never emit a landscape wordmark canvas")
    args = p.parse_args(argv)
    fitted, meta = convert_mark(
        args.src,
        outline=args.outline or args.force_outline,
        force_outline=args.force_outline,
        square=args.square,
        pad_frac=args.pad_frac,
        force_square=args.force_square,
    )
    save_webp(fitted, args.out)
    print(
        f"wrote {args.out} {meta['out_size'][0]}x{meta['out_size'][1]} "
        f"holes={meta['holes']} outlined={meta['outlined']} from {args.src}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
