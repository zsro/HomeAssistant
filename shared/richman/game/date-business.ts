import type {GameState,EventPayload} from './engine';
import type {PropertyDefinition} from './economy';
import {propertyBase} from './economy';
import {INSURANCE_FINGERPRINT} from './insurance';
import {hashSeed} from './random';
import {receiveRandomCard} from './g6';
import holidays from './calendar-activities-japan.json';
export const DATE_BUSINESS_RULES=Object.freeze({id:'japan-events-candidate-v30',version:1,base:'japan-events-candidate-v29',date:'after-advance-before-market-price;after-market-before-15-dividend-lottery-festival;month-interest-before-incoming-loan-policy-clock',wealth:'alive-seat-order;cash+bank-debt-int32;12-stocks-f32-price-times-quantity-plus-f32-running-sum-trunc-int32;raw-dynamic-land-and-building-cost-no-index;facility-base-plus-level-cost;no-inventory-company-funds-double-count',price:'initial1;daily-max(previous,trunc(trunc(int32-sum/alive)/initialFunds));no-year-reset;no-RNG',festival:'Japan-stage0-first-fixed-date;Jan1-display-only;Dec25-alive-seat-order-one-remaining-pool-card-full-bag-first-cheapest;no-status-filter;no-cash;empty-no-RNG;Web-banner-no-media-or-special-character',indexed:'Toyota;Nissan-selected-land-and-cancel;visitor-insurance-premium;hospital-prison-first-travel-hotel-duration-claims;SEGA-subscription-dividends-loan-principal-lottery-unchanged',scope:'other-price-consumers-retain-unit-price-pending-audit;no-proven-birthday-or-year-cash-reward;no-original-wheel-special-actor-forced-auction'});
export const DATE_BUSINESS_FINGERPRINT=hashSeed(JSON.stringify({base:INSURANCE_FINGERPRINT,rules:DATE_BUSINESS_RULES,holidays})).toString(16);
export type PriceRow={playerId:string;liquid:number;stocks:number;property:number;wealth:number};
export type PriceReceipt={date:string;before:number;after:number;total:number;average:number;initialFunds:number;rows:PriceRow[]};
export type FestivalReceipt={date:string;slot:number;name:string;flags:number;gifts:{playerId:string;itemId:string|null;discarded:string|null}[]};
export type DateBusinessState={initialFunds:number;priceIndex:number;price:PriceReceipt|null;festival:FestivalReceipt|null};
export type DateBusinessEvent={type:'priceIndexUpdated';receipt:PriceReceipt}|{type:'calendarFestival';receipt:FestivalReceipt};
type Emit=(e:EventPayload)=>void;
export function initializeDateBusiness(s:GameState,initialFunds:number){if((s.rulesId===DATE_BUSINESS_RULES.id || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))))))))))s.calendar!.business={initialFunds,priceIndex:1,price:null,festival:null};}
/** x86 signed accounting and the stock accumulator's explicit float32 store. */
export function priceWealth(s:GameState,id:string,definitions:readonly PropertyDefinition[]):PriceRow{
 const b=s.economy!.balances[id],liquid=(b.cash+b.bank-s.news!.business!.loans[id])|0;let value=liquid;
 for(const stock of s.g6!.stocks)value=Math.trunc(Math.fround(value)+Math.fround(stock.price/100)*s.g6!.holdings[id][stock.id].quantity)|0;
 const stocks=(value-liquid)|0;let property=0;
 for(const p of s.economy!.properties){if(p.ownerId!==id)continue;const d=definitions.find(d=>d.id===p.id)!;property=(property+propertyBase(p,d)+d.upgradeCost*(d.kind==='land'&&p.buildingType?1:p.level))|0;}
 return {playerId:id,liquid,stocks,property,wealth:(value+property)|0};
}
export function updatePriceIndex(s:GameState,definitions:readonly PropertyDefinition[],emit:Emit){
 const b=s.calendar?.business;if(!b)return;
 const rows=s.players.filter(p=>!s.finance!.eliminated.includes(p.id)).map(p=>priceWealth(s,p.id,definitions));if(!rows.length)return;
 const total=rows.reduce((sum,r)=>(sum+r.wealth)|0,0),average=Math.trunc(total/rows.length),before=b.priceIndex,after=Math.max(before,Math.trunc(average/b.initialFunds));
 b.priceIndex=after;b.price={date:s.calendar!.date,before,after,total,average,initialFunds:b.initialFunds,rows};emit({type:'priceIndexUpdated',receipt:structuredClone(b.price)});
}
export function settleFestival(s:GameState,emit:Emit){
 const b=s.calendar?.business;if(!b)return;const date=s.calendar!.date,[,month,day]=date.split('-').map(Number),h=holidays.find(h=>h.month===month&&h.day===day);
 if(!h?.flags)return;
 const gifts:FestivalReceipt['gifts']=[];
 if(h.flags&8)for(const p of s.players){if(s.finance!.eliminated.includes(p.id))continue;const gift=receiveRandomCard(s,p.id,()=>{});gifts.push({playerId:p.id,itemId:gift?.itemId??null,discarded:gift?.discarded??null});}
 b.festival={date,slot:h.slot,name:h.month===1?'元旦':'圣诞节',flags:h.flags,gifts};emit({type:'calendarFestival',receipt:structuredClone(b.festival)});
}
