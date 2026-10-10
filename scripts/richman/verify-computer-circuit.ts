/** Independent accounting/ownership assertions over exported UI commands, never state injection. */
import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
export async function verifyComputerCircuit(replay:ControlledReplay,terminal=false){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control!.policy,'basic-v1');
 const frozen=new Map<string,{due:number;amount:number;unpaid:number}>();
 const exitContext=new Map<string,{active:number;turn:number;date:string;publicFund:number}>();
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),cross:unknown[]=[],forced:unknown[]=[],exits:unknown[]=[],reactions:unknown[]=[];let auto=0,human=0,publicAuctions=0,dates=0,negativeChecks=0;
 const mark=(k:string,i:number)=>{if(!prefixes.has(k))prefixes.set(k,i);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));
  const c=replay.commands[i],a=c.action,b=e.state,p=b.pending,id=b.players[b.active].id,isAI=replay.control!.computerIds.includes(b.players.find(x=>x.id===c.playerId)!.characterId);
  if(a.type!=='animationDone'&&a.type!=='pause'&&!(a.type==='minigame'&&a.input.kind==='tick')){
   assert.equal(c.playerId,decisionPlayer(b));
   if(isAI){auto++;const d=computerDecision(b);assert.ok(d);assert.deepEqual(a,d.action);mark('computer-first',i);}else human++;
   if(c.playerId!==id){const key=(isAI?'computer':'human')+'-'+p!.kind;cross.push({index:i,kind:p!.kind,actor:c.playerId,active:id,computer:isAI});if(!prefixes.has(key)){
    mark(key,i);const wrong=b.players.find(x=>x.id!==c.playerId)!.id,log=e.events;assert.equal(e.dispatch({...c,id:'wrong-'+c.id,playerId:wrong}).ok,false);assert.deepEqual(e.state,b);assert.deepEqual(e.events,log);negativeChecks++;
   }}
  }
  const result=e.dispatch(c);assert.ok(result.ok,JSON.stringify(c));const s=e.state,events=result.events;
  if(a.type==='pause')mark(s.paused?'paused':'resumed',i+1);
  if(s.calendar!.date!==b.calendar!.date)dates++;
  if(a.type==='reaction'&&p?.kind==='reaction'){
   const item=p.stage==='free'?'card:20':'card:19',used=a.choice==='use';if(!s.finance!.eliminated.includes(p.responderId)){assert.equal(s.effects!.inventory[p.responderId][item],b.effects!.inventory[p.responderId][item]-(used?1:0));assert.equal(s.g3!.supply[item],b.g3!.supply[item]+(used?1:0));}reactions.push({responder:p.responderId,active:id,computer:isAI,kind:p.continuation.kind,stage:p.stage,choice:a.choice,target:a.targetId??null});
   if(p.continuation.kind==='rent'&&p.stage==='redirect'&&used&&a.targetId!==p.continuation.decision.recipientId){assert.ok(s.pending?.kind==='property'||s.pending?.kind==='debt');assert.equal(s.pending.payerId,a.targetId);assert.equal(s.pending.amount,p.continuation.decision.amount);}
  }
  for(const ev of events){
   if(ev.type==='attackResolved'&&p?.kind==='reaction'&&p.continuation.kind==='attack'&&a.type==='reaction'&&a.choice==='decline'){
    assert.equal(ev.targetId,p.continuation.originalId);assert.equal(s.active,b.active);assert.equal(s.calendar!.date,b.calendar!.date);assert.equal(s.pending,null);
    if(ev.itemId==='card:17')assert.equal(s.g2!.players[ev.targetId!].prison,5);
    assert.equal(s.phase,s.g2!.players[ev.sourceId].prison||s.g2!.players[ev.sourceId].hospital?'turnEnd':'idle');mark('attack-return',i+1);
   }
   if(ev.type==='stockTraded'&&ev.forced){
    mark('necessary-stock-sale',i);const h=b.g6!.holdings[ev.traderId][ev.stockId],next=s.g6!.holdings[ev.traderId][ev.stockId];assert.equal(ev.amount,Math.trunc(ev.price*ev.quantity/100));assert.equal(next.quantity,h.quantity-ev.quantity);assert.equal(next.average,next.quantity?h.average:0);assert.equal(next.cost,Math.trunc(next.quantity*next.average!));
    assert.equal(s.economy!.balances[ev.traderId].bank,b.economy!.balances[ev.traderId].bank+ev.amount);assert.equal(s.news!.publicFund,b.news!.publicFund);
    const offer=events.find(x=>x.type==='propertyOffered'||x.type==='debtOffered');if(offer&&(offer.type==='propertyOffered'||offer.type==='debtOffered')){const bal=b.economy!.balances[ev.traderId];assert.equal(ev.quantity,Math.min(h.quantity,Math.ceil((offer.decision.amount-bal.cash-bal.bank)*100/ev.price)));}
    forced.push({trader:ev.traderId,active:id,quantity:ev.quantity,amount:ev.amount,stock:ev.stockId,bankBefore:b.economy!.balances[ev.traderId].bank,bankAfter:s.economy!.balances[ev.traderId].bank});
   }
   if(ev.type==='propertySettled'&&ev.operation==='rent'){const payer=ev.payerId??ev.playerId;assert.equal(ev.paid.cash+ev.paid.bank,ev.amount);assert.equal(s.economy!.balances[payer].cash,b.economy!.balances[payer].cash-ev.paid.cash);assert.equal(s.economy!.balances[payer].bank,b.economy!.balances[payer].bank-ev.paid.bank);assert.equal(s.economy!.balances[ev.recipientId!].bank,b.economy!.balances[ev.recipientId!].bank+ev.amount);}
   if(ev.type==='disposalStarted'){exitContext.set(ev.receipt.id,{active:b.active,turn:b.turn,date:b.calendar!.date,publicFund:b.news!.publicFund});frozen.set(ev.receipt.id,{due:ev.receipt.due,amount:ev.receipt.amount,unpaid:ev.receipt.unpaid});mark('exit-start',i);assert.ok(s.finance!.eliminated.includes(ev.receipt.payerId));assert.equal(ev.receipt.amount,ev.receipt.paid.cash+ev.receipt.paid.bank);assert.equal(ev.receipt.due,ev.receipt.amount+ev.receipt.unpaid);}
   if(ev.type==='disposalAssets')for(const row of ev.receipt.stocks){assert.equal(row.amount,Math.trunc(Math.fround(row.price/100)*row.quantity));assert.deepEqual(s.g6!.holdings[ev.receipt.payerId][row.stockId],{quantity:0,cost:0,average:0});}
   if(ev.type==='auctionSettled'&&ev.sourceId==='public'){publicAuctions+=ev.amount;if(ev.winnerId)assert.equal(b.economy!.balances[ev.winnerId].cash-s.economy!.balances[ev.winnerId].cash,ev.amount);}
   if(ev.type==='disposalCompleted'){
    mark('exit-return',i+1);const r=ev.receipt;assert.deepEqual({due:r.due,amount:r.amount,unpaid:r.unpaid},frozen.get(r.id));exits.push(r);assert.ok(s.finance!.eliminated.includes(r.payerId));assert.equal(s.economy!.balances[r.payerId].cash+s.economy!.balances[r.payerId].bank,0);assert.equal(r.amount+r.unpaid,r.due);
    if(!r.continuation){assert.equal(s.economy!.balances[r.recipientId].bank,b.economy!.balances[r.recipientId].bank+r.amount);assert.equal(s.active,b.active);assert.equal(s.phase,r.finishedGame?'finished':'turnEnd');}
    if(!r.finishedGame){assert.equal(r.auctions.length,r.released.length>3?3:0);assert.ok(Object.values(s.g6!.holdings[r.payerId]).every(h=>h.quantity===0&&h.cost===0&&h.average===0));assert.ok(s.news!.business!.companies.every(x=>x.ownerId!==r.payerId));assert.equal(s.g3!.slots[r.payerId].length,0);}
    const tax=events.find(x=>x.type==='newsResolved'&&x.newsId===13);
    if(r.continuation&&tax?.type==='newsResolved'){
     const taxes=tax.completeChanges!.taxes!,stock=r.stocks.reduce((n,x)=>n+x.amount,0),auction=r.auctions.reduce((n,x)=>n+x.amount,0),paid=taxes.reduce((n,x)=>n+x.cash+x.bank,0),context=exitContext.get(r.id)!;
     assert.equal(s.news!.publicFund,context.publicFund+stock+auction+paid);assert.equal(taxes.find(x=>x.playerId===r.payerId)!.unpaid,r.unpaid);
     assert.equal(s.active,context.active);assert.equal(s.turn,context.turn);assert.equal(s.calendar!.date,context.date);assert.equal(s.pending?.kind,'news');mark('tax-callback-return',i+1);
    }
   }
  }
  const current=s.finance!.disposal!.current;if(current){assert.deepEqual({due:current.due,amount:current.amount,unpaid:current.unpaid},frozen.get(current.id));const context=exitContext.get(current.id)!;assert.equal(s.active,context.active);assert.equal(s.turn,context.turn);assert.equal(s.calendar!.date,context.date);}
  const rentDisposal=(b.finance!.disposal!.current&&!b.finance!.disposal!.current.continuation)||events.some(x=>x.type==='disposalStarted'&&!x.receipt.continuation);
  if(rentDisposal){const stocks=events.filter(x=>x.type==='disposalAssets').flatMap(x=>x.receipt.stocks).reduce((n,x)=>n+x.amount,0),auctions=events.filter(x=>x.type==='auctionSettled').reduce((n,x)=>n+x.amount,0);assert.equal(s.news!.publicFund-b.news!.publicFund,stocks+auctions);}
  for(const bal of Object.values(s.economy!.balances))assert.ok(bal.cash>=0&&bal.bank>=0);
 }
 assert.ok(auto&&human&&dates);if(terminal){assert.equal(e.state.phase,'finished');assert.equal(e.state.finance!.eliminated.length,replay.config.characterIds.length-1);assert.ok(!e.state.finance!.eliminated.includes(e.state.finance!.winnerId!));mark('before-terminal',replay.commands.length-1);const s=e.state;assert.equal(e.dispatch({id:'after-finish',gameId:s.gameId,expectedRevision:s.revision,playerId:s.players[s.active].id,action:{type:'roll'}}).ok,false);assert.deepEqual(e.state,s);}
 const copy=replayGame(nodes,replay);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);
 for(const i of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,i)});for(let j=i;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,phase:e.state.phase,winner:e.state.finance!.winnerId,auto,human,dates,cross,reactions,forced,exits,publicAuctions,negativeChecks,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
