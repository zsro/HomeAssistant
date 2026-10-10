"""Consolidate successful real UI manifests; never infer acceptance from route plans."""
import json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[2]
rows=[]
for key in [2,3,4,'dream']:
    path=ROOT/f'frontend/src/features/richman/game/fixtures/site-circuit-v41-{key}-manifest.json'
    r=json.loads(path.read_text())
    assert r['report']['normalSpeed'] and r['report']['errors']==[] and r['report']['cleanup']=={'raf':0,'canvas':0}
    rows.append({'case':str(key),**r})
log=pathlib.Path('/private/tmp/richman-ac-full-tests.log').read_text()
tests=re.search(r'Tests\s+(\d+) passed \((\d+)\)',log)
files=re.search(r'Test Files\s+(\d+) passed \((\d+)\)',log)
assert tests and tests[1]==tests[2] and files and files[1]==files[2]
assert int(tests[1])==1592
result={'stage':'S2-03ac','date':'2026-10-06','rulesId':'japan-events-candidate-v41','fingerprint':'31214035','newRuntimeSemantics':False,'candidateClosure':{'status':'closed within Japan ordinary-player candidate scope','notNativeEquivalence':True,'codeCount':17,'nodes':110,'all17NewBrowser':False},'acceptance':{'historicalItems':43,'historicalNews':36,'historicalJapanFortuneSlots':37,'historicalMagicEffects':12,'historicalMinigames':3,'newCapabilities':0,'newDomainTests':67,'newActualReplayTests':4,'fullTests':int(tests[1]),'fullFiles':int(files[1]),'versionPlayerMatrix':123,'lint':'passed','build':'passed; existing chunk size warning','sourceAudit':'2 fixed-source files;17 codes;110 unique nodes','diffCheck':'passed'},'actualBrowser':{'normalSpeed':True,'worldInjection':False,'authOnlyFixture':True,'commands':sum(r['commands'] for r in rows),'cases':rows},'differences':['other asset listings','special actors','native roulette','native exit call stack and ending','minigame presentation/collision/native input'],'notNewBrowserAcceptance':['all17 services in one route','bank passing in these routes','successful hospital help in these routes','all dream site combinations','G7 self/other teleport into all sites','facility helped player own-turn release','same-day negative dividends/loan bankruptcy with minigames','trap/bomb/all balloon question branches/overflow/touch interactions'],'next':'S2-04a stock gap audit; preserve current calendar/company foundations; no semantic change stays v41, new semantics v42','git':{'committed':False,'pushed':False,'deployed':False}}
(ROOT/'docs/richman/s2-03ac-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Actual commands',result['actualBrowser']['commands'],'tests',tests[1])
