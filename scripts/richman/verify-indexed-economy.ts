import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {verifyDateBusiness} from './verify-date-business';
/** Independent pre-command accounting, including full real browser replays. */
export function verifyIndexedEconomy(before:GameState,after:GameState,events:GameEvent[]){
 const checks=verifyDateBusiness(before,after,events),index=before.calendar!.business!.priceIndex;
 const god=(id:string,n:number)=>{const type=before.g6!.gods.find(g=>g.carrier===id)?.type;return type===1?Math.floor(n/2):type===2?0:type===5?n+Math.floor(n/2):type===6?n*2:n;};
 for(const e of events){
  if(e.type==='propertySettled'){
   const p=before.economy!.properties.find(p=>p.id===e.propertyId)!,d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!,id=e.payerId??before.players[before.active].id,b=before.economy!.balances[id],a=after.economy!.balances[id];
   const expected=e.operation==='buy'?((p.basePrice??d.basePrice)+(d.kind==='facility'?0:p.level*d.upgradeCost))*index:e.operation==='upgrade'?(d.kind==='facility'&&p.level===0?p.basePrice??d.basePrice:d.upgradeCost)*index:before.pending?.kind==='property'?before.pending.amount:NaN;
   assert.equal(e.amount,expected);assert.equal(e.paid.cash,Math.min(b.cash,e.amount));assert.equal(e.paid.bank,e.amount-e.paid.cash);
   const claim=events.reduce((n,c)=>n+(c.type==='insuranceClaim'&&c.receipt.playerId===id?c.receipt.amount:0),0);
   assert.equal(a.cash,b.cash-e.paid.cash+claim);assert.equal(a.bank,b.bank-e.paid.bank);
   if(e.recipientId)assert.equal(after.economy!.balances[e.recipientId].bank,before.economy!.balances[e.recipientId].bank+e.amount);
   assert.equal(after.economy!.properties.find(q=>q.id===p.id)!.basePrice,p.basePrice);
   checks.push(`property ${e.operation}: quote, debit, recipient and raw fields at index ${index}`);
  }
  if(e.type==='propertyOffered'&&e.decision.operation==='rent'){
   const decision=e.decision,p=after.economy!.properties.find(p=>p.id===decision.propertyId)!,d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!,actor=after.players[after.active].id;
   if(d.kind==='land'&&(!decision.payerId||decision.payerId===actor)){
    const raw=PROPERTY_CATALOG.properties.filter(t=>t.kind==='land').reduce((n,t)=>{const q=after.economy!.properties.find(p=>p.id===t.id)!;return n+(q.ownerId===p.ownerId&&(p.buildingType===1?q.buildingType===1:q.buildingType!==1&&t.name===d.name)?(p.buildingType===1?2000:t.rents[q.level])*(p.priceStatus?2:1):0);},0);
    assert.equal(decision.amount,god(actor,raw*index));checks.push(`rent aggregate and god order at index ${index}`);
   }
  }
  if(e.type==='fortuneResolved'&&e.change.amount){
   const bases:Record<number,number>={2:10000,14:-3000,15:-3000,16:-3000,17:-6000,18:-600,19:-1500,20:1000,21:2000,22:3000,23:-1000,24:-2000,25:10000,26:-8000,27:4000,28:6000,29:8000,30:-5000,31:5000};
   if(e.fortuneId in bases){assert.equal(e.change.amount,bases[e.fortuneId]*index*(e.change.code===2?2:1));checks.push(`fortune ${e.fortuneId}: indexed fixed cash at index ${index}`);}
  }
  if(e.type==='newsResolved'){
   const taxes=e.operatingChanges?.taxes??e.completeChanges?.taxes;
   for(const t of taxes??[]){let base=0;if(e.newsId===12){for(const p of before.economy!.properties.filter(p=>p.ownerId===t.playerId)){const d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!;base+=(p.basePrice??d.basePrice)+p.level*d.upgradeCost;}}else{for(const k of before.g6!.stocks){const q=before.g6!.holdings[t.playerId][k.id].quantity;if(q)base=Math.fround(base+Math.fround(k.price/100)*q);}}
    assert.equal(t.due,Math.trunc(base*0.05)*index);assert.equal(t.cash,Math.min(before.economy!.balances[t.playerId].cash,t.due));assert.equal(t.bank,Math.min(before.economy!.balances[t.playerId].bank,t.due-t.cash));checks.push(`news ${e.newsId}: raw tax base truncates before index ${index}`);
   }
  }
 }
 return checks;
}
