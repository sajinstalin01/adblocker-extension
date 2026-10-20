#!/usr/bin/env python3
"""Generate the extension's raster icon sizes from the checked-in SVG source."""
from pathlib import Path
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "icons" / "rolex-key-adblocker.svg"
OUT = ROOT / "icons"
for size in (16, 32, 48, 128):
    cairosvg.svg2png(url=str(SOURCE), write_to=str(OUT / f"icon{size}.png"), output_width=size, output_height=size)
print("Generated Rolex Key AdBlocker icons: 16, 32, 48, 128 px")
