import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {JAPAN_STOCKS} from '../../frontend/src/features/richman/game/g6-catalog';
import {calendarClosed} from '../../frontend/src/features/richman/game/calendar-date';
import {g6Draw} from '../../frontend/src/features/richman/game/g6-random';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import {strict as assert} from 'node:assert';
const quote=(base:number,p:number)=>{const target=base*(100+p)/100,step=target<500?1:target<1500?5:target<5000?10:target<15000?50:100;return Math.max(100,Math.min(999900,base+Math.sign(p)*Math.floor(Math.abs(base*p/100)/step)*step));};
export function verifyStockLedger(r:Replay){
 assert.equal(r.rulesId,'japan-events-candidate-v43');assert.equal(r.itemFingerprint,'d9c26ce0');const e=new GameEngine(nodes,r.config),prefixes=new Map<string,number>(),trades:{side:string;stockId:string;amount:number}[]=[],days:{date:string;index:number;shared:number}[]=[],closed:string[]=[];let up=0,down=0,averagedBuys=0,partialSales=0,clearings=0,subscriptions=0;
 const mark=(k:string,i:number)=>{if(!prefixes.has(k))prefixes.set(k,i);};
 for(let i=0;i<r.commands.length;i++){
  const c=r.commands[i],b=e.state,a=c.action,res=e.dispatch(c);assert.ok(res.ok);const s=e.state;
  for(const player of b.players)for(const stock of b.g6!.stocks){const old=b.g6!.holdings[player.id][stock.id],h=s.g6!.holdings[player.id][stock.id];assert.equal(h.cost,Math.trunc(h.quantity*h.average!));
   if(h.quantity>old.quantity){const quantity=h.quantity-old.quantity;const subscription:GameEvent|undefined=res.events.find(ev=>ev.type==='companySubscribed'&&ev.receipt.stockId===stock.id&&ev.receipt.traderId===player.id);const paid:number=subscription?.type==='companySubscribed'?subscription.receipt.amount:Math.trunc(stock.price*quantity/100);assert.equal(h.average,Math.fround((Math.trunc(old.quantity*old.average!)+paid)/h.quantity));if(old.quantity)averagedBuys++;if(subscription){subscriptions++;assert.equal(s.economy!.balances[player.id].cash,b.economy!.balances[player.id].cash-paid);assert.equal(s.economy!.balances[player.id].bank,b.economy!.balances[player.id].bank);mark('subscription',i);}}
   else if(h.quantity<old.quantity){assert.equal(h.average,h.quantity?old.average:0);if(h.quantity){partialSales++;mark('partial-sale',i);}else{clearings++;mark('clear',i);}}
   else assert.equal(h.average,old.average);
  }
  if(a.type==='stockTrade'){
   const k=b.g6!.stocks.find(k=>k.id===a.stockId)!,after=s.g6!.stocks.find(k=>k.id===a.stockId)!,buy=a.side==='buy',paid=Math.floor(k.price*a.quantity/100),h=b.g6!.holdings[c.playerId][k.id],bank=b.economy!.balances[c.playerId].bank;
   assert.equal(s.economy!.balances[c.playerId].bank,bank+(buy?-paid:paid));assert.equal(s.economy!.balances[c.playerId].cash,b.economy!.balances[c.playerId].cash);assert.equal(s.g6!.holdings[c.playerId][k.id].quantity,h.quantity+(buy?a.quantity:-a.quantity));assert.equal(after.pool,k.pool+(buy?-a.quantity:a.quantity));assert.equal(after.quota,k.quota+(buy?-a.quantity:a.quantity));assert.deepEqual(after.history,k.history);assert.equal(after.momentum,k.momentum);assert.equal(after.price,k.price);
   if(buy){assert.ok(a.quantity<=Math.floor(bank*100/k.price));assert.ok(!(k.price>k.base&&k.price>=quote(k.base,10)));}else assert.ok(!(k.price<k.base&&k.price<=quote(k.base,-10)));
   trades.push({side:a.side,stockId:k.id,amount:paid});mark(a.side,i);assert.deepEqual(s.news!.business!.companies.map(c=>[c.funds,c.cumulative]),b.news!.business!.companies.map(c=>[c.funds,c.cumulative]));
  }
  if(b.calendar!.date!==s.calendar!.date){assert.equal(a.type,'endTurn');const events=res.events.filter(ev=>ev.type==='stockMarketUpdated');
   if(calendarClosed(s.calendar!.date)||b.news!.business!.marketClosed>1){assert.equal(events.length,0);assert.deepEqual(s.g6!.stocks.map(k=>[k.price,k.base,k.momentum,k.history]),b.g6!.stocks.map(k=>[k.price,k.base,k.momentum,k.history]));closed.push(s.calendar!.date);mark('closed-date',i);}
   else{assert.equal(events.length,1);const receipt=events[0].receipt;let draw=g6Draw(b.randomState,32768);assert.equal(receipt.draw,draw.index);assert.equal(receipt.shared,Math.fround((draw.index-16384)/4097));let rng=draw.state;
    for(const row of receipt.quotes){const k=b.g6!.stocks.find(k=>k.id===row.stockId)!,def=JAPAN_STOCKS.find(k=>k.id===row.stockId)!;assert.equal(row.base,k.price);assert.equal(row.beforePercent,k.momentum);let pct:number;
     if(row.kind==='halted')pct=0;else if(row.kind==='red')pct=10;else if(row.kind==='black')pct=-10;else{draw=g6Draw(rng,32768);rng=draw.state;assert.equal(row.draw,draw.index);const noise=Math.fround((draw.index-16384)/1171),raw=Math.fround(Math.fround(noise*Math.fround(def.volatility/10)+k.momentum!)+receipt.shared),company=b.news!.business!.companies.find(c=>c.stockId===k.id),anchor=company?company.capital/100:def.price;const factor=k.price>anchor*(company?3:8)?(raw>0 ? .5 : 2):k.price<anchor*(company ? .85 : .5)?(raw>0 ? 2 : .5):1;assert.equal(row.factor,factor);pct=Math.min(10,Math.max(-10,Math.fround(raw*factor)));}
     assert.equal(row.percent,pct);assert.equal(row.price,quote(k.price,pct));const actual=s.g6!.stocks.find(stock=>stock.id===row.stockId)!;assert.equal(actual.price,row.price);assert.equal(actual.momentum,pct);assert.deepEqual(actual.history,[...k.history,row.price].slice(-144));if(row.price>row.base&&row.price>=quote(row.base,10))up++;if(row.price<row.base&&row.price<=quote(row.base,-10))down++;
    }
    assert.equal(receipt.index,Math.floor(receipt.quotes.reduce((sum,q)=>sum+q.price,0)/10));days.push({date:receipt.date,index:receipt.index,shared:receipt.shared});mark('market-date',i);if(closed.length)mark('reopen-date',i);
   }
  }
 }
 assert.deepEqual(days.map(d=>d.date),['1998-01-10','1998-01-12','1998-01-13']);assert.deepEqual(closed,['1998-01-11']);assert.equal(new Set(trades.filter(t=>t.side==='buy').map(t=>t.stockId)).size,12);assert.ok(trades.some(t=>t.side==='sell'));assert.ok(up&&down);assert.ok(averagedBuys&&partialSales&&clearings);
 const copy=replayGame(nodes,r);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);for(const i of prefixes.values()){const partial=replayGame(nodes,{...r,commands:r.commands.slice(0,i)});for(const c of r.commands.slice(i))assert.ok(partial.dispatch(c).ok);assert.deepEqual(partial.state,e.state);assert.deepEqual(partial.events,e.events);}
 return{averagedBuys,partialSales,clearings,subscriptions,players:r.config.characterIds.length,commands:r.commands.length,turn:e.state.turn,trades:trades.length,buy:trades.filter(t=>t.side==='buy').length,sell:trades.filter(t=>t.side==='sell').length,days,closed,up,down,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
