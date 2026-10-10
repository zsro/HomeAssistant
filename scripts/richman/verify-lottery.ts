import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
/** Source-rule accounting against actual pre/post states, without lottery handlers. */
export function verifyLottery(before:GameState,after:GameState,events:readonly GameEvent[]){
 const checks:string[]=[];const a=before.lottery!,b=after.lottery!;
 for(const event of events){
  if(event.type==='lotteryOffered'){assert.ok([28,88].includes(event.decision.node));assert.equal(after.players[after.active].node,event.decision.node);assert.equal(after.g2!.players[after.players[after.active].id].dream,0);checks.push('actual Japan lottery landing');}
  if(event.type==='lotteryBought'){
   const id=event.buyerId,n=event.number;assert.equal(before.pending?.kind,'lottery');assert.equal(a.tickets[n-1],null);const expected=[...a.tickets];expected[n-1]=id;assert.deepEqual(b.tickets,expected);
   assert.equal(event.cost,1000);assert.equal(after.economy!.balances[id].cash,before.economy!.balances[id].cash-1000);assert.equal(after.economy!.balances[id].bank,before.economy!.balances[id].bank);assert.equal(after.news!.publicFund,before.news!.publicFund+1000);assert.equal(event.fund,after.news!.publicFund);assert.equal(event.cash,after.economy!.balances[id].cash);assert.equal(after.randomState,before.randomState);assert.equal(after.phase,'turnEnd');assert.equal(after.pending,null);checks.push('one unique number; fixed cash1000 into shared fund; no RNG/bank');
  }
  if(event.type==='lotteryDrawn'){
   const r=event.result,sold=a.tickets.flatMap((owner,i)=>owner?[i+1]:[]),restricted=before.players.some(p=>a.tickets.filter(owner=>owner===p.id).length>10);
   assert.ok(events.some(e=>e.type==='dateAdvanced'));assert.equal(r.date,after.calendar!.date);assert.equal(r.date.slice(-3),'-15');assert.equal(r.sold,sold.length);assert.equal(r.restricted,restricted);const candidates=sold.length?(restricted?sold:Array.from({length:36},(_,i)=>i+1)):[];assert.deepEqual(r.candidates,candidates);
   assert.equal(r.fundBefore,before.news!.publicFund);
   if(!sold.length){assert.equal(r.number,null);assert.equal(r.winnerId,null);assert.equal(r.amount,0);assert.deepEqual(a.tickets,b.tickets);checks.push('empty pool skips draw');}
   else {assert.ok(candidates.includes(r.number!));assert.equal(r.winnerId,a.tickets[r.number!-1]);
    if(r.winnerId){const id=r.winnerId;assert.equal(r.amount,r.fundBefore);assert.equal(r.fundAfter,0);assert.equal(after.economy!.balances[id].cash,before.economy!.balances[id].cash+r.amount);assert.equal(after.economy!.balances[id].bank,before.economy!.balances[id].bank);assert.deepEqual(b.tickets,Array(36).fill(null));checks.push('winner gets complete shared fund in cash, all tickets cleared');}
    else{assert.equal(r.amount,0);assert.equal(r.fundAfter,r.fundBefore);assert.deepEqual(b.tickets,a.tickets);assert.deepEqual(after.economy!.balances,before.economy!.balances);checks.push('unsold result carries tickets and entire fund');}}
   assert.equal(after.news!.publicFund,r.fundAfter);assert.deepEqual(b.lastDraw,r);
  }
  if(event.type==='lotteryReleased'){for(const n of event.numbers){assert.equal(a.tickets[n-1],event.ownerId);assert.equal(b.tickets[n-1],null);}checks.push('bankrupt holder tickets cleared');}
 }
 for(const owner of b.tickets)if(owner){assert.ok(after.players.some(p=>p.id===owner));assert.ok(!after.finance!.eliminated.includes(owner));}
 return checks;
}
