import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {GameState} from '../../frontend/src/features/richman/game/engine';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,CASH_GOODS} from '../../frontend/src/features/richman/game/computer-cash';
import {shopPrice} from '../../frontend/src/features/richman/game/shop-acquisition';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const goods=CASH_GOODS.map(x=>x.id as string);
const supply=(s:GameState,item:string)=>item==='card:01'?s.wealth!.supply:item==='card:02'?s.cards!.supply:s.g4!.supply[item];
export async function verifyComputerCash(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'cash-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),acquisitions:unknown[]=[],uses:unknown[]=[],reactions:unknown[]=[],cancellations:unknown[]=[];let auto=0,human=0;
 const mark=(key:string,n:number)=>{if(!prefixes.has(key))prefixes.set(key,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[i],a=c.action,b=e.state,id=c.playerId,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'cash-v1')!.action,a);}else human++;}
  const r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({i,c,r}));const s=e.state;
  for(const p of b.players)for(const item of goods)if(s.effects!.inventory[p.id][item]>b.effects!.inventory[p.id][item]){const isAI=replay.control!.computerIds.includes(p.characterId);acquisitions.push({id:p.id,ai:isAI,item,turn:s.turn,action:a.type,evidence:r.events.filter(x=>x.type==='itemBought'||x.type==='g6Notice'||x.type==='magicResolved').map(x=>x.type==='itemBought'?{item:x.itemId,cost:x.cost}:x.type==='g6Notice'?x.message:x.receipt)});mark(item+'-acquired',i+1);}
  if(a.type==='buyItem'&&goods.includes(a.itemId)){assert.ok(b.pending?.kind==='shop'&&b.pending.shelf?.cards.some(x=>x.itemId===a.itemId&&x.available));assert.equal(s.items!.points[id],b.items!.points[id]-shopPrice(a.itemId));assert.equal(supply(s,a.itemId),supply(b,a.itemId)-1);assert.equal(s.effects!.inventory[id][a.itemId],b.effects!.inventory[id][a.itemId]+1);assert.deepEqual(s.economy!.balances,b.economy!.balances);}
  const item=b.effects?.pending?.definitionId.slice(0,7);
  if(a.type==='pause'&&item&&goods.includes(item))mark(item+(s.paused?'-paused':'-resumed'),i+1);
  if(a.type==='item'&&item&&goods.includes(item)){
   if(a.action.type==='cancel'){assert.deepEqual(s.economy,b.economy);assert.deepEqual(s.effects!.inventory,b.effects!.inventory);assert.equal(supply(s,item),supply(b,item));assert.equal(s.phase,'idle');cancellations.push({ai,id,item,turn:s.turn});mark('cancel-before',i);mark('cancel-after',i+1);}
   if(a.action.type==='confirm'){assert.equal(s.effects!.inventory[id][item],b.effects!.inventory[id][item]-1);assert.equal(supply(s,item),supply(b,item)+1);assert.equal(s.g3!.slots[id].length,b.g3!.slots[id].length-1);mark(item+'-confirm-before',i);mark(item+'-confirm-after',i+1);}
  }
  if(b.pending?.kind==='reaction'&&b.pending.continuation.kind==='tax'){
   if(a.type==='pause')mark('tax-'+b.pending.stage+(s.paused?'-paused':'-resumed'),i+1);
   if(a.type==='reaction'){const card=b.pending.stage==='free'?'card:20':'card:19',consume=a.choice==='use'?1:0;assert.equal(s.effects!.inventory[id][card],b.effects!.inventory[id][card]-consume);assert.equal(s.g3!.supply[card],b.g3!.supply[card]+consume);assert.equal(s.effects!.inventory[b.pending.continuation.sourceId]['card:26'],b.effects!.inventory[b.pending.continuation.sourceId]['card:26']);reactions.push({ai,id,active:b.players[b.active].id,stage:b.pending.stage,choice:a.choice,target:a.targetId,turn:b.turn});mark('tax-'+b.pending.stage+'-before',i);mark('tax-'+b.pending.stage+'-after',i+1);}
  }
  for(const ev of r.events)if(ev.type==='wealthEqualized'||ev.type==='cashEqualized'||ev.type==='taxSettled'){
   const expected=structuredClone(b.economy!.balances);let gain=0,actualItem='',discarded=0;
   if(ev.type==='wealthEqualized'){
    actualItem='card:01';const ids=b.players.filter(p=>!b.finance!.eliminated.includes(p.id)).map(p=>p.id),total=ids.reduce((n,p)=>n+BigInt(expected[p].cash),0n),average=Number(total/BigInt(ids.length));discarded=Number(total%BigInt(ids.length));assert.deepEqual(ev.participants,ids.map(playerId=>({playerId,cash:expected[playerId].cash})));assert.equal(ev.average,average);assert.equal(ev.discarded,discarded);gain=average-expected[id].cash;for(const p of ids)expected[p].cash=average;
   }else if(ev.type==='cashEqualized'){
    actualItem='card:02';const total=BigInt(expected[id].cash)+BigInt(expected[ev.targetId].cash),average=Number(total/2n);discarded=Number(total%2n);assert.equal(ev.sourceCash,expected[id].cash);assert.equal(ev.targetCash,expected[ev.targetId].cash);assert.equal(ev.average,average);assert.equal(ev.discarded,discarded);gain=average-expected[id].cash;expected[id].cash=expected[ev.targetId].cash=average;
   }else{
    actualItem='card:26';let source=id,payer='',waived=false;
    if(b.pending?.kind==='reaction'&&b.pending.continuation.kind==='tax'){
     assert.ok(a.type==='reaction');source=b.pending.continuation.sourceId;payer=a.choice==='use'&&b.pending.stage==='redirect'?a.targetId!:b.pending.responderId;waived=a.choice==='use'&&b.pending.stage==='free'||payer===source;
    }else{assert.ok(a.type==='item'&&a.action.type==='confirm');payer=a.action.target.id;}
    assert.equal(ev.sourceId,source);assert.equal(ev.payerId,payer);assert.equal(ev.waived,waived);
    const amount=waived?0:Math.floor(expected[payer].cash/5);assert.equal(ev.amount,amount);expected[ev.payerId].cash-=amount;expected[ev.sourceId].bank+=amount;gain=amount;mark('tax-settled-before',i);mark('tax-settled-after',i+1);
   }
   assert.deepEqual(s.economy!.balances,expected);assert.deepEqual(s.economy!.properties,b.economy!.properties);assert.deepEqual(s.g6,b.g6);assert.deepEqual(s.finance,b.finance);assert.deepEqual(s.players,b.players);assert.deepEqual(s.calendar,b.calendar);assert.equal(s.news!.publicFund,b.news!.publicFund);assert.equal(s.randomState,b.randomState);assert.equal(s.turn,b.turn);assert.equal(s.active,b.active);assert.equal(s.phase,'idle');assert.equal(s.pending,null);
   uses.push({ai,id,item:actualItem,turn:s.turn,gain,discarded,receipt:ev,before:b.economy!.balances,after:s.economy!.balances});
  }
 }
 assert.ok(auto&&human&&uses.length);const full=replayGame(nodes,JSON.parse(JSON.stringify(replay)));assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,auto,human,acquisitions,uses,reactions,cancellations,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
