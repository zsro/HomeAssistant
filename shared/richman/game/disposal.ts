import {removePlayerGod} from './god-pairs';
import type {GameState,EventPayload} from './engine';
import type {DebtDecision} from './finance';
import type {PropertyDefinition,Balance} from './economy';
import {ESTATE_FINGERPRINT,pruneSales} from './estate-sales';
import {hashSeed} from './random';
import {g6Draw} from './g6-random';
import {auctionReserve,settleAuction} from './g4';
import type {AuctionDecision} from './g4';
import {actionLocked,emptyMobility} from './g2';
import {breakAlliance,returnSupply,cardPrices} from './g3';
import {TOOL_SELL_PRICES} from './fortune-catalog';
import {releaseLottery} from './lottery';
import {updateCompanyOwner} from './news-business';
import {removeHazard} from './g5';
export const DISPOSAL_RULES=Object.freeze({id:'japan-events-candidate-v33',version:1,base:'japan-events-candidate-v32',scope:'rent-debt-only-after-existing-free-redirect-stock-rescue;other-payment-callbacks-legacy-explicitly-deferred',exit:'mark-dead-zero-money-points-loans-insurance-status-gods-carried-hazards-alliance;vehicle-retained-until-tools;final-human-survivor-ends-before-estate-stock-bag-lottery-disposal;Web-prunes-listings-immediately',assets:'lands-then-facilities-numeric-release-keep-level-kind-base-price-status;cancel-research;company-clear-then-share-rank;all-12-shares-trunc(f32-price*quantity)-public-pool-quota-return;tools-including-equipped-and-cards-return-supply;ignore-returned-sale-points;lottery-release-no-refund',auction:'only-owned-count>3;exactly3;seeded-repeated-full-array-index-reject-already-selected;draw-next-after-settlement;released-land-and-facility;source-public;cash>reserve;v32-price-and-eligibility;no-bid-counts;Web-hotseat-increments',continuation:'freeze-liquid-actual-paid-before-exit;credit-recipient-bank-after-all-auctions;no-sale-proceeds-to-debtor-creditor;resume-original-active-turnEnd-or-finished;no-roll-dates-market-during-auction;G7-restores-finance-world',boundary:'no-special-actors-human-vs-AI-defeat-menus;original-exit-callbacks-outside-rent-deferred;no-original-RNG-or-timed-auction-UI;safe-money-model'});
export const DISPOSAL_FINGERPRINT=hashSeed(JSON.stringify({base:ESTATE_FINGERPRINT,rules:DISPOSAL_RULES})).toString(16);
export type DisposalReceipt={continuation?:'payment'|'surrender';id:string;payerId:string;recipientId:string;propertyId:string;due:number;amount:number;unpaid:number;paid:Balance;released:string[];pool:(string|null)[];draws:number[];stocks:{stockId:string;quantity:number;price:number;amount:number}[];inventory:{itemId:string;quantity:number;points:number}[];ignoredPoints:number;auctions:{propertyId:string;winnerId:string|null;amount:number;reserve:number}[];finishedGame:boolean};
export type DisposalState={serial:number;current:DisposalReceipt|null;last:DisposalReceipt|null};
export type DisposalEvent={type:'disposalStarted';receipt:DisposalReceipt}|{type:'disposalAssets';receipt:DisposalReceipt}|{type:'disposalDrawn';disposalId:string;index:number;propertyId:string|null}|{type:'disposalCompleted';receipt:DisposalReceipt};
type Emit=(e:EventPayload)=>void;
function complete(s:GameState,emit:Emit){const d=s.finance!.disposal!,r=d.current!;if(!r.continuation){s.economy!.balances[r.recipientId].bank+=r.amount;emit({type:'debtSettled',payerId:r.payerId,propertyId:r.propertyId,recipientId:r.recipientId,due:r.due,amount:r.amount,unpaid:r.unpaid,paid:{...r.paid}});}d.last=structuredClone(r);d.current=null;s.pending=null;s.remaining=0;s.phase=r.finishedGame?'finished':'turnEnd';emit({type:'disposalCompleted',receipt:structuredClone(r)});}
/** Called only by settleDebt: earlier rent stock rescue is intentionally retained. */
export function beginRentDisposal(s:GameState,defs:readonly PropertyDefinition[],debt:DebtDecision,token:()=>string,emit:Emit,cleanupEffects:()=>void,continuation?:'payment'|'surrender'){
 const id=debt.payerId??s.players[s.active].id,f=s.finance!,d=f.disposal!,b=s.economy!.balances[id],paid=continuation==='surrender'?{cash:0,bank:0}:{...b};
 const r:DisposalReceipt={...(continuation?{continuation}:{}),id:'disposal-'+(++d.serial),payerId:id,recipientId:debt.recipientId,propertyId:debt.propertyId,due:debt.amount,amount:paid.cash+paid.bank,unpaid:debt.amount-paid.cash-paid.bank,paid,released:[],pool:[],draws:[],stocks:[],inventory:[],ignoredPoints:0,auctions:[],finishedGame:false};d.current=r;
 f.eliminated.push(id);b.cash=0;b.bank=0;emit({type:'pointsCleared',amount:s.items!.points[id]});s.items!.points[id]=0;
 breakAlliance(s,id,'破产解除同盟',emit);removePlayerGod(s,id,emit);
 for(const h of [...s.g5!.hazards])if(h.carrier===id)removeHazard(s,h.id,emit,'携带者破产');
 const vehicle=s.g2!.players[id].vehicle,engineer=s.g5!.engineers[id];s.g2!.players[id]={...emptyMobility(),vehicle,diceCount:s.g2!.players[id].diceCount};s.g4!.hotel[id]=0;
 delete s.g1!.facing[id];for(const key of ['prison','hospital'] as const)s.news!.detention![key]=s.news!.detention![key].filter(p=>p!==id);
 const business=s.news!.business!,loan=business.loans[id];business.loans[id]=0;business.noLoans[id]=0;if(business.bankRejected)business.bankRejected[id]=0;if(business.insurance)business.insurance.terms[id]=0;
 if(loan)emit({type:'loanChanged',targetId:id,operation:'writeoff',amount:loan,debt:0,balance:{...b}});
 const alive=s.players.filter(p=>!f.eliminated.includes(p.id));r.finishedGame=alive.length===1;
 emit({type:'disposalStarted',receipt:structuredClone(r)});
 if(r.finishedGame){f.winnerId=alive[0].id;emit({type:'bankrupt',payerId:id,released:[]});pruneSales(s,emit);complete(s,emit);if(!continuation)emit({type:'gameEnded',winnerId:alive[0].id});return;}
 const owned=defs.filter(def=>s.economy!.properties.find(p=>p.id===def.id)!.ownerId===id).sort((a,b)=>Number(a.kind==='facility')-Number(b.kind==='facility')||Number(a.id.split(':').at(-1))-Number(b.id.split(':').at(-1)));
 for(const def of owned){const p=s.economy!.properties.find(p=>p.id===def.id)!;p.ownerId=null;p.research=null;r.released.push(p.id);}r.pool=[...r.released];
 for(const c of business.companies)if(c.ownerId===id)c.ownerId=null;
 for(const k of [...s.g6!.stocks].sort((a,b)=>Number(a.id.slice(3))-Number(b.id.slice(3)))){const h=s.g6!.holdings[id][k.id];if(!h.quantity)continue;const quantity=h.quantity,amount=Math.trunc(Math.fround(k.price/100)*quantity);r.stocks.push({stockId:k.id,quantity,price:k.price,amount});s.news!.publicFund+=amount;k.pool+=quantity;k.quota+=quantity;h.quantity=0;h.cost=0;if(h.average!==undefined)h.average=0;updateCompanyOwner(s,id,k.id);}
 const bag=s.effects!.inventory[id],equipped=engineer&&!engineer.suspended?'tool:12':vehicle;if(equipped!=='foot')bag[equipped]=(bag[equipped]??0)+1;
 for(const [itemId,quantity] of Object.entries(bag))if(quantity>0){const price=itemId.startsWith('card:')?cardPrices[itemId]:TOOL_SELL_PRICES[Number(itemId.slice(5))];r.inventory.push({itemId,quantity,points:price*quantity});r.ignoredPoints+=price*quantity;if(!(continuation==='surrender'&&itemId.startsWith('tool:')&&Number(itemId.slice(5))>=9))returnSupply(s,itemId,quantity);}
 s.g2!.players[id]=emptyMobility();s.g5!.engineers[id]=null;cleanupEffects();releaseLottery(s,id,emit);pruneSales(s,emit);
 emit({type:'bankrupt',payerId:id,released:[...r.released]});emit({type:'disposalAssets',receipt:structuredClone(r)});s.pending=null;s.remaining=0;s.phase='turnEnd';continueDisposal(s,defs,token,emit);
}
/** Resumes the suspended rent payment after the public auction sequence. */
export function continueDisposal(s:GameState,defs:readonly PropertyDefinition[],token:()=>string,emit:Emit){
 const r=s.finance?.disposal?.current;if(!r||s.pending?.kind==='auction')return;
 while(r.released.length>3&&r.auctions.length<3){
  let propertyId:string|null;
  do{const draw=g6Draw(s.randomState,r.pool.length);s.randomState=draw.state;propertyId=r.pool[draw.index];r.draws.push(draw.index);emit({type:'disposalDrawn',disposalId:r.id,index:draw.index,propertyId});if(propertyId)r.pool[draw.index]=null;}while(!propertyId);
  const p=s.economy!.properties.find(p=>p.id===propertyId)!,def=defs.find(d=>d.id===propertyId)!,reserve=auctionReserve(p,def,s);
  const remaining=s.players.filter(p=>!s.finance!.eliminated.includes(p.id)&&!actionLocked(s.g2!.players[p.id])&&!s.g4!.hotel[p.id]&&s.economy!.balances[p.id].cash>reserve).map(p=>p.id);
  const a:AuctionDecision={kind:'auction',id:token(),propertyId,sourceId:'public',originalOwner:null,reserve,bid:reserve,leader:null,responderId:remaining[0]??r.payerId,remaining,disposalId:r.id};s.phase='auction';s.pending=a;
  if(remaining.length){emit({type:'auctionOffered',decision:structuredClone(a)});return;}
  // Same no-bid settlement path, no synthetic command and no cash movement.
  settleAuction(s,a,emit);
 }
 complete(s,emit);
}
