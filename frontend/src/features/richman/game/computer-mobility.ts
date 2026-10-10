import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision,roadReach} from './computer-roads';
import {G1_GOODS,g1Options,g1Adjacent} from './g1';
import {G2_GOODS,actionLocked,maxDice,g2Options} from './g2';
import {G5_GOODS} from './g5-catalog';
import {g5Options,researchOptions} from './g5';
import {PROPERTY_CATALOG,propertyBase} from './economy';
import {g4RentLines} from './g4';
import {consumerIndex} from './price-index';
import {itemSite} from './items';
import {cardCount} from './cards';
import {shopPrice,shopSupply} from './shop-acquisition';
export const MOBILITY_POLICY='mobility-v1';
export const MOBILITY_GOODS=[G1_GOODS.find(g=>g.id==='card:06')!,...G2_GOODS.filter(g=>g.id==='tool:05'||g.id==='tool:06'),G5_GOODS.find(g=>g.id==='tool:12')!];
const defs=PROPERTY_CATALOG.properties;
/** Public dice distribution only. No seeded roll, engine simulation, deck or checkpoint access. */
export function mobilityRoutes(s:GameState,nodes:readonly MapNode[],previous=s.players[s.active].previous,engineer=!!s.g5?.engineers[s.players[s.active].id]){
 const who=s.players[s.active],id=who.id,ally=s.g3!.allies[id]?.partner,byId=new Map(nodes.map(n=>[n.id,n])),balance=s.economy!.balances[id];
 const friendly=(owner:string|null)=>owner===id||!!ally&&owner===ally;
 const blocked=new Set(s.roadTools!.blocks),hazards=new Set(s.g5!.hazards.filter(h=>!h.carrier).map(h=>h.node));
 const carried=s.g5!.hazards.find(h=>h.carrier===id),index=consumerIndex(s);
 const landing=(node:number)=>{
  if(hazards.has(node))return -10000;
  const d=defs.find(d=>d.nodeIds.includes(node)),p=d&&s.economy!.properties.find(p=>p.id===d.id);
  if(!d||!p)return itemSite(byId.get(node)!)?.points?20:0;
  if(engineer&&p.ownerId===ally&&(p.level>0||p.research))return -100000;
  if(p.ownerId&&!friendly(p.ownerId)){
   // Conservative visible base rent; do not budget on free/reaction cards, gods, insurance or future sales.
   const type=p.buildingType??0;
   const rent=(d.kind==='land'?g4RentLines(s,d,defs).reduce((n,r)=>n+r.amount,0):!p.level||type===0||type===4?0:type===1||type===2?d.rents[p.level-1]*(type===1?4:6)*(p.priceStatus?2:1):engineer?12000:s.g2!.players[id].vehicle==='foot'?0:s.g2!.players[id].vehicle==='tool:05'?6000:18000)*index;
   const danger=rent>balance.cash+balance.bank-1000?-10000:-100-Math.min(500,rent/100);
   return engineer&&p.level>0&&danger>-10000?200+p.level*40+danger:danger;
  }
  if(engineer&&!p.ownerId&&p.level>0)return -200; // Do not spend the research vehicle demolishing an unowned investment.
  if(d.kind!=='land'||(p.priceStatus??0)&15)return 0;
  const cost=(p.ownerId?d.upgradeCost:propertyBase(p,d)+p.level*d.upgradeCost)*index;
  return balance.cash-cost>=1000?(p.ownerId?p.level<5?30:10:40):0;
 };
 const cache=new Map<string,number>();
 const afterStep=(node:number,prev:number,remaining:number):number=>{
  if(!byId.has(node))return -100000;
  if(blocked.has(node))return landing(node)-50;
  if(!remaining)return landing(node);
  const key=`${node}:${prev}:${remaining}`;if(cache.has(key))return cache.get(key)!;
  const all=g1Adjacent(byId.get(node)!),onward=all.filter(n=>n!==prev),score=Math.max(-100000,...(onward.length?onward:all).map(n=>afterStep(n,node,remaining-1)));
  cache.set(key,score);return score;
 };
 const all=g1Adjacent(byId.get(who.node)!),onward=all.filter(n=>n!==previous),first=onward.length?onward:all;
 const totals=Array.from({length:18},(_,i)=>({steps:i+1,score:carried&&carried.remaining<=i+1?-10000:Math.max(-100000,...first.map(n=>afterStep(n,who.node,i)))}));
 const dice=([1,2,3] as const).map(count=>{
  let distribution=[1];for(let i=0;i<count;i++){const next=Array(distribution.length+6).fill(0);distribution.forEach((n,sum)=>{for(let d=1;d<=6;d++)next[sum+d]+=n;});distribution=next;}
  return{count,score:distribution.reduce((sum,n,steps)=>sum+(steps?totals[steps-1].score*n:0),0)/6**count};
 });
 return{dice,totals,afterStep};
}
export function mobilityChoice(s:GameState,nodes:readonly MapNode[],item:string){
 const p=s.players[s.active],m=s.g2!.players[p.id];
 if(actionLocked(m)||s.g4!.hotel[p.id]||m.stop||m.turtle)return null;
 if(item==='tool:05'||item==='tool:06')return maxDice(item)>maxDice(m.vehicle)&&g2Options(s,nodes,item).length?{target:{kind:'player' as const,id:p.id},score:20+maxDice(item)}:null;
 if(item==='card:06'){
  const option=g1Options(s,nodes,defs,item).find(o=>o.target.id===p.id);if(!option?.turn)return null;
  const current=mobilityRoutes(s,nodes).dice.slice(0,maxDice(m.vehicle)).reduce((a,b)=>Math.max(a,b.score),-Infinity);
  const candidates: (number|null)[]=option.turn.candidates.length?option.turn.candidates:[null];
  const worst=Math.min(...candidates.map(prev=>Math.max(...mobilityRoutes(s,nodes,prev).dice.slice(0,maxDice(m.vehicle)).map(d=>d.score))));
  return worst-current>=25?{target:option.target,score:worst-current}:null;
 }
 if(item==='tool:12'&&g5Options(s,nodes,defs,item).length){
  const ally=s.g3!.allies[p.id]?.partner,reach=roadReach(s,nodes,p.id,6);
  if(s.economy!.properties.some(q=>q.ownerId===ally&&(q.level>0||q.research)&&defs.find(d=>d.id===q.id)!.nodeIds.some(n=>reach.has(n))))return null;
  const enemy=s.economy!.properties.some(q=>q.ownerId&&q.ownerId!==p.id&&q.ownerId!==ally&&q.level>0&&defs.find(d=>d.id===q.id)!.nodeIds.some(n=>reach.has(n)));
  const normal=mobilityRoutes(s,nodes).dice[0].score,engineering=mobilityRoutes(s,nodes,p.previous,true).dice[0].score;
  return enemy&&engineering>normal+10&&engineering>-100?{target:{kind:'player' as const,id:p.id},score:engineering-normal}:null;
 }
 return null;
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==MOBILITY_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=decisionPlayer(s),p=s.pending,who=s.players[s.active],m=s.g2!.players[id];
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 if(id!==who.id)return previousDecision(s,nodes,'roads-v1');
 const bag=s.effects!.inventory[id],available=!actionLocked(m)&&!s.g4!.hotel[id]&&!s.finance!.eliminated.includes(id),good=MOBILITY_GOODS.find(g=>g.effect===s.effects?.pending?.definitionId);
 if(p?.kind==='effect'&&good){
  if(!available)return null;
  const c=bag[good.id]>0?mobilityChoice(s,nodes,good.id):null;
  return c?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:c.target}},`${good.name}：重算公开路线、装备及盟友风险`):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'移动收益、状态或库存变化，取消并保留物品');
 }
 if(available&&!p&&['idle','turnEnd'].includes(s.phase)&&!bag['tool:12']&&!s.g5!.engineers[id]&&!s.economy!.properties.some(q=>q.research?.ownerId===id&&q.research.itemId==='tool:12')){
  const r=researchOptions(s,defs).find(r=>r.itemId==='tool:12');
  if(r)return choose({type:'research',propertyId:r.propertyId,itemId:r.itemId},'在当前已有四级科研楼免费生产一辆工程车；不新增建站或追踪路线策略');
 }
 if(available&&s.phase==='idle'&&!p){
  const choices=MOBILITY_GOODS.flatMap((g,order)=>{const c=bag[g.id]>0?mobilityChoice(s,nodes,g.id):null;return c?[{g,c,order}]:[];}).sort((a,b)=>b.c.score-a.c.score||a.order-b.order);
  if(choices[0])return choose({type:'item',action:{type:'begin',definitionId:choices[0].g.effect}},`使用${choices[0].g.name}，不预读下一次骰子或事件`);
  if(!m.stop&&!m.turtle&&!s.g5!.engineers[id]){
   const best=mobilityRoutes(s,nodes).dice.slice(0,maxDice(m.vehicle)).sort((a,b)=>b.score-a.score||a.count-b.count)[0];
   if(best.count!==m.diceCount)return choose({type:'traffic',diceCount:best.count},'按公开骰子分布选择当前路线分值最高的骰数，平分少骰优先');
  }
 }
 if(available&&p?.kind==='branch'&&s.remaining>=1&&s.remaining<=18){
  const route=mobilityRoutes(s,nodes),node=[...p.choices].sort((a,b)=>route.afterStep(b,who.node,s.remaining-1)-route.afterStep(a,who.node,s.remaining-1)||a-b)[0];
  return choose({type:'choose',decisionId:p.id,node},'按剩余公开路线选路；工程车先交租再拆，避开盟友建筑与可见危险落点');
 }
 if(p?.kind==='shop'){
  const goods=MOBILITY_GOODS.filter(g=>g.id!=='tool:12'&&!bag[g.id]&&(g.id==='card:06'||maxDice(g.id as 'tool:05'|'tool:06')>maxDice(m.vehicle)));
  const g=goods.find(g=>shopSupply(s,g.id)>0&&s.items!.points[id]>=shopPrice(g.id)&&(g.id.startsWith('card:')?cardCount(bag)<15&&p.shelf?.cards.some(x=>x.itemId===g.id&&x.available):p.shelf?.tools.some(x=>x.itemId===g.id&&x.available)));
  if(g)return choose({type:'buyItem',decisionId:p.id,itemId:g.id},`花${shopPrice(g.id)}点补充${g.name}，工程车仅沿既有科研获取`);
 }
 return previousDecision(s,nodes,'roads-v1');
}
