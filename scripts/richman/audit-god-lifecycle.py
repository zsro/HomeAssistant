#!/usr/bin/env python3
"""Read-only static evidence; does not execute the Windows game."""
import json, re, struct, hashlib
from pathlib import Path
from audit_effects import pe_name_offset
root=Path(__file__).resolve().parents[2]
cache=Path('/private/tmp/richman-price-reference')
files=['rich4.asm','rich4_gods.asm','rich4_objects.asm','rich4_load_map.asm','rich4_player_core_actions.asm','rich4_fortune.asm','rich4_ai_use_card.asm','rich4_ai_use_tool.asm','rich4_animate_object.asm']
sha=lambda b:hashlib.sha256(b).hexdigest()
asm=(cache/'rich4.asm').read_text()
data=Path('/Users/zsr/Documents/rich4/Game/rich4.exe').read_bytes()
tables={}
for name,va in [('participantScore',0x4749e2),('money',0x474a06),('resistance',0x474a2a)]:
 block=asm.split(f'ref_{va:08x}:',1)[1].split('\nref_',1)[0]
 raw=b''.join(int(value,16).to_bytes({'db':1,'dd':4}[kind],'little') for kind,value in re.findall(r'^(db|dd) (0x[0-9a-f]+)$',block,re.M))[:36]
 off=pe_name_offset(data,va)
 tables[name]={'VA':hex(va),'signed16':list(struct.unpack('<18h',raw)),'localPEOffset':off,'localPEMatches':data[off:off+36]==raw,'binaryPatternOffsets':[m.start() for m in re.finditer(re.escape(raw),data)]}
# Record exact static callsites; naming a reader does not assert every branch is reachable.
readers={}
for field in (68,70,72):
 readers[str(field)]=[{'file':f,'line':i,'instruction':line.strip()} for f in files for i,line in enumerate((cache/f).read_text().splitlines(),1) if re.search(r'\+\s*'+str(field)+r'\)\]' ,line)]
result={'stage':'S3-03a','nativeExecution':False,'evidence':'fixed-commit disassembly plus local PE data comparison; no Windows runtime or native animation equivalence',
 'referenceCommit':'ec7d70e693059d1e781d9d1cc2ad7f36d360d39e','referenceURL':'https://github.com/mytbk/rich4','cache':str(cache),
 'files':[{'provenance': 'local cache; fixed-commit attribution not independently rechecked' if f=='rich4_animate_object.asm' else 'sha256 matches prior fixed-commit source registrations','file':f,'sha256':sha((cache/f).read_bytes()),'url':'https://github.com/mytbk/rich4/blob/ec7d70e693059d1e781d9d1cc2ad7f36d360d39e/asm/'+f} for f in files],
 'localBinaryNote':'Reference VA bytes differ. Each full 36-byte table occurs once at another file offset; byte-pattern match is data evidence, not proof of identical executable callsites.',
 'localBinary':{'path':'/Users/zsr/Documents/rich4/Game/rich4.exe','sha256':sha(data)},'tables':tables,'fieldReaders':readers,
 'facts':[
 {'id':'GOD-01','source':'rich4_gods.asm:472-552','finding':'Attach replaces prior carrier; player+63 is object slot. Type15 duration13, other attached types7; add signed16 fields+68/+70/+72.'},
 {'id':'GOD-02','source':'rich4_objects.asm:139-254','finding':'Removal clears attachment and subtracts three modifiers; first12 object slots alternate paired slot and seek distant unoccupied node. Busy paired slot and all reentry callers deferred.'},
 {'id':'GOD-03','source':'rich4_load_map.asm:255-307','finding':'Initial slots1/3/5/7/9/11 plus13/14; differs from Web 12-type initial pool and five-round replenishment.'},
 {'id':'GOD-04','source':'rich4.asm:22732-22899; rich4_fortune.asm','finding':'fcn_0044b896 selects money +70 or resistance +72 and threshold result codes; imported fortune consumers already exist in Web. +68 is seen in participant scoring fcn_00437d1a; do not invent global luck probability.'},
 {'id':'GOD-05','source':'rich4_player_core_actions.asm:4459-4484,4830-4873','finding':'Own-action attached timer; date month-change branch relocates slots13/14 after day15 dividend/lottery; not evidence of five-round all-god refresh.'},
 {'id':'GOD-06','source':'rich4.asm:1910-2030,7130-7160; rich4_animate_object.asm','finding':'Attached object node/visual follows carrier; absence rendering gate exists. Animation is not proof of autonomous free-god game movement.'}],
 'scope':{'implemented':'read-only god/traffic panel and following text badge; game rules and all policies unchanged','deferred':['native paired spawn/remove rules and blocked pair','special slots11/13/14','native free wandering not established','native vehicle/god sprites and animation','base character luck and original AI scoring','native spinner and exit callstack']}}
# Do not silently accept a mislabeled cross-version binary table.
# Different original binary layout: unmatched addresses remain explicitly unverified.
(root/'docs/richman/s3-03a-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'tables':tables,'readerCounts':{k:len(v) for k,v in readers.items()}},ensure_ascii=False))
