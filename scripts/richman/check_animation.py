#!/usr/bin/env python3
"""Local atlas bounds/alpha/hash checks; no browser or game execution."""
import hashlib,json
from pathlib import Path
from PIL import Image
root=Path('frontend/public/richman/generated/animation')
a=json.loads((root/'manifest.json').read_text());r=json.loads(Path('docs/richman/s3-04c-resources.json').read_text())
im=Image.open(root/'objects.webp').convert('RGBA')
assert hashlib.sha256((root/'objects.webp').read_bytes()).hexdigest()==r['atlas']['sha256']
assert len(a['sprites'])==120
for key,f in a['sprites'].items():
 assert f['width']>0 and f['height']>0 and f['x']>=0 and f['y']>=0
 assert f['x']+f['width']<=im.width and f['y']+f['height']<=im.height
 crop=im.crop((f['x'],f['y'],f['x']+f['width'],f['y']+f['height']))
 assert crop.getchannel('A').getextrema()==(0,255),key
print(json.dumps(dict(frames=120,atlasBounds=True,alphaTransparentAndOpaque=True,atlasHash=True,browserStarted=False)))
