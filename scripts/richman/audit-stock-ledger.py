"""Audit fixed native holding and caller evidence, never substitute plans for tests."""
import hashlib
import json
from pathlib import Path

cache = Path('/private/tmp/richman-price-reference')
tree = json.loads(Path('/private/tmp/richman-news-tree.json').read_text())
assert tree['sha'] == 'ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
anchors = {
    'rich4_stocks.asm': ['_rich4_buy_stock:', 'loc_00428d7f:', 'loc_00428db7:',
                        '_rich4_sell_stock:', 'loc_00428e5b:', 'loc_00428ea4:'],
    'rich4_ui_stock.asm': ['loc_00429ac9:', 'ref_00463f64:', 'loc_0042af89:', 'loc_0042afff:'],
    'rich4_player_core_actions.asm': ['loc_0041d273:'],
    'rich4_fortune.asm': ['loc_0044c8aa:', 'loc_0044c9c0:'],
    'rich4_player_bankrupt.asm': ['loc_0040d14d:'],
    'rich4.asm': ['loc_00416488:', 'loc_00416534:'],
    'rich4_calculate_player_wealth.asm': ['_rich4_calculate_player_wealth:', 'loc_004239e0:'],
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
    'R08-01b': 'Holding is integer quantity + float32 average yuan. Buy truncates old quantity*average to integer, adds actual paid, divides by new quantity and stores float32. Cash subscription and public market converge on loc00428db7.',
    'R08-02b': 'Partial sell changes quantity, preserves average; exactly empty stores zero. Display cost is derived trunc(quantity*average), not cumulative cash spend. Re-entry uses surviving average, not pro-rata historical integer cost.',
    'R08-03b': 'Public buy pays bank and reduces pool/quota. Company cash buy pays trunc(capital/10000)*quantity, reduces private subscription pool; neither creates operating income. Both update ownership.',
    'R08-04b': 'Sell flag1 credits bank, flag0 public. Fortune8 calls flag0 for each stock including zero-sale; fortune9 flag1 only nonzero. Exit calls flag0 after existing final-survivor early return. Pool/quota restored and ownership updated. No public receipts pay original debt or revive player.',
    'R08-05b': 'Original stock list displays stored average with %.2f. Asset UI iterates 12 stocks, accumulating current-price*quantity and average*quantity with integer conversion and float accumulator stores. Web per-stock integer-cent value and exact-safe-integer total retained; full native aggregate/x87 precision differs. Unrealized=value-derived-cost is a labeled Web display, not claimed native realized P&L.',
    'R10-01b': 'v43 adds average field only; legacy shapes/fingerprints unchanged; existing G7 world checkpoints restore it. v43 restores inherited asset-fortune gates omitted in v42; v42 is not retroactively changed.'
}
result = {'stage':'S2-04b','referenceCommit':tree['sha'],
          'grade':'fixed cross-version assembly evidence; no Windows execution',
          'sources':sources,'anchors':entries,'rules':rules,
          'retainedDifferences':['integer-cent trade amounts versus native float-price product boundaries',
             'native x87/float aggregate precision and large-total rounding', 'native RNG/time reseeding',
             'full native chart/input/audio','other asset listings','special actors','native roulette',
             'native exit call stack and ending','minigame presentation/collision/input']}
Path('docs/richman/s2-04b-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(len(sources),'sources',len(entries),'anchors')
