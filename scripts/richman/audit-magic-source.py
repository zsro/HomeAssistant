"""Fixed-blob audit; source interpretation is not a native Windows execution test."""
import hashlib,json,pathlib,re
root=pathlib.Path('/private/tmp/richman-price-reference');tree=json.loads(pathlib.Path('/private/tmp/richman-news-tree.json').read_text());commit=tree['sha'];sources=[];refs=[]
anchors={
'rich4_magic_house.asm':['ref_00431c7a:','fcn_00431caa:','loc_00431cd6:','loc_00431d65:','loc_00431dcc:','loc_00431e75:','loc_00431eef:','loc_00431f67:','loc_004320dd:','loc_00432160:','loc_004321f0:','loc_00432259:','loc_00432384:','loc_0043242b:','loc_004324fa:','fcn_004325c2:','loc_00432719:','loc_00432e8e:','loc_00432a4c:','fcn_0043380a:','loc_0043390b:'],
'rich4.asm':['fcn_00431842:','loc_00431867:','loc_004318b7:','loc_00431969:','loc_00431a23:','loc_00431a7d:','loc_00431ad2:','loc_00431b2c:','loc_00431b61:','loc_00431b99:','loc_00431bcf:','loc_00431c02:','loc_00431c31:','_rich4_change_player_direction:','fcn_0043f127:','fcn_0043f7c6:','fcn_0044090e:','fcn_00440706:','fcn_0043f23e:'],
'rich4_player_core_actions.asm':['_rich4_handle_player_land_on_node:','loc_00419884:','loc_0041b132:','loc_0041b13c:','loc_0041b146:','loc_0041b15e:','loc_0041b16c:','loc_0041b3cb:'],
'rich4_calculate_player_wealth.asm':['_rich4_calculate_player_wealth:'],
'rich4_card_utils_2.asm':['_rich4_player_sell_all_the_card:'],
'rich4_tool_utils.c':['rich4_player_sell_all_tools(int player)'],
'rich4_card_mengyouka.asm':['loc_004443d4:','loc_00444483:'],
'rich4_player_info.h':[], 'rich4_characters.c':[],
'rich4_small_games.asm':['_rich4_ui_game_penguin_treasure:','_rich4_ui_game_balloon:','_rich4_ui_game_xicongtianjiang:']}
for f,needles in anchors.items():
 b=(root/f).read_bytes();blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();record=next(t for t in tree['tree'] if t['path'].split('/')[-1]==f);assert record['sha']==blob,f
 sources.append(dict(path=record['path'],url=f"https://github.com/mytbk/rich4/blob/{commit}/{record['path']}",gitBlobSha1=blob,sha256=hashlib.sha256(b).hexdigest()))
 lines=b.decode().splitlines()
 for n in needles:
  hits=[i+1 for i,l in enumerate(lines) if l.split(';')[0].strip()==n];assert hits,(f,n);refs.append(dict(path=record['path'],anchor=n,lines=hits))
s=(root/'rich4_magic_house.asm').read_text();strings={}
for label,body in re.findall(r'(ref_00464[0-9a-f]+):\n(.*?)(?=\n\w+:|\Z)',s,re.S):
 b=bytearray()
 for w,n in re.findall(r'^(db|dd) (0x[0-9a-f]+)$',body,re.M):b.extend(int(n,16).to_bytes(1 if w=='db' else 4,'little'))
 if b:strings[label]=b.rstrip(b'\0').decode('cp950')
