"""Check fixed original reaction anchors; no Windows runtime equivalence claim."""
import json,hashlib
from pathlib import Path
root=Path('/private/tmp/richman-price-reference')
prior=[json.loads(Path(f'docs/richman/{name}').read_text()) for name in ['s2-02j-sources.json','s2-05a-sources.json']]
names={
 'rich4_card_passive.asm':['_rich4_try_use_card_mianfeika:','_rich4_try_use_card_jiahuoka:','_rich4_use_card_mianzuika:','_rich4_use_card_fuchouka:'],
 'rich4_card_xianhaika.asm':['loc_00444599:','loc_004445e7:','loc_0044460b:','loc_0044461c:'],
 'rich4_card_mengyouka.asm':['_rich4_use_card_mengyouka:','loc_00444334:','loc_004443e6:'],
 'rich4_card_tongmengka.asm':['loc_004457e8:','loc_00445827:','loc_00445866:'],
 'rich4_player_core_actions.asm':['loc_00419e34:','loc_00419e67:','loc_00419e9a:','loc_00419ec7:','loc_00419f2a:'],
 'rich4_player_bankrupt.asm':['loc_0040d039:','loc_0040d089:','loc_0040d14d:','loc_0040d282:'],
}
sources=[];anchors=[]
for name,labels in names.items():
 raw=(root/name).read_bytes();source=next(x for d in prior for x in d['sources'] if x['path'].endswith('/'+name));assert hashlib.sha256(raw).hexdigest()==source['sha256']
 source={**source,'gitBlobSha1':hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()};sources.append(source)
 for label in labels:
  hits=[i+1 for i,line in enumerate(raw.decode().splitlines()) if line.split(';')[0].strip()==label];assert hits,(name,label);anchors.append({'path':source['path'],'anchor':label,'lines':hits})
r={'stage':'S2-05b','referenceCommit':prior[0]['referenceCommit'],'rulesId':'japan-events-candidate-v44','fingerprint':'f9dbb7e9','semanticIncrement':False,'grade':'fixed cross-version assembly anchors, not Windows execution','sources':sources,'anchors':anchors,
'rules':{'R07-01b-circuit':'Existing ordinary rent: alliance waiver before reactions; optional free then redirect; only final payer portfolio is liquidated; substitute protections are not recursively offered; owner redirect waives rent.',
'R07-02b-circuit':'Existing attack: hostility first; automatic immunity before redirect; target source prison=4, other=5; original-hit revenge applies 5 to source with no recursive immunity. Original dream winter guard precedes reactions, redirect bypasses it.',
'R05-01b-circuit':'Existing v33 exit: substitute dies; original turn actor remains; auction cash goes public, original actual-paid frozen and credited to owner bank after disposal; no date/next actor advance while auction waits.',
'R10-01b-circuit':'UI-only fix: later profiles inherited nearby worker in engine but ItemPanel mode allowlist stopped at company. Use existing g1 capability plus pre-G1 nearby modes; old worker-only mode preserved. No fingerprint or engine change.'},
'historicalCoverage':[{'stage':'G3/v9 + unified','coverage':'six cards acquired, optional/free/redirect/automatic defenses, small-map substitute debt, roster and inventory','gap':'current v44 averages/public disposal and original-map ally rent not combined'},{'stage':'S2-03p/x','coverage':'insurance and magic detention reactions','gap':'current attack redirection and current-action return stressed here'},{'stage':'S2-05a','coverage':'rent necessary sale, negative dividend, loan date/public disposal','gap':'no new free/redirect/alliance UI'}],
'retainedDifferences':prior[1]['retainedDifferences']}
Path('docs/richman/s2-05b-sources.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(len(sources),'sources',len(anchors),'anchors')
