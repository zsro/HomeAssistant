import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision} from './computer-inventory';
import {G4_GOODS,g4Options,auctionReserve,maximumLevel} from './g4';
import {PROPERTY_CATALOG,propertyBase} from './economy';
import type {PropertyState} from './economy';
import {consumerIndex} from './price-index';
import {actionLocked} from './g2';
import {shopPrice,shopSupply} from './shop-acquisition';
export const COMMERCE_POLICY='commerce-v1';
export const COMMERCE_GOODS=G4_GOODS.filter(g=>g.id!=='card:26');
const definitions=PROPERTY_CATALOG.properties;
/** Static rent exposure only: no draws, future paths, deity modifiers or engine simulation. */
export function commerceRent(p:PropertyState,properties:readonly PropertyState[]){
 const d=definitions.find(d=>d.id===p.id)!;
 if(!p.ownerId||(p.priceStatus!&15))return 0;
 const multiplier=p.priceStatus?2:1;
 if(d.kind==='facility')return p.level&&[1,2].includes(p.buildingType??0)?d.rents[p.level-1]*multiplier:0;
 return properties.reduce((sum,q)=>{const def=definitions.find(d=>d.id===q.id)!;return sum+(def.kind==='land'&&q.ownerId===p.ownerId&&(p.buildingType===1?q.buildingType===1:q.buildingType!==1&&def.name===d.name)?(p.buildingType===1?2000:def.rents[q.level])*multiplier:0);},0);
}
export function commerceChoices(s:GameState,nodes:readonly MapNode[],item:string){
 const id=s.players[s.active].id,ally=s.g3!.allies[id]?.partner,props=s.economy!.properties;
 const friendly=(owner:string|null)=>owner===id||!!ally&&owner===ally;
 return g4Options(s,nodes,definitions,item).flatMap<{item:string;target:string;value?:number;score:number;affected:string[]}>(option=>{
  const p=props.find(p=>p.id===option.target.id)!,d=definitions.find(d=>d.id===p.id)!;
  if(p.ownerId&&s.finance!.eliminated.includes(p.ownerId))return [];
  if(item==='card:08'){
   // Never risk our own or allied land in an irrevocable auction; no promised bidder or proceeds.
   if(!p.ownerId||friendly(p.ownerId)||p.priceStatus)return [];
   const score=commerceRent(p,props);return score>0?[{item,target:p.id,score,affected:[p.id]}]:[];
  }
  if(item==='card:07'){
   if(!p.ownerId||p.ownerId===ally||p.priceStatus||p.research)return [];
   let value:number|undefined,next:PropertyState={...p};
   if(d.kind==='land')next.buildingType=p.buildingType===1?0:1;
   else{
    if(p.ownerId===id&&(p.buildingType??0)===0)value=2;
    else if(p.ownerId!==id&&[1,2].includes(p.buildingType??0))value=0;
    else return []; // Do not destroy research or guess gas/roulette utility.
    next.buildingType=value;
   }
   next={...next,level:Math.min(p.level,maximumLevel(next,d))};
   if(p.ownerId===id&&next.level<p.level)return [];
   const after=props.map(q=>q.id===p.id?next:q),total=(ps:readonly PropertyState[])=>ps.filter(q=>q.ownerId===p.ownerId).reduce((n,q)=>n+commerceRent(q,ps),0);
   const score=(total(after)-total(props))*(p.ownerId===id?1:-1);
   return score>0?[{item,target:p.id,value,score,affected:[p.id]}]:[];
  }
  const affected=props.filter(q=>{const def=definitions.find(d=>d.id===q.id)!;return d.kind==='land'?def.kind==='land'&&def.name===d.name:q.id===p.id;});
  if(affected.some(q=>q.ownerId&&(item==='card:27'?!friendly(q.ownerId):friendly(q.ownerId))))return [];
  // Avoid refreshing the same status; opposite status can be replaced when the whole group is safe.
  if(affected.every(q=>q.priceStatus&&(item==='card:27'?!(q.priceStatus&15):!!(q.priceStatus&15))))return [];
  const after=props.map(q=>affected.includes(q)?{...q,priceStatus:item==='card:27'?80:81}:q);
  const score=affected.reduce((n,q)=>n+(q.ownerId&&(item==='card:27'?q.ownerId===id:!friendly(q.ownerId))?(commerceRent(after.find(p=>p.id===q.id)!,after)-commerceRent(q,props))*(item==='card:27'?1:-1):0),0);
  return score>0?[{item,target:p.id,score,affected:affected.map(q=>q.id)}]:[];
 }).sort((a,b)=>b.score-a.score||a.target.localeCompare(b.target,'en'));
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==COMMERCE_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=decisionPlayer(s),p=s.pending,choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 if(p?.kind==='auction'&&!p.disposalId&&!p.publicNews&&!p.magicBatchId){
  const property=s.economy!.properties.find(q=>q.id===p.propertyId)!,d=definitions.find(d=>d.id===p.propertyId)!,ally=s.g3!.allies[id]?.partner,cash=s.economy!.balances[id].cash;
  const ceiling=(propertyBase(property,d)+property.level*d.upgradeCost+2*commerceRent(property,s.economy!.properties))*consumerIndex(s),next=p.bid+100;
  const bid=d.kind==='land'&&property.ownerId!==id&&property.ownerId!==ally&&!property.priceStatus&&(!p.leader||p.leader!==ally)&&next<=ceiling&&cash-next>=1000;
  return choose({type:'auction',decisionId:p.id,increment:bid?100:null},bid?`现金加价100；不超过基础资产加两次静态租金上限${ceiling}，保留1000元现金`:'保留现金或避开盟友/原有产权，退出此次竞价');
 }
 if(id!==s.players[s.active].id)return previousDecision(s,nodes,'inventory-v1');
 const bag=s.effects!.inventory[id],available=!actionLocked(s.g2?.players[id])&&!s.g4?.hotel[id]&&!s.finance?.eliminated.includes(id),good=COMMERCE_GOODS.find(g=>g.effect===s.effects?.pending?.definitionId);
 if(p?.kind==='effect'&&good){
  if(!available)return null;
  const choice=bag[good.id]>0?commerceChoices(s,nodes,good.id)[0]:undefined;
  return choice?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:{kind:'property',id:choice.target}},...(choice.value===undefined?{}:{value:choice.value})},`${good.name}：按整组产权/楼型/租金评估；${good.id==='card:08'?`标价${auctionReserve(s.economy!.properties.find(q=>q.id===choice.target)!,definitions.find(d=>d.id===choice.target)!,s)}，实收以竞价结果为准`:'确认不另收现金'}`):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'产权、库存或整组收益风险变化，取消并保留卡片');
 }
 if(s.phase==='idle'&&!p&&available){
  const choices=COMMERCE_GOODS.flatMap((g,order)=>bag[g.id]>0?commerceChoices(s,nodes,g.id).map(c=>({...c,g,order})):[]).sort((a,b)=>b.score-a.score||a.order-b.order);
  if(choices[0])return choose({type:'item',action:{type:'begin',definitionId:choices[0].g.effect}},`使用${choices[0].g.name}；确认前重新检查整组产权、租金和盟友风险`);
 }
 if(p?.kind==='shop'&&(s.g3?.slots[id].length??15)<15){
  const g=COMMERCE_GOODS.find(g=>!bag[g.id]&&p.shelf?.cards.some(x=>x.itemId===g.id&&x.available)&&shopSupply(s,g.id)>0&&s.items!.points[id]>=shopPrice(g.id));
  if(g)return choose({type:'buyItem',decisionId:p.id,itemId:g.id},`花${shopPrice(g.id)}点补充一张${g.name}，等待合适经营目标`);
 }
 return previousDecision(s,nodes,'inventory-v1');
}
