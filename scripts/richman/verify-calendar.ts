import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
/** Independent UTC arithmetic for recorded 1998/2000 routes; no production calendar/bank handlers. */
const epoch=(d:string)=>Date.parse(d+'T00:00:00Z');
const plus=(d:string,n:number)=>new Date(epoch(d)+n*86400000).toISOString().slice(0,10);
const fixed=['01-01','01-02','01-03','01-15','02-11','03-22','04-29','05-03','05-05','09-15','09-23','10-10','11-03','11-23','12-23'];
const closed=(d:string)=>new Date(epoch(d)).getUTCDay()===0?'周日休市':fixed.includes(d.slice(5))?'日本固定节日休市':'';
export function verifyCalendar(before:GameState,after:GameState,events:readonly GameEvent[]){
 const a=before.calendar!,b=after.calendar!,advanced=events.filter(e=>e.type==='dateAdvanced'),interest=events.filter(e=>e.type==='monthlyInterest'),notices=events.filter(e=>e.type==='loanNotice');
 assert.equal(advanced.length,Number(a.date!==b.date));assert.equal(b.date,advanced.length?plus(a.date,1):a.date);assert.equal(b.elapsedDays,a.elapsedDays+advanced.length);
 const checks:string[]=[];
 for(const e of advanced){assert.equal(e.from,a.date);assert.equal(e.date,b.date);assert.equal(e.closed,closed(b.date));assert.ok(after.active<=before.active);checks.push('one calendar day at solvent seat wrap');}
 assert.equal(interest.length,Number(!!advanced.length&&b.date.endsWith('-01')));
 const balances=structuredClone(before.economy!.balances);
 for(const e of interest){assert.deepEqual(e.rows.map(r=>r.playerId),before.players.filter(p=>!before.finance!.eliminated.includes(p.id)).map(p=>p.id));for(const row of e.rows){const id=row.playerId,debt=before.news!.business!.loans[id];assert.equal(row.before,balances[id].bank);assert.equal(row.debt,debt);assert.equal(row.after,debt?row.before:Math.trunc(row.before*1.1));assert.equal(row.amount,row.after-row.before);balances[id].bank=row.after;}assert.equal(e.date,b.date);checks.push('monthly interest all solvent seats, debt gate and integer truncation');}
 for(const e of notices){const n=e.notice,id=n.playerId;assert.equal(id,after.players[after.active].id);assert.equal(n.date,b.date);assert.equal(n.due,a.due[id]);assert.equal(n.days,(epoch(n.due)-epoch(n.date))/86400000);assert.equal(n.principal,before.news!.business!.loans[id]);assert.ok(n.days>=0&&n.days<=3);if(n.kind==='collected'){assert.equal(n.days,0);assert.equal(n.bank,Math.min(n.principal,balances[id].bank));assert.equal(n.cash,Math.min(n.principal-n.bank,balances[id].cash));assert.equal(n.unpaid,n.principal-n.bank-n.cash);balances[id].bank-=n.bank;balances[id].cash-=n.cash;assert.equal(after.news!.business!.loans[id],0);assert.equal(b.due[id],null);checks.push('maturity bank-first then cash; clear principal and due');}else{assert.ok(n.days>0);assert.equal(n.bank+n.cash+n.unpaid,0);checks.push('non-paying reminder at3/2/1 calendar days');}}
 if(advanced.length||notices.length){assert.deepEqual(after.economy!.balances,balances);assert.equal(before.news!.publicFund,after.news!.publicFund);}
 for(const p of after.players){const id=p.id,debt=after.news!.business!.loans[id];if(!debt||after.finance!.eliminated.includes(id))assert.equal(b.due[id],null);else if(a.due[id])assert.equal(b.due[id],a.due[id]);else{let expected=plus(b.date,90);while(closed(expected))expected=plus(expected,1);assert.equal(b.due[id],expected);checks.push('first positive debt+90 with fixed closure roll');}}
 for(const e of events) if(e.type==='stockTraded'&&!e.forced){assert.equal(closed(b.date),'');checks.push('actual trade occurs on open day');assert.ok(e.quantity>0);}
 if(advanced.length&&closed(b.date)){for(let i=0;i<before.g6!.stocks.length;i++){assert.equal(after.g6!.stocks[i].price,before.g6!.stocks[i].price);assert.deepEqual(after.g6!.stocks[i].history,before.g6!.stocks[i].history);}checks.push('closed day preserves every price and history');}
 return checks;
}
