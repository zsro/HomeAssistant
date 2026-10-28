import type {GameState,EventPayload} from './engine';
import type {PropertyDefinition} from './economy';
import {propertyBase} from './economy';
import {priceIndex} from './price-index';
import {actionLocked} from './g2';
import {INDEXED_FINGERPRINT} from './indexed-economy';
import {hashSeed} from './random';
export const ESTATE_RULES=Object.freeze({id:'japan-events-candidate-v32',version:1,base:'japan-events-candidate-v31',auction:'trunc(raw-base*(1+level*0.5))*index;cash>reserve;exclude-source-and-hotel-travel-prison-hospital-winter-dream;stop-not-excluded;Web-hotseat-increments-retained;winner-cash-source-bank-or-public;no-bid-unown',sales:'Web-before-roll-unlocked;property-only-seven-slots-per-player;same-property-replace-in-place;no-escrow;quote=(raw-base+level*cost)*index;price1..10quote;zero-input-cancel-via-Web-form;buy-cash-only-exact-allowed-to-seller-bank;retain-building;remove-record-on-trade',records:'id-changes-on-reprice;type-level-owner-snapshot;Web-prune-after-accepted-mutation-and-before-trade;price-field-changes-not-invalidating;age-byte-wrap-daily-after-price-before-market-no-expiry;exited-seller-cleared;G7-finance-world',news:'v32-restores-operating6-7-12-and-status0-1-2-3-16-17-dispatch-gates-missed-after-v21;old-replays-frozen',boundary:'existing-research-ownership-cleanup;no-stock-tool-card-listings;no-original-input-window-AI;bankruptcy-source-exits-before-auction-and-only-random-three-if-more-than-three-properties;full-forced-disposal-deferred'});
export const ESTATE_FINGERPRINT=hashSeed(JSON.stringify({base:INDEXED_FINGERPRINT,rules:ESTATE_RULES})).toString(16);
export type SaleRecord={id:string;sellerId:string;propertyId:string;price:number;level:number;buildingType:number;age:number};
export type SaleReceipt={listing:SaleRecord;buyerId:string;cashBefore:number;cashAfter:number;bankBefore:number;bankAfter:number};
export type SaleState={serial:number;records:Record<string,SaleRecord[]>;last:SaleReceipt|null};
export type SaleAction={type:'listProperty';propertyId:string;price:number}|{type:'cancelListing';listingId:string}|{type:'buyListing';listingId:string;price:number};
export type SaleEvent={type:'propertyListed';record:SaleRecord;replaced:string|null}|{type:'listingRemoved';listingId:string;reason:'cancelled'|'changed'|'sold'}|{type:'saleCompleted';receipt:SaleReceipt}|{type:'salesAged';date:string;records:{id:string;age:number}[]};
type Emit=(e:EventPayload)=>void;
export function initializeSales(s:GameState){if((s.rulesId === ESTATE_RULES.id || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))))))))s.finance!.sales={serial:0,records:Object.fromEntries(s.players.map(p=>[p.id,[]])),last:null};}
export function salesAvailable(s:GameState){const id=s.players[s.active].id;return !!s.finance?.sales&&s.phase==='idle'&&!s.paused&&!s.finance.eliminated.includes(id)&&!actionLocked(s.g2!.players[id])&&!s.g2!.players[id].stop&&!s.g4!.hotel[id];}
export function saleQuote(s:GameState,d:PropertyDefinition){const p=s.economy!.properties.find(p=>p.id===d.id)!;return(propertyBase(p,d)+p.level*d.upgradeCost)*priceIndex(s);}
export function pruneSales(s:GameState,emit:Emit){const sales=s.finance?.sales;if(!sales)return;for(const [id,rows]of Object.entries(sales.records))sales.records[id]=rows.filter(r=>{const p=s.economy!.properties.find(p=>p.id===r.propertyId),valid=!s.finance!.eliminated.includes(id)&&p?.ownerId===id&&p.level===r.level&&(p.buildingType??0)===r.buildingType;if(!valid)emit({type:'listingRemoved',listingId:r.id,reason:'changed'});return valid;});}
export function ageSales(s:GameState,emit:Emit){const sales=s.finance?.sales;if(!sales)return;const records: {id:string;age:number}[]=[];for(const [id,rows]of Object.entries(sales.records)){if(s.finance!.eliminated.includes(id))continue;for(const r of rows){r.age=(r.age+1)&255;records.push({id:r.id,age:r.age});}}if(records.length)emit({type:'salesAged',date:s.calendar!.date,records});}
export function operateSales(s:GameState,defs:readonly PropertyDefinition[],action:SaleAction,emit:Emit){
 if(!salesAvailable(s))return false;
 const id=s.players[s.active].id,sales=s.finance!.sales!;pruneSales(s,emit);
 if(action.type==='listProperty'){
  const p=s.economy!.properties.find(p=>p.id===action.propertyId),d=defs.find(d=>d.id===action.propertyId);if(!p||!d||p.ownerId!==id)return false;
  const rows=sales.records[id],at=rows.findIndex(r=>r.propertyId===p.id),maximum=saleQuote(s,d)*10;
  if(!Number.isSafeInteger(action.price)||action.price<1||action.price>maximum||(at<0&&rows.length>=7))return false;
  const record:SaleRecord={id:'sale-'+(++sales.serial),sellerId:id,propertyId:p.id,price:action.price,level:p.level,buildingType:p.buildingType??0,age:0},replaced=at<0?null:rows[at].id;
  if(at<0)rows.push(record);else rows[at]=record;emit({type:'propertyListed',record:{...record},replaced});return true;
 }
 const r=Object.values(sales.records).flat().find(r=>r.id===action.listingId);if(!r)return false;
 if(action.type==='cancelListing'){if(r.sellerId!==id)return false;sales.records[id]=sales.records[id].filter(x=>x.id!==r.id);emit({type:'listingRemoved',listingId:r.id,reason:'cancelled'});return true;}
 if(r.sellerId===id||action.price!==r.price)return false;
 const buyer=s.economy!.balances[id],seller=s.economy!.balances[r.sellerId];if(buyer.cash<r.price||!Number.isSafeInteger(seller.bank+r.price))return false;
 const receipt:SaleReceipt={listing:{...r},buyerId:id,cashBefore:buyer.cash,cashAfter:buyer.cash-r.price,bankBefore:seller.bank,bankAfter:seller.bank+r.price};
 buyer.cash-=r.price;seller.bank+=r.price;s.economy!.properties.find(p=>p.id===r.propertyId)!.ownerId=id;sales.records[r.sellerId]=sales.records[r.sellerId].filter(x=>x.id!==r.id);sales.last=receipt;
 emit({type:'saleCompleted',receipt:structuredClone(receipt)});emit({type:'listingRemoved',listingId:r.id,reason:'sold'});return true;
}
