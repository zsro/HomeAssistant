"""Audit fixed native holding and caller evidence, never substitute plans for tests."""
import hashlib
import json
from pathlib import Path

cache = Path('/private/tmp/richman-price-reference')
tree = json.loads(Path('/private/tmp/richman-news-tree.json').read_text())
assert tree['sha'] == 'ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
anchors = {
 'rich4_stocks.asm':['fcn_00429040:','loc_0042905b:','loc_0042908f:','loc_00429099:','loc_004290da:'],
 'rich4_news.asm':['loc_0044b3e7:','loc_0044b402:','loc_0044b6d6:'],
 'rich4_ui_stock.asm':['loc_0042a724:','loc_0042a795:','loc_0042a7da:','loc_0042a808:','loc_0042a813:','loc_0042a834:','fcn_0042aaff:','loc_0042ab59:','loc_0042abbb:','loc_0042b137:','ref_00463f64:'],
}
sources, entries = [], []
for name, labels in anchors.items():
    raw = (cache/name).read_bytes()
    entry = next(x for x in tree['tree'] if x['path'].split('/')[-1] == name)
    blob = hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
    assert blob == entry['sha'], name
    sources.append({'path': entry['path'], 'gitBlobSha1': blob,
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'url': f"https://github.com/mytbk/rich4/blob/{tree['sha']}/{entry['path']}"})
    for label in labels:
        lines = [i+1 for i,line in enumerate(raw.decode().splitlines()) if line.split(';')[0].strip()==label]
        assert lines, (name,label)
        entries.append({'path':entry['path'],'anchor':label,'lines':lines})
assert "db '%.2f',0x00" in (cache/'rich4_ui_stock.asm').read_text()
rules = {
 'R08-01c': 'Company news 30..35 calls 00429040. Nonzero trend writes persistent stock+28 percent +10/-10 before requoting base and replacing last history point. Zero trend returns without changing percent or price. v44 only; v43 and prior replays retain their old behavior.',
 'R08-02c': 'Original-map actual commands independently reconcile bank market trades, cash company subscriptions/private pool/ownership, fortune8 public and fortune9 bank sales, float32 averages and derived costs. Quote receipts independently recomputed from recorded draws. No new ledger semantics.',
 'R10-01c': 'G7 legal research/time use restores world including holdings/averages, money, companies, quotes/history, news and calendar, consumes checkpoint tool, retains current RNG and invalidates checkpoints. Recorded prefixes resume to identical final state/events.',
 'R08-03c': 'Native chart has 144-slot circular history, zero sentinel, midpoint/spread-based vertical scaling and GDI line drawing. Native window dispatch handles mouse movement/release/doubleclick/custom messages. Web retains 144 data samples and last12 textual history, HTML controls; native chart, exact input geometry and audio not reproduced.'
}
matrix = [
 {'area':'history/data','native':'144-slot float ring; zero sentinel; last sample overwritten by immediate red/black update','web':'up to 144 integer-cent chronological samples; last sample replaced; last12 rendered as text','status':'candidate data retained; native ring/float rendering differs'},
 {'area':'chart/scaling','native':'midpoint/spread vertical scaling, circular traversal, GDI LineTo; exact thresholds not claimed here','web':'textual history; no native chart axes/scale/GDI reproduction','status':'explicit presentation backlog; not passed'},
 {'area':'ownership/pie','native':'stock screen GDI Ellipse/pie drawing beside plot','web':'holding table and company ranking text','status':'data represented; original ownership visual not reproduced'},
 {'area':'input','native':'window messages for mouse move/release/doubleclick and custom events; stock selection/quantity hit regions','web':'HTML stock and side selectors, integer quantity input, confirm; pause/fullscreen/narrow layout','status':'Web workflow tested; original geometry/gesture/audio parity unverified'},
 {'area':'precision/RNG','native':'float price, x87 operations, native RNG/reseeding','web':'integer-cent quotes, selected float32 stores and deterministic shared RNG','status':'explicit numerical and randomness difference; no Windows runtime comparison'},
]
result={'stage':'S2-04c','referenceCommit':tree['sha'],'grade':'fixed cross-version assembly evidence; no Windows execution','sources':sources,'anchors':entries,'rules':rules,'chartInputMatrix':matrix,'retainedDifferences':['native precision/RNG/chart/input/audio','other asset listings','special actors','native roulette','native exit call stack and ending','minigame presentation/collision/input']}
Path('docs/richman/s2-04c-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(len(sources),'sources',len(entries),'anchors')
