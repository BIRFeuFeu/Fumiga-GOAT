#!/usr/bin/env python3
"""Prepare the approved high-resolution tree, without a runtime dependency.

Usage: python3 tools/prepare_tree_art.py INPUT.png game/assets/ui/tree_ancestral.png
Requires Pillow only (art tooling, not the game). The approved 1552x672 source
has a nearly uniform #1d1127 backdrop; do not use this key on unrelated artwork.
The crop and pixel scale are the contract in game/js/tree_layout.js.
"""
import argparse
from pathlib import Path
from PIL import Image


def prepare(source, destination):
    image = Image.open(source).convert("RGB")
    if image.size != (1552, 672):
        raise ValueError("Expected the approved 1552x672 illustration")
    image = image.crop((384, 0, 1152, 672)).convert("RGBA")
    pixels = []
    key = (29, 17, 39)
    data = image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()
    for red, green, blue, _ in data:
        distance = max(abs(red - key[0]), abs(green - key[1]), abs(blue - key[2]))
        alpha = max(0, min(255, (distance - 5) * 64))
        pixels.append((red, green, blue, alpha) if alpha else (0, 0, 0, 0))
    image.putdata(pixels)
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, optimize=True)
    print(f"{destination}: {image.width}x{image.height}, {destination.stat().st_size} bytes, RGBA")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    parser.add_argument("destination")
    args = parser.parse_args()
    prepare(args.source, args.destination)
