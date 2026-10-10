import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
/** Independent arithmetic on an actual replay transition, not a call to the fortune handler. */
export function verifyFortune(before:GameState,after:GameState,events:readonly GameEvent[]) {
 const e=events.find(e=>e.type==='fortuneResolved');if(!e||e.type!=='fortuneResolved')return null;
 const c=e.change,id=e.playerId,b=after.economy!.balances[id];
 assert.equal(b.cash,c.cashAfter);assert.equal(b.bank,c.bankAfter);assert.equal(after.items!.points[id],c.pointsAfter);
 assert.equal(e.cursor,after.fortune!.cursor);assert.equal(e.publicFund,after.news!.publicFund);
 const base=[-6000,-600,-1500,1000,2000,3000,-1000,-2000,10000,-8000,4000,6000,8000,-5000,5000,0][e.fortuneId-17];
 assert.notEqual(base,undefined);assert.equal(c.amount,c.code===1?0:base*(c.code===2?2:1));
 if(e.fortuneId!==32){
  const paid=Math.max(0,-c.amount),cash=Math.min(c.cashBefore,paid),bank=Math.min(c.bankBefore,paid-cash);
  assert.equal(c.cashAfter,c.cashBefore+(c.amount>0?c.amount:-cash));assert.equal(c.bankAfter,c.bankBefore-bank);
  assert.equal(c.unpaid,paid-cash-bank);assert.equal(c.bankrupt,c.unpaid>0);
  assert.equal(after.news!.publicFund-before.news!.publicFund,cash+bank);
 }else if(c.code!==1){
  assert.equal(c.vehicleAfter,'foot');assert.equal(after.g2!.players[id].diceCount,1);assert.deepEqual(after.g3!.slots[id],[]);
  const points=c.sold.reduce((v,x)=>v+x.count*x.price,0);assert.equal(c.pointsAfter,(c.pointsBefore+points)&65535);
  for(const x of c.sold){assert.equal(after.effects!.inventory[id][x.itemId],0);if(x.itemId.startsWith('tool:'))assert.equal(x.price,[0,15,30,25,25,80,150,100,30,30,40,95,150,250][Number(x.itemId.slice(5))]);}
  assert.equal(c.cashAfter,c.cashBefore);assert.equal(c.bankAfter,c.bankBefore);
 }
 // God attachment can have its own prior money/card effect on the same landing.
 if(!events.some(e=>e.type==='g6Notice')){
  assert.deepEqual(before.economy!.balances[id],{cash:c.cashBefore,bank:c.bankBefore});assert.equal(before.items!.points[id],c.pointsBefore);
  if(e.fortuneId===32&&c.code!==1)for(const sale of c.sold)assert.equal(sale.count,(before.effects!.inventory[id][sale.itemId]??0)+(c.vehicleBefore===sale.itemId?1:0));
 }
 return {fortuneId:e.fortuneId,code:c.code,godType:c.godType,amount:c.amount,points:c.pointsAfter-c.pointsBefore,sold:c.sold,checked:'actual replay transition, independently checked amount/payment/public fund/inventory arithmetic'};
}
