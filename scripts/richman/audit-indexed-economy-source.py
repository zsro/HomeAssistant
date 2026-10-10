"""Index all fixed-source price references, verify blobs and selected payment arithmetic.
Reference-only inputs in /private/tmp; outputs contain addresses/hashes, not game code.
"""
import pathlib,json,hashlib,re,struct,collections
root=pathlib.Path('/private/tmp/richman-price-reference');commit='ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
tree={x['path']:x['sha'] for x in json.load(open('/private/tmp/richman-news-tree.json'))['tree']}
sources=[];refs=[]
for p in sorted(root.glob('*')):
 text=p.read_text(errors='replace');lines=text.splitlines();hits=[];label=''
 for i,line in enumerate(lines):
  if re.match(r'^\w+:$',line):label=line[:-1]
  if '_rich4_price_index' not in line or line.startswith(('extern ','global ','_rich4_price_index:')):continue
  category='deferred-caller-audit'
  if p.stem.startswith('rich4_ai_'):category='AI-not-human-payment'
  elif p.stem=='rich4_news':category='news-award-or-tax-v31'
  elif p.stem=='rich4_fortune':category='fortune-fixed-money-v31'
  elif p.stem=='rich4_card_goudika':category='purchase-v31' if line.startswith('imul edi') else 'hostility-not-payment'
  elif p.stem in ['rich4_card_paimaika','rich4_card_chaichuka']:category='hostility-not-payment'
  elif p.stem=='rich4_card_passive':category='AI-reaction-choice-not-human-fee'
  elif p.stem=='rich4_gods':category='wheel-threshold-deferred' if i+1==676 else 'hostility-not-payment'
  elif p.stem in ['rich4_update_price_index','rich4_new_game']:category='index-update-initialization-v30'
  elif p.stem=='rich4_ui_sale':category='disposal-auction-deferred'
  hits.append(dict(line=i+1,label=label,category=category))
 if not hits:continue
 path='asm/'+p.name if p.suffix=='.asm' else p.name;b=p.read_bytes();blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();assert tree[path]==blob,path
 sources.append(dict(path=path,url=f'https://github.com/mytbk/rich4/blob/{commit}/{path}',gitBlobSha1=blob,sha256=hashlib.sha256(b).hexdigest()));refs.extend(dict(path=path,**r) for r in hits)
# Symbolically evaluate linear shift/add/sub/multiply from an index load until first store/call.
def coefficient(file,line,index):
 lines=(root/file).read_text().splitlines();regs={};started=False
 for raw in lines[line-1:]:
  s=raw.split(';')[0].strip()
  if re.match(r'^\w+:$',s) or not s:continue
  m=re.fullmatch(r'(mov|shl|add|sub|imul) (e[a-z]{2}), (.+)',s)
  if not m:break
  op,dest,value=m.groups()
  if value=='dword [_rich4_price_index]':v=index;started=True
  elif value in regs:v=regs[value]
  else:
   try:v=int(value,0)
   except ValueError:break
  if op=='mov':regs[dest]=v
  elif dest not in regs:break
  elif op=='shl':regs[dest]<<=v
  elif op=='add':regs[dest]+=v
  elif op=='sub':regs[dest]-=v
  else:regs[dest]*=v
 assert started
 return regs
fortune=[(319,10000),(1391,3000),(1517,3000),(1624,3000),(1647,6000),(1713,600),(1734,1500),(1756,1000),(1847,2000),(1904,3000),(1927,1000),(1950,2000),(1972,10000),(1994,8000),(2016,4000),(2038,6000),(2060,8000),(2083,5000),(2104,5000)]
for line,base in fortune:
 for index in [1,3,7]:assert coefficient('rich4_fortune.asm',line,index)['eax']==base*index,(line,base,coefficient('rich4_fortune.asm',line,index))
for line,base in [(1024,10000),(1188,5000),(1271,10000)]:
 for index in [1,3,7]:assert coefficient('rich4_news.asm',line,index)['eax']==base*index
for line in [2148,2184]:assert coefficient('rich4_player_core_actions.asm',line,3)['eax']==6000
rules={
'R04-01r':dict(address='4197d8;419967;41a013;41a1..41a2;41a86b',evidence='ordinary price=(raw base+level*cost)*index; upgrade=cost*index; facility buy raw base only, first build raw base, subsequent upgrade cost; cash-only affordability; never scale stored fields'),
'R04-02r':dict(address='4197d8;41a421;41a485;41a4db;41d709..41d7c9',evidence='ordinary chain sum*index; hotel/casino raw fee*index*wheel*price-status; fuel500*vehicle-factor*dice*index; caller then applies god1 floorhalf,2 zero,5 plusfloorhalf,6 double; Web seeded wheels retained'),
'R05-01r':dict(address='419... rent-card branch;41a60e;41a63d;41aef0..41af62',evidence='rent/company free then redirect threshold2000*index or insufficient funds; hotel skips free; redirected payer uses original quote; existing stock rescue/rent bank receipt retained, original forced auction deferred'),
'R06-01r':dict(address='goudika65/177;chashuika128..149;paimaika51/152;passive247/260/390',evidence='forced land purchase raw sum*index cash to owner bank; tax card 20% and literal2000 threshold unchanged; auction-card price-index references update hostility, not auction price; passive references AI willingness, not new human fee'),
'R08-01r':dict(address='449976;449... least-land;449... stockaward;449e50..449f1b;44a110',evidence='news8/9/10 10000/5000/10000*index; news12 raw property total*0.05 truncate then index; news13 twelve holdings with float32 stored running sum, *0.05 truncate then index; paid cash+bank enters public fund; no insurance/card window; existing Web bankruptcy'),
'R08-02r':dict(address='fortune line319;1391..2104;49-entry dispatcher prior audit',evidence='fraud2 debt10000*index; fines14/15/16 3000*index; fixed money17..31 coefficients verified for index1/3/7; index before good/bad luck doubling or cancel; insurer reimburses actual indexed loss once; raw compensation0/1, stocks8/9, bank10%, point sale32 unchanged'),
'R05-02r':dict(address='gods40ed3b;40f521..40f8b3;41d709',evidence='god rent multiplier verified; god source676 is wheel retry threshold5000*index; four later refs are hostility calculations. Existing random attach-cash amounts NOT proved by these refs and remain candidate, no blanket multiplier'),
'R05-03r':dict(address='Web v31 integration',evidence='v30 fees remain indexed once; asset wealth/tax base/raw land news preserve units; versioned fingerprint and all old replays; G7 restores price plus indexed world; original sale/auction and special actors deferred')}
out=dict(stage='S2-03r',referenceCommit=commit,grade='fixed cross-version source; no original Windows runtime comparison',verifiedFiles=len(sources),sources=sources,referenceCount=len(refs),categories=dict(collections.Counter(r['category'] for r in refs)),references=refs,arithmeticChecks=dict(fortuneCoefficients=fortune,indices=[1,3,7],newsAwards=3,companyThresholds=2),rules=rules,deferred=['unclassified caller references retained in full inventory, not blanket verified','original disposal/forced-auction/sale records','god wheel and attach cash; magic house; special actors; original wheel timing','int32 overflow of multiplied positive fees beyond Web supported safe monetary range'])
pathlib.Path('docs/richman/s2-03r-sources.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps(dict(files=len(sources),references=len(refs),categories=out['categories']),ensure_ascii=False))
