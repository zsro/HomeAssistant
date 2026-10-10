import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision} from './computer-cash';
import {G2_GOODS,g2Options,actionLocked} from './g2';
import {shopPrice,shopSupply} from './shop-acquisition';
export const STATUS_POLICY='status-v1';
export const STATUS_GOODS=G2_GOODS.filter(g=>g.id.startsWith('card:'));
/** Current public status only. Raw 128 still counts as active until its next boundary. */
export function statusChoices(s:GameState,nodes:readonly MapNode[],item:string){
 const source=s.players[s.active].id,ally=s.g3?.allies[source]?.partner;
 return g2Options(s,nodes,item).flatMap(option=>{
  if(!option.playerIds.length||option.playerIds.some(id=>id===source||id===ally))return [];
  // Do not overwrite an existing restriction or a saved dream vehicle to refresh a timer.
  if(option.playerIds.some(id=>{const m=s.g2!.players[id];return actionLocked(m)||m.stop||m.turtle;}))return [];
  if(item==='card:16'||item==='card:17'){
   const id=option.playerIds[0],bag=s.effects!.inventory[id];
   if(['card:21','card:19','card:18'].some(card=>bag[card]>0))return [];
   // Imprisonment can pay insurance; do not reward an insured opponent or debit that company.
   if(item==='card:17'&&s.news?.business?.insurance?.terms[id])return [];
  }
  const score=(item==='card:14'?1:item==='card:30'?3:5)*option.playerIds.length;
  return [{item,option,score}];
 }).sort((a,b)=>b.score-a.score||s.players.findIndex(p=>p.id===a.option.target.id)-s.players.findIndex(p=>p.id===b.option.target.id));
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==STATUS_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=s.players[s.active].id,p=s.pending;
 if(decisionPlayer(s)!==id)return previousDecision(s,nodes,'cash-v1');
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 const bag=s.effects!.inventory[id],available=!actionLocked(s.g2?.players[id])&&!s.g4?.hotel[id]&&!s.finance?.eliminated.includes(id);
 const good=STATUS_GOODS.find(g=>g.effect===s.effects?.pending?.definitionId);
 if(p?.kind==='effect'&&good){
  if(!available)return null;
  const target=bag[good.id]>0?statusChoices(s,nodes,good.id)[0]:undefined;
  return target?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:target.option.target}},`${good.name}：${target.option.title}；按当前状态与期限选择，避开同盟和已知反制`):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'状态、目标、库存或反制风险已变化，取消并保留卡片');
 }
 if(s.phase==='idle'&&!p&&available){
  const choices=STATUS_GOODS.flatMap((g,order)=>bag[g.id]>0?statusChoices(s,nodes,g.id).map(c=>({...c,g,order})):[]).sort((a,b)=>b.score-a.score||a.order-b.order);
  if(choices[0])return choose({type:'item',action:{type:'begin',definitionId:choices[0].g.effect}},`使用${choices[0].g.name}限制未受限对手；确认前重新判断状态、同盟与反制`);
 }
 if(p?.kind==='shop'&&(s.g3?.slots[id].length??15)<15){
  const g=STATUS_GOODS.find(g=>!bag[g.id]&&p.shelf?.cards.some(x=>x.itemId===g.id&&x.available)&&shopSupply(s,g.id)>0&&s.items!.points[id]>=shopPrice(g.id));
  if(g)return choose({type:'buyItem',decisionId:p.id,itemId:g.id},`花${shopPrice(g.id)}点补充一张${g.name}，等待安全目标`);
 }
 return previousDecision(s,nodes,'cash-v1');
}
