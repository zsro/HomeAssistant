"""Fixed native source anchors for S2-05a; no native-runtime claim."""
import json,hashlib
from pathlib import Path
root=Path('/private/tmp/richman-price-reference')
prior=json.loads(Path('docs/richman/s2-03v-sources.json').read_text())
names={'rich4_ui_bank.asm':['fcn_00433bd8:','loc_00433c1e:','loc_00436a9b:'],
 'rich4_ui_stock.asm':['fcn_0042ba97:','loc_0042be6f:','loc_0042bec2:'],
 'rich4_player_core_actions.asm':['loc_0041d066:','fcn_0041d2c6:'],
 'rich4_player_bankrupt.asm':['loc_0040d039:','loc_0040d089:','loc_0040d14d:','loc_0040d282:'],
 'rich4_stocks.asm':['_rich4_sell_stock:','loc_00428ea4:']}
sources=[];anchors=[]
for filename,labels in names.items():
 p=root/filename;raw=p.read_bytes();source=next(x for x in prior['sources'] if x['path'].endswith('/'+filename));assert hashlib.sha256(raw).hexdigest()==source['sha256'];assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==source['gitBlobSha1'];sources.append(source)
 for label in labels:
  hits=[i+1 for i,l in enumerate(raw.decode().splitlines()) if l.split(';')[0].strip()==label];assert hits,(filename,label);anchors.append({'path':source['path'],'anchor':label,'lines':hits})
rules={
 'R05-01a-stress':'Revalidate current v44: dividend and maturity debit bank then cash, insufficient amount exits without necessary-share pre-sale; public exit proceeds cannot refill original debit. Rent retains earlier necessary liquidation and can leave player alive. No new rule.',
 'R08-01a-stress':'Frozen company allocation and seat nets use original f32 ratio/int32 sum. Later seats read live cash after earlier auctions. Exit clears average/quantity and ownership only after final-survivor early branch; exact loan payment leaves average/ownership intact. No new ledger rule.',
 'R09-01a-stress':'While dividend disposal waits, date tail/lottery/incoming loan/self clocks wait. Completed dividend emits receipt, then lottery, then incoming maturity; second loan disposal has distinct callback. Same-day awarded lottery+loan is domain coverage, not original-map UI evidence.',
 'R10-01a-stress':'Legal original-map commands and actual browser exports independently reconcile obligations/actual/unpaid, forced rent sale versus public exit stock sale, bids, company ownership and restart from serialized replay prefixes. Plan-only results never count as UI.',
}
result={'stage':'S2-05a','rulesId':'japan-events-candidate-v44','fingerprint':'f9dbb7e9','semanticIncrement':False,'referenceCommit':prior['referenceCommit'],'grade':'fixed cross-version assembly; no Windows execution','sources':sources,'anchors':anchors,'rules':rules,'historicalCoverage':[{'stage':'S2-03t/v33','coverage':'rent insolvency, final-survivor and three public auctions','gap':'no v43 averages/v42 quotes'},{'stage':'S2-03u/v34','coverage':'company/fortune callbacks; maturity domain','gap':'maturity public disposal original-map UI missing'},{'stage':'S2-03v/v35','coverage':'tax/dividend frozen rows, public disposal and date return; same-day loan domain','gap':'same-day awarded lottery+loan and new stock ledger UI missing'},{'stage':'S2-04b/c','coverage':'averages/current quotes; legal fortune8/9/G7 routes','gap':'necessary rent stock sale and negative dividend/maturity disposal current-profile UI missing'}],'retainedDifferences':['original float/x87 versus integer cents and aggregate precision','native RNG/reseeding','native chart/input/audio','other asset listings','special actors','native roulette','native exit call stack/end menu and Web last-survivor date stop','minigame presentation/collision/input']}
Path('docs/richman/s2-05a-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(len(sources),'files',len(anchors),'anchors')
