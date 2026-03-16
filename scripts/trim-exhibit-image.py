#!/usr/bin/env python3
"""Trim exhibit_01_discipline_map.png: remove gray sidebars, black frame, and excess white so the diagram fills the image."""
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

# Background = white or light gray (exclude from content)
BG_MAX = 230
# Colored diagram = has saturation (not white, not pure black/gray)
SATURATION_MIN = 15
COLORED_MAX = 250
# Black frame
BLACK_MAX = 25
FRAME_DENSITY = 0.7
CONTENT_DENSITY = 0.002

def is_background(p):
    return max(p[0], p[1], p[2]) > BG_MAX

def is_black_frame(p):
    return max(p[0], p[1], p[2]) <= BLACK_MAX

def is_colored(p):
    r, g, b = p[0], p[1], p[2]
    return max(r, g, b) < COLORED_MAX and (max(r, g, b) - min(r, g, b)) > SATURATION_MIN

# 1) Find bbox of colored/saturated content (diagram nodes and colored areas)
x_min, x_max = w, -1
y_min, y_max = h, -1
for y in range(h):
    for x in range(w):
        if is_colored(pixels[x, y]):
            x_min = min(x_min, x)
            x_max = max(x_max, x)
            y_min = min(y_min, y)
            y_max = max(y_max, y)

# If no colored content found, fall back to any non-background content
if x_max < x_min or y_max < y_min:
    for x in range(w):
        n = sum(1 for y in range(h) if not is_background(pixels[x, y]))
        if n >= h * CONTENT_DENSITY:
            x_min = x_min if x_min <= x_max else x
            x_max = max(x_max, x)
    for y in range(h):
        n = sum(1 for x in range(w) if not is_background(pixels[x, y]))
        if n >= w * CONTENT_DENSITY:
            y_min = y_min if y_min <= y_max else y
            y_max = max(y_max, y)
    if x_max < x_min:
        x_min, x_max = 0, w - 1
    if y_max < y_min:
        y_min, y_max = 0, h - 1

# 2) Optionally shrink from edges by skipping black frame (thin border)
def first_non_frame_column(from_x, to_x, step):
    for x in range(from_x, to_x, step):
        n_black = sum(1 for y in range(max(0, y_min), min(h, y_max + 1)) if is_black_frame(pixels[x, y]))
        total = min(h, y_max + 1) - max(0, y_min)
        if total == 0 or n_black < total * FRAME_DENSITY:
            return x
    return from_x

def first_non_frame_row(from_y, to_y, step):
    for y in range(from_y, to_y, step):
        n_black = sum(1 for x in range(max(0, x_min), min(w, x_max + 1)) if is_black_frame(pixels[x, y]))
        total = min(w, x_max + 1) - max(0, x_min)
        if total == 0 or n_black < total * FRAME_DENSITY:
            return y
    return from_y

inner_x_min = first_non_frame_column(x_min, min(x_min + 80, w), 1)
inner_x_max = first_non_frame_column(x_max, max(x_max - 80, -1), -1)
inner_y_min = first_non_frame_row(y_min, min(y_min + 80, h), 1)
inner_y_max = first_non_frame_row(y_max, max(y_max - 80, -1), -1)

if inner_x_min >= inner_x_max or inner_y_min >= inner_y_max:
    inner_x_min, inner_x_max = x_min, x_max
    inner_y_min, inner_y_max = y_min, y_max

PAD = 12
x_min_final = max(0, inner_x_min - PAD)
y_min_final = max(0, inner_y_min - PAD)
x_max_final = min(w, inner_x_max + 1 + PAD)
y_max_final = min(h, inner_y_max + 1 + PAD)

cropped = orig.crop((x_min_final, y_min_final, x_max_final, y_max_final))
cropped.save(img_path, "PNG", optimize=True)
nw = x_max_final - x_min_final
nh = y_max_final - y_min_final
print(f"Trimmed to bbox ({x_min_final},{y_min_final})-({x_max_final},{y_max_final}), size {nw}x{nh}, saved {img_path}")
