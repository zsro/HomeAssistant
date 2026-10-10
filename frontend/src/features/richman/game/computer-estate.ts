import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision} from './computer-defense';
import {G1_GOODS,g1Options} from './g1';
import {PROPERTY_CATALOG,propertyBase} from './economy';
import {consumerIndex} from './price-index';
import {actionLocked} from './g2';
import {shopPrice,shopSupply} from './shop-acquisition';

export const ESTATE_POLICY='estate-v1';
export const ESTATE_CARDS=['card:03','card:04','card:05','card:12'] as const;
/** Public static estimate, not a promised rent or sale receipt. No deck/RNG/world simulation. */
export function estateChoices(s:GameState,nodes:readonly MapNode[],item:string){
 const id=s.players[s.active].id,ally=s.g3?.allies[id]?.partner,index=consumerIndex(s);
 return g1Options(s,nodes,PROPERTY_CATALOG.properties,item).flatMap(option=>{
  let assets=0,rents=0,enemyRentLoss=0;
  if(option.transfer&&s.economy!.balances[id].cash-option.transfer.amount<1000)return [];
  for(const {before,after} of option.changes){
   const def=PROPERTY_CATALOG.properties.find(d=>d.id===before.id)!;
   // Chain/special-building economics are deliberately outside this first active-card policy.
   if(def.kind!=='land'||before.buildingType||after.buildingType)return [];
   if(ally&&(before.ownerId===ally||after.ownerId===ally))return [];
   if([before.ownerId,after.ownerId].some(owner=>owner&&s.finance?.eliminated.includes(owner)))return [];
   if(before.priceStatus)return []; // Do not assume sealed or temporarily inflated rents persist.
   const value=(p:typeof before)=>(propertyBase(p,def)+p.level*def.upgradeCost)*index;
   const rent=(p:typeof before)=>(def.rents[p.level]??0)*index;
   assets+=(after.ownerId===id?value(after):0)-(before.ownerId===id?value(before):0);
   rents+=(after.ownerId===id?rent(after):0)-(before.ownerId===id?rent(before):0);
   enemyRentLoss+=(before.ownerId&&before.ownerId!==id?rent(before):0)-(after.ownerId&&after.ownerId!==id?rent(after):0);
  }
  const cost=option.transfer?.amount??0,net=assets-cost;
  if(item==='card:12'){
   if(!option.changes[0].before.ownerId||enemyRentLoss<=0)return [];
  }else if(net<0||net===0&&rents<=0)return [];
  const score=item==='card:12'?enemyRentLoss:net+5*rents;
  return score>0?[{item,option,score,cost,net,rents}]:[];
 }).sort((a,b)=>b.score-a.score||a.option.target.id.localeCompare(b.option.target.id,'en'));
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==ESTATE_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=s.players[s.active].id,p=s.pending,bag=s.effects?.inventory[id];
 if(decisionPlayer(s)!==id)return previousDecision(s,nodes,'defense-v1');
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 const available=!actionLocked(s.g2?.players[id])&&!s.g4?.hotel[id]&&!s.finance?.eliminated.includes(id);
 const good=G1_GOODS.find(g=>g.effect===s.effects?.pending?.definitionId&&ESTATE_CARDS.some(c=>c===g.id));
 if(p?.kind==='effect'&&good){
  if(!available)return null; // Existing engine rejects even cancel under artificial locked-state mutation.
  const target=(bag?.[good.id]??0)>0?estateChoices(s,nodes,good.id)[0]:undefined;
  return target?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:target.option.target}},`${good.name}：${target.option.title}；现金支出${target.cost}元，按当前产权与基础租金估值`):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'目标、库存或收益已失效，取消并保留卡片');
 }
 if(s.phase==='idle'&&!p&&available){
  const candidates=ESTATE_CARDS.flatMap(item=>(bag?.[item]??0)>0?estateChoices(s,nodes,item):[]).sort((a,b)=>b.score-a.score||ESTATE_CARDS.indexOf(a.item as typeof ESTATE_CARDS[number])-ESTATE_CARDS.indexOf(b.item as typeof ESTATE_CARDS[number]));
  const target=candidates[0],good=G1_GOODS.find(g=>g.id===target?.item);
  if(good)return choose({type:'item',action:{type:'begin',definitionId:good.effect}},`使用${good.name}改善地产，购地付款后保留至少1000元现金并避开同盟；确认时重新判断目标`);
 }
 if(p?.kind==='shop'&&(s.g3?.slots[id].length??15)<15){
  const item=ESTATE_CARDS.find(item=>!bag?.[item]&&p.shelf?.cards.some(x=>x.itemId===item&&x.available)&&shopSupply(s,item)>0&&s.items!.points[id]>=shopPrice(item));
  if(item)return choose({type:'buyItem',decisionId:p.id,itemId:item},`花${shopPrice(item)}点补充一张${G1_GOODS.find(g=>g.id===item)!.name}，等待合适地产机会`);
 }
 return previousDecision(s,nodes,'defense-v1');
}
