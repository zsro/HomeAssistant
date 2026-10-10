"""Recheck fixed G7 primary-source cache, without claiming native runtime equivalence."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
report=json.loads((root/'docs/richman/s2-05c-sources.json').read_text())
cache=Path('/private/tmp/richman-price-reference')
for source in report['sources']:
 data=(cache/Path(source['path']).name).read_bytes()
 assert hashlib.sha256(data).hexdigest()==source['sha256'],source['path']
for entry in report['anchors']:
 lines=(cache/Path(entry['path']).name).read_text().splitlines()
 assert [i+1 for i,line in enumerate(lines) if entry['anchor'] in line]==entry['lines'],entry
print(len(report['sources']),'fixed sources;',len(report['anchors']),'anchors; no Windows execution')
