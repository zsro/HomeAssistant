import {queueCompanyPayment} from './payments';
import {consumerIndex} from './price-index';
import {priceIndex} from './price-index';
import {COMMERCE_RULES} from './commerce-rules';
import type {GameState,EventPayload} from './engine';
import {DIVIDEND_FINGERPRINT} from './dividends';
import {hashSeed} from './random';
import {godRent,attachedGod} from './g6';
import {openReaction,consumeG3} from './g3';
export const COMPANY_RULES=Object.freeze({id:'japan-events-candidate-v27',version:1,base:'japan-events-candidate-v26',sites:'Japan-company-type5-Toyota59/60-base700;type3-SEGA102/103-base150;landing-only;dream-code0-valid',fees:'owner-required-visitor-not-owner;Toyota700*foot0-bike1-car2-active-engineer4*current-dice*fixed-price1;SEGA150*elapsedDays-start0-no-price',reaction:'visitor-god1/2/5/6-half/zero/+half/double;amount>=2000-or-insufficient-free-then-redirect-no-recursion;positive-fee-first-other-alive-god14/15-pays',payment:'cash-then-bank;actual-payment-to-company-period-and-cumulative-int32;no-public-fund-no-owner-credit-no-alliance-owner-status-filter;no-presale',exit:'Web-insufficient-pay-available-return-shares-no-proceeds-standard-exit-no-original-auction',receipt:'Web-visible-ack-including-waived;G7-business-world;no-extra-RNG',scope:'no-Nissan-target-building-service-insurance-onsite-subscription-other-company-services'});
export const COMPANY_FINGERPRINT=hashSeed(JSON.stringify({base:DIVIDEND_FINGERPRINT,rules:COMPANY_RULES})).toString(16);
export type CompanyFee={kind:'companyFee';companyId:string;name:string;node:number;visitorId:string;ownerId:string|null;base:number;amount:number;factor:number;dice:number;days:number;reason:string};
export type ServiceReceipt=CompanyFee&{payerId:string;free:boolean;redirected:boolean;godPayer:boolean;cash:number;bank:number;paid:number;unpaid:number;bankrupt:boolean;fundsBefore:number;fundsAfter:number;cumulativeBefore:number;cumulativeAfter:number};
export type CompanyDecision={kind:'company';id:string;receipt:ServiceReceipt};
export type CompanyEvent={type:'companyService';receipt:ServiceReceipt};
type Emit=(e:EventPayload)=>void;
export function finishCompanyFee(s:GameState,c:CompanyFee,payerId:string,free:boolean,token:()=>string,emit:Emit,eliminate:(id:string)=>void){
 const company=s.news!.business!.companies.find(k=>k.id===c.companyId)!,amount=free?0:c.amount;
 const godPayer=amount?s.players.find(p=>p.id!==payerId&&!s.finance!.eliminated.includes(p.id)&&[14,15].includes(attachedGod(s,p.id)?.type??0))?.id:undefined;
 const finalPayer=godPayer??payerId,b=s.economy!.balances[finalPayer],cash=Math.min(b.cash,amount),bank=Math.min(b.bank,amount-cash),paid=cash+bank,unpaid=amount-paid;
 const fundsBefore=company.funds,cumulativeBefore=company.cumulative;
 if(unpaid&&queueCompanyPayment(s,{...c,payerId:finalPayer,free,redirected:payerId!==c.visitorId,godPayer:!!godPayer,cash,bank,paid,unpaid,bankrupt:true,fundsBefore,fundsAfter:fundsBefore,cumulativeBefore,cumulativeAfter:cumulativeBefore}))return;
 b.cash-=cash;b.bank-=bank;
 company.funds=(company.funds+paid)|0;company.cumulative=(company.cumulative+paid)|0;
 if(unpaid){for(const k of s.g6!.stocks){const h=s.g6!.holdings[finalPayer][k.id];k.pool+=h.quantity;k.quota+=h.quantity;h.quantity=0;h.cost=0;if(h.average!==undefined)h.average=0;}eliminate(finalPayer);const alive=s.players.filter(p=>!s.finance!.eliminated.includes(p.id));if(alive.length===1)s.finance!.winnerId=alive[0].id;}
 const receipt:ServiceReceipt={...c,payerId:finalPayer,free,redirected:payerId!==c.visitorId,godPayer:!!godPayer,cash,bank,paid,unpaid,bankrupt:!!unpaid,fundsBefore,fundsAfter:company.funds,cumulativeBefore,cumulativeAfter:company.cumulative};
 s.news!.business!.service=receipt;s.phase='company';s.pending={kind:'company',id:token(),receipt:structuredClone(receipt)};emit({type:'companyService',receipt:structuredClone(receipt)});
}
export function offerCompany(s:GameState,token:()=>string,emit:Emit,eliminate:(id:string)=>void){
 if((s.rulesId !== COMPANY_RULES.id && (s.rulesId !== COMMERCE_RULES.id && (s.rulesId !== 'japan-events-candidate-v29' && (s.rulesId !== 'japan-events-candidate-v30' && (s.rulesId !== 'japan-events-candidate-v31' && (s.rulesId !== 'japan-events-candidate-v32' && (s.rulesId !== 'japan-events-candidate-v33' && (s.rulesId !== 'japan-events-candidate-v34' && (s.rulesId !== 'japan-events-candidate-v35' && (s.rulesId !== 'japan-events-candidate-v36' && (s.rulesId !== 'japan-events-candidate-v37' && (s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))))))))))))))))))))return false;
 const visitor=s.players[s.active],company=s.news!.business!.companies.find(c=>['japan:company:2','japan:company:5'].includes(c.id)&&c.nodeIds.includes(visitor.node));
 if(!company||s.finance!.eliminated.includes(visitor.id))return false;
 const vehicle=s.g2!.players[visitor.id].vehicle,factor=s.g5!.engineers[visitor.id]&&!s.g5!.engineers[visitor.id]!.suspended?4:vehicle==='tool:06'?2:vehicle==='tool:05'?1:0,days=s.calendar!.elapsedDays;
 const raw=company.id==='japan:company:2'?700*factor*s.dice*priceIndex(s):150*days;
 const reason=!company.ownerId?'尚无经营者':company.ownerId===visitor.id?'经营者本人免付':!raw?(company.id==='japan:company:2'?'步行或本次点数为0':'已过0天'):company.id==='japan:company:2'?`700 × 车辆系数${factor} × 本次点数${s.dice}${s.calendar?.business?' × 物价'+priceIndex(s):''}`:`150 × 已过${days}天`;
 const base=!company.ownerId||company.ownerId===visitor.id?0:raw,amount=godRent(s,visitor.id,base);
 const c:CompanyFee={kind:'companyFee',companyId:company.id,name:company.name,node:visitor.node,visitorId:visitor.id,ownerId:company.ownerId,base,amount,factor,dice:s.dice,days,reason};
 startCompanyFee(s,c,token,emit,eliminate);return true;
}
export function startCompanyFee(s:GameState,c:CompanyFee,token:()=>string,emit:Emit,eliminate:(id:string)=>void){
 const id=c.visitorId,amount=c.amount,b=s.economy!.balances[id];
 if(amount>0&&(amount>=2000*consumerIndex(s)||amount>b.cash+b.bank)){
  if(s.effects!.inventory[id]['card:20']>0){openReaction(s,c,id,'free',token,emit);return;}
  if(s.effects!.inventory[id]['card:19']>0){openReaction(s,c,id,'redirect',token,emit);return;}
 }
 finishCompanyFee(s,c,id,false,token,emit,eliminate);
}

export function reactCompany(s:GameState,choice:'use'|'decline',targetId:string|undefined,token:()=>string,emit:Emit,eliminate:(id:string)=>void){
 const p=s.pending;if(p?.kind!=='reaction'||p.continuation.kind!=='companyFee'||!['use','decline'].includes(choice)||(targetId!==undefined&&(choice==='decline'||p.stage==='free'))||(choice==='use'&&p.stage==='redirect'&&!p.targets.includes(targetId!)))return false;
 if(choice==='use'&&!consumeG3(s,p.responderId,p.stage==='free'?'card:20':'card:19',emit))return false;
 emit({type:'reactionAnswered',responderId:p.responderId,stage:p.stage,choice,...(targetId?{targetId}:{})});
 if(p.stage==='free'&&choice==='decline'&&s.effects!.inventory[p.responderId]['card:19']>0)openReaction(s,p.continuation,p.responderId,'redirect',token,emit);
 else finishCompanyFee(s,p.continuation,p.stage==='redirect'&&choice==='use'?targetId!:p.responderId,p.stage==='free'&&choice==='use',token,emit,eliminate);
 return true;
}
