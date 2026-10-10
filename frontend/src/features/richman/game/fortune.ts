import {queueFortunePayment} from './payments';
import {consumerIndex} from './price-index';
import {claimInsurance} from './insurance-state';
import {CALENDAR_SCOPE} from './calendar-date';
import {finalFortuneEligible,offerFinalFortune,FINAL_SCOPE} from './final-fortune';
import type {FinalFortuneChange} from './final-fortune';
import {trafficFortuneHandler,offerTrafficFortune,TRAFFIC_SCOPE} from './traffic-fortune';
import type {TrafficFortuneChange} from './traffic-fortune';
import type {MapNode} from '../types';
export * from './fortune-catalog';
import {FORTUNE_CATALOG,FORTUNE_NODES,FORTUNE_GOD_MONEY,FORTUNE_GOD_RESISTANCE,TOOL_SELL_PRICES} from './fortune-catalog';
import {assetFortuneEligible, offerAssetFortune} from './asset-fortune';
import type {AssetFortuneChanges, FortuneCollection} from './asset-fortune';
import type {PropertyDefinition} from './economy';
import type { GameState, EventPayload } from './engine';
import { g6Draw } from './g6-random';
import { paymentSplit } from './economy';
import { cardPrices, returnSupply, syncCardSlots, itemName } from './g3';
import { GODS } from './g6-catalog';

