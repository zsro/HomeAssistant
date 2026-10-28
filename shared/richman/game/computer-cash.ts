import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision} from './computer-estate';
import {EQUAL_CASH_EFFECT,equalCashTargets,equalCashPreview} from './cards';
import {WEALTH_EFFECT,wealthParticipants,wealthPreview} from './wealth';
import {g4Options,G4_GOODS} from './g4';
import {PROPERTY_CATALOG} from './economy';
import {actionLocked,detained} from './g2';
import {shopPrice,shopSupply} from './shop-acquisition';

export const CASH_POLICY='cash-v1';
export const CASH_GOODS=[{id:'card:01',name:'均富卡',effect:WEALTH_EFFECT},{id:'card:02',name:'均贫卡',effect:EQUAL_CASH_EFFECT},G4_GOODS.find(g=>g.id==='card:26')!] as const;
export const CASH_MIN_GAIN=100;
/** Current public cash only; estimates are not future returns or a simulation. */
export function cashChoices(s:GameState,nodes:readonly MapNode[],item:string){
 const id=s.players[s.active].id,balances=s.economy!.balances,own=balances[id],ally=s.g3?.allies[id]?.partner;
 const choices:{targetId:string;gain:number;destination:'cash'|'bank';discarded:number}[]=[];
 if(item==='card:01'){
  const ids=wealthParticipants(s.players,s.finance?.eliminated??[]),preview=wealthPreview(ids.map(p=>balances[p].cash));
  if(preview&&(!ally||!ids.includes(ally)||balances[ally].cash<=preview.average))choices.push({targetId:id,gain:preview.average-own.cash,destination:'cash',discarded:preview.discarded});
 }else if(item==='card:02'){
  const excluded=[...(s.finance?.eliminated??[]),...s.players.filter(p=>detained(s.g2?.players[p.id])||s.g4?.hotel[p.id]).map(p=>p.id)];
  for(const targetId of equalCashTargets(s.players,s.active,excluded,nodes)){
   if(targetId===ally)continue;const preview=equalCashPreview(own.cash,balances[targetId].cash);
   if(preview)choices.push({targetId,gain:preview.average-own.cash,destination:'cash',discarded:preview.discarded});
  }
 }else if(item==='card:26'){
  for(const option of g4Options(s,nodes,PROPERTY_CATALOG.properties,item)){
   const targetId=option.target.id,amount=Math.floor(balances[targetId].cash/5),bag=s.effects!.inventory[targetId];
   // Known optional defenses can waive/redirect the entire expected receipt. Do not assume they decline.
   if(targetId===ally||bag['card:20']>0||amount>2000&&bag['card:19']>0||!Number.isSafeInteger(own.bank+amount))continue;
   choices.push({targetId,gain:amount,destination:'bank',discarded:0});
  }
 }
 return choices.filter(c=>c.gain>=CASH_MIN_GAIN).sort((a,b)=>b.gain-a.gain||s.players.findIndex(p=>p.id===a.targetId)-s.players.findIndex(p=>p.id===b.targetId));
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==CASH_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const actor=decisionPlayer(s),id=s.players[s.active].id,p=s.pending;
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:actor,action,reason});
 if(p?.kind==='reaction'&&p.continuation.kind==='tax'){
  const tax=p.continuation;
  const amount=Math.floor(s.economy!.balances[actor].cash/5),bag=s.effects!.inventory[actor];
  const decline=()=>choose({type:'reaction',decisionId:p.id,choice:'decline'},'无实际查税支出或反应已失效，保留卡片');
  if(amount<=0||actor===tax.sourceId)return decline();
  if(p.stage==='free')return bag['card:20']>0?choose({type:'reaction',decisionId:p.id,choice:'use'},`免费卡免除当前${amount}元查税`):decline();
  if(bag['card:19']<1)return decline();
  const legal=s.players.filter(x=>p.targets.includes(x.id)&&x.id!==actor&&!s.finance?.eliminated.includes(x.id));
  const target=legal.find(x=>x.id===tax.sourceId)??legal.filter(x=>x.id!==s.g3?.allies[actor]?.partner).sort((a,b)=>Math.floor(s.economy!.balances[a.id].cash/5)-Math.floor(s.economy!.balances[b.id].cash/5))[0];
  return target?choose({type:'reaction',decisionId:p.id,choice:'use',targetId:target.id},`查税嫁祸给${target.id}；转回使用者免付，否则按实际付款人当前现金重算`):decline();
 }
 if(actor!==id)return previousDecision(s,nodes,'estate-v1');
 const bag=s.effects?.inventory[id],available=!actionLocked(s.g2?.players[id])&&!s.g4?.hotel[id]&&!s.finance?.eliminated.includes(id);
 const good=CASH_GOODS.find(g=>g.effect===s.effects?.pending?.definitionId);
 if(p?.kind==='effect'&&good){
  if(!available)return null;
  const target=(bag?.[good.id]??0)>0?cashChoices(s,nodes,good.id)[0]:undefined;
  return target?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:{kind:'player',id:target.targetId}}},`${good.name}选择${target.targetId}，按当前值预计${target.destination==='bank'?'银行':'现金'}增加${target.gain}元，平均取整损失${target.discarded}元；确认时由规则结算`):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'当前收益不足100元、同盟受损或反应风险变化，取消并保留卡片');
 }
 if(s.phase==='idle'&&!p&&available){
  const options=CASH_GOODS.flatMap((g,order)=>(bag?.[g.id]??0)>0?cashChoices(s,nodes,g.id).map(c=>({...c,g,order})):[]).sort((a,b)=>b.gain-a.gain||a.order-b.order);
  if(options[0])return choose({type:'item',action:{type:'begin',definitionId:options[0].g.effect}},`使用${options[0].g.name}改善当前资金，确认前重新核对现金、同盟与反应风险`);
 }
 if(p?.kind==='shop'&&(s.g3?.slots[id].length??15)<15){
  const g=CASH_GOODS.find(g=>!bag?.[g.id]&&p.shelf?.cards.some(x=>x.itemId===g.id&&x.available)&&shopSupply(s,g.id)>0&&s.items!.points[id]>=shopPrice(g.id));
  if(g)return choose({type:'buyItem',decisionId:p.id,itemId:g.id},`花${shopPrice(g.id)}点补充一张${g.name}，保留现金并等待合适机会`);
 }
 return previousDecision(s,nodes,'estate-v1');
}
