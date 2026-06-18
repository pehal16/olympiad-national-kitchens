#!/usr/bin/env python3
"""Build PM01 vegetable cut photo cards from curated source photos."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "exams" / "pm01-vegetable-photo-cuts.json"
OUT_SIZE = (720, 480)


def project_path(public_path: str) -> Path:
    clean = public_path.lstrip("/")
    return ROOT / "public" / clean if clean.startswith("assets/") else ROOT / clean


def crop_box(image: Image.Image, crop: list[float]) -> tuple[int, int, int, int]:
    left, top, right, bottom = crop
    width, height = image.size
    return (
        max(0, min(width - 1, round(left * width))),
        max(0, min(height - 1, round(top * height))),
        max(1, min(width, round(right * width))),
        max(1, min(height, round(bottom * height))),
    )


def build_card(item: dict) -> None:
    source_path = project_path(item["source"])
    output_path = project_path(item["image"])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source_path) as source:
        source = source.convert("RGB")
        cropped = source.crop(crop_box(source, item["crop"]))
        card = ImageOps.fit(
            cropped,
            OUT_SIZE,
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        card = ImageEnhance.Contrast(card).enhance(1.035)
        card = ImageEnhance.Sharpness(card).enhance(1.08)
        card.save(output_path, "PNG", optimize=True)


def main() -> None:
    items = json.loads(MANIFEST.read_text(encoding="utf-8"))
    seen = set()
    for item in items:
        if item["id"] in seen:
            raise SystemExit(f"Duplicate id: {item['id']}")
        seen.add(item["id"])
        build_card(item)
    print(json.dumps({"ok": True, "count": len(items)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
