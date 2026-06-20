#!/usr/bin/env python3
"""Rebuild PM01 extended cards from curated photographic PM01 assets."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT_SIZE = (720, 480)


PHOTO_MAP = [
    ("public/assets/pm01/vegetables-photo/sticks/potato-allumette.png", "public/assets/pm01/extended/cuts/potato-shoestring.png"),
    ("public/assets/pm01/vegetables-photo/basic/potato-balls.png", "public/assets/pm01/extended/cuts/potato-tourne.png"),
    ("public/assets/pm01/vegetables-photo/slices/carrot-rondelle.png", "public/assets/pm01/extended/cuts/carrot-oblique.png"),
    ("public/assets/pm01/vegetables-photo/cubes/mixed-brunoise.png", "public/assets/pm01/extended/cuts/tomato-concasse.png"),
    ("public/assets/pm01/vegetables-photo/cubes/onion-brunoise.png", "public/assets/pm01/extended/cuts/onion-small-dice.png"),
    ("public/assets/pm01/vegetables-photo/leafy/cabbage-checkers-photo.png", "public/assets/pm01/extended/cuts/cabbage-checkers.png"),
    ("public/assets/pm01/vegetables-photo/cubes/mixed-macedoine.png", "public/assets/pm01/extended/cuts/beet-cubes.png"),
    ("public/assets/pm01/vegetables-photo/cubes/potato-parmentier-photo.png", "public/assets/pm01/extended/cuts/potato-parmentier.png"),
    ("public/assets/pm01/vegetables-photo/sticks/mixed-julienne.png", "public/assets/pm01/extended/cuts/pepper-strips.png"),
    ("public/assets/pm01/vegetables-photo/slices/zucchini-paysanne.png", "public/assets/pm01/extended/cuts/cucumber-half-moons.png"),
    ("public/assets/pm01/vegetables-photo/slices/potato-thin-slices.png", "public/assets/pm01/extended/cuts/mushroom-slices.png"),
    ("public/assets/pm01/vegetables-photo/leafy/greens-chiffonade-photo.png", "public/assets/pm01/extended/cuts/greens-chopped.png"),
    ("public/assets/pm01/meat-products/entrecote.png", "public/assets/pm01/extended/meat/beef-medallions.png"),
    ("public/assets/pm01/meat-products/entrecote.png", "public/assets/pm01/extended/meat/beef-steak-natural.png"),
    ("public/assets/pm01/meat-products/large-piece.png", "public/assets/pm01/extended/meat/beef-escalope.png"),
    ("public/assets/pm01/meat-products/azu.png", "public/assets/pm01/extended/meat/beef-stroganoff-strips.png"),
    ("public/assets/pm01/meat-products/goulash.png", "public/assets/pm01/extended/meat/beef-shashlik-cubes.png"),
    ("public/assets/pm01/meat-products/romsteak.png", "public/assets/pm01/extended/meat/pork-schnitzel-breaded.png"),
    ("public/assets/pm01/meat-products/entrecote.png", "public/assets/pm01/extended/meat/pork-chop-bone-in.png"),
    ("public/assets/pm01/meat-products/goulash.png", "public/assets/pm01/extended/meat/lamb-ragout-bone-in.png"),
    ("public/assets/pm01/meat-products/cutlets.png", "public/assets/pm01/extended/meat/meat-mince-portions.png"),
    ("public/assets/pm01/meat-products/large-piece.png", "public/assets/pm01/extended/meat/meat-bones-broth.png"),
    ("public/assets/pm01/fish-process/fish-quality.png", "public/assets/pm01/extended/fish/whole-fish-cleaned.png"),
    ("public/assets/pm01/fish-products/fish-portion.png", "public/assets/pm01/extended/fish/fish-steak-crosscut.png"),
    ("public/assets/pm01/fish-products/fish-fillet.png", "public/assets/pm01/extended/fish/fish-fillet-skin-on.png"),
    ("public/assets/pm01/fish-products/fish-fillet.png", "public/assets/pm01/extended/fish/fish-fillet-skinless.png"),
    ("public/assets/pm01/fish-products/fish-fillet.png", "public/assets/pm01/extended/fish/fish-butterfly-fillet.png"),
    ("public/assets/pm01/fish-process/fish-trim.png", "public/assets/pm01/extended/fish/fish-trim-head-tail.png"),
    ("public/assets/pm01/fish-products/fish-portion.png", "public/assets/pm01/extended/fish/fish-roll.png"),
    ("public/assets/pm01/fish-products/fish-cutlets.png", "public/assets/pm01/extended/fish/fish-balls.png"),
    ("public/assets/pm01/fish-products/fish-breaded.png", "public/assets/pm01/extended/fish/fish-sticks-breaded.png"),
    ("public/assets/pm01/fish-products/fish-mince.png", "public/assets/pm01/extended/fish/fish-quenelles.png"),
    ("public/assets/pm01/poultry-workshop.png", "public/assets/pm01/extended/poultry/whole-chicken-prepared.png"),
    ("public/assets/pm01/poultry-products/chicken-fillet.png", "public/assets/pm01/extended/poultry/chicken-breast-butterfly.png"),
    ("public/assets/pm01/poultry-products/chicken-thigh-drumstick.png", "public/assets/pm01/extended/poultry/chicken-wing-segments.png"),
    ("public/assets/pm01/poultry-products/chicken-fillet.png", "public/assets/pm01/extended/poultry/chicken-supreme.png"),
    ("public/assets/pm01/poultry-products/chicken-leg-quarter.png", "public/assets/pm01/extended/poultry/chicken-front-quarter.png"),
    ("public/assets/pm01/poultry-products/chicken-thigh-drumstick.png", "public/assets/pm01/extended/poultry/chicken-back-broth.png"),
    ("public/assets/pm01/poultry-products/rabbit-portions.png", "public/assets/pm01/extended/poultry/rabbit-saddle.png"),
    ("public/assets/pm01/poultry-products/rabbit-portions.png", "public/assets/pm01/extended/poultry/rabbit-hind-leg.png"),
    ("public/assets/pm01/poultry-products/poultry-mince.png", "public/assets/pm01/extended/poultry/poultry-cutlets.png"),
    ("public/assets/pm01/poultry-products/poultry-mince.png", "public/assets/pm01/extended/poultry/poultry-quenelles.png"),
    ("public/assets/pm01/process/veg-cut.png", "public/assets/pm01/extended/safety/color-coded-boards.png"),
    ("public/assets/pm01/meat-tools/boning-knife.png", "public/assets/pm01/extended/safety/knife-sanitizing.png"),
    ("public/assets/pm01/violations/complex.png", "public/assets/pm01/extended/safety/thermometer-check.png"),
    ("public/assets/pm01/packaging/film-tray-fish.png", "public/assets/pm01/extended/safety/vacuum-packaging.png"),
    ("public/assets/pm01/packaging/sealed-container.png", "public/assets/pm01/extended/safety/labelled-container.png"),
    ("public/assets/pm01/violations/complex.png", "public/assets/pm01/extended/safety/fridge-separate-storage.png"),
    ("public/assets/pm01/violations/vegetable.png", "public/assets/pm01/extended/safety/waste-bin-separated.png"),
    ("public/assets/pm01/process/veg-wash.png", "public/assets/pm01/extended/safety/glove-change-handwash.png"),
]


def rebuild_card(source: str, target: str) -> int:
    source_path = ROOT / source
    target_path = ROOT / target
    if not source_path.exists():
        raise FileNotFoundError(source_path)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as image:
        image = image.convert("RGB")
        card = ImageOps.fit(image, OUT_SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        card = ImageEnhance.Contrast(card).enhance(1.035)
        card = ImageEnhance.Sharpness(card).enhance(1.06)
        card.save(target_path, "PNG", optimize=True)
    return target_path.stat().st_size


def main() -> None:
    seen_targets = set()
    sizes = []
    for source, target in PHOTO_MAP:
        if target in seen_targets:
            raise SystemExit(f"Duplicate target: {target}")
        seen_targets.add(target)
        sizes.append(rebuild_card(source, target))
    print(json.dumps({"ok": True, "count": len(PHOTO_MAP), "minBytes": min(sizes)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
