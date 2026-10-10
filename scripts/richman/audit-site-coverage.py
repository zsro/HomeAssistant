"""Current 17-code matrix; inherited fixed-source audit plus actual circuit evidence."""
import hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
D=ROOT/'docs/richman'
load=lambda p:json.loads(p.read_text())
ab=load(D/'s2-03ab-sources.json')
sources=[]
for entry in ab['sources']:
    raw=(pathlib.Path('/private/tmp/richman-price-reference')/pathlib.Path(entry['path']).name).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==entry['sha256']
    assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==entry['gitBlobSha1']
    sources.append(entry)
reports={n:load(ROOT/f'frontend/src/features/richman/game/fixtures/site-circuit-v41-{n}-manifest.json') for n in [2,3,4,'dream']}
rows=load(D/'s2-03w-sources.json')['mapEvents']
statuses={0:'普通地产/大型用地/六家公司候选；84是监狱持留格，不是探访入口',1:'原空分派，保持无服务',2:'全部36条候选新闻与序列',3:'日本37槽候选命运',4:'30点帮助普通在押玩家，标128等自身行动释放',5:'30点帮助普通住院玩家，标128等自身行动释放',6:'企鹅限时走动挖掘，按分数结算点数',7:'限时射气球与特殊效果，按分数结算点数',8:'限时接物/避炸弹，按分数结算点数',9:'36号票池、固定现金购彩、15日公共奖池',10:'停留50点',11:'停留30点',12:'停留10点',13:'随机卡片/背包/供应',14:'经过及停留银行，存取借还与日历结算',15:'经营者赠品/有限货架/买卖/营业入账/分红',16:'十二效果/反应/逐位与嵌套返回'}
history={0:['s2-03o-results.json','s2-03p-results.json','s2-03r-results.json','s2-03v-results.json'],1:['s2-03w-sources.json'],2:['s2-03f-results.json'],3:['s2-03j-results.json'],4:['s2-03z-results.json'],5:['s2-03z-results.json'],6:['s2-03ab-results.json'],7:['s2-03ab-results.json'],8:['s2-03ab-results.json'],9:['s2-03l-results.json'],10:['s2-02f-results.json'],11:['s2-02f-results.json'],12:['s2-02f-results.json'],13:['s2-03a-results.json'],14:['s2-03k-results.json'],15:['s2-03aa-results.json'],16:['s2-03y-results.json']}
for row in rows:
    code=row['code'];row['status']=statuses[code];row['historicalEvidence']=history[code]
    row['currentDomain']='representative landing/passing/dream gate tests in site-circuit.test.ts; property dream behavior inherited'
    row['actualCircuitLanding']={str(n):sorted(set(row['nodeIds'])&set(r['landings'])) for n,r in reports.items()}
    row['actualCircuitPassing']={str(n):sorted(set(row['nodeIds'])&set(r['passes'])) for n,r in reports.items()}
    row['newUiClaim']='recorded arrivals only; arrival at empty facility is not a successful help'
    row['differences']=('SVG/geometry/collision/RNG/audio/native input; explicit start/ack/quit Web convention' if code in [6,7,8] else 'special actors excluded; original roulette UI retained as difference' if code==16 else 'special actors excluded' if code in [4,5] else 'inherited candidate differences; no new native equivalence claim')
allnodes=[n for r in rows for n in r['nodeIds']]
assert len(allnodes)==110 and len(set(allnodes))==110 and sorted(allnodes)==list(range(1,111))
result={'stage':'S2-03ac','referenceCommit':ab['referenceCommit'],'grade':'fixed cross-version source, historical reports, current engine boundaries, real browser commands; no native Windows execution','rulesId':'japan-events-candidate-v41','fingerprint':'31214035','sources':sources,'nativeEntry':{'file':'asm/rich4_player_core_actions.asm','line':322,'anchors':['status byte node+0x24 &255','dream byte player+55; nonzero event code returns','switch0..16; code1 has no service']},'mapEvents':rows,'inheritedEvidence':['s2-03ab-sources.json','s2-03aa-sources.json','s2-03z-sources.json','s2-03y-sources.json','s2-03k-sources.json'],'coverage':{'codes':17,'uniqueNodes':110,'representativeDomainTests':67,'circuitCases':4,'all17NewUi':False},'explicitDeferred':['other asset listings','special actors','native roulette','native exit call stack and ending','minigame presentation/collision/native input differences']}
(D/'s2-03ac-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('17 codes / 110 unique nodes; 2 fixed-source hashes verified; 4 actual circuit manifests')
