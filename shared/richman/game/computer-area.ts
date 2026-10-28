import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision,commerceRent} from './computer-commerce';
import {G5_GOODS} from './g5-catalog';
import {g5Options} from './g5';
import {maximumLevel} from './g4';
import {PROPERTY_CATALOG} from './economy';
import {actionLocked} from './g2';
import {shopPrice,shopSupply} from './shop-acquisition';
export const AREA_POLICY='area-v1';
export const AREA_GOODS=G5_GOODS.filter(g=>['card:09','card:10','card:11'].includes(g.id));
const definitions=PROPERTY_CATALOG.properties;
/** Current building investment and static rent only; no future draws, paths or research reward prediction. */
export function areaChoices(s:GameState,nodes:readonly MapNode[],item:string){
 if(!AREA_GOODS.some(g=>g.id===item))return [];
 const id=s.players[s.active].id,ally=s.g3!.allies[id]?.partner,props=s.economy!.properties;
 const friendly=(owner:string|null)=>owner===id||!!ally&&owner===ally;
 return g5Options(s,nodes,definitions,item).flatMap<{item:string;target:string;value?:number;score:number;affected:string[]}>(option=>{
  const d=definitions.find(d=>d.id===option.target.id)!;
  const affected=props.filter(q=>{const def=definitions.find(d=>d.id===q.id)!;return q.id===d.id||(item!=='card:11'&&d.kind==='land'&&def.kind==='land'&&def.name===d.name);});
  // A vacant facility must choose a legal type explicitly. Existing research is never converted.
  const value=option.buildingTypes?.includes(2)?2:undefined;
  const after=props.map(q=>{if(!affected.includes(q))return q;const def=definitions.find(d=>d.id===q.id)!;
   if(item!=='card:09')return {...q,level:0,buildingType:0,research:null};
   const next={...q,...(def.kind==='facility'&&!q.level?{buildingType:value}: {})};return {...next,level:Math.min(q.level+1,maximumLevel(next,def))};
  });
  const changed=affected.filter(q=>{const next=after.find(p=>p.id===q.id)!;return next.level!==q.level||next.buildingType!==q.buildingType||next.research!==q.research;});
  if(!changed.length)return [];
  // Never help opponents/unowned plots or destroy our/our ally's building or research.
  if(changed.some(q=>q.ownerId&&s.finance!.eliminated.includes(q.ownerId)))return [];
  if(item==='card:09'?changed.some(q=>!friendly(q.ownerId)):changed.some(q=>friendly(q.ownerId)))return [];
  const relevant=(owner:string|null)=>!!owner&&(item==='card:09'?owner===id:!friendly(owner));
  const investment=changed.reduce((sum,q)=>sum+(relevant(q.ownerId)?Math.abs(after.find(p=>p.id===q.id)!.level-q.level)*definitions.find(d=>d.id===q.id)!.upgradeCost:0),0);
  const rent=(ps:typeof props)=>ps.filter(q=>relevant(q.ownerId)).reduce((sum,q)=>sum+commerceRent(q,ps),0);
  const score=investment+(rent(after)-rent(props))*(item==='card:09'?1:-1);
  return score>0?[{item,target:d.id,value,score,affected:affected.map(q=>q.id)}]:[];
 }).sort((a,b)=>b.score-a.score||a.target.localeCompare(b.target,'en'));
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==AREA_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=decisionPlayer(s),p=s.pending,choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 if(id!==s.players[s.active].id)return previousDecision(s,nodes,'commerce-v1');
 const bag=s.effects!.inventory[id],available=!actionLocked(s.g2?.players[id])&&!s.g4?.hotel[id]&&!s.finance?.eliminated.includes(id),good=AREA_GOODS.find(g=>g.effect===s.effects?.pending?.definitionId);
 if(p?.kind==='effect'&&good){
  if(!available)return null;
  const choice=bag[good.id]>0?areaChoices(s,nodes,good.id)[0]:undefined;
  return choice?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:{kind:'property',id:choice.target}},...(choice.value===undefined?{}:{value:choice.value})},`${good.name}：整组建筑投资与静态租金有利；保护自己和盟友科研，确认耗一张、无现金费用`):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'合法目标、库存或整组产权收益变化，取消并保留卡片');
 }
 if(s.phase==='idle'&&!p&&available){
  const choices=AREA_GOODS.flatMap((g,order)=>bag[g.id]>0?areaChoices(s,nodes,g.id).map(c=>({...c,g,order})):[]).sort((a,b)=>b.score-a.score||a.order-b.order);
  if(choices[0])return choose({type:'item',action:{type:'begin',definitionId:choices[0].g.effect}},`使用${choices[0].g.name}；确认前重算整组产权、建筑与盟友风险`);
 }
 if(p?.kind==='shop'&&(s.g3?.slots[id].length??15)<15){
  const g=AREA_GOODS.find(g=>!bag[g.id]&&p.shelf?.cards.some(x=>x.itemId===g.id&&x.available)&&shopSupply(s,g.id)>0&&s.items!.points[id]>=shopPrice(g.id));
  if(g)return choose({type:'buyItem',decisionId:p.id,itemId:g.id},`花${shopPrice(g.id)}点补充一张${g.name}，遵守货架与有限供应`);
 }
 return previousDecision(s,nodes,'commerce-v1');
}
