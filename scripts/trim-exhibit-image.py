#!/usr/bin/env python3
"""Trim dark or white border from exhibit_01_discipline_map.png so only the diagram remains."""
from PIL import Image
import os

img_path = os.path.join(os.path.dirname(__file__), "..", "Publication Images", "exhibit_01_discipline_map.png")
orig = Image.open(img_path)
if orig.mode != "RGB":
    img = orig.convert("RGB")
else:
    img = orig
w, h = img.size
pixels = img.load()

# Content = pixels clearly not background (diagram, text, footnote); white margin excluded
BG_THRESHOLD = 240
# Minimum fraction of column/row that must be content to count as "in diagram" (trims stray pixels)
DENSITY = 0.002

def is_content(p):
    return max(p[0], p[1], p[2]) < BG_THRESHOLD

# Find first/last column with enough content
x_min, x_max = w, -1
for x in range(w):
    n = sum(1 for y in range(h) if is_content(pixels[x, y]))
    if n >= h * DENSITY:
        if x_min == w:
            x_min = x
        x_max = x
# Find first/last row with enough content
y_min, y_max = h, -1
for y in range(h):
    n = sum(1 for x in range(w) if is_content(pixels[x, y]))
    if n >= w * DENSITY:
        if y_min == h:
            y_min = y
        y_max = y

if x_max < 0:
    x_min, x_max = 0, w - 1
if y_max < 0:
    y_min, y_max = 0, h - 1
# Crop to content bounds; minimal pad to remove remaining whitespace
PAD = 8
x_min = max(0, x_min - PAD)
y_min = max(0, y_min - PAD)
x_max = min(w, x_max + 1 + PAD)
y_max = min(h, y_max + 1 + PAD)

cropped = orig.crop((x_min, y_min, x_max, y_max))
cropped.save(img_path, "PNG", optimize=True)
print(f"Trimmed to bbox ({x_min},{y_min})-({x_max},{y_max}), saved {img_path}")
