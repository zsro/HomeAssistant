import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-reactions';
import nodes from '../../shared/richman/japan-topology.fixture.json';
export async function verifyComputerRent(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'rent-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),reactions:unknown[]=[],purchases:unknown[]=[],acquisitions:unknown[]=[],payments:unknown[]=[],forced:unknown[]=[],disposals:unknown[]=[];let auto=0,human=0;const disposalStart=new Map<string,{fund:number;bank:number;date:string;turn:number}>();
 const mark=(key:string,n:number)=>{if(!prefixes.has(key))prefixes.set(key,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));
  const c=replay.commands[i],a=c.action,b=e.state,p=b.pending,id=c.playerId,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){
   assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'rent-v1')!.action,a);}else human++;
  }
  const result=e.dispatch(c);assert.ok(result.ok,JSON.stringify({i,c,result}));const s=e.state;
  for(const player of b.players)for(const item of ['card:19','card:20'])if(replay.control!.computerIds.includes(player.characterId)&&(s.effects!.inventory[player.id][item]??0)>(b.effects!.inventory[player.id][item]??0)){acquisitions.push({id:player.id,item,turn:s.turn,command:a.type,node:s.players.find(x=>x.id===player.id)!.node,evidence:result.events.filter(x=>x.type==='itemBought'||x.type==='g6Notice').map(x=>x.type==='g6Notice'?x.message:x.itemId)});mark(item+'-acquired',i+1);}
  if(a.type==='pause'&&p?.kind==='reaction')mark('reaction-'+(s.paused?'paused':'resumed'),i+1);
  if(a.type==='buyItem'&&ai&&['card:19','card:20'].includes(a.itemId)){
   const item=a.itemId;assert.equal(b.effects!.inventory[id][item]??0,0);assert.equal(s.effects!.inventory[id][item],1);assert.equal(b.items!.points[id]-s.items!.points[id],item==='card:20'?25:40);assert.equal(s.g3!.supply[item],b.g3!.supply[item]-1);assert.equal(b.pending?.kind,'shop');if(b.pending?.kind==='shop')assert.ok(b.pending.shelf!.cards.some(x=>x.itemId===item&&x.available));assert.ok(b.g3!.slots[id].length<15);assert.deepEqual(s.economy,b.economy);assert.equal(s.randomState,b.randomState);purchases.push({id,item,turn:s.turn});mark(item+'-buy',i+1);
  }
  if(a.type==='reaction'&&p?.kind==='reaction'&&p.continuation.kind==='rent'){
   const item=p.stage==='free'?'card:20':'card:19';mark(p.stage+'-before-'+ai,i);mark(p.stage+'-after-'+ai,i+1);
   if(a.choice==='use'){
    assert.equal(s.effects!.inventory[id][item],b.effects!.inventory[id][item]-1);assert.equal(s.g3!.supply[item],b.g3!.supply[item]+1);assert.equal(s.g3!.slots[id].filter(x=>x===item).length,b.g3!.slots[id].filter(x=>x===item).length-1);
    if(p.stage==='free'||a.targetId===p.continuation.decision.recipientId){assert.deepEqual(s.economy,b.economy);assert.deepEqual(s.g6,b.g6);assert.equal(s.phase,'turnEnd');assert.ok(result.events.some(ev=>ev.type==='rentWaived'));}
    else{assert.ok(p.targets.includes(a.targetId!));assert.equal(s.pending?.kind==='property'||s.pending?.kind==='debt'?s.pending.payerId:null,a.targetId);assert.deepEqual(s.economy!.balances[id],b.economy!.balances[id]);}
   }else assert.deepEqual(s.effects!.inventory,b.effects!.inventory);
   assert.equal(s.randomState,b.randomState);reactions.push({ai,id,stage:p.stage,choice:a.choice,target:a.targetId??null,amount:p.continuation.decision.amount,turn:s.turn});
  }
  if(a.type==='property'&&p?.kind==='property'&&p.operation==='rent'){
   const payer=p.payerId??id,recipient=p.recipientId!;assert.equal(id,payer);assert.equal(b.economy!.balances[payer].cash+b.economy!.balances[payer].bank-s.economy!.balances[payer].cash-s.economy!.balances[payer].bank,p.amount);assert.equal(s.economy!.balances[recipient].bank-b.economy!.balances[recipient].bank,p.amount);
   if(id!==b.players[b.active].id){payments.push({id,ai,amount:p.amount,turn:s.turn});mark('alternate-payer-before-'+ai,i);mark('alternate-payer-after-'+ai,i+1);}
  }
  if(a.type==='settleDebt'){assert.equal(p?.kind,'debt');if(p?.kind==='debt'){assert.equal(id,p.payerId??b.players[b.active].id);assert.ok(s.finance!.eliminated.includes(id));mark('exit-before',i);mark('exit-after',i+1);}}
  for(const ev of result.events){
   if(ev.type==='stockTraded'&&ev.forced){assert.equal(ev.amount,Math.floor(ev.price*ev.quantity/100));const h=s.g6!.holdings[ev.traderId][ev.stockId];if(h.quantity===0){assert.equal(h.average,0);assert.equal(h.cost,0);}forced.push(ev);mark('forced-stock-before',i);mark('forced-stock-after',i+1);}
   if(ev.type==='disposalStarted'&&!ev.receipt.continuation){const r=ev.receipt;disposalStart.set(r.id,{fund:b.news!.publicFund,bank:b.economy!.balances[r.recipientId].bank,date:b.calendar!.date,turn:b.turn});assert.equal(r.amount,b.economy!.balances[r.payerId].cash+b.economy!.balances[r.payerId].bank);}
   if(ev.type==='disposalCompleted'&&!ev.receipt.continuation){const r=ev.receipt,start=disposalStart.get(r.id)!;assert.ok(start);assert.equal(s.economy!.balances[r.payerId].cash+s.economy!.balances[r.payerId].bank,0);assert.equal(s.economy!.balances[r.recipientId].bank-start.bank,r.amount);assert.equal(s.news!.publicFund-start.fund,r.stocks.reduce((n,x)=>n+x.amount,0)+r.auctions.reduce((n,x)=>n+x.amount,0));assert.equal(r.unpaid,r.due-r.amount);assert.equal(s.calendar!.date,start.date);assert.equal(s.turn,start.turn);}
   if(ev.type==='disposalCompleted'){assert.ok(s.finance!.eliminated.includes(ev.receipt.payerId));disposals.push(ev);mark('public-disposal',i+1);}
  }
 }
 assert.ok(auto&&human);
 const replayed=replayGame(nodes,replay);assert.deepEqual(replayed.state,e.state);assert.deepEqual(replayed.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,auto,human,reactions,purchases,acquisitions,payments,forced,disposals,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
