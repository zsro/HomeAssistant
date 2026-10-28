import type {GameState,EventPayload} from './engine';
import type {ShopDecision} from './items';
import {SITE_SERVICES_FINGERPRINT} from './site-services';
import {cardPrices,returnSupply} from './g3';
import {receiveRandomCard} from './g6';
import {g6Draw} from './g6-random';
import {TOOL_SELL_PRICES} from './fortune-catalog';
import {hashSeed} from './random';
export const SHOP_ACQUISITION_RULES=Object.freeze({id:'japan-events-candidate-v40',version:1,base:'japan-events-candidate-v39',gift:'company1-current-operator-before-human-shelf;coin-card/tool;weighted-current-pool;card-full-replace-first-cheapest;tool1..8-full9-no-retry-no-consume;empty-no-fallback;free-no-turnover;continue-shop',shelf:'draw6..15-card-slots-weighted-without-replacement-from-copy-after-gift;duplicates-allowed;global-pool-unreserved;tools1..8-positive-one-slot-each;buy-consumes-one-slot;no-refill-on-sell-toggle-or-pause;new-visit-rebuilds-from-current-pool',supply:'reuse-all30-card-and8-tool-pools;purchase/receive-decrement;use/sell-return;no-periodic-synthetic-refill;card-buy-cap15-tool-buy-per-kind9;no-research-tools-on-shelf',random:'existing-v12-seeded-range-not-native-rand-or-voice-draws;empty/small-card-pool-cap-slots-to-total-instead-of-native-mod0',scope:'human-hotseat;special-actors-native-shop-animation-AI-and-exact-RNG-deferred'});
export const SHOP_ACQUISITION_FINGERPRINT=hashSeed(JSON.stringify({base:SITE_SERVICES_FINGERPRINT,rules:SHOP_ACQUISITION_RULES})).toString(16);
export type ShopGift={kind:'card'|'tool';itemId:string|null;received:boolean;discarded:string|null;reason:'received'|'empty'|'full'};
export type ShopShelf={requested:number;cards:{itemId:string;available:boolean}[];tools:{itemId:string;available:boolean}[];gift:ShopGift|null};
export type ShopAcquisitionEvent={type:'shopGift';receipt:ShopGift}|{type:'shopShelf';shelf:ShopShelf};
export const SHOP_CARDS=Object.keys(cardPrices).sort();
export const SHOP_TOOLS=Array.from({length:8},(_,i)=>`tool:${String(i+1).padStart(2,'0')}`);
export function shopSupply(s:GameState,id:string){if(id==='card:01')return s.wealth!.supply;if(id==='card:02')return s.cards!.supply;if(id==='tool:08')return s.items!.supply;return[s.g6,s.g5,s.g4,s.g3,s.g2,s.g1,s.roadTools].find(v=>v&&id in v.supply)?.supply[id]??0;}
export const shopPrice=(id:string)=>id.startsWith('card:')?cardPrices[id]:TOOL_SELL_PRICES[Number(id.slice(5))];
function draw(s:GameState,n:number){const r=g6Draw(s.randomState,n);s.randomState=r.state;return r.index;}
function weighted(s:GameState,ids:readonly string[]){return ids.flatMap(id=>Array.from({length:shopSupply(s,id)},()=>id));}
export function prepareShop(s:GameState,d:ShopDecision,emit:(e:EventPayload)=>void){
 if((s.rulesId!==SHOP_ACQUISITION_RULES.id && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))))))))return;
 const id=s.players[s.active].id,company=s.news!.business!.companies.find(c=>c.id===d.companyId)!;let gift:ShopGift|null=null;
 if(company.ownerId===id){
  const kind=draw(s,2)===0?'card':'tool';
  if(kind==='card'){const received=receiveRandomCard(s,id,()=>{});gift={kind,itemId:received?.itemId??null,received:!!received,discarded:received?.discarded??null,reason:received?'received':'empty'};}
  else{const pool=weighted(s,SHOP_TOOLS),itemId=pool.length?pool[draw(s,pool.length)]:null,bag=s.effects!.inventory[id],received=!!itemId&&(bag[itemId]??0)<9;if(received){bag[itemId!]=(bag[itemId!]??0)+1;returnSupply(s,itemId!,-1);}gift={kind,itemId,received,discarded:null,reason:!itemId?'empty':received?'received':'full'};}
  emit({type:'shopGift',receipt:structuredClone(gift)});
 }
 const requested=6+draw(s,10),pool=weighted(s,SHOP_CARDS),cards:ShopShelf['cards']=[];
 // Native assumes enough cards for every draw. Safely truncate a depleted shelf, without inventing stock.
 while(cards.length<requested&&pool.length){const index=draw(s,pool.length);cards.push({itemId:pool.splice(index,1)[0],available:true});}
 d.shelf={requested,cards,tools:SHOP_TOOLS.filter(id=>shopSupply(s,id)>0).map(itemId=>({itemId,available:true})),gift};emit({type:'shopShelf',shelf:structuredClone(d.shelf)});
}
export function buyFromShelf(s:GameState,itemId:string,token:()=>string,emit:(e:EventPayload)=>void){
 const d=s.pending;if((s.rulesId!==SHOP_ACQUISITION_RULES.id && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))))))||s.phase!=='shop'||d?.kind!=='shop'||!d.shelf)return false;
 const slot=[...d.shelf.cards,...d.shelf.tools].find(x=>x.itemId===itemId&&x.available),who=s.players[s.active].id,bag=s.effects!.inventory[who],price=shopPrice(itemId);
 if(!slot||shopSupply(s,itemId)<=0||s.items!.points[who]<price|| (itemId.startsWith('card:')?s.g3!.slots[who].length>=15:(bag[itemId]??0)>=9))return false;
 bag[itemId]=(bag[itemId]??0)+1;if(itemId.startsWith('card:'))s.g3!.slots[who].push(itemId);returnSupply(s,itemId,-1);s.items!.points[who]-=price;slot.available=false;d.id=token();emit({type:'itemBought',itemId,cost:price,points:s.items!.points[who],supply:shopSupply(s,itemId)});return true;
}
