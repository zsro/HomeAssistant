import {buyHolding} from './stock-ledger';
import {priceIndex} from './price-index';
import type {GameState,EventPayload} from './engine';
import type {PropertyDefinition,PropertyState} from './economy';
import {propertyBase} from './economy';
import {maximumLevel,buildingName} from './g4';
import {godRent} from './g6';
import {JAPAN_STOCKS} from './g6-catalog';
import {updateCompanyOwner} from './news-business';
import {COMPANY_FINGERPRINT,startCompanyFee} from './company-services';
import {hashSeed} from './random';
import {COMMERCE_RULES} from './commerce-rules';
export const COMMERCE_FINGERPRINT=hashSeed(JSON.stringify({base:COMPANY_FINGERPRINT,rules:COMMERCE_RULES})).toString(16);
export type ConstructionReceipt={companyId:string;visitorId:string;ownerId:string;propertyId:string|null;before:PropertyState|null;after:PropertyState|null;attempts:number;fee:number};
export type SubscriptionReceipt={companyId:string;stockId:string;traderId:string;quantity:number;price:number;amount:number;availableBefore:number;availableAfter:number;ownerBefore:string|null;ownerAfter:string|null;holdingBefore:{quantity:number;cost:number};holdingAfter:{quantity:number;cost:number}};
export type ConstructionOption={id:string;title:string;detail:string;fee:number;buildingTypes?:number[]};
export type CommerceDecision={kind:'construction';id:string;companyId:string;ownerId:string;options:ConstructionOption[]}|{kind:'subscription';id:string;companyId:string;name:string;price:number;available:number;maximum:number};
export type CommerceEvent={type:'companyBuilt';receipt:ConstructionReceipt}|{type:'companySubscribed';receipt:SubscriptionReceipt};
type Emit=(e:EventPayload)=>void;
export function initialSubscription(stockId:string){return 10000-JAPAN_STOCKS.find(k=>k.id===stockId)!.shares;}
export function constructionOptions(s:GameState,definitions:readonly PropertyDefinition[]):ConstructionOption[]{
 const c=s.news!.business!.companies.find(c=>c.id==='japan:company:3')!,self=c.ownerId===s.players[s.active].id;
 return definitions.map(d=>{const p=s.economy!.properties.find(p=>p.id===d.id)!;return{id:p.id,title:`${d.name} · ${d.nodeIds.join('/')}号 · ${p.ownerId?'玩家'+p.ownerId.split('-')[1]:'待售'}`,detail:`${buildingName(p,d)} ${p.level}级；${self?'免费尝试建造两次':'建造一次后收费'+(propertyBase(p,d)*priceIndex(s)).toLocaleString()+'元'}，归属不变。满级仍可选择。`,fee:self?0:propertyBase(p,d)*priceIndex(s),...(d.kind==='facility'&&!p.level?{buildingTypes:[0,1,2,3,4]}:{})};});
}
export function offerSubscription(s:GameState,token:()=>string){
 if((s.rulesId!==COMMERCE_RULES.id && (s.rulesId !== 'japan-events-candidate-v29' && (s.rulesId !== 'japan-events-candidate-v30' && (s.rulesId !== 'japan-events-candidate-v31' && (s.rulesId !== 'japan-events-candidate-v32' && (s.rulesId !== 'japan-events-candidate-v33' && (s.rulesId !== 'japan-events-candidate-v34' && (s.rulesId !== 'japan-events-candidate-v35' && (s.rulesId !== 'japan-events-candidate-v36' && (s.rulesId !== 'japan-events-candidate-v37' && (s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))))))))))))))))))||s.finance!.winnerId)return false;
 const id=s.players[s.active].id,c=s.news!.business!.companies.find(c=>c.nodeIds.includes(s.players[s.active].node));
 if(!c||!['japan:company:2','japan:company:3','japan:company:4','japan:company:5'].includes(c.id)||s.finance!.eliminated.includes(id)||s.g2!.players[id].dream)return false;
 const price=Math.trunc(c.capital/10000),available=c.subscription??0,maximum=price>0?Math.min(1000,available,Math.floor(s.economy!.balances[id].cash/price)):0;
 if(maximum<1)return false;
 s.phase='commerce';s.pending={kind:'subscription',id:token(),companyId:c.id,name:c.name,price,available,maximum};return true;
}
export function offerCommerce(s:GameState,definitions:readonly PropertyDefinition[],token:()=>string){
 if((s.rulesId!==COMMERCE_RULES.id && (s.rulesId !== 'japan-events-candidate-v29' && (s.rulesId !== 'japan-events-candidate-v30' && (s.rulesId !== 'japan-events-candidate-v31' && (s.rulesId !== 'japan-events-candidate-v32' && (s.rulesId !== 'japan-events-candidate-v33' && (s.rulesId !== 'japan-events-candidate-v34' && (s.rulesId !== 'japan-events-candidate-v35' && (s.rulesId !== 'japan-events-candidate-v36' && (s.rulesId !== 'japan-events-candidate-v37' && (s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))))))))))))))))))))return false;
 const c=s.news!.business!.companies.find(c=>c.nodeIds.includes(s.players[s.active].node));
 if(c?.id==='japan:company:3'&&c.ownerId){s.phase='commerce';s.pending={kind:'construction',id:token(),companyId:c.id,ownerId:c.ownerId,options:constructionOptions(s,definitions)};return true;}
 // Insurance service is explicitly deferred; this profile adds its independently verified subscription only.
 return c?.id==='japan:company:3'||c?.id==='japan:company:4'?offerSubscription(s,token):false;
}
export function constructCompany(s:GameState,definitions:readonly PropertyDefinition[],decisionId:string,propertyId:string|null,buildingType:number|undefined,token:()=>string,emit:Emit,eliminate:(id:string)=>void){
 const pending=s.pending;if((s.rulesId!==COMMERCE_RULES.id && (s.rulesId !== 'japan-events-candidate-v29' && (s.rulesId !== 'japan-events-candidate-v30' && (s.rulesId !== 'japan-events-candidate-v31' && (s.rulesId !== 'japan-events-candidate-v32' && (s.rulesId !== 'japan-events-candidate-v33' && (s.rulesId !== 'japan-events-candidate-v34' && (s.rulesId !== 'japan-events-candidate-v35' && (s.rulesId !== 'japan-events-candidate-v36' && (s.rulesId !== 'japan-events-candidate-v37' && (s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))))))))))))))))))||s.phase!=='commerce'||pending?.kind!=='construction'||pending.id!==decisionId)return false;
 const id=s.players[s.active].id,c=s.news!.business!.companies.find(c=>c.id===pending.companyId)!;
 const option=constructionOptions(s,definitions).find(p=>p.id===propertyId);
 if((propertyId!==null&&!option)||(option?.buildingTypes?!option.buildingTypes.includes(buildingType!):buildingType!==undefined))return false;
 const p=s.economy!.properties.find(p=>p.id===propertyId),d=definitions.find(d=>d.id===propertyId),before=p?structuredClone(p):null;
 const self=c.ownerId===id,fee=self?0:(p&&d?propertyBase(p,d):1000)*priceIndex(s);let attempts=0;
 if(p&&d){const build=()=>{attempts++;if(d.kind==='facility'&&!p.level)p.buildingType=buildingType!;if(p.level<maximumLevel(p,d))p.level++;};build();if(self&&!(p.level===5&&p.level!==before!.level))build();emit({type:'g4PropertyChanged',property:structuredClone(p),reason:'日产建设'});}
 const receipt:ConstructionReceipt={companyId:c.id,visitorId:id,ownerId:c.ownerId!,propertyId,before,after:p?structuredClone(p):null,attempts,fee};s.news!.business!.construction=receipt;emit({type:'companyBuilt',receipt:structuredClone(receipt)});
 const reason=propertyId===null?(self?'经营者取消，免费':`取消建造，服务费${fee}`):self?'经营者免费建造':`日产建造，按地价${fee}元收费`;
 startCompanyFee(s,{kind:'companyFee',companyId:c.id,name:c.name,node:s.players[s.active].node,visitorId:id,ownerId:c.ownerId,base:fee,amount:godRent(s,id,fee),factor:0,dice:s.dice,days:s.calendar!.elapsedDays,reason},token,emit,eliminate);return true;
}
export function subscribeCompany(s:GameState,decisionId:string,quantity:number|null,emit:Emit){
 const p=s.pending;if((s.rulesId!==COMMERCE_RULES.id && (s.rulesId !== 'japan-events-candidate-v29' && (s.rulesId !== 'japan-events-candidate-v30' && (s.rulesId !== 'japan-events-candidate-v31' && (s.rulesId !== 'japan-events-candidate-v32' && (s.rulesId !== 'japan-events-candidate-v33' && (s.rulesId !== 'japan-events-candidate-v34' && (s.rulesId !== 'japan-events-candidate-v35' && (s.rulesId !== 'japan-events-candidate-v36' && (s.rulesId !== 'japan-events-candidate-v37' && (s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))))))))))))))))))||s.phase!=='commerce'||p?.kind!=='subscription'||p.id!==decisionId)return false;
 const id=s.players[s.active].id,c=s.news!.business!.companies.find(c=>c.id===p.companyId)!,balance=s.economy!.balances[id],price=Math.trunc(c.capital/10000),maximum=Math.min(1000,c.subscription!,Math.floor(balance.cash/price));
 if(quantity!==null&&(!Number.isSafeInteger(quantity)||quantity<1||quantity>maximum))return false;
 if(quantity!==null){const h=s.g6!.holdings[id][c.stockId],before={...h},available=c.subscription!,ownerBefore=c.ownerId,amount=quantity*price;balance.cash-=amount;c.subscription!-=quantity;buyHolding(h,quantity,amount);updateCompanyOwner(s,id,c.stockId);
 const receipt:SubscriptionReceipt={companyId:c.id,stockId:c.stockId,traderId:id,quantity,price,amount,availableBefore:available,availableAfter:c.subscription!,ownerBefore,ownerAfter:c.ownerId,holdingBefore:before,holdingAfter:{...h}};s.news!.business!.subscriptionReceipt=receipt;emit({type:'companySubscribed',receipt:structuredClone(receipt)});}
 s.phase='turnEnd';s.pending=null;return true;
}
