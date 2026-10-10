#!/usr/bin/env python3
"""Pinned static source audit. Does not assert Windows execution or native RNG parity."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[2];cache=Path('/private/tmp/richman-price-reference')
commit='ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
files=['rich4_load_map.asm','rich4_objects.asm','rich4_node_utils.asm','rich4_player_core_actions.asm','rich4_player_utils.asm','rich4_hospital_utils.asm','rich4_tool_utils.c','rich4_tool_gongchengche.asm','rich4.asm']
facts=[
 ('SPECIAL-01','rich4_load_map.asm',255,307,'Initialize odd1..11 then13/14. v46 uses same order; legacy15 remains explicitly separate.'),
 ('SPECIAL-02','rich4_player_utils.asm',685,718,'ref48baf8 is remaining movement, decremented per completed step; move-one-step dispatch checks zero. Not a dream flag.'),
 ('SPECIAL-03','rich4_player_core_actions.asm',2584,2602,'11/13/14 have separate dispatch from attachable1..10/12. Ordinary actor IDs0..3; special actors separate.'),
 ('SPECIAL-04','rich4_player_core_actions.asm',2901,2967,'11 zero-remaining gate; remove11 BEFORE ordinary vehicle check; nonzero traffic skips hospital, foot calls preparation then hospital3. No card reaction window.'),
 ('SPECIAL-04b','rich4_tool_gongchengche.asm',18,58,'Engineering sets traffic+17 to0x1f (nonzero), so active engineer also avoids object11. Web stores active engineer separately from foot mobility; gate must include non-suspended engineer.'),
 ('SPECIAL-05','rich4_hospital_utils.asm',30,187,'Hospital shared entry relocates/updates absence and calls fcn44ba63 with duration*2000*priceIndex; existing insurance integration reused. No added payment debt or attack response.'),
 ('SPECIAL-06','rich4_player_core_actions.asm',2968,3015,'13 ordinary final stop calls receive_random_tool; only returned0 retains object. Nonzero removes13 and shows selected tool.'),
 ('SPECIAL-07','rich4_tool_utils.c',12,64,'Weighted current finite supply for tool1..8 only; selected ID returned even if receive_tool refuses stack>=9. Empty pool returns0 without draw. Full stack means remove object, no supply decrement, no retry. Corrects prior shorthand successful receipt.'),
 ('SPECIAL-08','rich4_player_core_actions.asm',3114,3160,'14 ordinary final stop removes then adds500 via ADD WORD player+48 (uint16 wrap), no fee or company revenue. Special actor branches deferred.'),
 ('SPECIAL-09','rich4_player_core_actions.asm',4830,4874,'After day15 dividend/lottery check and month helper, capture13 old node (+290), remove13, sample distant from OLD node, place13; repeat14 (+314). Absent old node0 means no distance. Corrects previous report implied generic refresh.'),
 ('SPECIAL-10','rich4_objects.asm',139,254,'First12 slots removal pairs XOR1;13/14 never pair. Reuse shared sampler and busy-slot behavior; include special road occupancy.'),
 ('SPECIAL-11','rich4.asm',4320,4357,'Explosion uses shared object removal. Web fixed initial hit set includes special objects; newly paired spawn not recursively hit, native mutable traversal remains difference.')]
for f in files:assert (cache/f).exists()
result={'stage':'S3-03c','referenceCommit':commit,'nativeExecution':False,'sources':[{'path':'asm/'+f,'sha256':hashlib.sha256((cache/f).read_bytes()).hexdigest(),'url':f'https://github.com/mytbk/rich4/blob/{commit}/asm/{f}'} for f in files],'facts':[{'id':i,'file':f,'lines':[a,b],'finding':v} for i,f,a,b,v in facts],'corrections':['13 selected nonzero is not proof inventory increased: full selected kind still removes object','month13/14 sample distant from captured old node, not unconditional origin0'],'implemented':'ordinary-seat road11/13/14 final stops; pair11/12; tool1..8 pools/full outcome; uint16 points; ordered month refresh; shared occupancy/nuclear removal/G7 restore','differences':['native RNG/voice draws/empty-cap protection and transient double-slot reentrancy retained','special actors4+ and15 acquisition/pool retained as deferred','special object teleport selection, native mutable blast traversal and original sprites/spinner deferred','no Windows runtime validation; shared candidate detention/vehicle status semantics retained']}
(root/'docs/richman/s3-03c-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('Audited',len(files),'files and',len(facts),'facts')
