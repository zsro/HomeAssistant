import type {GameState,EventPayload} from './engine';
import type {PropertyDefinition,Balance} from './economy';
import type {ServiceReceipt} from './company-services';
import type {FortuneChange,FortuneDecision} from './fortune';
import type {LoanNotice} from './calendar';
import {DISPOSAL_FINGERPRINT,beginRentDisposal} from './disposal';
import {hashSeed} from './random';
export const PAYMENT_RULES=Object.freeze({id:'japan-events-candidate-v34',version:1,base:'japan-events-candidate-v33',scope:'insolvent-company-fees-Toyota-SEGA-Nissan-Mitsui;negative-fortune14..19-23-24-26-30;incoming-loan-maturity;rent-inherited',order:'company-fortune-flags0-cash-bank-freeze-actual;no-presale;exit-stock-public-sale-three-auctions-before-company-ledger-or-public-credit;fortune-insurance-only-if-survives-no-rescue;loan-direct-bank-cash-sink-no-public-credit',continuation:'serialized-finance-payment-queued-disposing-completed;company-and-fortune-receipt-after-disposal;loan-turnEnd-before-own-status-ticks;final-survivor-no-asset-disposal-but-caller-receipt;G7-finance-world',boundary:'news-batched-tax-and-negative-dividends-remain-legacy-pending-separate-resumable-batch;original-menus-special-actors-RNG-and-auction-timer-deferred'});
export const PAYMENT_FINGERPRINT=hashSeed(JSON.stringify({base:DISPOSAL_FINGERPRINT,rules:PAYMENT_RULES})).toString(16);
type Base={stage:'queued'|'disposing'|'completed';payerId:string;due:number;paid:Balance;disposalId?:string};
export type PaymentContinuation=Base&({kind:'company';receipt:ServiceReceipt}|{kind:'fortune';change:FortuneChange;decision:FortuneDecision|null;skipped:number[];reason:string}|{kind:'loan';notice:LoanNotice}|{kind:'batch';batchId:number;rowIndex:number;destination:'public'|'sink'});
export type PaymentState={current:PaymentContinuation|null;last:PaymentContinuation|null};
export type PaymentEvent={type:'paymentCompleted';payment:PaymentContinuation};
type Emit=(e:EventPayload)=>void;
function available(s:GameState,id:string,due:number){return (s.rulesId===PAYMENT_RULES.id||(s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))))))))))&&due>s.economy!.balances[id].cash+s.economy!.balances[id].bank;}
function queue(s:GameState,p:PaymentContinuation){if(s.finance!.payments!.current)throw Error('Overlapping payment continuation');s.finance!.payments!.current=structuredClone(p);}
export function queueCompanyPayment(s:GameState,receipt:ServiceReceipt){
 if(!available(s,receipt.payerId,receipt.amount))return false;
 queue(s,{kind:'company',stage:'queued',payerId:receipt.payerId,due:receipt.amount,paid:{cash:receipt.cash,bank:receipt.bank},receipt});return true;
}
export function queueFortunePayment(s:GameState,id:string,due:number,change:FortuneChange,decision:FortuneDecision|null,skipped:number[],reason:string){
 if(!available(s,id,due))return false;
 queue(s,{kind:'fortune',stage:'queued',payerId:id,due,paid:{...s.economy!.balances[id]},change,decision,skipped,reason});return true;
}
export function queueLoanPayment(s:GameState,notice:LoanNotice){
 if(!available(s,notice.playerId,notice.principal))return false;
 const paid={...s.economy!.balances[notice.playerId]};
 queue(s,{kind:'loan',stage:'queued',payerId:notice.playerId,due:notice.principal,paid,notice:{...notice,cash:paid.cash,bank:paid.bank,unpaid:notice.principal-paid.cash-paid.bank}});return true;
}
export function queueBatchPayment(s:GameState,batchId:number,rowIndex:number,payerId:string,due:number,destination:'public'|'sink'){queue(s,{kind:'batch',stage:'queued',batchId,rowIndex,payerId,due,destination,paid:{...s.economy!.balances[payerId]}});}
/** The callback is plain state, so auctions, replay and world restore cannot lose it. */
export function startQueuedPayment(s:GameState,defs:readonly PropertyDefinition[],token:()=>string,emit:Emit,cleanup:(id:string)=>void){
 const p=s.finance?.payments?.current;if(p?.stage!=='queued')return;
 p.stage='disposing';const paid=p.paid.cash+p.paid.bank;
 beginRentDisposal(s,defs,{kind:'debt',id:token(),payerId:p.payerId,propertyId:p.kind==='company'?p.receipt.companyId:p.kind==='fortune'?`fortune:${p.decision!.fortuneId}`:p.kind==='batch'?`batch:${p.batchId}:${p.rowIndex}`:'loan',recipientId:p.kind==='company'?p.receipt.companyId:p.kind==='fortune'?'public':p.kind==='batch'?p.destination:'bank',amount:p.due,available:paid,shortfall:p.due-paid,lines:[]},token,emit,()=>cleanup(p.payerId),'payment');
 p.disposalId=(s.finance!.disposal!.current??s.finance!.disposal!.last)!.id;
}
export function resumePayment(s:GameState,token:()=>string,emit:Emit){
 const p=s.finance?.payments?.current,r=s.finance?.disposal?.last;
 if(!p||!r||p.stage!=='disposing'||s.finance!.disposal!.current||r?.id!==p.disposalId)return;
 const actual=p.paid.cash+p.paid.bank;
 if(p.kind==='company'){
  const c=s.news!.business!.companies.find(c=>c.id===p.receipt.companyId)!;
  c.funds=(c.funds+actual)|0;c.cumulative=(c.cumulative+actual)|0;
  p.receipt.fundsAfter=c.funds;p.receipt.cumulativeAfter=c.cumulative;
  s.news!.business!.service=structuredClone(p.receipt);
  if(!r.finishedGame){s.phase='company';s.pending={kind:'company',id:token(),receipt:structuredClone(p.receipt)};}
  emit({type:'companyService',receipt:structuredClone(p.receipt)});
 }else if(p.kind==='fortune'){
  s.news!.publicFund+=actual;
  const c=p.change;c.amount=-p.due;c.unpaid=p.due-actual;c.bankrupt=true;c.cashAfter=0;c.bankAfter=0;c.pointsAfter=0;c.vehicleAfter=s.g2!.players[p.payerId].vehicle;c.returnedShares=r.stocks.reduce((n,k)=>n+k.quantity,0);
  // Original 44cec2 checks alive before its insurance call. Exit cannot be rescued by insurance.
  const d=p.decision!;d.lines.push(`应付 ${p.due.toLocaleString()} 元；现金 ${p.paid.cash.toLocaleString()}＋存款 ${p.paid.bank.toLocaleString()} 元于退出处置后进入公共资金，未付 ${c.unpaid.toLocaleString()} 元。`,`玩家已退出，不再领取本次保险赔款；股票和拍卖款归公共资金，不抵原债。`);
  if(!r.finishedGame){s.phase='fortune';s.pending={...structuredClone(d),id:token()};}
  emit({type:'fortuneResolved',fortuneId:d.fortuneId,title:d.title,node:d.node,skipped:p.skipped,cursor:s.fortune!.cursor,publicFund:s.news!.publicFund,change:structuredClone(c)});
 }else if(p.kind==='batch'){
  if(p.destination==='public')s.news!.publicFund+=actual;
 }else{
  s.news!.business!.loans[p.payerId]=0;s.calendar!.due[p.payerId]=null;
  s.calendar!.notices.push(structuredClone(p.notice));s.calendar!.notices=s.calendar!.notices.slice(-12);
  emit({type:'loanNotice',notice:structuredClone(p.notice)});
 }
 p.stage='completed';s.finance!.payments!.last=structuredClone(p);s.finance!.payments!.current=null;
 emit({type:'paymentCompleted',payment:structuredClone(p)});
 if(r.finishedGame)emit({type:'gameEnded',winnerId:s.finance!.winnerId!});
}
