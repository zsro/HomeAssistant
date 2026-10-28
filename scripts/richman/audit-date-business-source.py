"""Verify fixed source blobs and the full Japan activity flag table; no source redistribution."""
import json,hashlib,re,pathlib
root=pathlib.Path('/private/tmp/rich4-tools-audit/rich4-master/asm');commit='ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
tree={x['path']:x['sha'] for x in json.load(open('/private/tmp/richman-news-tree.json'))['tree']}
files={f'asm/{n}.asm':root/f'{n}.asm' for n in ['rich4','rich4_player_core_actions','rich4_new_game','rich4_hospital_utils','rich4_prison_utils','rich4_player_utils']}
files['asm/rich4_ui_sale.asm']=pathlib.Path('/private/tmp/rich4-calendar-daily-other.asm')
files.update({'asm/rich4_update_price_index.asm':pathlib.Path('/private/tmp/rich4-calendar-price.asm'),'asm/rich4_calculate_player_wealth.asm':pathlib.Path('/private/tmp/rich4-calendar-wealth.asm'),'asm/rich4_date_utils.asm':pathlib.Path('/private/tmp/rich4-calendar-date.asm')})
sources=[]
for path,local in files.items():
 b=local.read_bytes();blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();assert blob==tree[path],path
 sources.append(dict(path=path,url=f'https://github.com/mytbk/rich4/blob/{commit}/{path}',gitBlobSha1=blob,sha256=hashlib.sha256(b).hexdigest()))
a=files['asm/rich4.asm'].read_text();raw=bytearray()
for line in a.split('ref_0047ff4a:\n',1)[1].splitlines():
 m=re.fullmatch(r'(db|dd) (0x[\da-fA-F]+)',line.split(';')[0].strip())
 if m:raw.extend(int(m[2],16).to_bytes(1 if m[1]=='db' else 4,'little'))
 if len(raw)>=864:break
rows=[dict(slot=i,month=raw[578+i*12],day=raw[579+i*12],flags=raw[581+i*12]) for i in range(24)]
assert rows==json.load(open('shared/richman/game/calendar-activities-japan.json'))
assert [(r['month'],r['day'],r['flags']) for r in rows if r['flags']]==[(1,1,3),(12,25,15)]
out=dict(referenceCommit=commit,verifiedFiles=len(sources),grade='fixed cross-version assembly; no Windows runtime equivalence',sources=sources,table=dict(address='47ff4a+Japan(stage0,map2)*288;24x12 bytes;flags offset5',rows=rows),rules={
'R09-01q':dict(address='41cf67..41d1a5;452117;452444..452788',evidence='date advance -> day limit victory -> daily price -> market/flags -> holiday -> day15 dividends then lottery -> day1 interest/special objects -> expiry; incoming own action separate'),
'R09-02q':dict(address='47ff4a+576;452612..45275b',evidence='Japan Jan1 flags3 presentation only; Dec25 flags15 includes bit8 card gift; only alive player+21 checked, seat order, shared receive_random_card, no cash reward; bit4 special-character/presentation deferred'),
'R09-03q':dict(address='452117;452444;41cf67',evidence='year is incremented by month wrap; no independent birthday comparison or yearly cash reward found in inspected date chain; absence is scoped, not proof across all executable'),
'R05-01q':dict(address='423acf..423b20;new_game4201',evidence='index starts1; signed32 sum of alive wealth, trunc average then divide initial funds, retain maximum; no random or year reset'),
'R05-02q':dict(address='4239b9..423ac4',evidence='cash+bank-loan;12 float32 stock prices with float32 running subtotal and truncate per stock; dynamic raw land price plus ordinary floor cost or special-land one cost; facility base+level*cost; company funds/inventory not direct assets'),
'R13-01q':dict(address='41ac3c;41ac8c->41abde;41adb9..41ae1a;41ac2c',evidence='visitor insurance base*wheel*index; Toyota vehicle*dice*base*index; Nissan selected base or cancel1000*index; SEGA base*elapsedDays no index; onsite capital/10000 not indexed'),
'R13-02q':dict(address='43ec3f..43ee0f;43d590..43d760;40d375..40d4c5;41a805',evidence='hospital/prison/first travel/hotel duration2000*priceIndex; negative fortune payouts reimburse actual due, not a second multiplier'),
'R09-05q':dict(address='428475..4284bb (ui_sale)',evidence='daily after price, before market: alive seats, seven 12-byte sale-record slots; nonzero entry increments byte+1; no direct reward. Full sale records/aging remain deferred with original disposal system'),
'R09-04q':dict(address='Web v30 integration',evidence='calendar business state participates existing G7 checkpoint; v29 old fingerprints remain; property/news/fortune/item other indexed consumers explicitly deferred')},deferred=['special-character Christmas branch, original media/music/timed effects','birthday/annual cash rewards not evidenced in inspected chain','other price-index consumers: general property purchase/build/rent, news/fortune/card/god/magic-house amounts need caller-by-caller audit','original forced bankruptcy auctions; Windows runtime comparison'])
pathlib.Path('docs/richman/s2-03q-sources.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps(dict(verified=len(sources),activities=[r for r in rows if r['flags']]),ensure_ascii=False))
