import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision} from './computer-status';
import {G3_GOODS,g3Options,cardPrices} from './g3';
import {consumeCardSlot,receiveCardSlot} from './card-slots';
import {PROPERTY_CATALOG} from './economy';
import {actionLocked} from './g2';
import {shopPrice,shopSupply,SHOP_TOOLS} from './shop-acquisition';
export const INVENTORY_POLICY='inventory-v1';
export const INVENTORY_GOODS=G3_GOODS.filter(g=>g.id==='card:13'||g.id==='card:29');
/** Replacement-point estimate, not cash or a prediction of future use. Research-tool acquisition strategy is deferred. */
export function robberyGain(s:GameState,source:string,item:string){
 const bag=s.effects!.inventory[source],slots=s.g3!.slots[source];
 if(!bag['card:13'])return null;
 if(item.startsWith('tool:'))return SHOP_TOOLS.includes(item)&&(bag[item]??0)<9?{score:shopPrice(item)-25,discarded:null}:null;
 const received=receiveCardSlot(slots,item,cardPrices);if(!received)return null;
 const after=consumeCardSlot(received.slots,'card:13')??received.slots;
 return {score:after.reduce((n,id)=>n+cardPrices[id],0)-slots.reduce((n,id)=>n+cardPrices[id],0),discarded:received.discarded};
}
export function inventoryChoices(s:GameState,nodes:readonly MapNode[],item:string){
 const source=s.players[s.active].id,allies=s.g3!.allies;
 return g3Options(s,nodes,item).flatMap<{item:string;target:string;stolen:string|undefined;score:number;discarded:string|null}>(option=>{
  if(item==='card:13'){
   if(allies[source]?.partner===option.id)return [];
   return option.items.flatMap(stolen=>{const gain=robberyGain(s,source,stolen);return gain&&gain.score>0?[{item,target:option.id,stolen,...gain}]:[];});
  }
  // Raw 128 is still a live relationship. Do not refresh it or displace a third party.
  if(allies[source]||allies[option.id])return [];
  const rents=(id:string)=>PROPERTY_CATALOG.properties.reduce((n,def)=>{const p=s.economy!.properties.find(p=>p.id===def.id)!;return n+(def.kind==='land'&&p.ownerId===id&&!p.buildingType&&!p.priceStatus?(def.rents[p.level]??0):0);},0);
  const score=rents(option.id)-rents(source);
  return score>0?[{item,target:option.id,stolen:undefined,score,discarded:null}]:[];
 }).sort((a,b)=>b.score-a.score||s.players.findIndex(p=>p.id===a.target)-s.players.findIndex(p=>p.id===b.target));
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==INVENTORY_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=s.players[s.active].id,p=s.pending;
 if(decisionPlayer(s)!==id)return previousDecision(s,nodes,'status-v1');
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 const bag=s.effects!.inventory[id],available=!actionLocked(s.g2?.players[id])&&!s.g4?.hotel[id]&&!s.finance?.eliminated.includes(id);
 const good=INVENTORY_GOODS.find(g=>g.effect===s.effects?.pending?.definitionId);
 if(p?.kind==='effect'&&good){
  if(!available)return null;
  const target=bag[good.id]>0?inventoryChoices(s,nodes,good.id)[0]:undefined;
  return target?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:{kind:'player',id:target.target}},...(target.stolen?{stolenItemId:target.stolen}:{})},good.id==='card:13'?`抢夺：库存点价净增${target.score}，已计入满包丢弃与耗卡`:'同盟：对方普通地产基础租金较多；保留已有关系，期限由规则推进'):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'当前库存收益、目标或关系已变化，取消并保留卡片');
 }
 if(s.phase==='idle'&&!p&&available){
  // Inventory points and rents are unlike units: use a fixed group order, not a combined score.
  const g=INVENTORY_GOODS.find(g=>bag[g.id]>0&&inventoryChoices(s,nodes,g.id).length);
  if(g)return choose({type:'item',action:{type:'begin',definitionId:g.effect}},`使用${g.name}；确认时重新评估库存、容量和关系`);
 }
 if(p?.kind==='shop'&&(s.g3?.slots[id].length??15)<15){
  const g=INVENTORY_GOODS.find(g=>!bag[g.id]&&p.shelf?.cards.some(x=>x.itemId===g.id&&x.available)&&shopSupply(s,g.id)>0&&s.items!.points[id]>=shopPrice(g.id));
  if(g)return choose({type:'buyItem',decisionId:p.id,itemId:g.id},`花${shopPrice(g.id)}点补充一张${g.name}，等待有利目标`);
 }
 return previousDecision(s,nodes,'status-v1');
}
