import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,capitalBudget} from '../../frontend/src/features/richman/game/computer-capital';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
/** Independent receipt arithmetic; replay tests intentionally use the production dispatcher. */
export async function verifyComputerCapital(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'capital-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),trades:unknown[]=[],subscriptions:unknown[]=[],loans:unknown[]=[],banks:unknown[]=[],reds:unknown[]=[],forcedSales:unknown[]=[],reactions:unknown[]=[],exits:unknown[]=[],rentPayments:unknown[]=[];let auto=0,human=0;
 const mark=(name:string,n:number)=>{if(!prefixes.has(name))prefixes.set(name,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));
  const c=replay.commands[i],a=c.action,b=e.state,id=c.playerId,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId),item=b.effects?.pending?.definitionId.slice(0,7);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'capital-v1')!.action,a);}else human++;}
  const r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({i,c,r}));const s=e.state;
  if(a.type==='pause'){
   const next=replay.commands.slice(i+1).find(c=>c.action.type!=='pause')?.action;
   if(next&&['stockTrade','loan','bank','subscribeCompany'].includes(next.type)){const key=next.type==='stockTrade'?next.side:next.type==='subscribeCompany'?'subscription':next.type==='loan'||next.type==='bank'?next.operation:'';mark(key+(s.paused?'-paused':'-resumed'),i+1);}
  }
  const sameWorldClock=()=>{for(const k of ['randomState','calendar','active','turn'] as const)assert.deepEqual(s[k],b[k]);assert.equal(s.news!.publicFund,b.news!.publicFund);};
  const mean=(stockId:string,qty:number,paid:number,buy:boolean)=>{const old=b.g6!.holdings[id][stockId],now=s.g6!.holdings[id][stockId],quantity=old.quantity+(buy?qty:-qty),average=buy?Math.fround((Math.trunc(old.quantity*old.average!)+paid)/quantity):quantity?old.average!:0;assert.deepEqual(now,{quantity,average,cost:Math.trunc(quantity*average)});};
  if(a.type==='stockTrade'){
   const old=b.g6!.stocks.find(k=>k.id===a.stockId)!,now=s.g6!.stocks.find(k=>k.id===a.stockId)!,amount=Math.trunc(old.price*a.quantity/100),sign=a.side==='buy'?-1:1,bal=b.economy!.balances[id];
   assert.equal(r.events.filter(ev=>ev.type==='stockTraded'&&ev.traderId===id&&!ev.forced&&ev.amount===amount&&ev.quantity===a.quantity).length,1);
   assert.deepEqual(s.economy!.balances[id],{cash:bal.cash,bank:bal.bank+sign*amount});assert.equal(now.pool,old.pool+sign*a.quantity);assert.equal(now.quota,old.quota+sign*a.quantity);assert.equal(now.price,old.price);mean(a.stockId,a.quantity,amount,a.side==='buy');sameWorldClock();assert.equal(s.phase,b.phase);
   const company=s.news!.business!.companies.find(k=>k.stockId===a.stockId);if(company?.ownerId){const ownerQty=s.g6!.holdings[company.ownerId][a.stockId].quantity;assert.ok(s.players.filter(p=>!s.finance!.eliminated.includes(p.id)).every(p=>s.g6!.holdings[p.id][a.stockId].quantity<=ownerQty));}
   trades.push({ai,id,turn:s.turn,side:a.side,stockId:a.stockId,quantity:a.quantity,amount,balanceBefore:bal,balanceAfter:s.economy!.balances[id],holdingBefore:b.g6!.holdings[id][a.stockId],holdingAfter:s.g6!.holdings[id][a.stockId],ownerBefore:b.news!.business!.companies.find(k=>k.stockId===a.stockId)?.ownerId??null,ownerAfter:company?.ownerId??null,budget:capitalBudget(b,id)});mark(a.side+'-before',i);mark(a.side+'-after',i+1);
  }
  if(a.type==='subscribeCompany'&&a.quantity){
   assert.equal(b.pending?.kind,'subscription');const pending=b.pending as {companyId:string},old=b.news!.business!.companies.find(k=>k.id===pending.companyId)!,now=s.news!.business!.companies.find(k=>k.id===old.id)!,amount=Math.trunc(old.capital/10000)*a.quantity,bal=b.economy!.balances[id];
   assert.deepEqual(s.economy!.balances[id],{cash:bal.cash-amount,bank:bal.bank});assert.equal(now.subscription,old.subscription!-a.quantity);assert.equal(now.funds,old.funds);assert.equal(now.cumulative,old.cumulative);assert.deepEqual(s.g6!.stocks,b.g6!.stocks);mean(old.stockId,a.quantity,amount,true);sameWorldClock();assert.equal(s.phase,'turnEnd');
   subscriptions.push({ai,id,turn:s.turn,receipt:r.events.filter(ev=>ev.type==='companySubscribed'),balanceBefore:bal,balanceAfter:s.economy!.balances[id]});mark('subscription-before',i);mark('subscription-after',i+1);
  }
  if(a.type==='bank'){
   const bal=b.economy!.balances[id],sign=a.operation==='withdraw'?1:-1;assert.deepEqual(s.economy!.balances[id],{cash:bal.cash+sign*a.amount,bank:bal.bank-sign*a.amount});sameWorldClock();banks.push({ai,id,operation:a.operation,amount:a.amount});mark(a.operation+'-before',i);mark(a.operation+'-after',i+1);
  }
  if(a.type==='loan'){
   const bal=b.economy!.balances[id],old=b.news!.business!.loans[id];
   if(a.operation==='borrow'){assert.equal(s.news!.business!.loans[id],old+a.amount);assert.deepEqual(s.economy!.balances[id],{cash:bal.cash,bank:bal.bank+a.amount});assert.ok(s.calendar!.due[id]);}
   else{assert.equal(s.news!.business!.loans[id],old-a.amount);assert.deepEqual(s.economy!.balances[id],{cash:bal.cash-Math.max(0,a.amount-bal.bank),bank:Math.max(0,bal.bank-a.amount)});assert.equal(s.calendar!.due[id],old===a.amount?null:b.calendar!.due[id]);}
   assert.equal(s.randomState,b.randomState);assert.equal(s.calendar!.date,b.calendar!.date);assert.equal(s.news!.publicFund,b.news!.publicFund);loans.push({ai,id,turn:s.turn,operation:a.operation,amount:a.amount,balanceBefore:bal,balanceAfter:s.economy!.balances[id],debtBefore:old,debtAfter:s.news!.business!.loans[id],dueBefore:b.calendar!.due[id],dueAfter:s.calendar!.due[id]});mark(a.operation+'-before',i);mark(a.operation+'-after',i+1);
  }
  if(a.type==='item'&&a.action.type==='confirm'&&item==='card:24'){
   const stockId=a.action.target.id,old=b.g6!.stocks.find(k=>k.id===stockId)!;assert.equal(s.g6!.stocks.find(k=>k.id===stockId)!.trend,'red');assert.deepEqual(s.g6!.holdings,b.g6!.holdings);assert.deepEqual(s.economy,b.economy);assert.equal(s.effects!.inventory[id][item],b.effects!.inventory[id][item]-1);reds.push({ai,id,stockId,quantity:b.g6!.holdings[id][stockId].quantity,priceBefore:old.price,priceAfter:s.g6!.stocks.find(k=>k.id===stockId)!.price});mark('red-before',i);mark('red-after',i+1);
  }
  if(a.type==='reaction'){reactions.push({ai,id,kind:b.pending,action:a,events:r.events});mark('reaction-before',i);mark('reaction-after',i+1);}
  if(a.type==='property'&&a.accept&&b.pending?.kind==='property'&&b.pending.operation==='rent'&&!b.pending.hotelTurns){const p=b.pending,payer=p.payerId??b.players[b.active].id,bal=b.economy!.balances[payer],cash=Math.min(bal.cash,p.amount),expected=structuredClone(b.economy!.balances);expected[payer].cash-=cash;expected[payer].bank-=p.amount-cash;if(p.recipientId)expected[p.recipientId].bank+=p.amount;assert.deepEqual(s.economy!.balances,expected);assert.equal(s.news!.publicFund,b.news!.publicFund);rentPayments.push({ai,active:b.players[b.active].id,payer,recipient:p.recipientId,amount:p.amount,paid:{cash,bank:p.amount-cash}});mark('rent-payment-before',i);mark('rent-payment-after',i+1);}
  const forced=r.events.filter(ev=>ev.type==='stockTraded'&&ev.forced);
  if(forced.length&&s.pending?.kind==='property'&&s.pending.operation==='rent'){
   const payer=s.pending.payerId??s.players[s.active].id,expected=structuredClone(b.economy!.balances),holdings=structuredClone(b.g6!.holdings[payer]);
   for(const ev of forced){if(ev.type!=='stockTraded')throw Error();assert.equal(ev.traderId,payer);expected[payer].bank+=Math.trunc(ev.price*ev.quantity/100);const h=holdings[ev.stockId];h.quantity-=ev.quantity;if(!h.quantity)h.average=0;h.cost=Math.trunc(h.quantity*h.average!);}
   assert.deepEqual(s.economy!.balances,expected);assert.deepEqual(s.g6!.holdings[payer],holdings);assert.equal(s.news!.publicFund,b.news!.publicFund);assert.ok(expected[payer].cash+expected[payer].bank>=s.pending.amount);
  }
  for(const ev of r.events){if(ev.type==='stockTraded'&&ev.forced){assert.equal(ev.amount,Math.trunc(ev.price*ev.quantity/100));forcedSales.push({event:ev,action:a.type,active:b.players[b.active].id,pending:b.pending,publicBefore:b.news!.publicFund,publicAfter:s.news!.publicFund});mark('forced-sale-before',i);mark('forced-sale-after',i+1);}if(ev.type==='stockMarketUpdated'){mark('market-before',i);mark('market-after',i+1);}}
  if(s.finance!.eliminated.length>b.finance!.eliminated.length){exits.push({action:a.type,before:b.finance!.eliminated,after:s.finance!.eliminated,publicBefore:b.news!.publicFund,publicAfter:s.news!.publicFund});mark('exit-before',i);mark('exit-after',i+1);}
 }
 assert.ok(auto&&human&&trades.length);const full=replayGame(nodes,JSON.parse(JSON.stringify(replay)));assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,auto,human,trades,subscriptions,loans,banks,reds,forcedSales,reactions,exits,rentPayments,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
