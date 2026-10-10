"""Collect confirmed local acceptance; never promote an unfinished/error run."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
load=lambda p:json.loads(Path(p).read_text())
log=Path('/private/tmp/computer-final-tests.log').read_text()
assert '1786 passed (1786)' in log and '124 passed (124)' in log and 'Unhandled Errors' not in log
assert 'built in' in Path('/private/tmp/computer-final-build.log').read_text()
assert 'error' not in Path('/private/tmp/computer-lint.log').read_text().lower()
rows=[load(root/f'frontend/src/features/richman/game/fixtures/computer-v44-{n}-manifest.json') for n in (2,3,4)]
for r in rows: assert r['report']['errors']==[] and r['report']['cleanup']=={'raf':0,'canvas':0}
before=Path('/private/tmp/richman-03ai-before/frontend/src/features/richman/game/fixtures')
old=list(before.glob('*.json'))
assert len(old)==280 and all(p.read_bytes()==(root/'frontend/src/features/richman/game/fixtures'/p.name).read_bytes() for p in old)
data={'stage':'S3-01a','date':'2026-10-07','rulesId':'japan-events-candidate-v44','fingerprint':'f9dbb7e9','policy':'basic-v1','semanticIncrement':False,'runtimeChanged':True,'basicComputerImplemented':True,'s3_01Closed':False,'nativeComplete':False,
'preserved':{'s2_03CandidateClosed':True,'s2_04CandidateClosed':True,'s2_05CandidateClosed':True,'items':43,'news':36,'japanFortuneSlots':37,'oldFixtureJsonUnchanged':280,'allVersionPlayerCases':132,'workerUIFixUnchanged':True},
'checks':{'frontend':{'passed':1786,'files':124,'newDomain':10,'newActualReplay':3,'maxWorkers':2,'errors':0},'lint':'passed','build':'passed; existing chunk size/mixed import warnings','firstFullRun':'1783 assertions passed, 1 onTaskUpdate RPC timeout; not accepted as clean run; final clean rerun includes 3 new browser replay tests'},
'originalMapBrowser':{'routes':rows,'totalCommands':sum(r['commands'] for r in rows),'totalComputerDecisions':sum(r['computer'] for r in rows),'normalSpeed':True,'injection':'auth only; no game state injection','terminalUI':False,'alternateResponderUI':False},
'domainLongGames':load('/private/tmp/computer-long.json'),'builtUI':load('/private/tmp/richman-computer-built/results.json'),
'fixes':['bank rejection skips transfer','browser harness return link corrected and full mixed routes rerun'],
'notClaimed':['native AI equivalence or difficulty tuning','terminal winner mixed-seat UI','actual AI alternate responder reaction/debt/magic-build UI','all seat/character permutations','browser background throttling','advanced card/stock/research/bidding strategies','loading control metadata as a saved session'],
'next':'S3-01b: legal mixed-seat terminal and alternate responder UI/replay acceptance, then S3-02 grouped strategy',
'git':{'committed':False,'pushed':False,'deployed':False}}
(root/'docs/richman/s3-01a-results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('S3-01a confirmed:',data['checks']['frontend'],data['originalMapBrowser']['totalCommands'])
