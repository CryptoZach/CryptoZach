#!/usr/bin/env python3
"""Generate favicon.png (32x32) and og-image.png (1200x630) for Sprint 4."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ACCENT = "#1a7a3a"
BG = "#111111"
WHITE = "#ffffff"
GRAY = "#999999"


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except OSError:
                continue
    return ImageFont.load_default()


def make_favicon() -> None:
    size = 32
    img = Image.new("RGBA", (size, size), (26, 122, 58, 255))
    draw = ImageDraw.Draw(img)
    font = load_font(13)
    text = "TS"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2
    y = (size - th) // 2 - 1
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    img.save(ROOT / "favicon.png", format="PNG")


def make_og_image() -> None:
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)
    accent = (26, 122, 58)
    draw.rectangle([80, 80, 400, 84], fill=accent)
    title = "Independent research on dollar infrastructure and tokenization."
    font_title = load_font(36)
    font_brand = load_font(18)
    font_author = load_font(16)
    y = 140
    for line in _wrap_text(title, font_title, draw, 900):
        draw.text((80, y), line, fill=(255, 255, 255), font=font_title)
        y += int(font_title.size * 1.2) + 4
    draw.text((80, 540), "Tokenization.Systems", fill=accent, font=font_brand)
    draw.text((80, 570), "Zach Zukowski", fill=GRAY, font=font_author)
    img.save(ROOT / "og-image.png", format="PNG", optimize=True)


def _wrap_text(text: str, font: ImageFont.FreeTypeFont | ImageFont.ImageFont, draw: ImageDraw.ImageDraw, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        test = " ".join(current + [word])
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


if __name__ == "__main__":
    make_favicon()
    make_og_image()
    print("Wrote favicon.png and og-image.png")
