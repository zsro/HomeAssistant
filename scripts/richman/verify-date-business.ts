import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {verifyDividends} from './verify-dividends';
/** Independent accounting from each real pre-command world, not production price helpers. */
export function verifyDateBusiness(before:GameState,after:GameState,events:GameEvent[]){
 const checks:string[]=[];const price=events.find(e=>e.type==='priceIndexUpdated');
 if(price?.type==='priceIndexUpdated'){
  const properties=structuredClone(before.economy!.properties);
  for(const e of events){if(e===price)break;if(e.type==='g4PropertyChanged')Object.assign(properties.find(p=>p.id===e.property.id)!,e.property);}
  const amounts=before.players.filter(p=>!before.finance!.eliminated.includes(p.id)).map(p=>{
   const balance=before.economy!.balances[p.id];let wealth=(balance.cash+balance.bank-before.news!.business!.loans[p.id])|0;
   for(const k of before.g6!.stocks)wealth=Math.trunc(Math.fround(wealth)+Math.fround(k.price/100)*before.g6!.holdings[p.id][k.id].quantity)|0;
   for(const q of properties.filter(q=>q.ownerId===p.id)){const d=PROPERTY_CATALOG.properties.find(d=>d.id===q.id)!;wealth=(wealth+(q.basePrice??d.basePrice)+d.upgradeCost*(d.kind==='land'&&q.buildingType?1:q.level))|0;}
   return wealth;
  });
  assert.deepEqual(price.receipt.rows.map(r=>r.wealth),amounts);const total=amounts.reduce((sum,v)=>(sum+v)|0,0),average=Math.trunc(total/amounts.length),next=Math.max(before.calendar!.business!.priceIndex,Math.trunc(average/before.calendar!.business!.initialFunds));
  assert.equal(price.receipt.total,total);assert.equal(price.receipt.average,average);assert.equal(after.calendar!.business!.priceIndex,next);
  for(const type of ['calendarFestival','companyDividends','lotteryDrawn','monthlyInterest','loanNotice','insuranceClock']){const idx=events.findIndex(e=>e.type===type);if(idx>=0)assert.ok(events.indexOf(price)<idx);}
  checks.push('daily signed wealth/float32 holdings/raw buildings; alive denominator; monotone index before settlement');
 }
 for(const e of events){
  if(e.type==='calendarFestival'){
   const r=e.receipt;assert.equal(r.date,after.calendar!.date);
   if(r.name==='圣诞节'){assert.equal(r.date.slice(5),'12-25');assert.deepEqual(r.gifts.map(g=>g.playerId),before.players.filter(p=>!before.finance!.eliminated.includes(p.id)).map(p=>p.id));for(const g of r.gifts){if(!g.itemId||after.finance!.eliminated.includes(g.playerId))continue;assert.equal(after.effects!.inventory[g.playerId][g.itemId],before.effects!.inventory[g.playerId][g.itemId]+1-(g.discarded===g.itemId?1:0));}checks.push('Christmas actual ordered gifts enter inventory, no status filter');}
   else{assert.equal(r.date.slice(5),'01-01');assert.deepEqual(r.gifts,[]);checks.push('New Year presentation has no gift; normal monthly interest remains');}
  }
  if(e.type==='insurancePolicy'){const r=e.receipt;assert.equal(r.base,r.playerId===r.ownerId?0:r.draw*1000*before.calendar!.business!.priceIndex);checks.push('premium applies current index once before god/reaction/payment');}
  if(e.type==='companyService'){const r=e.receipt;if(r.companyId==='japan:company:2'&&r.ownerId&&r.ownerId!==r.visitorId){assert.equal(r.base,700*r.factor*r.dice*before.calendar!.business!.priceIndex);checks.push('Toyota price-index fee');}if(r.companyId==='japan:company:5'&&r.ownerId&&r.ownerId!==r.visitorId){assert.equal(r.base,150*r.days);checks.push('SEGA elapsed-day fee is unindexed');}}
  if(e.type==='lotteryBought'){assert.equal(e.cost,1000);checks.push('lottery cash ticket remains fixed 1000');}
 }
 if(events.some(e=>e.type==='companyDividends'))checks.push(...verifyDividends(before,after,events));
 return checks;
}
