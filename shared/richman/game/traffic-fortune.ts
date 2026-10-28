import {queueFortunePayment} from './payments';
import {consumerIndex} from './price-index';
import {claimInsurance} from './insurance-state';
import {CALENDAR_SCOPE} from './calendar-date';
import {FINAL_SCOPE} from './final-fortune';
import type {GameState,EventPayload} from './engine';
import type {MapNode} from '../types';
import type {FortuneChange,FortuneDecision} from './fortune';
import {fortuneLuck} from './fortune';
import {ASSET_FORTUNE_FINGERPRINT} from './asset-fortune';
import {hashSeed} from './random';
import {consumeG3,openReaction,returnSupply} from './g3';
import {detained,enterDetention} from './g2';
import type {Mobility} from './g2';
import {paymentSplit} from './economy';
export const TRAFFIC_FORTUNE_CATALOG=[{id:10,title:'机车失窃'},{id:11,title:'汽车损毁'},{id:12,title:'掉入水沟住院'},{id:13,title:'机车摔伤'},{id:14,title:'违规穿越道路罚款'},{id:15,title:'机车未戴安全帽罚款'},{id:16,title:'汽车超速罚款'},{id:41,title:'诱骗案件拘留'},{id:42,title:'妨害风化拘留'},{id:43,title:'违禁药物拘留'},{id:44,title:'施放毒气拘留'}] as const;
export const TRAFFIC_FORTUNE_RULES=Object.freeze({id:'japan-events-candidate-v22',version:1,base:'japan-events-candidate-v21',
 selection:'32of37;10-11-moto-car;12-13-foot-moto;14-16-foot-moto-car;engineer-skip;Japan-slots33-36-map41-44-stage0',
 loss:'10-11-resistance72-cancel1-no-double-return-equipped-pool-foot1-no-card-reaction',
 detention:'12-13-hospital3;41-44-prison3-5-7-9;72-cancel1-double2-before-auto-absolve-optional-redirect;no-target-recheck-revenge-hostility',
 hospital:'outside-target-destroy-equipped-vehicle-before-entry;already-detained-hotel-keeps;active-engineer-cleared-suspended-kept;no-distant-node-animation-RNG',
 money:'14-16-fine3000-price1;70-cancel1-double2;cash-bank-real-paid-public-no-stock-rescue-Web-bankruptcy-no-insurance',
 clock:'reuse-raw127-add-detained-freeze-roster-switch-hotel-clear;no-date-insurance-full-company' });