prior=json.loads(pathlib.Path('docs/richman/s2-03g-sources.json').read_text());events=prior['mapEvents']
status={0:'地产/大型建筑/公司候选已接入；完整设施差异保留',1:'无效果分派保留',2:'36新闻候选已实现/历史验收',3:'日本37命运候选已实现/历史验收',4:'拘留状态与名单已实现；直接停留监狱原UI/服务待核验',5:'住院状态与名单已实现；直接停留医院原UI/服务待核验',6:'企鹅寻宝小游戏未实现',7:'射气球小游戏未实现',8:'喜从天降小游戏未实现',9:'彩票地点/15日开奖v25候选已实现',10:'50点地点已实现',11:'30点地点已实现',12:'10点地点已实现',13:'随机卡地点v14已实现',14:'银行/贷款/日期候选已实现；其他差异保留',15:'商店购买已实现；原商店卖出UI待补',16:'本轮魔法屋12目标组、6/12效果；其余效果与原动画待补'}
# Keep source node IDs and replace the historical stage-g status with the current audit.
for e in events:e['status']=status[e['code']]
assert sorted(n for e in events for n in e['nodeIds'])==list(range(1,111))
rules={
'R13-01w':'17 map dispatch entries: code16 at35/73; 6/7/8 are minigames, no standalone roulette map code. Insurance/god/house selectors are distinct UI entry points, not one location.',
'R13-02w':'Landing handler masks low byte of status; sleep-walking suppresses nonzero codes. House has no entry fee. Human callback32719 rand%12 rejects empty groups;32e8e human mouse selection and32a4c posts selected effect-1. Web draws once uniformly among valid groups, freezes target order; no RNG/timer/AI equivalence claim.',
'R13-03w':'31842 builds alive one-based seats; maxima include all ties, property counts include land+facility, built counts buildings not levels; positive-only counts/cash/bank/points; wealth max starts0. Traffic CURRENT low2bits; dream443d4 clears to0, saved102/103 are not active traffic, attachedgodbyte63, sex20. Detained participants are not removed from group collection.',
'R05-01w':'Wealth239b9 cash+bank-loan, each stock current float32price*quantity plus float32 accumulated int then trunc/int32, raw property base+building cost; no price multiplier, points, tools or loan interest. Native malformed register idioms/extreme integer/FP behavior not claimed equivalent outside Web safe domain.',
'R07-01w':'Effect0 sells cards only via441f21;8 tools via445b3f incl active lowbit vehicle to bag before selling; dream ordinary vehicle already in bag (no duplicate); retain saved102/103; suspended engineer keeps v11 candidate lease, not native-equivalence claim, no cap loss,13 tool prices,first8 return pool;points add low16; no god fortune resistance, cash fee, insurance or bankruptcy caller.',
'R09-01w':'Effect3 ++byte56 then&127 without reflection/resistance.7 tests packedbytes50..53 hotel/disappear/prison/hospital, not winter/dream;40c78c heading+4 mod8, blocked-exit-filtered random previous; reuse existing v7 candidate.',
'R06-01w':'Effect4 directly cash+bank/zero cash without bank reject/loan/fee helper;6 receive one random card per target in frozen seat order; reuse finite card supply/full15 replacement. No immediate date advance/dividend/loan/public payment; inherited next-action and day continuation unchanged.',
'R13-04w':'v36 root magic last receipt + pending decision, token/pause/actor validation; G7 world includes receipt. Six unsupported effects visible as deferred:1 three fortunes;2 prison3;5 build;9 demolish;10 hospital3;11 auction current property.'}
result=dict(stage='S2-03w',referenceCommit=commit,grade='fixed cross-version source; not native execution equivalence',sources=sources,verifiedFiles=len(sources),references=refs,decodedStrings=strings,mapEvents=events,currentMapStatus=[dict(code=i,status=status[i])for i in range(17)],rules=rules,effects=[dict(id=i,label=list(strings.values())[12+i],implemented=i in [0,3,4,6,7,8])for i in range(12)],differences=['seeded draw over nonempty groups instead of rand%12 retries/timing','existing v7 direction candidate','only four exported roster sex entries; unknown custom IDs omitted from sex groups','safe money model; signed bank overflow not emulated','v11 suspended engineer lease remains deferred native parity; no phantom engineer sale','six remaining magic effects unavailable; no AI magic policy'],deferred=['six magic effects','three minigames','hospital/prison direct landing services','original shop selling UI','god/insurance original roulette timing','other asset listings','special actors','native end menus'])
pathlib.Path('docs/richman/s2-03w-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(dict(files=len(sources),anchors=len(refs),effects=12,implemented=6),ensure_ascii=False))
