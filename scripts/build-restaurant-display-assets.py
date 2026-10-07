"""Proportional WebP display exports; immutable source images are never changed."""
import hashlib, json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
input_file = ROOT / 'output/story/layout3/display-inputs.json'
registry_file = ROOT / 'docs/restaurant-display-assets.json'
inputs = json.loads(input_file.read_text(encoding='utf-8-sig')) if input_file.exists() else sorted({entry['sourceUrl'] for entry in json.loads(registry_file.read_text(encoding='utf-8'))['exports']})
exports = []
for url in inputs:
    source = ROOT / 'public' / url.lstrip('/')
    if not source.is_file():
        raise RuntimeError(f'Missing source {url}')
    with Image.open(source) as original:
        for role, width, quality in [('card', 400, 74), ('preview', 800, 78)]:
            image = original.convert('RGBA' if 'A' in original.getbands() else 'RGB')
            image.thumbnail((width, width), Image.Resampling.LANCZOS)
            target_url = '/assets/olympiad/display-v1/' + role + url[len('/assets/olympiad'):]
            target = ROOT / 'public' / target_url.lstrip('/')
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target, 'WEBP', quality=quality, method=6)
            exports.append({'sourceUrl': url, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'sourceSize': list(original.size), 'url': target_url, 'role': role, 'size': list(image.size), 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'alpha': 'A' in image.getbands()})
album_source = pathlib.Path('C:/Users/АМ/.codex/generated_images/01a09b88-e413-7740-adfb-d5d13946d70f/exec-1c9902e5-c664-4436-ad89-1aef48a12b7c.png')
album_target = ROOT / 'public/assets/olympiad/story/layout-v3/album-spread.webp'
album_target.parent.mkdir(parents=True, exist_ok=True)
if album_source.exists():
    with Image.open(album_source) as image:
        image.thumbnail((1400, 1000), Image.Resampling.LANCZOS)
        image.convert('RGB').save(album_target, 'WEBP', quality=78, method=6)
elif not album_target.exists():
    raise RuntimeError('Blank album source and checked export are unavailable')
(ROOT / 'docs/restaurant-display-assets.json').write_text(json.dumps({'version':1, 'operation':'proportional resize only; no composition edits; source images retained', 'sources':len(inputs), 'sourceBytes':sum((ROOT / 'public' / u.lstrip('/')).stat().st_size for u in inputs), 'displayBytes':sum(e['bytes'] for e in exports), 'exports':exports, 'album':{'source':str(album_source),'url':'/assets/olympiad/story/layout-v3/album-spread.webp','bytes':album_target.stat().st_size,'review':'Individually inspected blank pages; no food or answer cues.'}}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'sources':len(inputs),'exports':len(exports),'bytes':sum(e['bytes'] for e in exports)}))