export type FortuneState = { order:number[]; cursor:number };
export type FortuneDecision = { kind:'fortune'; id:string; node:number; fortuneId:number; title:string; lines:string[]; scope?:string; collection?:FortuneCollection };
export type FortuneChange = {
 final?:FinalFortuneChange; traffic?:TrafficFortuneChange; assets?:AssetFortuneChanges; godType:number; modifier:number; code:number; amount:number; cashBefore:number; cashAfter:number; bankBefore:number; bankAfter:number;
 unpaid:number; returnedShares:number; sold:{itemId:string;count:number;price:number}[]; pointsBefore:number; pointsAfter:number;
 vehicleBefore:string; vehicleAfter:string; bankrupt:boolean;
};
export type FortuneEvent = {type:'fortuneCollectionOffered';donors:string[]}| {type:'fortuneResolved';fortuneId:number;title:string;node:number;skipped:number[];cursor:number;publicFund:number;change:FortuneChange}|{type:'fortuneSkipped';skipped:number[]};
export function initializeFortune(s:GameState) {
 const remaining=Array.from({length:37},(_,i)=>i),order:number[]=[];
 while(remaining.length){const d=g6Draw(s.randomState,remaining.length);s.randomState=d.state;order.push(remaining.splice(d.index,1)[0]);}
 s.fortune={order,cursor:0};
}
export function fortuneLuck(s:GameState, inventory:boolean, bad:boolean) {
 const godType=s.g6!.gods.find(g=>g.carrier===s.players[s.active].id)?.type??0;
 const modifier=(inventory?FORTUNE_GOD_RESISTANCE:FORTUNE_GOD_MONEY)[godType]??0;
 let code=0;
 if(modifier<0)code=bad?2:1;
 else if(modifier>100)code=bad?1:2;
 else if(modifier>50){const d=g6Draw(s.randomState,2);s.randomState=d.state;code=d.index*(bad?1:2);}
 return {godType,modifier,code};
}
export function applyFortune(s:GameState,fortuneId:number,eliminate?:(id:string)=>void,emit:(e:EventPayload)=>void=()=>{}) {
 const def=FORTUNE_CATALOG.find(d=>d.id===fortuneId);if(!def)throw new Error('Unsupported fortune');
 const id=s.players[s.active].id,b=s.economy!.balances[id],m=s.g2!.players[id],engineer=s.g5!.engineers[id];
 const luck=fortuneLuck(s,fortuneId===32,def.amount<0||fortuneId===32),lines:string[]=[];
 const change:FortuneChange={...luck,amount:0,cashBefore:b.cash,cashAfter:b.cash,bankBefore:b.bank,bankAfter:b.bank,unpaid:0,returnedShares:0,sold:[],pointsBefore:s.items!.points[id],pointsAfter:s.items!.points[id],vehicleBefore:engineer&&!engineer.suspended?'tool:12':m.vehicle,vehicleAfter:m.vehicle,bankrupt:false};
 if(luck.godType)lines.push(`${GODS.find(g=>g.type===luck.godType)?.name??'神仙'}：${luck.code===1?'本次命运取消':luck.code===2&&fortuneId!==32?'金额加倍':'按原规则结算'}。`);
 if(luck.code!==1){
  if(fortuneId===32){
   const bag=s.effects!.inventory[id],vehicle=change.vehicleBefore;
   if(vehicle!=='foot')bag[vehicle]=(bag[vehicle]??0)+1;
   m.vehicle='foot';m.diceCount=1;
   if(engineer&&!engineer.suspended)s.g5!.engineers[id]=null;
   let points=0;
   for(const [itemId,count] of Object.entries(bag))if(count>0){
    const price=itemId.startsWith('card:')?cardPrices[itemId]:TOOL_SELL_PRICES[Number(itemId.slice(5))];
    if(price===undefined)throw new Error(`Unknown sale price: ${itemId}`);
    points+=count*price;change.sold.push({itemId,count,price});returnSupply(s,itemId,count);bag[itemId]=0;
    lines.push(`${itemName(itemId)} × ${count}：${count*price} 点。`);
   }
   syncCardSlots(s);s.items!.points[id]=(s.items!.points[id]+points)&65535;
   lines.push(`变卖合计 ${points} 点，点数 ${change.pointsBefore} → ${s.items!.points[id]}；恢复步行、1骰。`);
  }else{
   change.amount=def.amount*consumerIndex(s)*(luck.code===2?2:1);
   if(change.amount>0){b.cash+=change.amount;lines.push(`获得现金 ${change.amount.toLocaleString()} 元。`);}
   else{
    const due=-change.amount,available=b.cash+b.bank,paid=paymentSplit(b,Math.min(due,available),true)!;
    if(due>available&&queueFortunePayment(s,id,due,change,null,[],def.title))return {change,lines,title:def.title};
    b.cash-=paid.cash;b.bank-=paid.bank;s.news!.publicFund+=paid.cash+paid.bank;change.unpaid=Math.max(0,due-available);change.bankrupt=due>available;
    if(change.bankrupt){
     if(!eliminate)throw new Error('Fortune insolvency requires elimination handler');
     for(const stock of s.g6!.stocks){const h=s.g6!.holdings[id][stock.id];change.returnedShares+=h.quantity;stock.pool+=h.quantity;stock.quota+=h.quantity;h.quantity=0;h.cost=0;if(h.average!==undefined)h.average=0;}
     eliminate(id);
     const survivors=s.players.filter(p=>!s.finance!.eliminated.includes(p.id));if(survivors.length===1)s.finance!.winnerId=survivors[0].id;
    }
    const claim=claimInsurance(s,id,due,'命运：'+def.title,emit);if(claim)lines.push(`保险现金赔付 ${claim.amount.toLocaleString()} 元。`);
    lines.push(`应付 ${due.toLocaleString()} 元；现金 ${paid.cash.toLocaleString()}＋存款 ${paid.bank.toLocaleString()} 元${change.bankrupt?`，未付 ${change.unpaid} 元，破产退出（持股归池，不抵欠款）`:''}。`);
   }
  }
 }else lines.push('资金、背包及车辆不变。');
 change.cashAfter=b.cash;change.bankAfter=b.bank;change.pointsAfter=s.items!.points[id];change.vehicleAfter=s.g5!.engineers[id]&&!s.g5!.engineers[id]!.suspended?'tool:12':m.vehicle;
 if(fortuneId!==32)lines.push(`现金 ${change.cashBefore.toLocaleString()} → ${b.cash.toLocaleString()}；存款 ${change.bankBefore.toLocaleString()} → ${b.bank.toLocaleString()} 元。`);
 return {change,lines,title:def.title};
}
export function offerFortune(s:GameState,token:()=>string,emit:(e:EventPayload)=>void,eliminate:(id:string)=>void,defs:readonly PropertyDefinition[]=[],nodes:readonly MapNode[]=[]) {
 const p=s.players[s.active];const nested=(s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))))))&&s.magic?.nested?.waiting==='fortune';if(!s.fortune||(!nested&&(!(FORTUNE_NODES as readonly number[]).includes(p.node)||s.g2!.players[p.id].dream)))return false;
 const skipped:number[]=[];
 for(let i=0;i<37;i++){
  const id=s.fortune.order[s.fortune.cursor];s.fortune.cursor=(s.fortune.cursor+1)%37;
  if(finalFortuneEligible(s,id)){offerFinalFortune(s,id,skipped,token,emit);return true;}
  const traffic=trafficFortuneHandler(s,id);if(traffic!==null){offerTrafficFortune(s,nodes,id,traffic,skipped,token,emit,eliminate);return true;}
  if(assetFortuneEligible(s,id,defs)){offerAssetFortune(s,id,defs,skipped,token,emit);return true;}
  if(!FORTUNE_CATALOG.some(d=>d.id===id)){skipped.push(id);continue;}
  const {change,lines,title}=applyFortune(s,id,eliminate,emit);
  s.phase='fortune';s.pending={kind:'fortune',id:token(),node:p.node,fortuneId:id,title,lines,...(s.calendar?{scope:CALENDAR_SCOPE}:(s.rulesId==='japan-events-candidate-v23'||(s.rulesId==='japan-events-candidate-v24'||(s.rulesId==='japan-events-candidate-v25'||(s.rulesId==='japan-events-candidate-v26'||(s.rulesId === 'japan-events-candidate-v27' || (s.rulesId === 'japan-events-candidate-v28' || (s.rulesId === 'japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))?{scope:FINAL_SCOPE}:s.rulesId==='japan-events-candidate-v22'?{scope:TRAFFIC_SCOPE}:s.rulesId==='japan-events-candidate-v21'?{scope:'当前开放21项命运，其余候选暂跳过；日期、贷款到期及完整公司/保险业务仍未实现。'}:{})};
  const queued=s.finance?.payments?.current;if(queued?.kind==='fortune'&&queued.stage==='queued'){queued.decision=structuredClone(s.pending as FortuneDecision);queued.skipped=[...skipped];return true;}
  emit({type:'fortuneResolved',fortuneId:id,title,node:p.node,skipped,cursor:s.fortune.cursor,publicFund:s.news!.publicFund,change});return true;
 }
 emit({type:'fortuneSkipped',skipped});return false;
}
