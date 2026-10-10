import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Holding} from '../../frontend/src/features/richman/game/g6-market';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import {JAPAN_STOCKS} from '../../frontend/src/features/richman/game/g6-catalog';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import {strict as assert} from 'node:assert';
const quote=(base:number,percent:number)=>{const target=base*(100+percent)/100,tick=target<500?1:target<1500?5:target<5000?10:target<15000?50:100;return Math.max(100,Math.min(999900,base+Math.trunc(base*percent/100/tick)*tick));};
export function verifyStockCircuit(r:Replay,kind:string){
 assert.equal(r.rulesId,'japan-events-candidate-v44');assert.equal(r.itemFingerprint,'f9dbb7e9');
 const e=new GameEngine(nodes,r.config),prefixes=new Map<string,number>(),news:number[]=[],fortune:number[]=[];
 let trades=0,subscriptions=0,subscriptionPaid=0,forcedBank=0,forcedPublic=0,dates=0,quoteDays=0,companyTrends=0,restored=0,research=0;
 const mark=(key:string,index:number)=>{if(!prefixes.has(key))prefixes.set(key,index);};
 for(let i=0;i<r.commands.length;i++){
  const c=r.commands[i],b=e.state,res=e.dispatch(c);assert.ok(res.ok);const s=e.state;
  const rewind=res.events.some(x=>x.type==='g7Notice'&&x.message.startsWith('时光机：'));
  if(rewind){const snapshot=b.g7!.checkpoints[c.playerId]!.world;
   assert.deepEqual(s.g6,snapshot.g6);assert.deepEqual(s.economy,snapshot.economy);assert.deepEqual(s.news,snapshot.news);assert.deepEqual(s.calendar,snapshot.calendar);assert.equal(s.randomState,b.randomState);
   assert.notDeepEqual(b.g6!.holdings,s.g6!.holdings);assert.equal(s.effects!.inventory[c.playerId]['tool:10'],snapshot.effects!.inventory[c.playerId]['tool:10']-1);assert.ok(Object.values(s.g7!.checkpoints).every(x=>x===null));restored++;mark('time-restore',i);
  }
  for(const p of s.players)for(const k of s.g6!.stocks){const h=s.g6!.holdings[p.id][k.id];assert.ok(Number.isFinite(h.average));assert.equal(h.cost,Math.trunc(h.quantity*h.average!));if(!h.quantity)assert.equal(h.average,0);}
  if(c.action.type==='stockTrade'){
   const a=c.action,k=b.g6!.stocks.find(k=>k.id===a.stockId)!,h=b.g6!.holdings[c.playerId][k.id],next=s.g6!.holdings[c.playerId][k.id],after=s.g6!.stocks.find(x=>x.id===k.id)!,amount=Math.trunc(k.price*a.quantity/100),buy=a.side==='buy';
   assert.equal(next.quantity,h.quantity+(buy?a.quantity:-a.quantity));assert.equal(next.average,buy?Math.fround((Math.trunc(h.quantity*h.average!)+amount)/next.quantity):next.quantity?h.average:0);
   assert.equal(s.economy!.balances[c.playerId].bank,b.economy!.balances[c.playerId].bank+(buy?-amount:amount));assert.equal(s.economy!.balances[c.playerId].cash,b.economy!.balances[c.playerId].cash);assert.equal(after.pool,k.pool+(buy?-a.quantity:a.quantity));assert.equal(after.quota,k.quota+(buy?-a.quantity:a.quantity));trades++;mark('trade',i);
  }
  for(const ev of res.events){
   if(ev.type==='companySubscribed'){
    const row=ev.receipt,h=b.g6!.holdings[row.traderId][row.stockId],after=s.g6!.holdings[row.traderId][row.stockId],old=b.news!.business!.companies.find(x=>x.id===row.companyId)!,company=s.news!.business!.companies.find(x=>x.id===row.companyId)!;
    assert.equal(row.price,Math.trunc(old.capital/10000));assert.equal(row.amount,row.price*row.quantity);assert.equal(after.average,Math.fround((Math.trunc(h.quantity*h.average!)+row.amount)/(h.quantity+row.quantity)));
    assert.equal(s.economy!.balances[row.traderId].cash,b.economy!.balances[row.traderId].cash-row.amount);assert.equal(s.economy!.balances[row.traderId].bank,b.economy!.balances[row.traderId].bank);assert.equal(company.subscription,old.subscription!-row.quantity);assert.equal(company.funds,old.funds);assert.equal(company.cumulative,old.cumulative);assert.deepEqual(s.g6!.stocks,b.g6!.stocks);assert.equal(company.ranking[0]??null,company.ownerId);assert.equal(s.g6!.holdings[row.traderId][row.stockId].quantity,h.quantity+row.quantity);subscriptions++;subscriptionPaid+=row.amount;mark('subscription',i);
   }
   if(ev.type==='fortuneResolved'&&[8,9].includes(ev.fortuneId)&&ev.change.assets?.stocks){
    let sum=0;for(const row of ev.change.assets.stocks){const h:Holding=b.g6!.holdings[ev.playerId][row.id],after:Holding=s.g6!.holdings[ev.playerId][row.id],k=b.g6!.stocks.find(k=>k.id===row.id)!;const quantity:number=ev.fortuneId===8?Math.trunc(h.quantity/10):h.quantity;
     assert.equal(row.before,h.quantity);assert.equal(row.after,h.quantity-quantity);assert.equal(row.amount,Math.trunc(k.price*quantity/100));assert.equal(after.average,after.quantity?h.average:0);assert.equal(row.costAfter,Math.trunc(after.quantity*after.average!));assert.equal(row.recipient,ev.fortuneId===8?'public':'bank');sum+=row.amount;
     const current=s.g6!.stocks.find(k=>k.id===row.id)!;assert.equal(current.pool,k.pool+quantity);assert.equal(current.quota,k.quota+quantity);
    }
    assert.equal(s.economy!.balances[ev.playerId].bank-b.economy!.balances[ev.playerId].bank,ev.fortuneId===9?sum:0);assert.equal(s.news!.publicFund-b.news!.publicFund,ev.fortuneId===8?sum:0);if(sum){fortune.push(ev.fortuneId);if(ev.fortuneId===8)forcedPublic+=sum;else forcedBank+=sum;mark('fortune-'+ev.fortuneId,i);}
   }
   if(ev.type==='newsResolved'){
    news.push(ev.newsId);if(ev.completeChanges?.company&&ev.stocks.length){const company=ev.completeChanges.company.after,k=s.g6!.stocks.find(k=>k.id===company.stockId)!;assert.equal(k.momentum,k.trend==='red'?10:-10);assert.equal(k.price,quote(k.base,k.momentum!));assert.deepEqual(s.g6!.holdings,b.g6!.holdings);assert.deepEqual(s.economy!.balances,b.economy!.balances);companyTrends++;mark('company-trend',i);}
   }
   if(ev.type==='stockMarketUpdated'){
    const receipt=ev.receipt;assert.equal(receipt.shared,Math.fround((receipt.draw-16384)/4097));
    for(const q of receipt.quotes){const before=b.g6!.stocks.find(k=>k.id===q.stockId)!,def=JAPAN_STOCKS.find(k=>k.id===q.stockId)!;assert.equal(q.base,before.price);assert.equal(q.beforePercent,before.momentum);let percent=0;
     if(q.kind==='red')percent=10;else if(q.kind==='black')percent=-10;else if(q.kind==='ordinary'){const noise=Math.fround((q.draw!-16384)/1171),raw=Math.fround(Math.fround(noise*Math.fround(def.volatility/10)+q.beforePercent)+receipt.shared),company=b.news!.business!.companies.find(x=>x.stockId===q.stockId),anchor=company?company.capital/100:def.price,factor=q.base>anchor*(company?3:8)?(raw>0?.5:2):q.base<anchor*(company ? .85 : .5)?(raw>0?2:.5):1;assert.equal(q.factor,factor);percent=Math.min(10,Math.max(-10,Math.fround(raw*factor)));}
     assert.equal(q.percent,percent);assert.equal(q.price,quote(q.base,percent));
    }
    assert.equal(receipt.index,Math.trunc(receipt.quotes.reduce((sum,q)=>sum+q.price,0)/10));quoteDays++;mark('market-date',i);
   }
   if(ev.type==='g5Notice'&&ev.message.startsWith('研究完成')&&ev.message.includes('时光机')){research++;mark('research-delivery',i);}
  }
  if(!rewind&&s.calendar!.date!==b.calendar!.date){dates++;mark('date',i);if(!res.events.some(e=>e.type==='stockMarketUpdated')){assert.deepEqual(s.g6!.stocks.map(k=>[k.price,k.base,k.history]),b.g6!.stocks.map(k=>[k.price,k.base,k.history]));mark('closed-date',i);}}
 }
 if(kind==='commerce'){assert.ok(subscriptions&&companyTrends&&dates);assert.ok(subscriptionPaid>0);}if(kind==='fortune'){assert.ok(fortune.includes(8)&&fortune.includes(9));assert.ok(forcedBank&&forcedPublic);}if(kind==='time'){assert.ok(research&&restored);assert.ok(dates&&trades);}
 const copy=replayGame(nodes,r);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);
 for(const index of prefixes.values()){const copy=replayGame(nodes,{...r,commands:r.commands.slice(0,index)});for(const c of r.commands.slice(index))assert.ok(copy.dispatch(c).ok);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return {kind,players:r.config.characterIds.length,commands:r.commands.length,turn:e.state.turn,trades,subscriptions,subscriptionPaid,forcedBank,forcedPublic,fortune,news,dates,quoteDays,companyTrends,research,restored,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
