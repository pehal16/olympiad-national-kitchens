"""Proportional WebP export of separately reviewed restaurant scene originals."""
import hashlib, json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
input_file = root / 'output/immersive-export-input.json'
sources = json.loads(input_file.read_text(encoding='utf-8')) if input_file.exists() else json.loads((root / 'docs/restaurant-immersive-assets.json').read_text(encoding='utf-8'))['assets']
destination = root / 'public/assets/olympiad/story/layout-v2/scenes'
destination.mkdir(parents=True, exist_ok=True)
registry = []
for source in sources:
    target = destination / (source['key'] + '.webp')
    with Image.open(source['path']) as original:
        size = original.size
        original.thumbnail((832, 1248) if source['key'].endswith('mobile') else (1536, 1024))
        original.save(target, 'WEBP', quality=87, method=6)
        exported = original.size
    registry.append({**source, 'url': '/' + target.relative_to(root / 'public').as_posix(),
        'originalSize': size, 'exportSize': exported, 'bytes': target.stat().st_size,
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'review': 'Individually inspected: consistent guest, natural scale, blank props, no food or answer cues. Proportional export only.'})
(root / 'docs/restaurant-immersive-assets.json').write_text(json.dumps({'layoutVersion': 2, 'assets': registry}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Exported {len(registry)} scenes; {sum(x["bytes"] for x in registry)} bytes total')
