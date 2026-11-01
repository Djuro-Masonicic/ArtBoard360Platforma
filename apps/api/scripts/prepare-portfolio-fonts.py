"""One-time lossless WOFF2 -> TTF conversion of the existing ArtBoard fonts.

Run with fonttools[woff] available. The checked-in TTFs are runtime assets;
Python is not needed by the API or its Docker image.
"""
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[3]
target = root / "apps/api/assets/portfolio-fonts"
target.mkdir(parents=True, exist_ok=True)
for weight in ("Regular", "Bold", "RegularItalic"):
    font = TTFont(root / f"apps/web/app/fonts/Alcyone-{weight}.woff2")
    font.flavor = None
    font.save(target / f"Alcyone-{weight}.ttf")
