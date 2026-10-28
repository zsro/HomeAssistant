import {sellHolding} from './stock-ledger';
import {CALENDAR_SCOPE} from './calendar-date';
import {FINAL_SCOPE} from './final-fortune';
import type {GameState,EventPayload} from './engine';
import type {PropertyDefinition,PropertyState} from './economy';
import {propertyBase} from './economy';
import {FORTUNE_FINGERPRINT} from './fortune-catalog';
import {fortuneLuck} from './fortune';
import type {FortuneChange,FortuneDecision} from './fortune';
import {hashSeed} from './random';
import {g6Draw} from './g6-random';
import {consumeCardSlot,receiveCardSlot} from './card-slots';
import {cardPrices,itemName,returnSupply} from './g3';
import {tradeAmount} from './g6-market';
import {updateCompanyOwner} from './news-business';
import {GODS,JAPAN_STOCKS} from './g6-catalog';
export const ASSET_FORTUNE_CATALOG=[{id:0,title:'建筑拆除补偿'},{id:1,title:'空地征收补偿'},{id:5,title:'向其他玩家各取一张卡'},{id:8,title:'损失一成持股'},{id:9,title:'全部持股卖出'}] as const;
export const ASSET_FORTUNE_RULES=Object.freeze({id:'japan-events-candidate-v21',version:1,base:'japan-events-candidate-v20',
 property:'owned-ordinary-numeric-order;0-built-level-times-original-upgrade-cost-cash-clear-level-type-keep-owner;1-empty-dynamic-base-cash-unown;one-target-draw-no-god-modifier',
 cards:'5-seat-order-other-active-cardholders-including-detained;human-visible-card-choice-or-skip-per-donor;separate-token-each;15-full-drop-first-cheapest-before-receive;transfer-net-zero-pool-discard-return;no-hostility-reaction-RNG',
 stocks:'8-floor-each-quantity10%-all12-even-zero-update-owner-proceeds-public;9-nonzero-all-to-bank;70-bad-cancel1-code2-no-multiplier;forced-bypass-halts;pool-quota-return;Web-total-cost-prorata-floor',
 timing:'21of37-slots;unchanged-news-fortune-initialization;time-world-restores;no-direct-fees-bankruptcy-loan-maturity-insurance-calendar' });
