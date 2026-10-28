import type {EventPayload,GameState} from './engine';
import {JAPAN_STOCKS} from './g6-catalog';
import {g6Draw} from './g6-random';
export type MarketQuote={stockId:string;base:number;price:number;beforePercent:number;percent:number;draw:number|null;factor:number;kind:'ordinary'|'halted'|'red'|'black'};
export type MarketReceipt={date:string;draw:number;shared:number;index:number;quotes:MarketQuote[]};
export type MarketState={last:MarketReceipt|null};
export type StockMarketEvent={type:'stockMarketUpdated';receipt:MarketReceipt};
/** Strict thresholds transcribed from 00429248..00429413; prices here are cents. */
export function valuationFactor(base:number,initial:number,capital:number|undefined,percent:number){
 const anchor=capital===undefined?initial:capital/100,low=capital===undefined ? .5 : .85,high=capital===undefined?8:3;
 if(base>anchor*high)return percent>0 ? .5 : 2;
 if(base<anchor*low)return percent>0 ? 2 : .5;
 return 1;
}
export function marketBuyLimit(bank:number,price:number,pool:number,quota:number){return Math.max(0,Math.min(pool,quota,Math.floor(bank*100/price)));}
/** Daily caller already decremented trend/stop clocks and checked the closed market. */
export function updateStockMarket(s:GameState,quote:(base:number,percent:number)=>number,emit:(e:EventPayload)=>void){
 const g=s.g6!,draw=g6Draw(s.randomState,32768);s.randomState=draw.state;
 const shared=Math.fround((draw.index-16384)/4097),quotes:MarketQuote[]=[];
 for(const k of g.stocks){
  k.base=k.price;const beforePercent=k.momentum??0;let raw:number|null=null,factor=1,percent=0,kind:MarketQuote['kind']='ordinary';
  if(s.news?.business?.halted[k.id])kind='halted';
  else if(k.trend){kind=k.trend;percent=k.trend==='red'?10:-10;}
  else{
   const noise=g6Draw(s.randomState,32768);s.randomState=noise.state;raw=noise.index;
   const def=JAPAN_STOCKS.find(d=>d.id===k.id)!;
   k.noise=Math.fround((raw-16384)/1171);
   percent=Math.fround(Math.fround(k.noise*Math.fround(def.volatility/10)+beforePercent)+shared);
   factor=valuationFactor(k.base,def.price,s.news?.business?.companies.find(c=>c.stockId===k.id)?.capital,percent);
   percent=Math.max(-10,Math.min(10,Math.fround(percent*factor)));
  }
  k.momentum=percent;k.price=quote(k.base,percent);k.history.push(k.price);k.history=k.history.slice(-144);
  quotes.push({stockId:k.id,base:k.base,price:k.price,beforePercent,percent,draw:raw,factor,kind});
 }
 const receipt:MarketReceipt={date:s.calendar!.date,draw:draw.index,shared,index:Math.trunc(g.stocks.reduce((sum,k)=>sum+k.price,0)/10),quotes};
 g.market!.last=receipt;emit({type:'stockMarketUpdated',receipt:structuredClone(receipt)});
}
