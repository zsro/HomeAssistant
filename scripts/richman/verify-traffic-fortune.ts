import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {verifyAssetFortune} from './verify-asset-fortune';
export function verifyTrafficFortune(before:GameState,after:GameState,events:readonly GameEvent[]){
 const e=events.find(e=>e.type==='fortuneResolved');if(!e||e.type!=='fortuneResolved')return {checks:[] as string[]};
 if(!e.change.traffic)return verifyAssetFortune(before,after,events);
 const c=e.change,t=c.traffic!,checks:string[]=[],id=e.playerId,b=after.economy!.balances[id];
 assert.equal(c.cashAfter,b.cash);assert.equal(c.bankAfter,b.bank);assert.ok([10,11,12,13,14,15,16,41,42,43,44].includes(e.fortuneId));
 if(t.slot>=33)assert.equal(e.fortuneId,t.slot+8);
 if(c.code===1){assert.equal(t.targetId,null);assert.equal(c.amount,0);checks.push('god cancellation');}
 else if(t.kind==='fine'){
  const due=3000*(c.code===2?2:1),cash=Math.min(c.cashBefore,due),bank=Math.min(c.bankBefore,due-cash);
  assert.equal(c.amount,-due);assert.equal(c.cashAfter,c.cashBefore-cash);assert.equal(c.bankAfter,c.bankBefore-bank);assert.equal(c.unpaid,due-cash-bank);assert.equal(after.news!.publicFund-before.news!.publicFund,cash+bank);checks.push('fine arithmetic and actual public receipts');
 }else if(t.absolved){assert.equal(t.targetId,null);assert.ok(events.some(e=>e.type==='effectConsumed'&&e.itemId==='card:21'));checks.push('automatic absolution');}
 else{
  const p=t.player!;assert.ok(p);const target=t.targetId!,m=after.g2!.players[target];assert.deepEqual(m,p.after);assert.equal(after.players.find(x=>x.id===target)!.node,p.nodeAfter);
  if(t.kind==='loss'){assert.equal(m.vehicle,'foot');assert.equal(m.diceCount,1);assert.equal(p.nodeAfter,p.nodeBefore);assert.equal(after.g2!.supply[p.before.vehicle],before.g2!.supply[p.before.vehicle]+1);checks.push('equipped vehicle loss and pool return');}
  else {const base=e.fortuneId<14?3:3+(e.fortuneId-41)*2;assert.equal(t.turns,base*(c.code===2?2:1));assert.equal(m[t.kind],((p.before[t.kind]&127)+t.turns)&127);assert.equal(m[t.kind==='prison'?'hospital':'prison'],0);assert.equal(p.nodeAfter,t.kind==='hospital'?55:84);assert.ok(after.news!.detention![t.kind].includes(target));assert.ok(!after.news!.detention![t.kind==='hospital'?'prison':'hospital'].includes(target));assert.equal(after.g4!.hotel[target],0);
   const destroy=t.kind==='hospital'&&!p.before.prison&&!p.before.hospital&&!p.before.travel&&!before.g4!.hotel[target];assert.equal(m.vehicle,destroy?'foot':p.before.vehicle);if(destroy&&p.before.vehicle!=='foot')assert.equal(after.g2!.supply[p.before.vehicle],before.g2!.supply[p.before.vehicle]+1);checks.push('actual detention term, target, roster and vehicle retention');
  }
  assert.equal(c.cashAfter,c.cashBefore);assert.equal(c.bankAfter,c.bankBefore);assert.equal(after.news!.publicFund,before.news!.publicFund);
 }
 return {checks,fortuneId:e.fortuneId,traffic:t};
}
