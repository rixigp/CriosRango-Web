#!/usr/bin/env python3
"""Normalize category PNGs to a common transparent square with uniform outer padding."""
from pathlib import Path
from PIL import Image
import argparse
import sys

ROOT = Path(__file__).resolve().parents[1] / "theme/crios-rango-2026/assets/images/categories"
CANVAS = 1254
SUBJECT_FRACTION = 0.90
TOLERANCE = 0.012

def alpha_bounds(image):
    return image.getchannel("A").getbbox()

def normalize(path):
    source = Image.open(path).convert("RGBA")
    bounds = alpha_bounds(source)
    if bounds is None:
        raise ValueError(f"{path.name}: image has no visible pixels")
    subject = source.crop(bounds)
    target_longest = round(CANVAS * SUBJECT_FRACTION)
    scale = target_longest / max(subject.size)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    resized = subject.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((CANVAS - size[0]) // 2, (CANVAS - size[1]) // 2))
    canvas.save(path, format="PNG", optimize=True)

def check(path):
    image = Image.open(path).convert("RGBA")
    if image.size != (CANVAS, CANVAS):
        raise ValueError(f"{path.name}: canvas {image.size}, expected {(CANVAS, CANVAS)}")
    bounds = alpha_bounds(image)
    if bounds is None:
        raise ValueError(f"{path.name}: empty alpha channel")
    left, top, right, bottom = bounds
    width, height = right - left, bottom - top
    ratio = max(width, height) / CANVAS
    if abs(ratio - SUBJECT_FRACTION) > TOLERANCE:
        raise ValueError(f"{path.name}: visible subject is {ratio:.3%}, expected about 90%")
    center_x, center_y = (left + right) / 2, (top + bottom) / 2
    if abs(center_x - CANVAS / 2) > 2 or abs(center_y - CANVAS / 2) > 2:
        raise ValueError(f"{path.name}: subject is not centered ({center_x:.1f}, {center_y:.1f})")

def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--normalize", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    paths = sorted(ROOT.glob("*.png"))
    if not paths:
        raise SystemExit(f"No category PNG assets found in {ROOT}")
    if args.normalize:
        for path in paths:
            normalize(path)
    for path in paths:
        check(path)
    print(f"CATEGORY_ASSETS_NORMALIZED=YES ({len(paths)} PNGs, {CANVAS}x{CANVAS}, {SUBJECT_FRACTION:.0%} visible subject)")
if __name__ == "__main__":
    main()
