import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {verifyFortune} from './verify-fortune';
/** Check actual command transitions with independent arithmetic and field assertions. */
export function verifyAssetFortune(before:GameState,after:GameState,events:readonly GameEvent[]){
 const e=events.find(e=>e.type==='fortuneResolved'),checks:string[]=[];
 for(const transfer of events.filter(e=>e.type==='inventoryTransferred')){
  const {sourceId,targetId,itemId,discarded}=transfer;
  assert.equal(after.effects!.inventory[sourceId][itemId],before.effects!.inventory[sourceId][itemId]-1);
  assert.equal(after.effects!.inventory[targetId][itemId],(before.effects!.inventory[targetId][itemId]??0)+1-(discarded===itemId?1:0));
  if(discarded&&discarded!==itemId)assert.equal(after.effects!.inventory[targetId][discarded],before.effects!.inventory[targetId][discarded]-1);
  assert.ok(after.g3!.slots[targetId].length<=15);checks.push('card transfer actual before/after');
 }
 if(!e||e.type!=='fortuneResolved')return {checks};
 const c=e.change,assets=c.assets,id=e.playerId;
 if(!assets){verifyFortune(before,after,events);return{checks,fortuneId:e.fortuneId};}
 const b=after.economy!.balances[id];assert.equal(c.cashAfter,b.cash);assert.equal(c.bankAfter,b.bank);
 if(assets.property){const p=assets.property,d=PROPERTY_CATALOG.properties.find(d=>d.id===p.before.id)!;
  assert.equal(d.kind,'land');assert.equal(p.before.ownerId,id);assert.deepEqual(before.economy!.properties.find(q=>q.id===d.id),p.before);assert.deepEqual(after.economy!.properties.find(q=>q.id===d.id),p.after);
  const compensation=e.fortuneId===0?p.before.level*d.upgradeCost:p.before.basePrice??d.basePrice;assert.equal(p.compensation,compensation);assert.equal(c.cashAfter-c.cashBefore,compensation);assert.equal(c.bankAfter,c.bankBefore);
  assert.equal(p.after.ownerId,e.fortuneId===0?id:null);assert.equal(p.after.level,0);assert.equal(p.after.basePrice,p.before.basePrice);assert.equal(p.after.priceStatus,p.before.priceStatus);
  assert.deepEqual(assets.candidates,PROPERTY_CATALOG.properties.filter(d=>d.kind==='land'&&before.economy!.properties.some(p=>p.id===d.id&&p.ownerId===id&&(e.fortuneId===0?p.level>0:p.level===0))).map(d=>d.id).sort((a,b)=>Number(a.split(':').at(-1))-Number(b.split(':').at(-1))));checks.push('ordinary targets and compensation fields independently verified');
 }
 if(assets.stocks){let total=0;
  for(const row of assets.stocks){const h=before.g6!.holdings[id][row.id],k=before.g6!.stocks.find(k=>k.id===row.id)!,newK=after.g6!.stocks.find(k=>k.id===row.id)!,q:number=e.fortuneId===8?Math.floor(h.quantity/10):h.quantity,amount=Math.floor(q*k.price/100);
   assert.equal(row.before,h.quantity);assert.equal(row.after,h.quantity-q);assert.equal(row.amount,amount);assert.equal(row.costAfter,row.after?Math.floor(h.cost*row.after/h.quantity):0);assert.equal(newK.pool,k.pool+q);assert.equal(newK.quota,k.quota+q);assert.equal(newK.price,k.price);assert.equal(after.g6!.holdings[id][row.id].quantity,row.after);total+=amount;
   const company=after.news!.business!.companies.find(c=>c.stockId===row.id);if(company){assert.equal(company.ownerId,row.ownerAfter);assert.equal(company.ownerId,company.ranking[0]??null);for(let i=1;i<company.ranking.length;i++)assert.ok(after.g6!.holdings[company.ranking[i-1]][row.id].quantity>=after.g6!.holdings[company.ranking[i]][row.id].quantity);}
  }
  assert.equal(c.cashAfter,c.cashBefore);assert.equal(c.bankAfter-c.bankBefore,e.fortuneId===9?total:0);assert.equal(after.news!.publicFund-before.news!.publicFund,e.fortuneId===8?total:0);assert.deepEqual(after.news!.business!.loans,before.news!.business!.loans);checks.push('stock quantity/value/pool/company and bank vs public independently verified');
 }
 if(assets.cards){assert.ok(assets.cards.length);assert.equal(c.cashAfter,c.cashBefore);assert.equal(c.bankAfter,c.bankBefore);assert.equal(after.pending?.kind,'fortune');assert.ok(after.pending?.kind==='fortune'&&!after.pending.collection);checks.push('multi-donor result finalized once; acknowledgement remains');}
 return {checks,fortuneId:e.fortuneId,assets};
}
