import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-inventory';
import {cardPrices} from '../../frontend/src/features/richman/game/g3';
import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const goods=['card:13','card:29'];
export async function verifyComputerInventory(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'inventory-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),acquisitions:unknown[]=[],uses:unknown[]=[],cancellations:unknown[]=[],clocks:unknown[]=[],waivers:unknown[]=[];let auto=0,human=0;
 const mark=(key:string,n:number)=>{if(!prefixes.has(key))prefixes.set(key,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[i],a=c.action,b=e.state,id=c.playerId,p=b.pending,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'inventory-v1')!.action,a);}else human++;}
  const r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({i,c,r}));const s=e.state;
  for(const player of b.players)for(const item of goods)if(s.effects!.inventory[player.id][item]>b.effects!.inventory[player.id][item]){acquisitions.push({id:player.id,ai:replay.control!.computerIds.includes(player.characterId),item,turn:s.turn,action:a.type,events:r.events.filter(x=>['itemBought','g6Notice','magicResolved','inventoryTransferred'].includes(x.type))});mark(item+'-acquired',i+1);}
  if(a.type==='buyItem'&&goods.includes(a.itemId)){assert.ok(p?.kind==='shop'&&p.shelf?.cards.some(x=>x.itemId===a.itemId&&x.available));assert.equal(s.items!.points[id],b.items!.points[id]-shopPrice(a.itemId));assert.equal(shopSupply(s,a.itemId),shopSupply(b,a.itemId)-1);assert.equal(s.effects!.inventory[id][a.itemId],b.effects!.inventory[id][a.itemId]+1);assert.deepEqual(s.economy!.balances,b.economy!.balances);}
  const item=b.effects?.pending?.definitionId.slice(0,7);
  if(a.type==='pause'&&item&&goods.includes(item))mark(item+(s.paused?'-paused':'-resumed'),i+1);
  if(a.type==='item'&&item&&goods.includes(item)){
   if(a.action.type==='cancel'){assert.deepEqual(s.effects!.inventory,b.effects!.inventory);assert.deepEqual(s.g3,b.g3);assert.equal(s.randomState,b.randomState);assert.equal(s.phase,'idle');cancellations.push({ai,id,item,turn:s.turn});mark('cancel-before',i);mark('cancel-after',i+1);}
   if(a.action.type==='confirm'){
    const target=a.action.target.id,bag=structuredClone(b.effects!.inventory),slots=structuredClone(b.g3!.slots),allies=structuredClone(b.g3!.allies),credits:Record<string,number>={};let discarded:string|null=null,received=true;
    const credit=(item:string)=>{credits[item]=(credits[item]??0)+1;};
    const remove=(who:string,card:string)=>{const at=slots[who].indexOf(card);assert.ok(at>=0);slots[who].splice(at,1);};
    const consume=()=>{if(bag[id][item]>0){bag[id][item]--;remove(id,item);credit(item);}};
    const breakAlly=(who:string)=>{const old=allies[who];if(old){allies[who]=null;allies[old.partner]=null;}};
    if(item==='card:13'){
     const stolen=a.stolenItemId!;assert.ok(bag[target][stolen]>0);bag[target][stolen]--;
     if(stolen.startsWith('card:')){
      remove(target,stolen);
      if(slots[id].length===15){const cheapest=Math.min(...slots[id].map(x=>cardPrices[x]));discarded=slots[id].find(x=>cardPrices[x]===cheapest)!;remove(id,discarded);bag[id][discarded]--;credit(discarded);}
      slots[id].push(stolen);
     }
     received=stolen.startsWith('card:')||(bag[id][stolen]??0)<9;
     if(received)bag[id][stolen]=(bag[id][stolen]??0)+1;else credit(stolen);
     if(allies[target]?.partner===id)breakAlly(target);consume();
     assert.ok(r.events.some(x=>x.type==='inventoryTransferred'&&x.sourceId===target&&x.targetId===id&&x.itemId===stolen&&x.received===received&&x.discarded===discarded));
    }else{consume();breakAlly(id);breakAlly(target);allies[id]={partner:target,remaining:7};allies[target]={partner:id,remaining:7};}
    assert.deepEqual(s.effects!.inventory,bag);assert.deepEqual(s.g3!.slots,slots);assert.deepEqual(s.g3!.allies,allies);
    for(const key of Object.keys(cardPrices))assert.equal(shopSupply(s,key),shopSupply(b,key)+(credits[key]??0));
    for(let t=1;t<=8;t++){const key='tool:'+String(t).padStart(2,'0');assert.equal(shopSupply(s,key),shopSupply(b,key)+(credits[key]??0));}
    for(const key of ['economy','finance','calendar','players','randomState','turn','active'] as const)assert.deepEqual(s[key],b[key]);
    assert.deepEqual(s.g2!.players,b.g2!.players);assert.deepEqual(s.g6!.holdings,b.g6!.holdings);assert.deepEqual(s.news,b.news);assert.equal(s.phase,'idle');assert.equal(s.pending,null);
    uses.push({ai,id,item,target,stolen:a.stolenItemId,discarded,received,turn:b.turn,before:{bag:b.effects!.inventory,slots:b.g3!.slots,allies:b.g3!.allies},after:{bag,slots,allies},credits});mark(item+'-confirm-before',i);mark(item+'-confirm-after',i+1);
   }
  }
  for(const ev of r.events){if(ev.type==='allianceTicked'||ev.type==='allianceChanged'){
   clocks.push(ev);const type=ev.type==='allianceTicked'?(ev.remaining===128?'raw128':'tick'):ev.remaining===0?'ended':'established';mark('alliance-'+type+'-before',i);mark('alliance-'+type+'-after',i+1);
   if(ev.type==='allianceTicked'){const old=b.g3!.allies[ev.playerId];assert.ok(old);assert.equal(ev.remaining,old.remaining===1?128:old.remaining-1);}
  }if(ev.type==='rentWaived'&&ev.reason==='同盟免租'){assert.equal(b.g3!.allies[b.players[b.active].id]?.partner,ev.ownerId);assert.equal(b.economy!.properties.find(p=>p.id===ev.propertyId)!.ownerId,ev.ownerId);assert.deepEqual(s.economy!.balances,b.economy!.balances);waivers.push(ev);mark('alliance-rent-waived',i+1);}}
 }
 assert.ok(auto&&human&&uses.length);const full=replayGame(nodes,JSON.parse(JSON.stringify(replay)));assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,auto,human,acquisitions,uses,cancellations,clocks,waivers,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
