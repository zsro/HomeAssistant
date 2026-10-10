import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
/** Independent per-command accounting. Does not invoke disposal/auction production helpers. */
export function verifyDisposal(before:GameState,after:GameState,events:readonly GameEvent[]){
 const checks:string[]=[];
 for(const e of events){
  if(e.type==='disposalStarted'){
   const r=e.receipt;assert.equal(r.amount,before.economy!.balances[r.payerId].cash+before.economy!.balances[r.payerId].bank);assert.ok(after.finance!.eliminated.includes(r.payerId));assert.deepEqual(after.economy!.balances[r.payerId],{cash:0,bank:0});assert.equal(after.items!.points[r.payerId],0);checks.push('exit first; frozen actual liquid payment; no debtor rescue');
  }
  if(e.type==='disposalAssets'){
   const r=e.receipt,owned=PROPERTY_CATALOG.properties.filter(d=>before.economy!.properties.find(p=>p.id===d.id)!.ownerId===r.payerId).sort((a,b)=>Number(a.kind==='facility')-Number(b.kind==='facility')||Number(a.id.split(':').at(-1))-Number(b.id.split(':').at(-1)));
   assert.deepEqual(r.released,owned.map(d=>d.id));for(const id of r.released){const old=before.economy!.properties.find(p=>p.id===id)!,p=after.economy!.properties.find(p=>p.id===id)!;assert.equal(p.ownerId,null);assert.equal(p.level,old.level);assert.equal(p.buildingType,old.buildingType);assert.equal(p.basePrice,old.basePrice);assert.equal(p.research,null);}
   assert.deepEqual(after.effects!.inventory[r.payerId],{});assert.equal(after.items!.points[r.payerId],0);assert.ok(!after.lottery!.tickets.includes(r.payerId));assert.ok(!Object.values(after.finance!.sales!.records).flat().some(x=>x.sellerId===r.payerId));
   const sold=before.g6!.stocks.filter(k=>before.g6!.holdings[r.payerId][k.id].quantity>0);const publicStock=sold.reduce((total,k)=>total+Math.trunc(Math.fround(k.price/100)*before.g6!.holdings[r.payerId][k.id].quantity),0);assert.equal(r.stocks.reduce((sum,k)=>sum+k.amount,0),publicStock);assert.equal(after.news!.publicFund-before.news!.publicFund,publicStock);checks.push('released original estates retain buildings; stocks public; bag no point credit; lottery/listing cleanup');
  }
  if(e.type==='auctionOffered'&&e.decision.disposalId){const a=e.decision,p=after.economy!.properties.find(p=>p.id===a.propertyId)!,def=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!;assert.equal(a.reserve,Math.trunc((p.basePrice??def.basePrice)*(2+p.level)/2)*after.calendar!.business!.priceIndex);assert.ok(!a.remaining.some(id=>after.finance!.eliminated.includes(id)));checks.push('forced auction indexed reserve and survivor-only participants');}
  if(e.type==='auctionSettled'&&before.pending?.kind==='auction'&&before.pending.disposalId){assert.equal(after.news!.publicFund-before.news!.publicFund,e.amount);if(e.winnerId)assert.equal(after.economy!.balances[e.winnerId].cash,before.economy!.balances[e.winnerId].cash-e.amount);checks.push('forced auction actual cash to public only');}
  if(e.type==='disposalCompleted'){const r=e.receipt;assert.equal(r.auctions.length,r.finishedGame||r.released.length<=3?0:3);assert.equal(new Set(r.auctions.map(a=>a.propertyId)).size,r.auctions.length);assert.equal(after.economy!.balances[r.recipientId].bank,before.economy!.balances[r.recipientId].bank+r.amount);assert.ok(events.some(e=>e.type==='debtSettled'&&e.amount===r.amount));assert.equal(after.phase,r.finishedGame?'finished':'turnEnd');checks.push('three distinct lots; deferred creditor actual receipt; original turn resumes');}
 }
 if(before.finance?.disposal?.current){assert.equal(before.turn,after.turn);assert.equal(before.active,after.active);assert.equal(before.calendar!.date,after.calendar!.date);checks.push('auction sequence freezes active turn and calendar');if(after.finance!.disposal!.current)assert.equal(after.economy!.balances[before.finance.disposal.current.recipientId].bank,before.economy!.balances[before.finance.disposal.current.recipientId].bank);}
 return checks;
}
