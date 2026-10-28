import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,ESTATE_CARDS} from '../../frontend/src/features/richman/game/computer-estate';
import {shopPrice} from '../../frontend/src/features/richman/game/shop-acquisition';
import {PROPERTY_CATALOG,propertyBase} from '../../frontend/src/features/richman/game/economy';
import nodes from '../../shared/richman/japan-topology.fixture.json';
export async function verifyComputerEstate(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'estate-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),acquisitions:unknown[]=[],uses:unknown[]=[],cancellations:unknown[]=[];let auto=0,human=0;
 const mark=(key:string,n:number)=>{if(!prefixes.has(key))prefixes.set(key,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[i],a=c.action,b=e.state,id=c.playerId,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'estate-v1')!.action,a);}else human++;}
  const r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({i,c,r}));const s=e.state;
  for(const p of b.players)for(const item of ESTATE_CARDS)if((s.effects!.inventory[p.id][item]??0)>(b.effects!.inventory[p.id][item]??0)){
   const isAI=replay.control!.computerIds.includes(p.characterId);acquisitions.push({id:p.id,ai:isAI,item,turn:s.turn,action:a.type,evidence:r.events.filter(x=>x.type==='itemBought'||x.type==='g6Notice'||x.type==='magicResolved').map(x=>x.type==='itemBought'?{item:x.itemId,cost:x.cost}:x.type==='g6Notice'?x.message:x.receipt)});if(isAI)mark(item+'-acquired',i+1);
  }
  if(a.type==='buyItem'&&ESTATE_CARDS.some(x=>x===a.itemId)){assert.ok(b.pending?.kind==='shop'&&b.pending.shelf?.cards.some(x=>x.itemId===a.itemId&&x.available));assert.equal(s.items!.points[id],b.items!.points[id]-shopPrice(a.itemId));assert.equal(s.g1!.supply[a.itemId],b.g1!.supply[a.itemId]-1);assert.equal(s.effects!.inventory[id][a.itemId],b.effects!.inventory[id][a.itemId]+1);assert.deepEqual(s.economy!.balances,b.economy!.balances);}
  const item=b.effects?.pending?.definitionId.slice(0,7);
  if(a.type==='pause'&&item&&ESTATE_CARDS.some(x=>x===item))mark(item+(s.paused?'-paused':'-resumed'),i+1);
  if(a.type==='item'&&a.action.type==='cancel'&&item&&ESTATE_CARDS.some(x=>x===item)){
   assert.deepEqual(s.economy,b.economy);assert.deepEqual(s.effects!.inventory,b.effects!.inventory);assert.deepEqual(s.g1,b.g1);assert.equal(s.randomState,b.randomState);assert.equal(s.phase,'idle');cancellations.push({ai,id,item,turn:s.turn});mark('cancel-before',i);mark('cancel-after',i+1);
  }
  for(const ev of r.events)if(ev.type==='g1Resolved'&&ESTATE_CARDS.some(x=>x===ev.itemId)){
   const item=ev.itemId,option=ev.option,changes=option.changes;
   mark(item+'-confirm-before',i);mark(item+'-confirm-after',i+1);assert.ok(ai);assert.equal(s.effects!.inventory[id][item],b.effects!.inventory[id][item]-1);assert.equal(s.g1!.supply[item],b.g1!.supply[item]+1);assert.equal(s.phase,'idle');assert.equal(s.pending,null);
   assert.deepEqual(s.players,b.players);assert.deepEqual(s.calendar,b.calendar);assert.deepEqual(s.g5,b.g5);assert.equal(s.randomState,b.randomState);assert.equal(s.turn,b.turn);assert.equal(s.active,b.active);
   const changed=new Set(changes.map(c=>c.before.id));for(const p of s.economy!.properties){const before=b.economy!.properties.find(x=>x.id===p.id)!;if(!changed.has(p.id))assert.deepEqual(p,before);}
   for(const change of changes){assert.deepEqual(change.before,b.economy!.properties.find(p=>p.id===change.before.id));assert.deepEqual(change.after,s.economy!.properties.find(p=>p.id===change.after.id));}
   if(item==='card:03'){
    assert.equal(changes.length,1);const{before,after}=changes[0],def=PROPERTY_CATALOG.properties.find(d=>d.id===before.id)!;const amount=(propertyBase(before,def)+before.level*def.upgradeCost)*b.calendar!.business!.priceIndex;
    assert.ok(def.nodeIds.includes(b.players[b.active].node));assert.ok(before.ownerId&&before.ownerId!==id);assert.deepEqual(after,{...before,ownerId:id});assert.deepEqual(option.transfer,{from:id,to:before.ownerId,amount});assert.ok(b.economy!.balances[id].cash-amount>=1000);
   }else if(item==='card:04'){
    assert.equal(changes.length,2);assert.deepEqual(changes[0].after,{...changes[0].before,ownerId:changes[1].before.ownerId});assert.deepEqual(changes[1].after,{...changes[1].before,ownerId:changes[0].before.ownerId});assert.equal(option.transfer,undefined);
   }else if(item==='card:05'){
    assert.equal(changes.length,2);for(let k=0;k<2;k++)assert.deepEqual(changes[k].after,{...changes[k].before,level:changes[1-k].before.level,buildingType:changes[1-k].before.buildingType});assert.equal(option.transfer,undefined);
   }else{assert.equal(changes.length,1);assert.ok(changes[0].before.ownerId&&changes[0].before.ownerId!==id);assert.deepEqual(changes[0].after,{...changes[0].before,level:changes[0].before.level-1});assert.equal(option.transfer,undefined);}
   for(const p of b.players){const t=option.transfer;assert.equal(s.economy!.balances[p.id].cash,b.economy!.balances[p.id].cash-(t?.from===p.id?t.amount:0));assert.equal(s.economy!.balances[p.id].bank,b.economy!.balances[p.id].bank+(t?.to===p.id?t.amount:0));}
   uses.push({ai,id,item,turn:s.turn,target:option.target.id,cost:option.transfer?.amount??0,changes});
  }
 }
 assert.ok(auto&&human&&uses.length);const full=replayGame(nodes,JSON.parse(JSON.stringify(replay)));assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,auto,human,acquisitions,uses,cancellations,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
