import {strict as assert} from 'node:assert';import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';import {decideComputer,GODS_GOODS,godsChoice} from '../../frontend/src/features/richman/game/computer-gods';import {attachedGod} from '../../frontend/src/features/richman/game/g6';import {GODS} from '../../frontend/src/features/richman/game/g6-catalog';import {marketPrice} from '../../frontend/src/features/richman/game/g6-market';import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';import nodes from '../../shared/richman/japan-topology.fixture.json';
export async function verifyComputerGods(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'gods-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),acquisitions:unknown[]=[],uses:unknown[]=[],cancellations:unknown[]=[],stockTrades:unknown[]=[],gains:unknown[]=[],relations:unknown[]=[],notices:unknown[]=[];let auto=0,human=0;
 const mark=(name:string,n:number)=>{if(!prefixes.has(name))prefixes.set(name,n);},goods=GODS_GOODS.map(g=>g.id as string);
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[i],a=c.action,b=e.state,id=c.playerId,ai:boolean=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId),item=b.effects?.pending?.definitionId.slice(0,7);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'gods-v1')!.action,a);}else human++;}
  const r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({i,c,r}));const s=e.state;
  for(const player of s.players)for(const item of goods){const n=s.effects!.inventory[player.id][item]-b.effects!.inventory[player.id][item];if(n>0){gains.push({playerId:player.id,item,amount:n,turn:s.turn,action:a.type,eventTypes:[...new Set(r.events.map(ev=>ev.type))],notices:r.events.filter(ev=>ev.type==='g6Notice')});mark(item+'-received',i+1);}}
  for(const ev of r.events)if(ev.type==='allianceChanged'){relations.push(ev);mark(ev.remaining?'alliance-formed-before':'alliance-ended-before',i);mark(ev.remaining?'alliance-formed-after':'alliance-ended-after',i+1);}
  if(a.type==='buyItem'&&goods.includes(a.itemId)){assert.equal(s.items!.points[id],b.items!.points[id]-shopPrice(a.itemId));assert.equal(shopSupply(s,a.itemId),shopSupply(b,a.itemId)-1);assert.deepEqual(s.economy!.balances,b.economy!.balances);acquisitions.push({ai,id,item:a.itemId,turn:s.turn,cost:shopPrice(a.itemId)});mark(a.itemId+'-bought',i+1);}
  if(a.type==='stockTrade'){assert.equal(ai,false,'active trading remains human only');stockTrades.push({id,action:a});mark('human-stock-before',i);mark('human-stock-after',i+1);}
  if(a.type==='pause'&&item&&goods.includes(item))mark(item+(s.paused?'-paused':'-resumed'),i+1);
  if(a.type==='item'&&item&&goods.includes(item)){
   if(a.action.type==='cancel'){assert.deepEqual(s.effects!.inventory,b.effects!.inventory);assert.deepEqual(s.g6,b.g6);assert.equal(s.randomState,b.randomState);cancellations.push({ai,id,item,turn:s.turn});mark('cancel-before',i);mark('cancel-after',i+1);}
   if(a.action.type==='confirm'){
    const target=a.action.target;assert.equal(r.events.filter(ev=>ev.type==='effectConsumed'&&ev.itemId===item&&ev.playerId===id&&ev.amount===1).length,1);
    assert.equal(s.phase,'idle');assert.equal(s.pending,null);assert.deepEqual(s.calendar,b.calendar);assert.equal(s.turn,b.turn);assert.equal(s.active,b.active);
    if(item==='card:22'){
     assert.equal(s.effects!.inventory[id][item],b.effects!.inventory[id][item]-1);assert.ok(!s.g5!.hazards.some(h=>h.carrier===id));assert.ok(!attachedGod(s,id)||!GODS.find(g=>g.type===attachedGod(s,id)!.type)!.bad);assert.deepEqual(s.economy,b.economy);assert.equal(s.news!.publicFund,b.news!.publicFund);assert.equal(s.randomState,b.randomState);
    }else if(item==='card:23'){
     const before=b.g6!.gods.find(g=>g.id===target.id)!;assert.equal(before.carrier,null);assert.equal(attachedGod(s,id)!.id,before.id);assert.equal(attachedGod(s,id)!.remaining,before.type===15?13:7);assert.equal(s.g6!.gods.filter(g=>g.carrier===id).length,1);
     // Luck may draw another invite: inventory/supply outcomes are governed by the engine pool.
    }else{
     const old=b.g6!.stocks.find(k=>k.id===target.id)!,next=s.g6!.stocks.find(k=>k.id===old.id)!;
     assert.equal(s.effects!.inventory[id][item],b.effects!.inventory[id][item]-1);assert.equal(s.g6!.supply[item],b.g6!.supply[item]+1);
     assert.equal(next.price,marketPrice(old.base,item==='card:24'?10:-10));assert.equal(next.remaining,2);assert.equal(next.trend,item==='card:24'?'red':'black');assert.deepEqual(s.g6!.holdings,b.g6!.holdings);assert.deepEqual(s.news!.business!.companies,b.news!.business!.companies);assert.deepEqual(s.economy,b.economy);assert.equal(s.news!.publicFund,b.news!.publicFund);assert.equal(s.randomState,b.randomState);
    }
    uses.push({ai,id,item,turn:s.turn,target,alliesBefore:b.g3!.allies,choice:ai?godsChoice(b,nodes,item):null,godBefore:attachedGod(b,id)??null,godAfter:attachedGod(s,id)??null,quoteBefore:b.g6!.stocks.find(k=>k.id===target.id)??null,quoteAfter:s.g6!.stocks.find(k=>k.id===target.id)??null});mark(item+'-confirm-before',i);mark(item+'-confirm-after',i+1);
   }
  }
  for(const ev of r.events)if(ev.type==='g6Notice'&&/附身|期限结束/.test(ev.message)){notices.push(ev);mark(/期限结束/.test(ev.message)?'god-expired':'god-attached',i+1);}else if(ev.type==='stockMarketUpdated'){mark('daily-market-before',i);mark('daily-market-after',i+1);}
 }
 assert.ok(auto&&human&&uses.length);const full=replayGame(nodes,JSON.parse(JSON.stringify(replay)));assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,auto,human,acquisitions,uses,cancellations,stockTrades,gains,relations,notices,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
