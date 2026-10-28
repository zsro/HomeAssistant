import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {Target} from './effects';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision} from './computer-area';
import {G5_GOODS} from './g5-catalog';
import {g5Options,blastTargets} from './g5';
import {ROAD_GOODS,robotPath,roadblockTargets} from './road-tools';
import {PROPERTY_CATALOG} from './economy';
import {actionLocked,maxDice} from './g2';
import {g1Adjacent} from './g1';
import {shopPrice,shopSupply} from './shop-acquisition';
export const ROADS_POLICY='roads-v1';
export const ROADS_GOODS=[...ROAD_GOODS,...G5_GOODS.filter(g=>['tool:03','tool:04','tool:07'].includes(g.id))];
const definitions=PROPERTY_CATALOG.properties;
/** Public graph envelope, not a forecast of dice or hidden events. Includes every branch. */
export function roadReach(s:GameState,nodes:readonly MapNode[],id:string,steps:number){
 const p=s.players.find(p=>p.id===id)!,byId=new Map(nodes.map(n=>[n.id,n])),result=new Map<number,number>([[p.node,0]]);
 let edge=[{node:p.node,previous:p.previous}];
 for(let distance=1;distance<=steps;distance++){
  const next=new Map<string,{node:number;previous:number}>();
  for(const e of edge){const all=g1Adjacent(byId.get(e.node)!),onward=all.filter(n=>n!==e.previous);for(const n of onward.length?onward:all){if(!result.has(n))result.set(n,distance);next.set(n+':'+e.node,{node:n,previous:e.node});}}
  edge=[...next.values()];
 }
 return result;
}
export function roadsChoices(s:GameState,nodes:readonly MapNode[],item:string):{item:string;target:Target;score:number}[]{
 if(!ROADS_GOODS.some(g=>g.id===item)||!s.g5)return [];
 const who=s.players[s.active],id=who.id,ally=s.g3!.allies[id]?.partner;
 if(actionLocked(s.g2!.players[id])||s.g4!.hotel[id])return [];
 const friendly=(owner:string|null)=>owner===id||!!ally&&owner===ally;
 const route=robotPath(nodes,who.node,who.previous);
 if(item==='tool:01'){
  const blocks=s.roadTools!.blocks.filter(n=>route.includes(n)),hazards=s.g5.hazards.filter(h=>!h.carrier&&route.includes(h.node));
  const score=blocks.length*30+hazards.length*60;
  return score?[{item,target:{kind:'player',id},score}]:[];
 }
 if(item==='tool:07')return g5Options(s,nodes,definitions,item).flatMap(option=>{
  const hit=blastTargets(s,nodes,definitions,Number(option.target.id));
  if(hit.players.some(friendly))return [];
  const props=s.economy!.properties.filter(p=>hit.properties.includes(p.id));
  if(props.some(p=>friendly(p.ownerId)&&(p.level>0||p.research)))return [];
  const investment=props.reduce((sum,p)=>sum+(p.ownerId&&!friendly(p.ownerId)&&p.level?definitions.find(d=>d.id===p.id)!.upgradeCost:0),0);
  const score=investment+hit.players.reduce((sum,pid)=>sum+300+(s.g2!.players[pid].vehicle!=='foot'?100:0)+(s.g5!.engineers[pid]?100:0),0);
  return score>0?[{item,target:option.target,score}]:[];
 }).sort((a,b)=>b.score-a.score||Number(a.target.id)-Number(b.target.id));
 const occupied=[...s.roadTools!.blocks,...s.g5.hazards.filter(h=>!h.carrier).map(h=>h.node)];
 const legal=item==='tool:02'?roadblockTargets(nodes.find(n=>n.id===who.node)!,nodes,occupied):g5Options(s,nodes,definitions,item).map(o=>Number(o.target.id));
 const safe=new Set(route); // Do not place something the same turn's robot would immediately clear.
 for(const p of s.players.filter(p=>friendly(p.id)&&!s.finance!.eliminated.includes(p.id)))for(const n of roadReach(s,nodes,p.id,6*maxDice(s.g2!.players[p.id].vehicle)).keys())safe.add(n);
 const enemies=s.players.filter(p=>!friendly(p.id)&&!s.finance!.eliminated.includes(p.id)&&!actionLocked(s.g2!.players[p.id])&&!s.g2!.players[p.id].stop&&!s.g4!.hotel[p.id]&&!(item==='tool:04'&&s.g5!.hazards.some(h=>h.carrier===p.id)));
 const reaches=enemies.map(p=>roadReach(s,nodes,p.id,6));
 return legal.flatMap(node=>{
  if(safe.has(node))return [];
  const distance=Math.min(...reaches.map(r=>r.get(node)??Infinity));if(distance<1||distance>6)return [];
  // A block only has current value on an owned rent-bearing destination. No landing is promised.
  const def=definitions.find(d=>d.nodeIds.includes(node)),property=def&&s.economy!.properties.find(p=>p.id===def.id);
  if(item==='tool:02'&&(!def||def.kind!=='land'||property?.ownerId!==id||(property.priceStatus!&15)))return [];
  const score=(item==='tool:02'?70:item==='tool:03'?65:55)-distance;
  return[{item,target:{kind:'node' as const,id:String(node)},score}];
 }).sort((a,b)=>b.score-a.score||Number(a.target.id)-Number(b.target.id));
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==ROADS_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=decisionPlayer(s),p=s.pending,choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 if(id!==s.players[s.active].id)return previousDecision(s,nodes,'area-v1');
 const bag=s.effects!.inventory[id],available=!actionLocked(s.g2?.players[id])&&!s.g4?.hotel[id]&&!s.finance?.eliminated.includes(id),good=ROADS_GOODS.find(g=>g.effect===s.effects?.pending?.definitionId);
 if(p?.kind==='effect'&&good){
  if(!available)return null;
  const choice=bag[good.id]>0?roadsChoices(s,nodes,good.id)[0]:undefined;
  return choice?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:choice.target}},`${good.name}：重算当前清路/攻击价值与自身、盟友风险；未来落点不保证`):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'道路、库存或安全目标已变化，取消并保留道具');
 }
 if(s.phase==='idle'&&!p&&available){
  const choices=ROADS_GOODS.flatMap((g,order)=>bag[g.id]>0?roadsChoices(s,nodes,g.id).map(c=>({...c,g,order})):[]).sort((a,b)=>b.score-a.score||a.order-b.order);
  if(choices[0])return choose({type:'item',action:{type:'begin',definitionId:choices[0].g.effect}},`使用${choices[0].g.name}；确认前重算道路及盟友风险`);
 }
 if(p?.kind==='shop'){
  const g=ROADS_GOODS.find(g=>!bag[g.id]&&p.shelf?.tools.some(x=>x.itemId===g.id&&x.available)&&shopSupply(s,g.id)>0&&s.items!.points[id]>=shopPrice(g.id));
  if(g)return choose({type:'buyItem',decisionId:p.id,itemId:g.id},`花${shopPrice(g.id)}点补充一个${g.name}，遵守货架、工具上限与有限供应`);
 }
 return previousDecision(s,nodes,'area-v1');
}
