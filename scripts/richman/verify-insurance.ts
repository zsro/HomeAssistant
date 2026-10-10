import {verifyDividends} from './verify-dividends';
/** Independent settlement arithmetic on actual browser commands; never manufactures browser evidence. */
import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
export function verifyInsurance(before:GameState,after:GameState,events:GameEvent[]){
 const checks=verifyDividends(before,after,events);
 for(const e of events){
  if(e.type==='insurancePolicy'){
   const r=e.receipt,term=before.news!.business!.insurance!.terms[r.playerId];
   assert.ok([3,5,10,15,20,30].includes(r.draw));assert.equal(r.before,term);assert.equal(r.after,(term+r.draw)%128);assert.equal(r.base,r.ownerId===r.playerId?0:r.draw*1000);
   assert.equal(after.news!.business!.insurance!.terms[r.playerId],after.finance!.eliminated.includes(r.playerId)?0:r.after);assert.notEqual(before.randomState,after.randomState);checks.push('policy: term modulo128, original wheel set, owner-free/1000-per-unit, grant-before-charge');
  }
  if(e.type==='insuranceClock'){
   assert.equal(e.playerId,after.players[after.active].id);assert.equal(e.before,before.news!.business!.insurance!.terms[e.playerId]);assert.equal(e.after,e.before>=128?0:e.before===1?128:Math.max(0,e.before-1));checks.push('clock: own incoming action, final128 coverage');
  }
  if(e.type==='companyService'&&e.receipt.companyId==='japan:company:4'){
   const r=e.receipt,policy=after.news!.business!.insurance!.policy!;
   assert.equal(r.base,policy.base);assert.equal(r.visitorId,policy.playerId);
   const god=before.g6!.gods.find(g=>g.carrier===r.visitorId)?.type;
   const amount=god===1?Math.floor(r.base/2):god===2?0:god===5?r.base+Math.floor(r.base/2):god===6?r.base*2:r.base;
   assert.equal(r.amount,amount);const free=events.some(e=>e.type==='effectConsumed'&&e.itemId==='card:20');assert.equal(r.free,free);
   const reaction=events.find(e=>e.type==='reactionAnswered'&&e.stage==='redirect'&&e.choice==='use');let payer=reaction?.type==='reactionAnswered'?reaction.targetId!:r.visitorId;
   assert.equal(r.redirected,payer!==r.visitorId);
   const sponsor=amount&&!free?before.players.find(p=>p.id!==payer&&!before.finance!.eliminated.includes(p.id)&&[14,15].includes(before.g6!.gods.find(g=>g.carrier===p.id)?.type??0)):undefined;
   assert.equal(r.godPayer,!!sponsor);payer=sponsor?.id??payer;assert.equal(r.payerId,payer);
   const b=before.economy!.balances[payer],due=free?0:amount,cash=Math.min(b.cash,due),bank=Math.min(b.bank,due-cash);
   assert.equal(r.cash,cash);assert.equal(r.bank,bank);assert.equal(r.paid,cash+bank);assert.equal(r.unpaid,due-cash-bank);
   assert.deepEqual(after.economy!.balances[payer],{cash:b.cash-cash,bank:b.bank-bank});assert.equal(after.news!.publicFund,before.news!.publicFund);checks.push('premium: independent god/reaction/sponsor and actual cash-bank accounting');
  }
  if(e.type==='insuranceClaim'){
   const r=e.receipt;assert.ok(r.term>0);assert.ok(!after.finance!.eliminated.includes(r.playerId));assert.equal(r.cashAfter-r.cashBefore,r.amount);assert.equal(r.fundsAfter,(r.fundsBefore-r.amount)|0);assert.equal(r.cumulativeAfter,(r.cumulativeBefore-r.amount)|0);
   let expected:number;
   if(r.reason==='住院'||r.reason==='监禁'){const key=r.reason==='住院'?'hospital':'prison';expected=((after.g2!.players[r.playerId][key]-(before.g2!.players[r.playerId][key]&127))&127)*2000;}
   else if(r.reason==='出国观光'||r.reason==='外星人绑架'){assert.equal(before.g2!.players[r.playerId].travel,0);expected=(after.g2!.players[r.playerId].travel!&63)*2000;}
   else if(r.reason==='住宿'){assert.equal(before.pending?.kind,'property');expected=before.pending?.kind==='property'?before.pending.hotelTurns!*2000:NaN;}
   else if(r.reason==='冒贷')expected=after.news!.business!.loans[r.playerId]-before.news!.business!.loans[r.playerId];
   else {const f=events.find(e=>e.type==='fortuneResolved');assert.ok(f?.type==='fortuneResolved');expected=-f.change.amount;assert.equal(f.change.bankrupt,false);}
   assert.equal(r.amount,expected);if(events.filter(e=>e.type==='insuranceClaim'&&e.receipt.playerId===r.playerId).at(-1)===e)assert.equal(after.economy!.balances[r.playerId].cash,r.cashAfter);checks.push('claim: independently derived loss/duration, cash credit, company signed debit');
  }
 }
 const claims=events.filter(e=>e.type==='insuranceClaim'),fees=events.filter(e=>e.type==='companyService').filter(e=>e.receipt.companyId==='japan:company:4');
 if(claims.length||fees.length){const prior=before.news!.business!.companies[3],next=after.news!.business!.companies[3];const net=fees.reduce((n,e)=>n+e.receipt.paid,0)-claims.reduce((n,e)=>n+e.receipt.amount,0);assert.equal(next.funds,(prior.funds+net)|0);assert.equal(next.cumulative,(prior.cumulative+net)|0);checks.push('ledger: actual premiums minus claims = period and cumulative delta');}
 for(const e of events)if(e.type==='companyDividends'){
  const c=e.settlement.companies.find(c=>c.companyId==='japan:company:4')!;let distributed=0;
  for(const a of c.allocations){const expected=c.shares?Math.trunc(c.funds*Math.fround(a.quantity/c.shares)):0;assert.equal(a.amount,expected);distributed+=a.amount;}
  assert.equal(c.after,c.shares?0:c.funds);checks.push(`dividend: actual holder denominator/float32 ratio/truncation, ${c.funds<0?'negative':'nonnegative'} earnings, distributed ${distributed}`);
 }
 return checks;
}
