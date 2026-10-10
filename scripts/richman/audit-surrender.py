#!/usr/bin/env python3
"""Recheck the pinned cached native evidence; no Windows execution claim."""
import json, hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
old=json.loads((root/'docs/richman/s3-03d-sources.json').read_text())
cache=Path('/private/tmp/richman-price-reference')
files=['rich4_ui_options.asm','rich4_player_utils.asm','rich4_magic_house.asm','rich4_objects.asm','rich4_gods.asm','rich4_tool_utils.c','rich4_player_bankrupt.asm','rich4_load_map.asm','rich4_player_core_actions.asm']
sources=[x for x in old['sources'] if Path(x['path']).name in files]
for source in sources:
 assert hashlib.sha256((cache/Path(source['path']).name).read_bytes()).hexdigest()==source['sha256'],source['path']
facts=[x for x in old['facts'] if x['id'].startswith('GOD-')]
for f in facts:
 f['id']=f['id'].replace('GOD-','DEATH-')
 if f['id']=='DEATH-05':f['finding']=f['finding'].replace('Existing Web retains equipment: explicit gap.','v44-v46 retain equipment; v47 clears active and saved equipment with explicit Web engineer/dream mapping.')
facts.append({'id':'DEATH-12','file':'rich4_player_utils.asm','lines':[1217,1240],'finding':'fcn40dfda loops ordinary seats and counts participation bit1 (remaining humans); surrender checks initial num_human_players>1 and this count>0 after bankruptcy.'})
facts.append({'id':'DEATH-13','file':'rich4_ui_options.asm','lines':[3040,3070],'finding':'options result2 calls surrender. Human-only idle/turnEnd command gating is an explicit safe Web menu boundary; native exact caller-phase/human UI stack not claimed identical.'})
result={'stage':'S3-03e','referenceCommit':old['referenceCommit'],'nativeExecution':False,'sources':sources,'facts':facts,'implementedScope':['explicit surrender continuation after shared public disposal, never ordinary debt hook','first free type15 slot before replacement, two slots, no random initial/refill15','equipment/bag clearing, no point refund, tools1..8 finite pool only','13 own-incoming expiry, removal without pair','cancel skips attachment only; source remains eliminated'], 'webBoundaries':['human source and idle/turnEnd only; ordinary human/AI targets','old G7 checkpoints invalidated by surrender; later snapshots retain dual slots and cleared equipment','existing last-one-alive Web endgame and public auction callback retained, not native stack equivalence','saved engineer/dream equipment already in bag is not returned twice; research supply fields are not incremented'], 'deferred':['original Windows runtime and exit stack/endgame','special actors, native RNG, animations/spinner','full native option menu phase reachability and keyboard cancel equivalence','autonomous walk not located; no invented behavior']}
(root/'docs/richman/s3-03e-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(sources),'facts':len(facts),'hashesVerified':True}))
