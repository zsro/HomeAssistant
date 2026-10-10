import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay,GameState} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const passive=['card:18','card:19','card:20','card:21','card:29'];
const total=(s:GameState,item:string)=>s.g3!.supply[item]+Object.values(s.effects!.inventory).reduce((n,b)=>n+(b[item]??0),0);
export async function verifyReactionCircuit(replay:Replay,kind:string){
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),reactions:unknown[]=[],attacks:unknown[]=[],waivers:unknown[]=[],forced:unknown[]=[],disposals:unknown[]=[];
 const initial=Object.fromEntries(passive.map(id=>[id,total(e.state,id)]));let pendingAttackConsumption=0,auctionPaid=0,substituteSales=0,substituteExits=0,paidRent=0,wrongActorChecks=0,afterExitActor:string|null=null,afterAttackActor:string|null=null;
 const mark=(name:string,index:number)=>{if(!prefixes.has(name))prefixes.set(name,index);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
  const c=replay.commands[i],a=c.action,b=e.state,p=b.pending;
  if(a.type==='reaction'&&p?.kind==='reaction'){
   mark(`${p.continuation.kind}-${p.stage}`,i);
   const wrong=b.players.find(x=>x.id!==p.responderId)!.id;
   assert.equal(e.dispatch({...c,id:'invalid-'+c.id,playerId:wrong}).ok,false);assert.deepEqual(e.state,b);wrongActorChecks++;
  }
  if(b.finance!.disposal!.current&&p?.kind==='auction')mark('public-auction',i);
  const result=e.dispatch(c);assert.ok(result.ok,JSON.stringify(c));if(!result.ok)throw Error('unreachable');const s=e.state,events=result.events;
  for(const id of passive)assert.equal(total(s,id),initial[id],`finite ${id} pool at ${i}`);
  for(const bag of Object.values(s.g6!.holdings))for(const h of Object.values(bag)){assert.equal(h.cost,Math.trunc(h.quantity*h.average!));if(!h.quantity)assert.equal(h.average,0);}
  for(const company of s.news!.business!.companies){if(s.phase==='finished')continue;assert.equal(company.ownerId,company.ranking[0]??null);let last=Infinity;for(const id of company.ranking){const q=s.g6!.holdings[id][company.stockId].quantity;assert.ok(q>0&&q<=last&&!s.finance!.eliminated.includes(id));last=q;}}
  if(a.type==='reaction'&&p?.kind==='reaction'){
   const item=p.stage==='free'?'card:20':'card:19',used=a.choice==='use';assert.equal(s.effects!.inventory[p.responderId][item],b.effects!.inventory[p.responderId][item]-(used?1:0));
   assert.equal(s.g3!.supply[item],b.g3!.supply[item]+(used?1:0));
   reactions.push({kind:p.continuation.kind,stage:p.stage,responderId:p.responderId,choice:a.choice,targetId:a.targetId??null,turn:b.turn});
   if(p.continuation.kind==='rent'){
    const payer=used&&p.stage==='redirect'?a.targetId!:p.responderId,d=p.continuation.decision;
    if(used&&p.stage==='free'||payer===d.recipientId){assert.deepEqual(s.economy!.balances,b.economy!.balances);assert.deepEqual(s.g6!.holdings,b.g6!.holdings);assert.equal(s.phase,'turnEnd');}
    else if(!(p.stage==='free'&&!used&&b.effects!.inventory[payer]['card:19'])){
     assert.ok(s.pending?.kind==='property'||s.pending?.kind==='debt');assert.equal(s.pending.payerId,payer);assert.equal(s.pending.amount,d.amount);assert.deepEqual(s.effects!.inventory[payer],b.effects!.inventory[payer]);
     for(const other of b.players.filter(x=>x.id!==payer))assert.deepEqual(s.economy!.balances[other.id],b.economy!.balances[other.id]);
    }
   }
  }
  for(const event of events){
   if(event.type==='effectConsumed'&&event.itemId==='card:17'){assert.equal(pendingAttackConsumption,0);pendingAttackConsumption++;assert.equal(s.effects!.inventory[event.playerId]['card:17'],b.effects!.inventory[event.playerId]['card:17']-1);}
   if(event.type==='stockTraded'&&event.forced){
    mark(event.traderId!==b.players[b.active].id?'substitute-liquidation':'own-liquidation',i);const h=b.g6!.holdings[event.traderId][event.stockId],next=s.g6!.holdings[event.traderId][event.stockId];assert.equal(event.amount,Math.trunc(event.price*event.quantity/100));assert.equal(next.quantity,h.quantity-event.quantity);assert.equal(next.average,next.quantity?h.average:0);assert.equal(s.economy!.balances[event.traderId].bank,b.economy!.balances[event.traderId].bank+event.amount);const offered=events.find(x=>x.type==='propertyOffered'||x.type==='debtOffered');if(offered&&(offered.type==='propertyOffered'||offered.type==='debtOffered')){const balance=b.economy!.balances[event.traderId],need=Math.ceil((offered.decision.amount-balance.cash-balance.bank)*100/event.price);assert.equal(event.quantity,Math.min(h.quantity,need));}assert.equal(s.news!.publicFund,b.news!.publicFund);forced.push(event);if(event.traderId!==b.players[b.active].id)substituteSales++;
   }
   if(event.type==='propertySettled'&&event.operation==='rent'){
    const payer=event.payerId??event.playerId,owner=event.recipientId!;assert.equal(event.paid.cash+event.paid.bank,event.amount);assert.equal(s.economy!.balances[payer].cash,b.economy!.balances[payer].cash-event.paid.cash);assert.equal(s.economy!.balances[payer].bank,b.economy!.balances[payer].bank-event.paid.bank);assert.equal(s.economy!.balances[owner].bank,b.economy!.balances[owner].bank+event.amount);paidRent+=event.amount;
   }
   if(event.type==='rentWaived'&&['同盟免租','免费卡'].includes(event.reason??'')){
    mark(event.reason==='同盟免租'?'allied-landing':'free-waiver',i);waivers.push(event);assert.equal(events.some(x=>x.type==='stockTraded'&&x.forced),false);
    if(event.reason==='同盟免租'){assert.equal(b.g3!.allies[b.players[b.active].id]?.partner,event.ownerId);for(const card of ['card:19','card:20'])assert.equal(s.effects!.inventory[event.playerId][card],b.effects!.inventory[event.playerId][card]);}
   }
   if(event.type==='attackResolved'&&event.itemId==='card:17'){
    assert.equal(pendingAttackConsumption,1);pendingAttackConsumption--;
    attacks.push(event);mark(event.targetId===null?'immune-attack':event.targetId===event.sourceId?'self-redirect-attack':'hit-attack',i);
    if(event.targetId===null){assert.ok(events.some(x=>x.type==='effectConsumed'&&x.itemId==='card:21'&&x.playerId===event.originalId));assert.equal(events.some(x=>x.type==='insuranceClaim'),false);assert.deepEqual(s.g2!.players[event.originalId],b.g2!.players[event.originalId]);}
    else {
     const targets=[{id:event.targetId,turns:event.targetId===event.sourceId?4:5}];if(events.some(x=>x.type==='g3Resolved'&&x.itemId==='card:18')){targets.push({id:event.sourceId,turns:5});mark('revenge-attack',i);}
     for(const t of targets){const m=s.g2!.players[t.id],old=b.g2!.players[t.id];assert.equal(m.prison,((old.prison&127)+t.turns)&127);assert.equal(m.hospital,0);assert.equal(m.vehicle,old.vehicle);assert.equal(s.players.find(x=>x.id===t.id)!.node,nodes.find(x=>x.kind===8002)!.id);}
     if(event.targetId!==event.originalId)for(const item of ['card:18','card:19','card:21'])assert.equal(s.effects!.inventory[event.targetId][item],b.effects!.inventory[event.targetId][item]);
     if(targets.some(x=>x.id===event.sourceId)){assert.equal(s.phase,'turnEnd');afterAttackActor=event.sourceId;}
    }
   }
   if(event.type==='insuranceClaim'){
    const r=event.receipt;assert.equal(r.cashAfter-r.cashBefore,r.amount);assert.equal(r.fundsBefore-r.fundsAfter,r.amount);assert.equal(r.cumulativeBefore-r.cumulativeAfter,r.amount);
   }
   if(event.type==='disposalStarted'){
    mark('exit-start',i);const r=event.receipt;assert.ok(s.finance!.eliminated.includes(r.payerId));assert.equal(r.amount,b.economy!.balances[r.payerId].cash+b.economy!.balances[r.payerId].bank);assert.equal(r.unpaid,r.due-r.amount);assert.equal(s.active,b.active);
   }
   if(event.type==='auctionSettled'&&(b.finance!.disposal!.current||events.some(x=>x.type==='disposalStarted'))){auctionPaid+=event.amount;assert.equal(event.sourceId,'public');}
   if(event.type==='disposalCompleted'&&!event.receipt.continuation){
    mark('rent-callback',i);const r=event.receipt;disposals.push(r);if(r.payerId!==b.players[b.active].id)substituteExits++;
    assert.equal(s.economy!.balances[r.recipientId].bank,b.economy!.balances[r.recipientId].bank+r.amount);assert.equal(s.active,b.active);assert.equal(s.economy!.balances[r.payerId].cash+s.economy!.balances[r.payerId].bank,0);assert.ok(s.finance!.eliminated.includes(r.payerId));assert.equal(s.phase,r.finishedGame?'finished':'turnEnd');
    if(!r.finishedGame){assert.equal(s.g3!.slots[r.payerId].length,0);assert.ok(Object.values(s.g6!.holdings[r.payerId]).every(x=>x.quantity===0&&x.average===0));assert.ok(s.news!.business!.companies.every(x=>x.ownerId!==r.payerId));assert.equal(s.g3!.allies[r.payerId],null);if(r.released.length>3)assert.equal(r.auctions.length,3);afterExitActor=b.players[b.active].id;}
   }
  }
  if(b.finance!.disposal!.current||events.some(x=>x.type==='disposalStarted')){
   const auctions=events.filter(x=>x.type==='auctionSettled');
   for(const player of b.players){const paid=auctions.reduce((n,x)=>n+(x.winnerId===player.id?x.amount:0),0);if(paid)assert.equal(s.economy!.balances[player.id].cash,b.economy!.balances[player.id].cash-paid);}
   const stockProceeds=events.filter(x=>x.type==='disposalAssets').flatMap(x=>x.receipt.stocks).reduce((n,x)=>n+x.amount,0);
   assert.equal(s.news!.publicFund,b.news!.publicFund+stockProceeds+auctions.reduce((n,x)=>n+x.amount,0));
  }
  if(b.finance!.disposal!.current){assert.equal(s.turn,b.turn);assert.equal(s.calendar!.date,b.calendar!.date);assert.equal(s.active,b.active);}
  if(a.type==='endTurn'&&(afterExitActor||afterAttackActor)){
   mark(afterExitActor?'after-exit-turn':'after-attack-turn',i);assert.equal(b.players[b.active].id,afterExitActor??afterAttackActor);let next=b.active;do{next=(next+1)%b.players.length;}while(b.finance!.eliminated.includes(b.players[next].id));assert.equal(s.active,next);afterExitActor=null;afterAttackActor=null;
  }
 }
 assert.equal(pendingAttackConsumption,0);
 if(kind==='attack'){assert.ok(prefixes.has('immune-attack')&&prefixes.has('self-redirect-attack')&&prefixes.has('revenge-attack')&&prefixes.has('after-attack-turn'));}
 if(kind==='waiver'){assert.ok(prefixes.has('allied-landing')&&prefixes.has('free-waiver'));}
 if(kind==='debt'){assert.ok(substituteSales>0&&substituteExits>0);assert.ok(prefixes.has('public-auction')||disposals.length>0);assert.ok(prefixes.has('after-exit-turn'));}
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const index of new Set(prefixes.values())){await new Promise<void>(resolve=>setTimeout(resolve,0));const prefix=JSON.parse(JSON.stringify({...replay,commands:replay.commands.slice(0,index)})) as Replay,copy=replayGame(nodes,prefix);for(const c of replay.commands.slice(index))assert.ok(copy.dispatch(c).ok);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return {kind,commands:replay.commands.length,players:replay.config.characterIds.length,turn:e.state.turn,date:e.state.calendar!.date,prefixes:[...prefixes.keys()],reactions,attacks,waivers,forced,disposals,auctionPaid,substituteSales,substituteExits,paidRent,wrongActorChecks,state:e.state,events:e.events};
}
