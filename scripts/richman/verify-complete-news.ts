import assert from 'node:assert/strict';
import type {GameState,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
export function verifyCompleteNews(before:GameState,after:GameState,event:GameEvent,events:GameEvent[]=[]){
 if(event.type==='loanChanged'){
  const old=before.news!.business!.loans[event.targetId],debt=after.news!.business!.loans[event.targetId],b=before.economy!.balances[event.targetId],a=after.economy!.balances[event.targetId];
  assert.equal(debt,event.operation==='borrow'?old+event.amount:event.operation==='repay'?old-event.amount:0);
  if(event.operation==='borrow'){assert.equal(a.bank-b.bank,event.amount);assert.equal(a.cash,b.cash);}else if(event.operation==='repay'){const fromBank=Math.min(b.bank,event.amount);assert.equal(a.bank,b.bank-fromBank);assert.equal(a.cash,b.cash-event.amount+fromBank);}
  return `loan:${event.operation}: bank/cash and debt independently checked`;
 }
 if(event.type!=='newsResolved'||!event.completeChanges)return null;
 // A single landing command may settle a god before news. Account for explicit preceding notices.
 before=structuredClone(before);
 for(const prior of events){if(prior===event)break;if(prior.type!=='g6Notice')continue;
  const gift=/^大财神赠送现金(\d+)元/.exec(prior.message);if(gift)before.economy!.balances[prior.playerId].cash+=Number(gift[1]);
  const transfer=/^神仙结算：玩家(\d+)支付(\d+)元(?:给玩家(\d+))?/.exec(prior.message);
  if(transfer){const from='player-'+transfer[1],amount=Number(transfer[2]),b=before.economy!.balances[from],cash=Math.min(amount,b.cash);b.cash-=cash;b.bank-=amount-cash;if(transfer[3]){const to='player-'+transfer[3];before.economy!.balances[to][from===prior.playerId?'bank':'cash']+=amount;}}
 }
 const c=event.completeChanges,id=event.newsId,defs=PROPERTY_CATALOG.properties;
 if(c.properties){
  assert.ok(c.candidates!.includes(c.targetId!));const d=defs.find(d=>d.id===c.targetId)!;
  if(id===14||id===18)assert.deepEqual(c.properties.map(p=>p.before.id),defs.filter(x=>d.kind==='land'?x.kind==='land'&&x.name===d.name:x.id===d.id).map(x=>x.id));
  if(id===19||id===21)assert.equal(c.properties.length,1);
  if(id===4)assert.ok(before.economy!.properties.find(p=>p.id===d.id)!.level>0);
  for(const x of c.properties){const d=defs.find(d=>d.id===x.before.id)!,p=before.economy!.properties.find(p=>p.id===d.id)!,q=after.economy!.properties.find(p=>p.id===d.id)!;assert.deepEqual(x.before,p);assert.deepEqual(x.after,q);assert.equal(q.ownerId,id===4||id===19?null:p.ownerId);assert.equal(q.level,id===14?p.level:id===4||id===19?0:d.kind==='land'&&p.buildingType?0:Math.max(0,p.level-1));assert.equal(q.basePrice,id===14?Math.floor((p.basePrice??d.basePrice)*7/10)&65535:p.basePrice);assert.equal(q.priceStatus,p.priceStatus);}
  for(const p of before.economy!.properties)if(!c.properties.some(x=>x.before.id===p.id))assert.deepEqual(after.economy!.properties.find(q=>q.id===p.id),p);
  assert.deepEqual(after.economy!.balances,before.economy!.balances);assert.deepEqual(after.roadTools!.blocks,before.roadTools!.blocks);
 }
 if(id===10){const counts=before.players.filter(p=>!before.finance!.eliminated.includes(p.id)).map(p=>({playerId:p.id,count:Object.values(before.g6!.holdings[p.id]).reduce((v,h)=>v+h.quantity,0)}));assert.deepEqual(c.counts,counts);const winner=counts.reduce((a,b)=>b.count>a.count?b:a).playerId;for(const p of before.players){assert.equal(after.economy!.balances[p.id].cash-before.economy!.balances[p.id].cash,p.id===winner?10000:0);assert.equal(after.economy!.balances[p.id].bank,before.economy!.balances[p.id].bank);}}
 if(id===13){let receipt=0;for(const t of c.taxes!){const base=before.g6!.stocks.reduce((v,k)=>v+k.price*before.g6!.holdings[t.playerId][k.id].quantity,0);assert.equal(t.baseCents,base);assert.equal(t.due,Math.floor(base/2000));const b=before.economy!.balances[t.playerId];assert.equal(t.cash,Math.min(b.cash,t.due));assert.equal(t.bank,Math.min(b.bank,t.due-t.cash));assert.equal(t.unpaid,t.due-t.cash-t.bank);receipt+=t.cash+t.bank;}assert.equal(after.news!.publicFund-before.news!.publicFund,receipt);}
 if(id===22)for(const p of before.players)assert.equal(after.news!.business!.noLoans[p.id],before.finance!.eliminated.includes(p.id)?before.news!.business!.noLoans[p.id]:15);
 if(id===26)assert.equal(after.news!.business!.marketClosed,10);
 if(id===27||id===28){const stockId=c.targetId!;assert.deepEqual(c.candidates,before.g6!.stocks.filter(k=>id===27||before.news!.business!.halted[k.id]>0).map(k=>k.id));assert.equal(after.news!.business!.halted[stockId],id===27?15:0);const k=after.g6!.stocks.find(k=>k.id===stockId)!,old=before.g6!.stocks.find(k=>k.id===stockId)!;assert.equal(k.price,id===27?old.base:old.price);assert.equal(k.trend,old.trend);assert.equal(k.remaining,old.remaining);}
 if(c.company){const old=c.company.before,n=c.company.after;assert.deepEqual(old,before.news!.business!.companies.find(c=>c.id===old.id));assert.deepEqual(n,after.news!.business!.companies.find(c=>c.id===old.id));assert.equal(n.ownerId,old.ownerId);assert.deepEqual(n.ranking,old.ranking);
  if(id!==29){const delta=id===31?20000:id===32?-20000:id===34?-5000:-10000;assert.equal(n.funds,id===35?(old.funds*2)|0:(old.funds+delta)|0);assert.equal(n.cumulative,(old.cumulative+(id===35?n.funds:delta))|0);assert.deepEqual(after.economy!.balances,before.economy!.balances);const k=after.g6!.stocks.find(k=>k.id===n.stockId)!,code=id===35?(Math.floor(old.funds/10000)<<4)&255:id===31?48:id===32?4:3;assert.equal(k.remaining,code&240?code>>>4:code&15);assert.equal(k.trend,code&240?'red':code&15?'black':null);}
 }
 if(c.prosecution){assert.equal(c.prosecution.originalId,c.company!.before.ownerId);if(c.prosecution.targetId){const id=c.prosecution.targetId,p=c.players!.find(p=>p.playerId===id)!;assert.deepEqual(p.after,after.g2!.players[id]);assert.equal(p.after.prison,p.before.prison?((p.before.prison+5)&127):5);}else assert.ok(c.prosecution.absolved);assert.equal(after.phase,'news');}
 return `news${id}: actual before/after targets, field arithmetic, payments and isolation independently checked`;
}
