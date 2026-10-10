import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {verifyCompany} from './verify-company';
/** Recompute actual before/after transactions, without production commerce/build/fee handlers. */
export function verifyCommerce(before:GameState,after:GameState,events:readonly GameEvent[]){
 const checks=verifyCompany(before,after,events.filter(e=>!(e.type==='companyService'&&(e.receipt.companyId==='japan:company:3'||e.receipt.base===0))));
 for(const e of events){
  if(e.type==='companyService'&&e.receipt.companyId!=='japan:company:3'&&e.receipt.base===0){
   const r=e.receipt,c=before.news!.business!.companies.find(c=>c.id===r.companyId)!,now=after.news!.business!.companies.find(c=>c.id===r.companyId)!;
   assert.ok(!c.ownerId||c.ownerId===r.visitorId||r.factor===0);assert.equal(r.amount,0);assert.equal(r.paid,0);assert.equal(r.cash,0);assert.equal(r.bank,0);assert.equal(now.funds,c.funds);assert.equal(now.cumulative,c.cumulative);checks.push('zero company fee keeps company ledger; simultaneous god balance effects outside service scope');
  }
  if(e.type==='companyBuilt'){
   const r=e.receipt,c=before.news!.business!.companies[2],self=c.ownerId===before.players[before.active].id;
   assert.ok([67,68].includes(before.players[before.active].node));assert.equal(r.ownerId,c.ownerId);assert.equal(r.visitorId,before.players[before.active].id);
   if(r.propertyId){const p=before.economy!.properties.find(p=>p.id===r.propertyId)!,d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!,q=after.economy!.properties.find(q=>q.id===p.id)!;assert.deepEqual(r.before,p);const type=d.kind==='facility'&&!p.level?q.buildingType!:p.buildingType??0,cap=d.kind==='land'?(type===1?1:5):[1,5,5,1,5][type];assert.ok(type>=0&&type<=4);let level=p.level,attempts=1;level=Math.min(cap,level+1);if(self&&!(level===5&&level!==p.level)){level=Math.min(cap,level+1);attempts++;}assert.equal(q.level,level);assert.equal(q.ownerId,p.ownerId);assert.equal(q.priceStatus,p.priceStatus);assert.equal(r.attempts,attempts);assert.deepEqual(r.after,q);assert.equal(r.fee,self?0:p.basePrice??d.basePrice);checks.push(self?'owner builds twice with caps for free':'visitor builds once before payment');}
   else{assert.equal(r.fee,self?0:1000);assert.equal(r.attempts,0);assert.deepEqual(before.economy!.properties,after.economy!.properties);checks.push('visitor cancellation charges1000 before modifiers');}
   assert.deepEqual(after.news!.business!.construction,r);
  }
  if(e.type==='companyService'&&e.receipt.companyId==='japan:company:3'){
   const r=e.receipt,c=before.news!.business!.companies[2],build=events.find(e=>e.type==='companyBuilt'),construction=build?.type==='companyBuilt'?build.receipt:before.news!.business!.construction!;assert.equal(r.base,construction.fee);
   const god=before.g6!.gods.find(g=>g.carrier===r.visitorId)?.type,base=r.base,amount=god===1?Math.floor(base/2):god===2?0:god===5?base+Math.floor(base/2):god===6?base*2:base;assert.equal(r.amount,amount);
   const free=events.some(e=>e.type==='effectConsumed'&&e.itemId==='card:20'),redirect=events.find(e=>e.type==='reactionAnswered'&&e.stage==='redirect'&&e.choice==='use');
   let payer=redirect?.type==='reactionAnswered'?redirect.targetId!:r.visitorId;assert.equal(r.redirected,payer!==r.visitorId);
   const substitute=amount&&!free?before.players.find(p=>p.id!==payer&&!before.finance!.eliminated.includes(p.id)&&[14,15].includes(before.g6!.gods.find(g=>g.carrier===p.id)?.type??0)):undefined;
   payer=substitute?.id??payer;assert.equal(r.payerId,payer);assert.equal(r.free,free);assert.equal(r.godPayer,!!substitute);if(substitute)checks.push('first other alive god carrier substitutes actual Nissan payer');
   const due=free?0:amount;
   const b=before.economy!.balances[r.payerId],cash=Math.min(b.cash,due),bank=Math.min(b.bank,due-cash),paid=cash+bank;assert.equal(r.cash,cash);assert.equal(r.bank,bank);assert.equal(r.paid,paid);assert.equal(r.unpaid,due-paid);assert.equal(after.economy!.balances[r.payerId].cash,b.cash-cash);assert.equal(after.economy!.balances[r.payerId].bank,b.bank-bank);
   const now=after.news!.business!.companies[2];assert.equal(now.funds,(c.funds+paid)|0);assert.equal(now.cumulative,(c.cumulative+paid)|0);assert.equal(before.news!.publicFund,after.news!.publicFund);if(paid)checks.push('Nissan actual fee cash-bank enters period and cumulative only');
  }
  if(e.type==='companySubscribed'){
   const r=e.receipt,c=before.news!.business!.companies.find(c=>c.id===r.companyId)!,now=after.news!.business!.companies.find(c=>c.id===r.companyId)!,id=before.players[before.active].id,price=Math.trunc(c.capital/10000),h=before.g6!.holdings[id][c.stockId],balance=before.economy!.balances[id];
   assert.equal(r.traderId,id);assert.equal(r.price,price);assert.ok(r.quantity>0&&r.quantity<=Math.min(1000,c.subscription!,Math.floor(balance.cash/price)));assert.equal(r.amount,r.quantity*price);assert.equal(now.subscription,c.subscription!-r.quantity);assert.equal(r.availableBefore,c.subscription);assert.equal(r.availableAfter,now.subscription);assert.deepEqual(after.g6!.stocks,before.g6!.stocks);assert.equal(after.economy!.balances[id].cash,balance.cash-r.amount);assert.equal(after.economy!.balances[id].bank,balance.bank);assert.deepEqual(after.g6!.holdings[id][c.stockId],{quantity:h.quantity+r.quantity,cost:h.cost+r.amount});assert.equal(now.funds,c.funds);assert.equal(now.cumulative,c.cumulative);assert.equal(after.news!.publicFund,before.news!.publicFund);
   const rank=c.ranking.filter(p=>p!==id&&after.g6!.holdings[p][c.stockId].quantity>0),index=rank.findIndex(p=>after.g6!.holdings[p][c.stockId].quantity<h.quantity+r.quantity);rank.splice(index<0?rank.length:index,0,id);assert.deepEqual(now.ranking,rank);assert.equal(now.ownerId,rank[0]);assert.equal(r.ownerBefore,c.ownerId);assert.equal(r.ownerAfter,now.ownerId);assert.deepEqual(after.news!.business!.subscriptionReceipt,r);checks.push('onsite cash subscription independent pool, unchanged market and company income');if(c.ownerId!==now.ownerId)checks.push('onsite subscription changes company operator by holdings');
  }
 }
 return checks;
}
