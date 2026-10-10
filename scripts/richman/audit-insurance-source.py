"""Verify fixed reference Git blobs and extract insurance wheel evidence. No network/source redistribution."""
import json,hashlib,re,struct,pathlib
root=pathlib.Path('/private/tmp/rich4-tools-audit/rich4-master')
commit='ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
tree={x['path']:x['sha'] for x in json.load(open('/private/tmp/richman-news-tree.json'))['tree']}
files={f'asm/{n}.asm':root/'asm'/f'{n}.asm' for n in ['rich4','rich4_player_core_actions','rich4_hospital_utils','rich4_prison_utils','rich4_player_utils']}
files['asm/rich4_fortune.asm']=pathlib.Path('/private/tmp/rich4-fortune-v20.asm')
sources=[]
for path,local in files.items():
 b=local.read_bytes();blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();assert blob==tree[path],path
 sources.append(dict(path=path,url=f'https://github.com/mytbk/rich4/blob/{commit}/{path}',gitBlobSha1=blob,sha256=hashlib.sha256(b).hexdigest()))
a=files['asm/rich4.asm'].read_text();chunk=a.split('ref_00475d0c:',1)[1].split('\n\n')[0]
raw=b''.join(struct.pack('<I',int(v,16)) for v in re.findall(r'dd (0x[0-9a-f]+)',chunk));row=list(raw[36:48]);valid=[n for n in row if n!=255];assert valid==[5,3,30,20,15,10]
out=dict(referenceCommit=commit,verifiedFiles=len(sources),grade='B fixed cross-version assembly; Japan company directory A inherited; no Windows runtime comparison',sources=sources,wheel=dict(address='475d0c+36',raw=row,valid=valid,entry='44090e(mode3) -> 43f7c6 -> 43f127',boundary='Original random start and timed key stop cannot equal Web one seeded uniform valid-result draw'),rules={
'R13-01p':dict(address='41a998..41aa3c;41ab6d..41ac8c',evidence='Japan company4 type4 at92/93; only actual landing, owner required; owner draw free; others word22=1000*draw*priceIndex; grant before v27 fee chain, dream allowed'),
'R13-02p':dict(address='44090e;43f7c6;43f127;475d0c+36',evidence='12 positions, odd sentinel255 cannot stop; valid results5/3/30/20/15/10; Web one uniform seeded draw explicitly differs from timed wheel'),
'R05-01p':dict(address='41ac3c..41ac8c;41ae37 fee chain inherited v27',evidence='grant before god-modified fee, free/redirect/god sponsor and actual cash-bank payment; policy stays visitor, owner-free; public fund unchanged'),
'R09-01p':dict(address='41aa0e..41aa37;41ac60..41ac87;41cae0;41cc48',evidence='player decimal+62 (0x3e); add draw &127, not clamp; own-action clear highbit else decrement with128 release marker; no hotel/detention/travel freeze; any nonzero raw byte covered'),
'R05-02p':dict(address='44ba63..44bae0;41d2c6..41d3d0',evidence='first type4 company pays full amount from period+28 and cumulative+2c signed32, even negative/no owner; victim cash via flag1; no public-fund or direct-owner payment; no term consumption'),
'R13-03p':dict(address='43ec3f..43ee0f;43d590..43d760;40d375..40d4c5;41a805',evidence='hospital/prison each actual entry/extension 2000*argument duration; travel only first entry; hotel added-duration*2000; reaction resolves target first; no generic vehicle-loss/building-damage claims'),
'R13-04p':dict(address='44c1eb..44c220;44cec2..44cf1e;44d172 and negative handler tails',evidence='fortune2 new-debt amount paid cash, debt retained; all negative money handlers14..19/23/24/26/30 use shared post-payment claim only if player remains alive; luck cancel no claim, double amount then reimburse; no blanket vehicle damage payouts'),
'R08-01p':dict(address='v26 dividends',evidence='premiums actual-paid revenue, claims signed negative; monthly15 holder ratios/dividend clearing inherited; no-holder carry, insolvency inherited Web liquidation'),
'R09-02p':dict(address='Web integration',evidence='business.insurance checkpoint; v29 only state/events and traffic-fortune gate fix, v26-28 omitted traffic handlers retained for exact replays; exits clear policy')},deferred=['original timed wheel/animation/voice RNG','special actors and unverified additional insurance callers','other calendar/price-index events','original bankruptcy forced auctions'])
pathlib.Path('docs/richman/s2-03p-sources.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'verified':len(sources),'wheel':valid}))