export const TRAFFIC_FORTUNE_FINGERPRINT=hashSeed(JSON.stringify({base:ASSET_FORTUNE_FINGERPRINT,rules:TRAFFIC_FORTUNE_RULES,catalog:TRAFFIC_FORTUNE_CATALOG})).toString(16);
export type TrafficFortuneChange={slot:number;targetId:string|null;kind:'loss'|'fine'|'hospital'|'prison';turns:number;absolved:boolean;redirected:boolean;player?:{before:Mobility;after:Mobility;nodeBefore:number;nodeAfter:number;engineerBefore:NonNullable<GameState['g5']>['engineers'][string];engineerAfter:NonNullable<GameState['g5']>['engineers'][string]}};
export type TrafficDetention={kind:'trafficDetention';originalId:string;decision:FortuneDecision;skipped:number[];change:FortuneChange};
type Emit=(e:EventPayload)=>void;
export const TRAFFIC_SCOPE='当前开放32项命运；期限按行动计时。日期、定期结息、贷款到期、原破产强拍及完整公司/保险业务仍未实现。';
function vehicle(s:GameState,id:string){return s.g5!.engineers[id]&&!s.g5!.engineers[id]!.suspended?'tool:12':s.g2!.players[id].vehicle;}
/** Returns handler id; the source slot is never rewritten in the shuffled order. */
export function trafficFortuneHandler(s:GameState,slot:number){
 if((s.rulesId!=='japan-events-candidate-v29' && (s.rulesId !== 'japan-events-candidate-v30' && (s.rulesId !== 'japan-events-candidate-v31' && (s.rulesId !== 'japan-events-candidate-v32' && (s.rulesId !== 'japan-events-candidate-v33' && (s.rulesId !== 'japan-events-candidate-v34' && (s.rulesId !== 'japan-events-candidate-v35' && (s.rulesId !== 'japan-events-candidate-v36' && (s.rulesId !== 'japan-events-candidate-v37' && (s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))))))))))))))))))&&s.rulesId!==TRAFFIC_FORTUNE_RULES.id&&s.rulesId!=='japan-events-candidate-v23'&&s.rulesId!=='japan-events-candidate-v24'&&s.rulesId!=='japan-events-candidate-v25')return null;
 const v=vehicle(s,s.players[s.active].id),mode=v==='foot'?0:v==='tool:05'?1:v==='tool:06'?2:3;
 if(slot===10||slot===11)return mode===1?10:mode===2?11:null;
 if(slot===12||slot===13)return mode===0?12:mode===1?13:null;
 if(slot>=14&&slot<=16)return mode<=2?14+mode:null;
 if(slot>=33&&slot<=36)return slot+8;
 return null;
}
function initial(s:GameState,slot:number,id:number):FortuneChange{
 const p=s.players[s.active].id,b=s.economy!.balances[p],v=vehicle(s,p);
 return {godType:0,modifier:0,code:0,amount:0,cashBefore:b.cash,cashAfter:b.cash,bankBefore:b.bank,bankAfter:b.bank,unpaid:0,returnedShares:0,sold:[],pointsBefore:s.items!.points[p],pointsAfter:s.items!.points[p],vehicleBefore:v,vehicleAfter:v,bankrupt:false,traffic:{slot,targetId:p,kind:id<12?'loss':id<14?'hospital':id<17?'fine':'prison',turns:id<14?3:id>40?3+(id-41)*2:0,absolved:false,redirected:false}};
}
function finish(s:GameState,c:TrafficDetention,token:()=>string,emit:Emit){
 const d=c.decision,b=s.economy!.balances[c.originalId];c.change.cashAfter=b.cash;c.change.bankAfter=b.bank;c.change.vehicleAfter=vehicle(s,c.originalId);
 d.id=token();s.phase='fortune';s.pending=d;
 emit({type:'fortuneResolved',fortuneId:d.fortuneId,title:d.title,node:d.node,skipped:c.skipped,cursor:s.fortune!.cursor,publicFund:s.news!.publicFund,change:c.change});
}
function finishDetention(s:GameState,nodes:readonly MapNode[],c:TrafficDetention,targetId:string|null,token:()=>string,emit:Emit){
 const t=c.change.traffic!;t.targetId=targetId;t.absolved=targetId===null;t.redirected=!!targetId&&targetId!==c.originalId;
 if(targetId){const p=s.players.find(p=>p.id===targetId)!,m=s.g2!.players[targetId],before=structuredClone(m),nodeBefore=p.node,engineerBefore=structuredClone(s.g5!.engineers[targetId]);
  if(t.kind==='hospital'&&!detained(m)&&!s.g4!.hotel[targetId]){if(m.vehicle!=='foot')returnSupply(s,m.vehicle);m.vehicle='foot';m.diceCount=1;if(!s.g5!.engineers[targetId]?.suspended)s.g5!.engineers[targetId]=null;}
  enterDetention(s,nodes,targetId,t.kind==='hospital'?'hospital':'prison',t.turns,emit);
  t.player={before,after:structuredClone(m),nodeBefore,nodeAfter:p.node,engineerBefore,engineerAfter:structuredClone(s.g5!.engineers[targetId])};
  c.decision.lines.push(`玩家 ${targetId.split('-')[1]}${t.kind==='hospital'?'住院':'监禁'} ${t.turns} 次行动；期限 ${before[t.kind==='hospital'?'hospital':'prison']} → ${m[t.kind==='hospital'?'hospital':'prison']}，移到 ${p.node} 号格。${t.kind==='hospital'?'在外目标当前车辆损毁返池；设施中目标保留车辆。':'车辆保留。'}`);
 }else c.decision.lines.push('自动使用免罪卡，本次不住院或入狱。');
 finish(s,c,token,emit);
}
export function offerTrafficFortune(s:GameState,nodes:readonly MapNode[],slot:number,id:number,skipped:number[],token:()=>string,emit:Emit,eliminate:(id:string)=>void){
 const player=s.players[s.active].id,change=initial(s,slot,id),t=change.traffic!,d:FortuneDecision={kind:'fortune',id:token(),node:s.players[s.active].node,fortuneId:id,title:TRAFFIC_FORTUNE_CATALOG.find(x=>x.id===id)!.title,lines:[],scope:s.calendar?CALENDAR_SCOPE:(s.rulesId==='japan-events-candidate-v23'||(s.rulesId==='japan-events-candidate-v24'||(s.rulesId==='japan-events-candidate-v25'||(s.rulesId==='japan-events-candidate-v26'||(s.rulesId === 'japan-events-candidate-v27' || (s.rulesId === 'japan-events-candidate-v28' || (s.rulesId === 'japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))?FINAL_SCOPE:TRAFFIC_SCOPE},c:TrafficDetention={kind:'trafficDetention',originalId:player,decision:d,skipped,change};
 Object.assign(change,fortuneLuck(s,t.kind!=='fine',true));
 d.lines.push(`命运${id}${slot!==id?`（候选槽${slot}，按当前交通方式/地区分派）`:''}：${change.code===1?'神仙取消本次效果':change.code===2&&t.kind!=='loss'?'神仙使金额或期限加倍':'按本项规则处理'}。`);
 if(change.code===1){t.targetId=null;t.turns=0;finish(s,c,token,emit);return;}
 if(t.kind==='loss'){
  const m=s.g2!.players[player],p=s.players[s.active],before=structuredClone(m),engineerBefore=structuredClone(s.g5!.engineers[player]);
  returnSupply(s,m.vehicle);m.vehicle='foot';m.diceCount=1;t.turns=0;t.player={before,after:structuredClone(m),nodeBefore:p.node,nodeAfter:p.node,engineerBefore,engineerAfter:structuredClone(s.g5!.engineers[player])};d.lines.push('当前车辆损失，返还供应池；改为步行、1骰，背包中其他车辆不变。');
 }else if(t.kind==='fine'){
  const b=s.economy!.balances[player],due=3000*consumerIndex(s)*(change.code===2?2:1),available=b.cash+b.bank,paid=paymentSplit(b,Math.min(due,available),true)!;
  change.amount=-due;if(due>available&&queueFortunePayment(s,player,due,change,d,skipped,'交通罚款'))return;
  b.cash-=paid.cash;b.bank-=paid.bank;s.news!.publicFund+=paid.cash+paid.bank;change.amount=-due;change.unpaid=Math.max(0,due-available);change.bankrupt=due>available;
  if(change.bankrupt){for(const k of s.g6!.stocks){const h=s.g6!.holdings[player][k.id];change.returnedShares+=h.quantity;k.pool+=h.quantity;k.quota+=h.quantity;h.quantity=0;h.cost=0;if(h.average!==undefined)h.average=0;}eliminate(player);const survivors=s.players.filter(p=>!s.finance!.eliminated.includes(p.id));if(survivors.length===1)s.finance!.winnerId=survivors[0].id;}
  const claim=claimInsurance(s,player,due,'交通罚款',emit);if(claim)d.lines.push(`保险现金赔付 ${claim.amount.toLocaleString()} 元。`);
  d.lines.push(`应付 ${due.toLocaleString()} 元，现金 ${paid.cash.toLocaleString()}＋存款 ${paid.bank.toLocaleString()} 元进入公共资金${change.bankrupt?`；未付 ${change.unpaid} 元，按当前规则破产退出`:''}。`,`现金 ${change.cashBefore.toLocaleString()} → ${b.cash.toLocaleString()}；存款 ${change.bankBefore.toLocaleString()} → ${b.bank.toLocaleString()} 元。`);
 }else{
  t.turns*=change.code===2?2:1;d.lines.push(`将${t.kind==='hospital'?'住院':'监禁'} ${t.turns} 次行动，先处理免罪/嫁祸。`);
  if(consumeG3(s,player,'card:21',emit))finishDetention(s,nodes,c,null,token,emit);
  else if(s.effects!.inventory[player]['card:19']>0)openReaction(s,c,player,'redirect',token,emit);
  else finishDetention(s,nodes,c,player,token,emit);
  return;
 }
 finish(s,c,token,emit);
}
export function reactTrafficFortune(s:GameState,nodes:readonly MapNode[],choice:'use'|'decline',targetId:string|undefined,token:()=>string,emit:Emit){
 const p=s.pending;if(p?.kind!=='reaction'||p.continuation.kind!=='trafficDetention'||!['use','decline'].includes(choice)||(choice==='use'?!p.targets.includes(targetId!):targetId!==undefined))return false;
 if(choice==='use'&&!consumeG3(s,p.responderId,'card:19',emit))return false;
 emit({type:'reactionAnswered',responderId:p.responderId,stage:'redirect',choice,...(targetId?{targetId}:{})});
 finishDetention(s,nodes,p.continuation,choice==='use'?targetId!:p.responderId,token,emit);return true;
}
