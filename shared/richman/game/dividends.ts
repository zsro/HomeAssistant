import type {GameState,EventPayload} from './engine';
import {LOTTERY_FINGERPRINT} from './lottery';
import {hashSeed} from './random';
export const DIVIDEND_RULES=Object.freeze({id:'japan-events-candidate-v26',version:1,base:'japan-events-candidate-v25',income:'existing-company-news30/31/32/33/34/35;no-invented-service-revenue',date:'15-after-market-before-lottery-before-incoming-loan;no-RNG',participants:'map-stock-order-mapped-companies;all-solvent-holders-including-detained;denominator-sum-actual-solvent-quantity',allocation:'float32(quantity/total)*signed-int32-funds;truncate-toward-zero;int32-sum-per-player-before-posting',clearing:'total>0-clear-period-including-zero/negative;no-holders-carry;keep-cumulative;discard-remainder-no-public-fund',payment:'int32-bank-plus-net;negative-bank-debit-cash-then-zero;negative-cash-bankrupt;no-reactions-no-stock-sale',exit:'Web-return-holdings-to-pool-without-proceeds-standard-cleanup;reselect-next-solvent-without-extra-date;one-survivor-wins-none-draw',scope:'no-full-company-services-insurance-original-bankruptcy-auction-other-calendar-events'});
export const DIVIDEND_FINGERPRINT=hashSeed(JSON.stringify({base:LOTTERY_FINGERPRINT,rules:DIVIDEND_RULES})).toString(16);
export type CompanyDividend={companyId:string;stockId:string;name:string;funds:number;cumulative:number;shares:number;after:number;allocations:{playerId:string;quantity:number;ratio:number;amount:number}[]};
export type DividendPayment={playerId:string;amount:number;before:{cash:number;bank:number};after:{cash:number;bank:number};unpaid:number;bankrupt:boolean;returnedShares:number};
export type DividendSettlement={date:string;companies:CompanyDividend[];payments:DividendPayment[]};
export type DividendEvent={type:'companyDividends';settlement:DividendSettlement};
/** 0042ba97: calculate every company's distribution before applying any player's net. */
export function settleDividends(s:GameState,emit:(e:EventPayload)=>void,eliminate:(id:string)=>void){
 const business=s.news?.business;
 if((s.rulesId!==DIVIDEND_RULES.id&&(s.rulesId !== 'japan-events-candidate-v27' && (s.rulesId !== 'japan-events-candidate-v28' && (s.rulesId !== 'japan-events-candidate-v29' && (s.rulesId !== 'japan-events-candidate-v30' && (s.rulesId !== 'japan-events-candidate-v31' && (s.rulesId !== 'japan-events-candidate-v32' && (s.rulesId !== 'japan-events-candidate-v33' && (s.rulesId !== 'japan-events-candidate-v34' && (s.rulesId !== 'japan-events-candidate-v35' && (s.rulesId !== 'japan-events-candidate-v36' && (s.rulesId !== 'japan-events-candidate-v37' && (s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))))))))))))))))))))||!business||!s.calendar?.date.endsWith('-15'))return;
 const players=s.players.filter(p=>!s.finance!.eliminated.includes(p.id));
 const totals=Object.fromEntries(players.map(p=>[p.id,0]));
 const companies:CompanyDividend[]=[];
 for(const stock of s.g6!.stocks){
  const c=business.companies.find(c=>c.stockId===stock.id);if(!c)continue;
  const shares=players.reduce((n,p)=>n+s.g6!.holdings[p.id][stock.id].quantity,0),funds=c.funds;
  const allocations=players.map(p=>{const quantity=s.g6!.holdings[p.id][stock.id].quantity,ratio=quantity?Math.fround(quantity/shares):0,amount=Math.trunc(funds*ratio)|0;totals[p.id]=(totals[p.id]+amount)|0;return{playerId:p.id,quantity,ratio,amount};});
  if(shares)c.funds=0;
  companies.push({companyId:c.id,stockId:stock.id,name:c.name,funds,cumulative:c.cumulative,shares,after:c.funds,allocations});
 }
 const payments:DividendPayment[]=[];
 for(const p of players){
  const b=s.economy!.balances[p.id],before={...b},amount=totals[p.id];b.bank=(b.bank+amount)|0;
  if(b.bank<0){b.cash=(b.cash+b.bank)|0;b.bank=0;}
  const unpaid=Math.max(0,-b.cash),bankrupt=b.cash<0;let returnedShares=0;
  if(bankrupt){b.cash=0;for(const k of s.g6!.stocks){const h=s.g6!.holdings[p.id][k.id];returnedShares+=h.quantity;k.pool+=h.quantity;k.quota+=h.quantity;h.quantity=0;h.cost=0;if(h.average!==undefined)h.average=0;}eliminate(p.id);}
  payments.push({playerId:p.id,amount,before,after:{...b},unpaid,bankrupt,returnedShares});
 }
 const settlement={date:s.calendar.date,companies,payments};business.dividends=settlement;
 emit({type:'companyDividends',settlement:structuredClone(settlement)});
}
