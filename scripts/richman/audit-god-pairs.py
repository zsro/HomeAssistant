#!/usr/bin/env python3
"""Static audit inventory, not a Windows execution claim."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[2];cache=Path('/private/tmp/richman-price-reference')
files=['rich4_node_utils.asm','rich4_objects.asm','rich4_gods.asm','rich4_load_map.asm','rich4_player_core_actions.asm','rich4_player_bankrupt.asm','rich4_card_songshenfu.asm','rich4.asm']
commit='ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
mapdata=json.loads((root/'docs/richman/japan-map-audit.json').read_text())
records=[{'path':'asm/'+f,'sha256':hashlib.sha256((cache/f).read_bytes()).hexdigest(),'url':f'https://github.com/mytbk/rich4/blob/{commit}/asm/{f}'} for f in files]
facts=[
 ('PAIR-01','rich4_load_map.asm',255,307,'Object type table initialized; odd slots1,3,5,7,9,11 then13/14 placed. This increment only ordinary1..10;12/15 preserve prior candidate availability.'),
 ('PAIR-02','rich4_node_utils.asm',52,146,'IDs1..numNodes, adjacency required; +0x24 &0x80ffff00 must be zero. Draw full eligible list; reject until |dx|>=300 OR |dy|>=300; origin0 skips distance. No native empty guard.'),
 ('PAIR-03','rich4_objects.asm',24,137,'Ordinary type chooses one fixed slot; node nonzero means busy, loop exits without modifying it. Sampler ran in caller before busy check.'),
 ('PAIR-04','rich4_objects.asm',139,254,'Removal detaches carrier/modifiers, clears road occupancy for free object, clears object node/time/carrier; zero-based index<12 uses adjacent XOR1 slot after sampling from old node.'),
 ('PAIR-05','rich4_gods.asm',472,550,'Attach temporarily zeros incoming slot node before old detach, then assigns current player node, carrier and7/13. Native transient reentrancy retained as a difference for forced double-occupied pairs; ordinary invariant prevents both pair members existing naturally.'),
 ('PAIR-06','rich4_player_core_actions.asm',4459,4484,'Expiry uses detach/remove, not calendar five-round replenishment.'),
 ('PAIR-07','rich4_player_bankrupt.asm',82,112,'Exit removes attached god then carried bomb before later asset handling; paired placement is not debt payment or revival.'),
 ('PAIR-08','rich4_card_songshenfu.asm',16,64,'Dismiss routes carried bomb through remove and applicable god through detach.'),
 ('PAIR-09','rich4_player_core_actions.asm',4830,4873,'Day15 dividends/lottery precede month-change13/14 removal/replacement; special objects not ordinary gods.'),
 ('PAIR-11','rich4_player_core_actions.asm',2584,2602,'Type11 dispatch differs from attach12;13 dispatches random-tool gift;14 dispatches point gift. Not all first14 slots are attachable gods.'),
 ('PAIR-12','rich4_player_core_actions.asm',2901,3148,'11 removes object then branches on ordinary vehicle, on-foot path reaches hospital3;13 ordinary recipient removes object only on successful random-tool receipt;14 ordinary path removes object and adds500 to points+48. Special actor branches and full gates deferred.'),
 ('PAIR-10','rich4.asm',4320,4357,'Area destruction calls shared remove object. Web v45 preserves G7 fixed initial hit-set semantics; native mutable road traversal equivalence not claimed.')]
pinned=Path('/private/tmp/richman-node-utils-pinned.asm');assert pinned.exists() and pinned.read_bytes()==(cache/'rich4_node_utils.asm').read_bytes()
result={'nodeUtilsPinnedDownload':{'matched':True,'path':str(pinned),'sha256':hashlib.sha256(pinned.read_bytes()).hexdigest()},'stage':'S3-03b','referenceCommit':commit,'nativeExecution':False,'status':'static-source-audited-Web-candidate','sources':records,'mapAuditSHA256':hashlib.sha256((root/'docs/richman/japan-map-audit.json').read_bytes()).hexdigest(),'staticBlocked':[{k:n[k] for k in ['id','x','y','statusBits']} for n in mapdata['nodes'] if n['statusBits']&0x80ffff00],'facts':[{'id':i,'file':f,'lines':[a,b],'finding':v} for i,f,a,b,v in facts], 'implemented':'five ordinary pairs1/2,3/4,5/6,7/8,9/10; replacement/dismiss/expiry/exit/G7 remove; seeded full-list rejection; snapshot restore','differences':['12/15 retain v44 initialization/refill;11/13/14 and11/12 pair deferred','seeded RNG is not libc rand; empty/no-distant guard and4096 retry cap are Web safety behavior','no forced double-pair transient occupancy emulation','G7 blast fixed hit list, not native mutable road traversal','no native animations/spinner or autonomous roaming claim']}
(root/'docs/richman/s3-03b-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('audited',len(files),'source files;',len(result['staticBlocked']),'blocked Japan nodes')
