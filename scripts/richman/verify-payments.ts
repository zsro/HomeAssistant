import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
/** Independent accounting: no production payment, valuation or callback helpers. */
export function verifyPayments(before:GameState,after:GameState,events:readonly GameEvent[]){
 const checks:string[]=[],completion=events.find(e=>e.type==='paymentCompleted'),assets=events.find(e=>e.type==='disposalAssets'&&e.receipt.continuation==='payment');
 const active=before.finance?.payments?.current;
 if(active){assert.equal(after.active,before.active);assert.equal(after.turn,before.turn);assert.equal(after.calendar!.date,before.calendar!.date);checks.push('suspended callback freezes active turn and date');}
 for(const e of events){
  if(e.type==='disposalStarted'&&e.receipt.continuation==='payment'){
   const r=e.receipt;assert.ok(after.finance!.eliminated.includes(r.payerId));assert.deepEqual(after.economy!.balances[r.payerId],{cash:0,bank:0});assert.equal(r.amount,r.paid.cash+r.paid.bank);assert.equal(r.due,r.amount+r.unpaid);assert.equal(after.items!.points[r.payerId],0);assert.ok(!events.some(e=>e.type==='debtSettled'));checks.push('exit first, frozen liquid actual, no rent-credit event or debtor rescue');
  }
  if(e.type==='disposalAssets'&&e.receipt.continuation==='payment'){
   const r=e.receipt;
   for(const id of r.released){const old=before.economy!.properties.find(p=>p.id===id)!,p=after.economy!.properties.find(p=>p.id===id)!;const built=events.find(e=>e.type==='companyBuilt'&&e.receipt.propertyId===id);assert.equal(p.ownerId,null);assert.equal(p.level,built?.type==='companyBuilt'?built.receipt.after!.level:old.level);assert.equal(p.research,null);}
   for(const k of r.stocks){assert.equal(k.quantity,before.g6!.holdings[r.payerId][k.stockId].quantity);assert.equal(k.amount,Math.trunc(Math.fround(k.price/100)*k.quantity));assert.equal(after.g6!.holdings[r.payerId][k.stockId].quantity,0);}
   assert.deepEqual(after.effects!.inventory[r.payerId],{});assert.equal(after.items!.points[r.payerId],0);assert.ok(!after.lottery!.tickets.includes(r.payerId));assert.ok(!Object.values(after.finance!.sales!.records).flat().some(k=>k.sellerId===r.payerId));checks.push('release buildings and retain shares until public disposal; bag and tickets cleanup');
  }
  if(e.type==='auctionOffered'&&e.decision.disposalId&&(after.finance!.payments!.current||completion)){
   const a=e.decision,p=after.economy!.properties.find(p=>p.id===a.propertyId)!,d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!;
   assert.equal(a.reserve,Math.trunc((p.basePrice??d.basePrice)*(2+p.level)/2)*after.calendar!.business!.priceIndex);assert.ok(a.remaining.every(id=>!after.finance!.eliminated.includes(id)));checks.push('indexed auction reserve and only living bidders');
  }
 }
 if(active||assets||completion){
  const stockIncome=assets?.type==='disposalAssets'?assets.receipt.stocks.reduce((n,k)=>n+k.amount,0):0;
  const auctions=events.filter(e=>e.type==='auctionSettled'&&e.sourceId==='public');
  const auctionIncome=auctions.reduce((n,e)=>n+(e.type==='auctionSettled'?e.amount:0),0);
  const fee=completion?.type==='paymentCompleted'&&completion.payment.kind==='fortune'?completion.payment.paid.cash+completion.payment.paid.bank:0;
  assert.equal(after.news!.publicFund-before.news!.publicFund,stockIncome+auctionIncome+fee);checks.push('public change equals stock sales plus auctions plus only fortune actual fee');
  for(const e of auctions)if(e.type==='auctionSettled'&&e.winnerId)assert.equal(before.economy!.balances[e.winnerId].cash-after.economy!.balances[e.winnerId].cash,e.amount);
 }
 if(active?.kind==='company'&&!completion){const id=active.receipt.companyId;assert.equal(after.news!.business!.companies.find(c=>c.id===id)!.funds,before.news!.business!.companies.find(c=>c.id===id)!.funds);assert.ok(!events.some(e=>e.type==='companyService'));checks.push('company ledger stays uncredited while auction callback pending');}
 if(completion?.type==='paymentCompleted'){
  const p=completion.payment,r=after.finance!.disposal!.last!,actual=p.paid.cash+p.paid.bank;
  assert.equal(p.stage,'completed');assert.equal(p.disposalId,r.id);assert.equal(r.amount,actual);assert.equal(r.auctions.length,r.finishedGame||r.released.length<=3?0:3);assert.equal(new Set(r.auctions.map(a=>a.propertyId)).size,r.auctions.length);assert.equal(after.finance!.payments!.current,null);
  assert.ok(events.findIndex(e=>e.type==='disposalCompleted')<events.indexOf(completion));assert.ok(!events.some(e=>e.type==='insuranceClaim'&&e.receipt.playerId===p.payerId));
  if(p.kind==='company'){const c=after.news!.business!.companies.find(c=>c.id===p.receipt.companyId)!;assert.equal(c.funds,(p.receipt.fundsBefore+actual)|0);assert.equal(c.cumulative,(p.receipt.cumulativeBefore+actual)|0);assert.ok(events.some(e=>e.type==='companyService'&&e.receipt.paid===actual));}
  if(p.kind==='fortune'){assert.equal(p.change.unpaid,p.due-actual);assert.ok(events.some(e=>e.type==='fortuneResolved'&&e.change.bankrupt));}
  if(p.kind==='loan'){assert.equal(after.news!.business!.loans[p.payerId],0);assert.equal(after.calendar!.due[p.payerId],null);assert.ok(events.some(e=>e.type==='loanNotice'&&e.notice.unpaid===p.due-actual));}
  assert.equal(after.phase,r.finishedGame?'finished':p.kind==='loan'?'turnEnd':p.kind);checks.push('one explicit callback after all auctions, correct destination and no insurance rescue');
 }
 return checks;
}
