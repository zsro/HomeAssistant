import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
/** Independent arithmetic oracle: never calls production sale/auction calculators. */
export function verifyEstateSales(before:GameState,after:GameState,events:readonly GameEvent[]){
 const checks:string[]=[];
 for(const event of events){
  if(event.type==='propertyListed'){
   const r=event.record,p=before.economy!.properties.find(p=>p.id===r.propertyId)!,d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!;
   assert.equal(p.ownerId,r.sellerId);assert.ok(r.price>=1&&r.price<=((p.basePrice??d.basePrice)+p.level*d.upgradeCost)*before.calendar!.business!.priceIndex*10);
   assert.deepEqual(after.economy,before.economy);assert.ok(after.finance!.sales!.records[r.sellerId].length<=7);assert.equal(r.age,0);checks.push('listing/reprice: valid quote, no escrow, seven slots');
  }
  if(event.type==='saleCompleted'){
   const r=event.receipt,listing=Object.values(before.finance!.sales!.records).flat().find(x=>x.id===r.listing.id)!;assert.ok(listing);
   const price=listing.price;assert.equal(after.economy!.balances[r.buyerId].cash,before.economy!.balances[r.buyerId].cash-price);assert.equal(after.economy!.balances[r.buyerId].bank,before.economy!.balances[r.buyerId].bank);
   assert.equal(after.economy!.balances[listing.sellerId].bank,before.economy!.balances[listing.sellerId].bank+price);assert.equal(after.economy!.balances[listing.sellerId].cash,before.economy!.balances[listing.sellerId].cash);
   const old=before.economy!.properties.find(p=>p.id===listing.propertyId)!,now=after.economy!.properties.find(p=>p.id===listing.propertyId)!;
   assert.equal(now.ownerId,r.buyerId);assert.equal(now.level,old.level);assert.equal(now.buildingType,old.buildingType);assert.ok(!after.finance!.sales!.records[listing.sellerId].some(x=>x.id===listing.id));checks.push('sale: exact cash -> seller bank, unchanged building, record removed');
  }
  if(event.type==='auctionOffered'){
   const a=event.decision,p=before.economy!.properties.find(p=>p.id===a.propertyId)!,d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!;
   assert.equal(a.reserve,Math.trunc((p.basePrice??d.basePrice)*(2+p.level)/2)*before.calendar!.business!.priceIndex);checks.push('auction reserve: truncate half-level base then index');
  }
  if(event.type==='auctionSettled'&&event.winnerId){
   assert.equal(after.economy!.balances[event.winnerId].cash,before.economy!.balances[event.winnerId].cash-event.amount);
   if(event.sourceId==='public')assert.equal(after.news!.publicFund,before.news!.publicFund+event.amount);else assert.equal(after.economy!.balances[event.sourceId].bank,before.economy!.balances[event.sourceId].bank+event.amount);
   assert.equal(after.economy!.properties.find(p=>p.id===event.propertyId)!.ownerId,event.winnerId);checks.push('auction receipt: winner cash to public/source bank');
  }
  if(event.type==='salesAged'){
   for(const r of event.records){const old=Object.values(before.finance!.sales!.records).flat().find(x=>x.id===r.id)!;assert.equal(r.age,(old.age+1)%256);}checks.push('daily listing byte age');
  }
 }
 return checks;
}
