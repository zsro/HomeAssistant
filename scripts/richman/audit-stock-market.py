"""Fixed-reference audit for S2-04a; no native execution/equivalence claim."""
import json,pathlib,hashlib,re,struct
root=pathlib.Path('/private/tmp/richman-price-reference');tree=json.loads(pathlib.Path('/private/tmp/richman-news-tree.json').read_text());assert tree['sha']=='ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
anchors={'rich4_stocks.asm':['_rich4_buy_stock:','_rich4_sell_stock:','fcn_00428ec5:','fcn_00429040:','fcn_0042915a:','fcn_004291d6:','loc_00429248:','loc_00429316:','loc_00429346:','loc_004293d2:','loc_00429470:','loc_004294b9:','fcn_004295ea:'],'rich4_ui_stock.asm':['loc_0042aee4:','loc_0042af30:','loc_0042af89:','loc_0042afff:','loc_0042b05a:'],'rich4_player_core_actions.asm':['fcn_0041c84f:','loc_0041d021:','loc_0041d045:','loc_0041d066:'],'rich4_all_stocks.c':[]}
sources=[];refs=[]
for f,needles in anchors.items():
 raw=(root/f).read_bytes();blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest();entry=next(t for t in tree['tree'] if t['path'].split('/')[-1]==f);assert blob==entry['sha'],f
 sources.append(dict(path=entry['path'],url=f"https://github.com/mytbk/rich4/blob/{tree['sha']}/{entry['path']}",gitBlobSha1=blob,sha256=hashlib.sha256(raw).hexdigest()))
 for anchor in needles:
  lines=[i+1 for i,l in enumerate(raw.decode().splitlines())if l.split(';')[0].strip()==anchor];assert lines;refs.append(dict(path=entry['path'],anchor=anchor,lines=lines))
asm=(root/'rich4_stocks.asm').read_text();constants={}
for m in re.finditer(r'(ref_00463f\w+):\n((?:dd 0x[0-9a-f]+\n)+)',asm):
 raw=b''.join(int(v,16).to_bytes(4,'little')for v in re.findall(r'dd (0x[0-9a-f]+)',m[2]));constants[m[1]]=struct.unpack('<'+('f'if len(raw)==4 else'd'),raw)[0]
assert constants['ref_00463fc4']==4097 and constants['ref_00463fc8']==1171 and constants['ref_00463fd8']==10000
rows=re.findall(r'\{ "[^"]+", ([^}]+)\}, /\* ([^*]+) \*/',(root/'rich4_all_stocks.c').read_text())[24:36]
stocks=[dict(id=f'jp:{24+i}',name=name,fields=[float(n.strip())for n in values.split(',')])for i,(values,name)in enumerate(rows)]
assert len(stocks)==12 and [x['fields'][3]for x in stocks]==[10000,5000,10000,5000,5000,5000,10000,10000,10000,10000,10000,10000]
catalog=pathlib.Path('frontend/src/features/richman/game/g6-catalog.ts').read_text()
for stock in stocks:
 m=re.search(r"id: '"+stock['id']+r"', name: '[^']+', shares: (\d+), price: (\d+), volatility: (\d+)",catalog);assert m
 assert int(m[1])==stock['fields'][3] and int(m[2])==round(stock['fields'][5]*100) and int(m[3])==round(stock['fields'][8]*10),stock['id']

rules={
'R08-01a':'Japanese stocks24..35: same12 names, initial yuan prices, public shares and volatility facts. Current catalog volatility8..20 is native0.8..2.0 times10; v42 applies /10.',
'R08-02a':'Open day uses one shared(rand-16384)/4097; ordinary stock stores noise=(rand-16384)/1171, adds noise*volatility to previous percent then shared. Stored fields float32; seeded draw0..32767 replaces native libc RNG and time reseed explicitly.',
'R08-03a':'Company anchor=capital(+0x24)/10000 yuan, strict below0.85x or above3x; ordinary initial price strict below0.5x/above8x. Above suppress positive0.5/amplify negative2; below positive2/negative0.5; then clamp[-10,10]. Uses capital, not funds/cumulative/dividend.',
'R08-04a':'Existing daily clocks precede quote update. Closed day returns before shared RNG or history. Each stock copies current to base; individual suspension resets percent0 and flat price, overrides red/black, no individual draw; else redblack sets+-10 without individual draw; ordinary last. 12 stocks catalog order,144 history, aggregate index trunc(sum(yuan)*10). Cards/news set same persistent percent when changing current quote.',
'R08-05a':'Target-price tiers5/15/50/150 yuan use delta steps0.01/0.05/0.1/0.5/1; lower1 upper9999. Reuse existing integer-cent ideal formula; native x87/f32 boundary bits not claimed equivalent.',
'R08-06a':'004295ea classifies upper/lower from current vs base and stepped+-10 quotes. UI upper(1) blocks buys,lower(3) blocks sells; opposite side allowed, flat unchanged price is not classified as limit. Debt forced sales bypass UI restriction. UI manual buy max=min(current quota, trunc(bank/current price)); current pool constraint retained. Existing floor(transaction price*quantity) amount can afford one extra share at fractional boundary, so v42 separately enforces unrounded affordability. Sale proceeds bank, pool/quota restored; company-owner ordering inherited.',
'R08-07a':'Quota per incoming ordinary seat: remaining<=1000 all,else trunc(pool*(rand%2000+1000)/10000). Existing seeded implementation retained; not daily supply refill. Native average-cost float is not existing total-cost prorating; retain as explicit next-step gap.'}
matrix=[dict(area=k,evidence=v,status='v42 increment'if k in ['R08-02a','R08-03a','R08-04a','R08-06a']else 'verified/reused with stated differences')for k,v in rules.items()]
result=dict(stage='S2-04a',referenceCommit=tree['sha'],grade='fixed cross-version assembly/C data; no native Windows execution',sources=sources,anchors=refs,constants=constants,japanStocks=stocks,rules=rules,matrix=matrix,deferred=['native x87/CRT/time reseed equivalence','native float average-cost','full native chart/input/audio','other asset listings','special actors','native roulette','native exit call stack and ending','minigame presentation/collision'])
pathlib.Path('docs/richman/s2-04a-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(len(sources),'sources',len(refs),'anchors',len(stocks),'stocks')
