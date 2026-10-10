import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision} from './computer-mobility';
import {attachedGod,g6Options} from './g6';
import {G6_GOODS,GODS} from './g6-catalog';
import {marketPrice} from './g6-market';
import {actionLocked} from './g2';
import {shopPrice,shopSupply} from './shop-acquisition';
import {roadReach} from './computer-roads';
import {PROPERTY_CATALOG} from './economy';
export const GODS_POLICY='gods-v1';
export const GODS_GOODS=G6_GOODS;
/** Heuristic scores, not promised cash: only currently public objects and holdings. */
export function godsChoice(s:GameState,nodes:readonly MapNode[],item:string){
 const id=s.players[s.active].id,ally=s.g3!.allies[id]?.partner,current=attachedGod(s,id);
 const options=g6Options(s,nodes,item);
 if(!options.length)return null;
 if(item==='card:22')return {target:options[0].target,score:s.g5!.hazards.some(h=>h.carrier===id)?10000:400};
 if(item==='card:23'){
  const g=s.g6!.gods.find(g=>g.id===options[0].target.id)!;
  if(GODS.find(d=>d.type===g.type)!.bad)return null;
  // Preserve useful rent protection/ownership until its last action; no random-wheel forecast.
  if(current&&[1,2,9,12].includes(current.type)&&current.remaining>1)return null;
  if(g.type===1&&ally&&s.economy!.balances[ally].cash+s.economy!.balances[ally].bank>0)return null;
  if([3,4].includes(g.type)&&s.g3!.slots[id].length-(s.effects!.inventory[id]['card:23']>0?1:0)+(g.type===4?2:1)>15)return null;
  if([3,4].includes(g.type)&&!Object.keys(s.effects!.inventory[id]).some(k=>k.startsWith('card:')&&shopSupply(s,k)>0))return null;
  if(g.type===9||g.type===12){
   const reach=roadReach(s,nodes,id,18),props=s.economy!.properties.filter(q=>PROPERTY_CATALOG.properties.find(d=>d.id===q.id)!.nodeIds.some(n=>reach.has(n)));
   if(g.type===9&&(!props.some(q=>q.ownerId===id&&q.level<5)||props.some(q=>q.ownerId&&q.ownerId!==id&&q.ownerId!==ally)))return null;
   if(g.type===12&&(!props.some(q=>q.ownerId!==id&&q.ownerId!==ally)||props.some(q=>q.ownerId===ally)))return null;
  }
  return {target:options[0].target,score:current&&GODS.find(d=>d.type===current.type)!.bad?350:100};
 }
 if(!['card:24','card:25'].includes(item))return null;
 // Card effects remain legal while halted; this policy conservatively waits for an open quote.
 if(s.news?.business?.marketClosed)return null;
 const choices=options.flatMap(o=>{
  const k=s.g6!.stocks.find(k=>k.id===o.target.id)!;
  if(s.news?.business?.halted[k.id])return [];
  const next=marketPrice(k.base,item==='card:24'?10:-10),delta=next-k.price;
  if(item==='card:24'?delta<=0:delta>=0)return [];
  const value=(p:string)=>Math.floor(s.g6!.holdings[p][k.id].quantity*next/100)-Math.floor(s.g6!.holdings[p][k.id].quantity*k.price/100);
  const own=value(id),friend=ally?value(ally):0,enemy=s.players.filter(p=>p.id!==id&&p.id!==ally&&!s.finance!.eliminated.includes(p.id)).reduce((n,p)=>n+value(p.id),0);
  if(own<0||friend<0)return [];
  const gain=item==='card:24'?own+friend-enemy:-enemy;
  return gain>=200?[{target:o.target,score:Math.min(300,gain/10),gain,own,friend,enemy,next}]:[];
 });
 return choices.sort((a,b)=>b.gain-a.gain)[0]??null;
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==GODS_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=decisionPlayer(s),p=s.pending;
 if(id!==s.players[s.active].id)return previousDecision(s,nodes,'mobility-v1');
 const bag=s.effects!.inventory[id],available=!actionLocked(s.g2!.players[id])&&!s.g4!.hotel[id]&&!s.finance!.eliminated.includes(id);
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 const good=GODS_GOODS.find(g=>g.effect===s.effects!.pending?.definitionId);
 if(p?.kind==='effect'&&good){
  if(!available)return null;
  const c=bag[good.id]>0?godsChoice(s,nodes,good.id):null;
  return c?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:c.target}},`${good.name}：重算最近神仙、现有期限及持仓市值/同盟风险；不预测随机收益`):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'公开目标或收益变化，取消并保留卡片');
 }
 if(available&&s.phase==='idle'&&!p){
  const choices=GODS_GOODS.flatMap((g,order)=>{const c=bag[g.id]>0?godsChoice(s,nodes,g.id):null;return c?[{g,c,order}]:[];}).sort((a,b)=>b.c.score-a.c.score||a.order-b.order);
  if(choices[0])return choose({type:'item',action:{type:'begin',definitionId:choices[0].g.effect}},`使用${choices[0].g.name}：按当前公开附身与行情判断`);
 }
 if(available&&p?.kind==='shop'&&s.g3!.slots[id].length<15){
  const g=GODS_GOODS.find(g=>!bag[g.id]&&shopSupply(s,g.id)>0&&s.items!.points[id]>=shopPrice(g.id)&&p.shelf?.cards.some(x=>x.itemId===g.id&&x.available));
  if(g)return choose({type:'buyItem',decisionId:p.id,itemId:g.id},`花${shopPrice(g.id)}点补充${g.name}；不因此自动买股`);
 }
 return previousDecision(s,nodes,'mobility-v1');
}
