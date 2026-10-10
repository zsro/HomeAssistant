import type {GameState,EventPayload} from './engine';
import type {Balance,PropertyDefinition} from './economy';
import {paymentSplit} from './economy';
import {propertyValue} from './finance';
import {consumerIndex,stockTaxBaseCents} from './price-index';
import type {NewsDecision} from './news';
import type {CompanyDividend} from './dividends';
import {PAYMENT_FINGERPRINT,queueBatchPayment} from './payments';
import {hashSeed} from './random';
export const BATCH_RULES=Object.freeze({id:'japan-events-candidate-v35',version:1,base:'japan-events-candidate-v34',tax:'news12-freeze-base-level-value;13-freeze-f32-market-base;truncate5%-then-index;seat-order-live-balances-cash-bank-flags0-public-after-disposal',dividend:'freeze-all-companies-f32-ratios-int32-nets-before-posting;clear-period-only-held;bank-then-cash-net-sink;no-company-or-public-debt-credit',continuation:'serialized-batch-rows-cursor-await-payment;no-stock-presale;public-exit-sale-not-debt-rescue;outer-day-pauses-before-lottery-monthly-and-incoming-loan',end:'Web-last-survivor-stops-remaining-batch-and-outer-day;news-original-global-end-check;dividend-and-lottery-original-outer-end-check-unproven',scope:'v34-inherited;special-actors-original-RNG-timed-auction-other-listings-wheel-magic-house-deferred'});
export const BATCH_FINGERPRINT=hashSeed(JSON.stringify({base:PAYMENT_FINGERPRINT,rules:BATCH_RULES})).toString(16);
export type BatchRow={playerId:string;amount:number;base?:number;baseCents?:number;before?:Balance;after?:Balance;paid?:Balance;unpaid?:number;bankrupt?:boolean;returnedShares?:number;skipped?:boolean};
export type PaymentBatch={id:number;kind:'landTax'|'stockTax'|'dividend';cursor:number;waiting:boolean;rows:BatchRow[];date:string;news?:Omit<NewsDecision,'id'>;skipped:number[];companies?:CompanyDividend[];stopped:boolean};
export type BatchState={serial:number;current:PaymentBatch|null;last:PaymentBatch|null;day:null|{monthChanged:boolean}};
export type BatchEvent={type:'batchStarted'|'batchCompleted';batch:PaymentBatch};
type Emit=(e:EventPayload)=>void;
function begin(s:GameState,b:Omit<PaymentBatch,'id'|'cursor'|'waiting'|'date'|'stopped'>,emit:Emit){const f=s.finance!.batches!;if(f.current)throw Error('Overlapping payment batch');f.current={...b,id:++f.serial,cursor:0,waiting:false,date:s.calendar!.date,stopped:false};emit({type:'batchStarted',batch:structuredClone(f.current)});}
export function beginTaxBatch(s:GameState,id:number,defs:readonly PropertyDefinition[],skipped:number[],emit:Emit){
 const rows=s.players.filter(p=>!s.finance!.eliminated.includes(p.id)).map(p=>{const base=id===12?propertyValue(p.id,s.economy!.properties,defs):stockTaxBaseCents(s,p.id);return{playerId:p.id,amount:-Math.floor(base/(id===12?20:2000))*consumerIndex(s),...(id===12?{base}:{baseCents:base})};});
 begin(s,{kind:id===12?'landTax':'stockTax',rows,skipped,news:{kind:'news',node:s.players[s.active].node,newsId:id,title:id===12?'全员缴交地产税5%':'全员缴交股票税5%',lines:[],scope:'税额在批次开始冻结，按座位依次结算；退出股票与拍卖收入归公共资金，不代缴原税。'}},emit);
}
export function beginDividendBatch(s:GameState,emit:Emit){
 if(!s.calendar!.date.endsWith('-15'))return;
 const players=s.players.filter(p=>!s.finance!.eliminated.includes(p.id)),totals=Object.fromEntries(players.map(p=>[p.id,0])),companies:CompanyDividend[]=[];
 for(const stock of s.g6!.stocks){const c=s.news!.business!.companies.find(c=>c.stockId===stock.id);if(!c)continue;
  const shares=players.reduce((n,p)=>n+s.g6!.holdings[p.id][stock.id].quantity,0),funds=c.funds;
  const allocations=players.map(p=>{const quantity=s.g6!.holdings[p.id][stock.id].quantity,ratio=quantity?Math.fround(quantity/shares):0,amount=Math.trunc(funds*ratio)|0;totals[p.id]=(totals[p.id]+amount)|0;return{playerId:p.id,quantity,ratio,amount};});
  if(shares)c.funds=0;companies.push({companyId:c.id,stockId:stock.id,name:c.name,funds,cumulative:c.cumulative,shares,after:c.funds,allocations});
 }
 begin(s,{kind:'dividend',rows:players.map(p=>({playerId:p.id,amount:totals[p.id]})),companies,skipped:[]},emit);
}
function complete(s:GameState,token:()=>string,emit:Emit){
 const f=s.finance!.batches!,b=f.current!;if(s.phase==='finished')b.stopped=true;const rows=b.rows.filter(r=>r.before);
 if(b.kind==='dividend'){
  const settlement={date:b.date,companies:b.companies!,payments:rows.map(r=>({playerId:r.playerId,amount:r.amount,before:r.before!,after:r.after!,unpaid:r.unpaid!,bankrupt:r.bankrupt!,returnedShares:r.returnedShares!}))};
  s.news!.business!.dividends=structuredClone(settlement);emit({type:'companyDividends',settlement});
 }else{
  const n=b.news!,taxes=rows.map(r=>({playerId:r.playerId,due:-r.amount,cash:r.paid!.cash,bank:r.paid!.bank,unpaid:r.unpaid!,bankrupt:r.bankrupt!,returnedShares:r.returnedShares!}));
  n.lines=rows.map(r=>`玩家${r.playerId.split('-')[1]}：应缴 ${(-r.amount).toLocaleString()} 元；现金 ${r.paid!.cash.toLocaleString()}＋存款 ${r.paid!.bank.toLocaleString()}，未付 ${r.unpaid!.toLocaleString()} 元${r.bankrupt?'，已退出，资产公共处置不抵税款':''}。`);
  if(b.stopped)n.lines.push('对局结束，后续座位不再结算。');
  if(s.phase!=='finished'){s.phase='news';s.pending={...structuredClone(n),id:token()};}
  emit({type:'newsResolved',newsId:n.newsId,title:n.title,node:n.node,skipped:b.skipped,money:rows.map(r=>({playerId:r.playerId,cashBefore:r.before!.cash,bankBefore:r.before!.bank,cashAfter:r.after!.cash,bankAfter:r.after!.bank})),stocks:[],publicFund:s.news!.publicFund,cursor:s.news!.cursor,...(b.kind==='landTax'?{operatingChanges:{taxes:taxes.map((t,i)=>({...t,base:rows[i].base!}))}}:{completeChanges:{taxes:taxes.map((t,i)=>({...t,baseCents:rows[i].baseCents!}))}})});
 }
 f.last=structuredClone(b);f.current=null;emit({type:'batchCompleted',batch:structuredClone(b)});
}
/** Frozen amounts, live balances. A row advances only after its exact payment callback returns. */
export function advanceBatch(s:GameState,token:()=>string,emit:Emit){
 const b=s.finance?.batches?.current;if(!b)return;
 if(b.waiting){
  const p=s.finance!.payments!.last;if(s.finance!.payments!.current||p?.kind!=='batch'||p.batchId!==b.id||p.rowIndex!==b.cursor)return;
  const r=b.rows[b.cursor],d=s.finance!.disposal!.last!;r.after={...s.economy!.balances[r.playerId]};r.returnedShares=d.stocks.reduce((n,k)=>n+k.quantity,0);b.waiting=false;b.cursor++;
 }
 while(b.cursor<b.rows.length){
  if(s.phase==='finished'){b.stopped=true;break;}
  const r=b.rows[b.cursor];if(s.finance!.eliminated.includes(r.playerId)){r.skipped=true;b.cursor++;continue;}
  const balance=s.economy!.balances[r.playerId];r.before={...balance};r.returnedShares=0;
  let after:Balance;
  if(b.kind==='dividend'){after={cash:balance.cash,bank:(balance.bank+r.amount)|0};if(after.bank<0){after.cash=(after.cash+after.bank)|0;after.bank=0;}}
  else {const paid=paymentSplit(balance,Math.min(-r.amount,balance.cash+balance.bank),true)!;after={cash:balance.cash-paid.cash,bank:balance.bank-paid.bank};}
  r.unpaid=b.kind==='dividend'?Math.max(0,-after.cash):Math.max(0,-r.amount-balance.cash-balance.bank);r.bankrupt=r.unpaid>0;
  r.paid=r.amount<0?{cash:balance.cash-Math.max(0,after.cash),bank:balance.bank-after.bank}:{cash:0,bank:0};
  if(r.bankrupt){r.paid={...balance};b.waiting=true;queueBatchPayment(s,b.id,b.cursor,r.playerId,r.paid.cash+r.paid.bank+r.unpaid,b.kind==='dividend'?'sink':'public');return;}
  Object.assign(balance,after);r.after={...balance};if(b.kind!=='dividend')s.news!.publicFund+=r.paid.cash+r.paid.bank;b.cursor++;
 }
 complete(s,token,emit);
}