export const ASSET_FORTUNE_FINGERPRINT=hashSeed(JSON.stringify({base:FORTUNE_FINGERPRINT,rules:ASSET_FORTUNE_RULES,catalog:ASSET_FORTUNE_CATALOG})).toString(16);
export type AssetFortuneChanges={
 candidates?:string[];property?:{before:PropertyState;after:PropertyState;compensation:number};
 stocks?:{id:string;before:number;after:number;costBefore:number;costAfter:number;amount:number;recipient:'bank'|'public';ownerBefore:string|null;ownerAfter:string|null}[];
 cards?:{donorId:string;itemId:string|null;discarded:string|null}[];
};
export type FortuneCollection={donors:string[];index:number;items:string[];skipped:number[];change:FortuneChange};
type Emit=(e:EventPayload)=>void;
export function assetFortuneTargets(s:GameState,id:number,defs:readonly PropertyDefinition[]){
 const player=s.players[s.active].id;
 return defs.filter(d=>d.kind==='land'&&s.economy!.properties.some(p=>p.id===d.id&&p.ownerId===player&&(id===0?p.level>0:p.level===0))).sort((a,b)=>Number(a.id.split(':').at(-1))-Number(b.id.split(':').at(-1)));
}
export function assetFortuneDonors(s:GameState){return s.players.filter((p,i)=>i!==s.active&&!s.finance!.eliminated.includes(p.id)&&s.g3!.slots[p.id].length>0).map(p=>p.id);}
export function assetFortuneEligible(s:GameState,id:number,defs:readonly PropertyDefinition[]){
 if(![ASSET_FORTUNE_RULES.id,'japan-events-candidate-v22','japan-events-candidate-v23','japan-events-candidate-v24','japan-events-candidate-v25','japan-events-candidate-v38','japan-events-candidate-v39','japan-events-candidate-v40','japan-events-candidate-v41','japan-events-candidate-v43','japan-events-candidate-v44','japan-events-candidate-v45','japan-events-candidate-v46','japan-events-candidate-v47'].includes(s.rulesId))return false;
 if(id===0||id===1)return assetFortuneTargets(s,id,defs).length>0;
 if(id===5)return assetFortuneDonors(s).length>0;
 return (id===8||id===9)&&Object.values(s.g6!.holdings[s.players[s.active].id]).some(h=>h.quantity>0);
}
function initialChange(s:GameState):FortuneChange{
 const id=s.players[s.active].id,b=s.economy!.balances[id],m=s.g2!.players[id],vehicle=s.g5!.engineers[id]&&!s.g5!.engineers[id]!.suspended?'tool:12':m.vehicle;
 return {godType:0,modifier:0,code:0,amount:0,cashBefore:b.cash,cashAfter:b.cash,bankBefore:b.bank,bankAfter:b.bank,unpaid:0,returnedShares:0,sold:[],pointsBefore:s.items!.points[id],pointsAfter:s.items!.points[id],vehicleBefore:vehicle,vehicleAfter:vehicle,bankrupt:false,assets:{}};
}
function emitResult(s:GameState,d:FortuneDecision,skipped:number[],change:FortuneChange,emit:Emit){emit({type:'fortuneResolved',fortuneId:d.fortuneId,title:d.title,node:d.node,skipped,cursor:s.fortune!.cursor,publicFund:s.news!.publicFund,change});}
export function offerAssetFortune(s:GameState,id:number,defs:readonly PropertyDefinition[],skipped:number[],token:()=>string,emit:Emit){
 const player=s.players[s.active].id,b=s.economy!.balances[player],change=initialChange(s),lines:string[]=[];
 const d:FortuneDecision={kind:'fortune',id:token(),node:s.players[s.active].node,fortuneId:id,title:ASSET_FORTUNE_CATALOG.find(d=>d.id===id)!.title,lines,scope:s.calendar?CALENDAR_SCOPE:(s.rulesId==='japan-events-candidate-v23'||(s.rulesId==='japan-events-candidate-v24'||(s.rulesId==='japan-events-candidate-v25'||(s.rulesId==='japan-events-candidate-v26'||(s.rulesId === 'japan-events-candidate-v27' || (s.rulesId === 'japan-events-candidate-v28' || (s.rulesId === 'japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))?FINAL_SCOPE:(s.rulesId==='japan-events-candidate-v22'?'当前开放32项':'当前开放21项')+'命运；地产补偿进现金，损失持股所得进公共资金，全卖所得进存款。日期、贷款到期及完整公司/保险业务仍未实现。'};
 s.phase='fortune';s.pending=d;
 if(id===5){const donors=assetFortuneDonors(s);change.assets!.cards=[];d.collection={donors,index:0,items:[...new Set(s.g3!.slots[donors[0]])],skipped,change};emit({type:'fortuneCollectionOffered',donors});return;}
 if(id===0||id===1){
  const candidates=assetFortuneTargets(s,id,defs),draw=g6Draw(s.randomState,candidates.length);s.randomState=draw.state;const def=candidates[draw.index],p=s.economy!.properties.find(p=>p.id===def.id)!,before=structuredClone(p);
  const compensation=id===0?p.level*def.upgradeCost:propertyBase(p,def);b.cash+=compensation;change.amount=compensation;
  if(id===0){p.level=0;p.buildingType=0;p.research=null;}else p.ownerId=null;
  change.assets!.candidates=candidates.map(d=>d.id);change.assets!.property={before,after:structuredClone(p),compensation};
  lines.push(`${def.name}（${def.nodeIds.join('/')}号）：${id===0?`建筑 ${before.level} → 0级，产权保留`:'空地产权收回为待售'}；补偿现金 ${compensation.toLocaleString()} 元。`);
 }else{
  Object.assign(change,fortuneLuck(s,false,true));change.assets!.stocks=[];
  if(change.godType)lines.push(`${GODS.find(g=>g.type===change.godType)!.name}：${change.code===1?'取消本次持股处置':'按本项比例处理持股'}。`);
  if(change.code!==1)for(const k of [...s.g6!.stocks].sort((a,b)=>Number(a.id.slice(3))-Number(b.id.slice(3)))){
   const h=s.g6!.holdings[player][k.id];if(id===9&&!h.quantity)continue;
   const before=h.quantity,costBefore=h.cost,quantity=id===8?Math.floor(before/10):before,amount=tradeAmount(k.price,quantity),company=s.news!.business!.companies.find(c=>c.stockId===k.id),ownerBefore=company?.ownerId??null;
   sellHolding(h,quantity);k.pool+=quantity;k.quota+=quantity;
   if(id===8)s.news!.publicFund+=amount;else b.bank+=amount;
   updateCompanyOwner(s,player,k.id);
   change.assets!.stocks.push({id:k.id,before,after:h.quantity,costBefore,costAfter:h.cost,amount,recipient:id===8?'public':'bank',ownerBefore,ownerAfter:company?.ownerId??null});
   if(before)lines.push(`${JAPAN_STOCKS.find(d=>d.id===k.id)!.name}：${before} → ${h.quantity} 股；${amount.toLocaleString()} 元${id===8?'进入公共资金':'存入银行'}。`);
  }
 }
 change.cashAfter=b.cash;change.bankAfter=b.bank;
 lines.push(`现金 ${change.cashBefore.toLocaleString()} → ${b.cash.toLocaleString()}；存款 ${change.bankBefore.toLocaleString()} → ${b.bank.toLocaleString()} 元。`);
 emitResult(s,d,skipped,change,emit);
}
export function collectFortuneCard(s:GameState,decisionId:string,itemId:string|null,token:()=>string,emit:Emit){
 const d=s.pending;if(![ASSET_FORTUNE_RULES.id,'japan-events-candidate-v22','japan-events-candidate-v23','japan-events-candidate-v24','japan-events-candidate-v25','japan-events-candidate-v38','japan-events-candidate-v39','japan-events-candidate-v40','japan-events-candidate-v41','japan-events-candidate-v43','japan-events-candidate-v44','japan-events-candidate-v45','japan-events-candidate-v46','japan-events-candidate-v47'].includes(s.rulesId)||s.phase!=='fortune'||d?.kind!=='fortune'||d.id!==decisionId||!d.collection)return false;
 const c=d.collection,donor=c.donors[c.index],receiver=s.players[s.active].id;
 if(itemId!==null&&(!c.items.includes(itemId)||!s.g3!.slots[donor].includes(itemId)))return false;
 let discarded:string|null=null;
 if(itemId!==null){
  const bag=s.effects!.inventory,received=receiveCardSlot(s.g3!.slots[receiver],itemId,cardPrices)!;
  s.g3!.slots[donor]=consumeCardSlot(s.g3!.slots[donor],itemId)!;bag[donor][itemId]--;
  s.g3!.slots[receiver]=received.slots;discarded=received.discarded;
  if(discarded){bag[receiver][discarded]--;returnSupply(s,discarded);}
  bag[receiver][itemId]=(bag[receiver][itemId]??0)+1;
  d.lines.push(`从玩家${donor.split('-')[1]}取得${itemName(itemId)}${discarded?`；满15张，丢弃${itemName(discarded)}返还供应池`:''}。`);
  emit({type:'inventoryTransferred',sourceId:donor,targetId:receiver,itemId,discarded,received:true});
 }else d.lines.push(`放弃向玩家${donor.split('-')[1]}取卡。`);
 c.change.assets!.cards!.push({donorId:donor,itemId,discarded});c.index++;d.id=token();
 if(c.index<c.donors.length)c.items=[...new Set(s.g3!.slots[c.donors[c.index]])];
 else{delete d.collection;emitResult(s,d,c.skipped,c.change,emit);}
 return true;
}
