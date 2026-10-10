#!/usr/bin/env python3
"""Recheck pinned local native sources and distinguish inherited acceptance from new UI."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
cache=Path('/private/tmp/richman-price-reference')
old=json.loads((root/'docs/richman/s3-03e-sources.json').read_text())
for source in old['sources']:
    assert hashlib.sha256((cache/Path(source['path']).name).read_bytes()).hexdigest()==source['sha256'],source['path']
history=[]
for stage,title in [('s3-03b','ordinary pairs'),('s3-03c','special objects/month'),('s3-03d','vehicle dodge/full-tool failure/G7'),('s3-03e','surrender/two slots'),('s3-02k','vehicle policies/restoration')]:
    p=root/f'docs/richman/{stage}-results.json'
    history.append({'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':title,'evidence':'historical actual UI results; relevant archived golden replays rerun separately'})
facts=[{'id':'R09-03f-01','sourceFacts':['DEATH-02','DEATH-12','DEATH-13'],'finding':'Only explicit ordinary human surrender triggers selection after exit; selector targets remaining ordinary players including computer. Safe Web command boundary and G7 barrier remain explicit candidates.'},
 {'id':'R09-03f-02','sourceFacts':['DEATH-01','DEATH-05'],'finding':'Reserve free type15 slot before replacing target god; native current equipment converted to tools then tools/cards discarded. Ordinary tools1..8 return pool, research tools do not mint pool; active/saved engineer mapping is Web adaptation.'},
 {'id':'R09-03f-03','file':'rich4_player_core_actions.asm','lines':[4464,4488],'finding':'Attached god remaining is decremented at own incoming action. Thirteen decrements reach expiry; a G7 world restore can restore earlier remaining and thus increase subsequent total boundaries.'},
 {'id':'R09-03f-04','evidenceKind':'deduction from current ordinary-seat command gates, verified by legal-command domain test','sourceFacts':['DEATH-01','DEATH-02'],'finding':'At most two successful gifts in a fresh four-ordinary-seat game: each consumes a source seat and selection requires at least two remaining targets. A third gift while two slots busy is not reachable through fresh ordinary surrender commands. Busy handling remains defensive domain coverage, not invented UI acquisition.'},
 {'id':'R09-03f-05','file':'rich4_load_map.asm','lines':[255,307],'finding':'Native initial odd objects1..11 plus13/14 exclude15; month entry remains13/14. v45/v46/v47 coverage is combined, historical failures/month coverage is not relabeled as new browser execution.'},
 {'id':'R09-03f-06','finding':'No runtime or policy behavior change this batch. G7 checkpoint after irreversible surrender includes eliminated source and cleared equipment; world restores without command/RNG/log rewind. Exact original G7/exit call stack is not asserted.'}]
result={'stage':'S3-03f','referenceCommit':old['referenceCommit'],'nativeExecution':False,'sources':old['sources'],'inheritedNativeFacts':old['facts'],'facts':facts,'historicalEvidence':history,'newGameSemantics':False,'newPolicyVersion':False,'auditScope':'Cached primary source hash recheck and local implementation/actual replay analysis; no new native Windows runtime','deferred':old['deferred']+['dream/suspended engineer and source-equipped surrender UI combinations','third busy type15 not reachable in fresh current ordinary four-seat game','original RNG/spinner and all special actor identities']}
(root/'docs/richman/s3-03f-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sources':len(old['sources']),'inheritedFacts':len(old['facts']),'closureFacts':len(facts),'history':len(history),'hashesVerified':True}))
