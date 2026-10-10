import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {verifyDividends} from './verify-dividends';
/** Independent actual pre/post fee and company ledger accounting, without service handlers. */
export function verifyCompany(before:GameState,after:GameState,events:readonly GameEvent[]){
 const checks=verifyDividends(before,after,events);
 for(const ev of events){if(ev.type!=='companyService')continue;
  const r=ev.receipt,c=before.news!.business!.companies.find(c=>c.id===r.companyId)!;assert.ok(c);assert.ok(c.nodeIds.includes(r.node));assert.ok(['japan:company:2','japan:company:5'].includes(c.id));assert.equal(after.players[after.active].node,r.node);assert.equal(r.visitorId,after.players[after.active].id);assert.equal(r.ownerId,c.ownerId);
  const m=before.g2!.players[r.visitorId],engineer=before.g5!.engineers[r.visitorId],factor=engineer&&!engineer.suspended?4:m.vehicle==='tool:06'?2:m.vehicle==='tool:05'?1:0,days=before.calendar!.elapsedDays;
  const base=!c.ownerId||c.ownerId===r.visitorId?0:c.id==='japan:company:2'?700*factor*before.dice:150*days;
  assert.equal(r.base,base);assert.equal(r.factor,factor);assert.equal(r.days,days);assert.equal(r.dice,before.dice);
  // These accepted routes can attach angels/demons here, but never a money-changing god.
  assert.ok(!events.some(e=>e.type==='g6Notice'&&/神仙结算|大财神赠送/.test(e.message)),'A simultaneous god cash transfer needs separate accounting before applying this verifier');
  const god=after.g6!.gods.find(g=>g.carrier===r.visitorId)?.type??before.g6!.gods.find(g=>g.carrier===r.visitorId)?.type;
  const amount=god===1?Math.floor(base/2):god===2?0:god===5?base+Math.floor(base/2):god===6?base*2:base;
  assert.equal(r.amount,amount);assert.equal(r.free,events.some(e=>e.type==='effectConsumed'&&e.itemId==='card:20'));
  let payer=r.visitorId;const reaction=events.find(e=>e.type==='reactionAnswered'&&e.stage==='redirect'&&e.choice==='use');if(reaction?.type==='reactionAnswered')payer=reaction.targetId!;
  assert.equal(r.redirected,payer!==r.visitorId);
  const substitute=amount&&!r.free?before.players.find(p=>p.id!==payer&&!before.finance!.eliminated.includes(p.id)&&[14,15].includes((after.g6!.gods.find(g=>g.carrier===p.id)??before.g6!.gods.find(g=>g.carrier===p.id))?.type??0)):undefined;
  assert.equal(r.godPayer,!!substitute);payer=substitute?.id??payer;assert.equal(r.payerId,payer);
  const balance=before.economy!.balances[payer],due=r.free?0:amount,cash=Math.min(balance.cash,due),bank=Math.min(balance.bank,due-cash),paid=cash+bank;
  assert.equal(r.cash,cash);assert.equal(r.bank,bank);assert.equal(r.paid,paid);assert.equal(r.unpaid,due-paid);assert.equal(r.bankrupt,due>paid);
  const expected=structuredClone(before.economy!.balances);expected[payer].cash-=cash;expected[payer].bank-=bank;assert.deepEqual(after.economy!.balances,expected);
  const now=after.news!.business!.companies.find(x=>x.id===c.id)!;assert.equal(now.funds,(c.funds+paid)|0);assert.equal(now.cumulative,(c.cumulative+paid)|0);assert.equal(r.fundsBefore,c.funds);assert.equal(r.fundsAfter,now.funds);assert.equal(r.cumulativeBefore,c.cumulative);assert.equal(r.cumulativeAfter,now.cumulative);assert.equal(after.news!.publicFund,before.news!.publicFund);assert.deepEqual(after.news!.business!.service,r);
  if(paid)checks.push(c.id==='japan:company:2'?'Toyota actual vehicle/dice fee cash-bank into company':'SEGA actual elapsed-days fee cash-bank into company');else checks.push('zero/unowned/owner/god waiver produces no company income');
 }
 return checks;
}
