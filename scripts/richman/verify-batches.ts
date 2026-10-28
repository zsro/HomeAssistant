import assert from 'node:assert/strict';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import type {PaymentBatch} from '../../frontend/src/features/richman/game/payment-batches';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import nodes from '../../shared/richman/japan-topology.fixture.json';
/** Independent arithmetic/ordering oracle: no production payment, tax, dividend or disposal calculator. */
export function verifyBatchReplay(replay:Replay){
 let taxStart:null|{fund:number;stock:number;auction:number}=null;
 const e=new GameEngine(nodes,replay.config),frozen=new Map<number,PaymentBatch>(),checks=new Set<string>(),receipts:PaymentBatch[]=[];
 for(const command of replay.commands){
  const before=e.state,result=e.dispatch(command);assert.ok(result.ok);if(!result.ok)throw Error();const after=e.state,events=result.events;
  for(const ev of events){
   if(ev.type==='batchStarted'){
    const b=ev.batch;frozen.set(b.id,structuredClone(b));assert.equal(b.cursor,0);assert.equal(b.waiting,false);
    if(b.kind==='dividend'){
     const totals=Object.fromEntries(b.rows.map(r=>[r.playerId,0]));
     for(const c of b.companies!){assert.equal(c.shares,c.allocations.reduce((n,a)=>n+a.quantity,0));assert.equal(c.after,c.shares?0:c.funds);for(const a of c.allocations){const ratio=a.quantity?Math.fround(a.quantity/c.shares):0;assert.equal(a.ratio,ratio);assert.equal(a.amount,Math.trunc(c.funds*ratio)|0);totals[a.playerId]=(totals[a.playerId]+a.amount)|0;}}
     for(const r of b.rows)assert.equal(r.amount,totals[r.playerId]);checks.add('float32 per-company allocation and frozen signed player nets');
    }else{
     for(const r of b.rows){let base=0;if(b.kind==='landTax'){for(const p of before.economy!.properties.filter(p=>p.ownerId===r.playerId)){const d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!;base+=(p.basePrice??d.basePrice)+p.level*d.upgradeCost;}assert.equal(r.base,base);}else{for(const k of before.g6!.stocks){const q=before.g6!.holdings[r.playerId][k.id].quantity;if(q>0)base=Math.fround(base+Math.fround(k.price/100)*q);}base*=100;assert.equal(r.baseCents,base);}assert.equal(r.amount,-Math.floor(base/(b.kind==='landTax'?20:2000))*before.calendar!.business!.priceIndex);}
     checks.add('original-map frozen tax basis and truncate-before-index');
    }
   }
   if(ev.type==='disposalAssets'&&ev.receipt.continuation==='payment'){
    for(const k of ev.receipt.stocks){assert.equal(k.amount,Math.trunc(Math.fround(k.price/100)*k.quantity));assert.equal(after.g6!.holdings[ev.receipt.payerId][k.stockId].quantity,0);}
    if(ev.receipt.stocks.length)checks.add('remaining stocks sold to public on exit, not pre-cleared');
   }
   if(ev.type==='paymentCompleted'&&ev.payment.kind==='batch'){
    const p=ev.payment,finished=events.find(x=>x.type==='disposalCompleted'&&x.receipt.id===p.disposalId);assert.ok(finished);assert.ok(events.indexOf(finished)<events.indexOf(ev));if(finished.type!=='disposalCompleted')throw Error();const d=finished.receipt;assert.equal(d.amount,p.paid.cash+p.paid.bank);assert.equal(d.unpaid,d.due-d.amount);assert.equal(d.auctions.length,d.finishedGame||d.released.length<=3?0:3);assert.deepEqual(after.economy!.balances[p.payerId],{cash:0,bank:0});assert.ok(after.finance!.eliminated.includes(p.payerId));
    checks.add('explicit row callback after disposal; auction money never rescues debtor');
   }
   if(ev.type==='batchCompleted'){
    const b=ev.batch,start=frozen.get(b.id)!;assert.ok(start);assert.deepEqual(b.rows.map(r=>r.amount),start.rows.map(r=>r.amount));assert.deepEqual(b.companies,start.companies);
    for(let i=0;i<b.rows.length;i++){const r=b.rows[i];if(!r.before){assert.ok(b.stopped||r.skipped);continue;}const actual=r.paid!.cash+r.paid!.bank;
     if(b.kind==='dividend'){let bank=(r.before.bank+r.amount)|0,cash=r.before.cash;if(bank<0){cash=(cash+bank)|0;bank=0;}assert.equal(r.unpaid,Math.max(0,-cash));assert.deepEqual(r.after,{cash:Math.max(0,cash),bank});}
     else{const due=-r.amount;assert.equal(r.paid!.cash,Math.min(due,r.before.cash));assert.equal(r.paid!.bank,Math.min(due-r.paid!.cash,r.before.bank));assert.equal(r.unpaid,due-actual);assert.deepEqual(r.after,{cash:r.before.cash-r.paid!.cash,bank:r.before.bank-r.paid!.bank});}
    }
    receipts.push(b);checks.add('seat live balances with immutable amounts and exact actual/unpaid receipts');
    if(b.stopped){assert.equal(after.phase,'finished');assert.ok(!events.some(x=>x.type==='lotteryDrawn'||x.type==='turnStarted'));checks.add('explicit Web final-survivor stops remaining seats and date tail');}
    else if(b.kind==='dividend'){assert.ok(events.findIndex(x=>x.type==='companyDividends')<events.findIndex(x=>x.type==='lotteryDrawn'));assert.ok(events.findIndex(x=>x.type==='lotteryDrawn')<events.findIndex(x=>x.type==='turnStarted'));checks.add('dividend receipt before same-day lottery and incoming turn');}
   }
  }
  const active=before.finance!.batches!.current;
  if(active?.waiting&&after.finance!.batches!.current?.id===active.id){assert.equal(after.turn,before.turn);assert.equal(after.calendar!.date,before.calendar!.date);assert.equal(after.active,before.active);checks.add('suspended batch freezes outer turn/date');}
  // Reconcile each tax batch's public fund from its entry through all exits, independent of destination code.
  if(events.some(x=>x.type==='batchStarted'))taxStart={fund:before.news!.publicFund,stock:0,auction:0};
  if(taxStart){for(const ev of events){if(ev.type==='disposalAssets')taxStart.stock+=ev.receipt.stocks.reduce((n,k)=>n+k.amount,0);if(ev.type==='auctionSettled'&&ev.sourceId==='public')taxStart.auction+=ev.amount;}
   const done=events.find(x=>x.type==='batchCompleted');if(done?.type==='batchCompleted'){const actual=done.batch.kind==='dividend'?0:done.batch.rows.reduce((n,r)=>n+(r.paid?.cash??0)+(r.paid?.bank??0),0),prize=events.reduce((n,x)=>n+(x.type==='lotteryDrawn'?x.result.amount:0),0);assert.equal(after.news!.publicFund-taxStart.fund,taxStart.stock+taxStart.auction+actual-prize);if(done.batch.kind==='dividend')for(const c of done.batch.companies!){const now=after.news!.business!.companies.find(x=>x.id===c.companyId)!;assert.equal(now.funds,c.after);assert.equal(now.cumulative,c.cumulative);}checks.add(done.batch.kind==='dividend'?'dividend debit is sink; public stock/auction proceeds minus lottery prize; company ledger unchanged':'tax public receipts equal original liquid payments plus separate stock/auction proceeds');taxStart=null;}}
 }
 return{engine:e,checks:[...checks],receipts};
}
