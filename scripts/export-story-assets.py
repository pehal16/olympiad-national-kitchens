"""Proportional WebP export only; native ImageGen supplies the scene/cutout pixels."""
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
for item in json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")):
    image = Image.open(item["path"])
    image.thumbnail((1800, 800) if item["key"].startswith("table") else (1200, 800), Image.Resampling.LANCZOS)
    output = root / item["output"]
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "WEBP", quality=88, method=6)
    print(item["key"], image.size, image.mode)
