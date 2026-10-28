import type {Action,GameState,EventPayload} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision,capitalBudget} from './computer-capital';
import {PROPERTY_CATALOG,propertyBase} from './economy';
import {consumerIndex} from './price-index';
import {stockValue} from './g6-market';
import {g7Options,nuclearTargets} from './g7';
import {G7_GOODS} from './g7-catalog';
import {researchOptions} from './g5';
import {actionLocked} from './g2';
import type {Target} from './effects';
import {g1Adjacent} from './g1';
import {REMOTE_EFFECT} from './items';
const defs=PROPERTY_CATALOG.properties;
export const RESEARCH_POLICY='research-v1';
type PublicObservation={value:Record<string,number>;allies:string;eliminated:string;protected:Record<string,string>};
export type ResearchMemory=Record<string,PublicObservation>;
/** Host observation only. Never copy engine checkpoints, decks, RNG, commands or saved world. */
export function publicObservation(s:GameState):PublicObservation{
 const value:Record<string,number>={},protectedState:Record<string,string>={};
 for(const p of s.players){const id=p.id,b=s.economy!.balances[id];value[id]=b.cash+b.bank+stockValue(s.g6!,id)-s.news!.business!.loans[id]+s.economy!.properties.filter(q=>q.ownerId===id).reduce((sum,q)=>{const d=defs.find(d=>d.id===q.id)!;return sum+(propertyBase(q,d)+q.level*d.upgradeCost)*consumerIndex(s);},0);
  protectedState[id]=JSON.stringify({inventory:s.effects!.inventory[id],status:s.g2!.players[id],engineer:s.g5!.engineers[id],gods:s.g6!.gods.filter(g=>g.carrier===id),research:s.economy!.properties.filter(q=>q.ownerId===id&&q.research).map(q=>[q.id,q.research])});
 }
 return{value,protected:protectedState,allies:JSON.stringify(s.g3!.allies),eliminated:JSON.stringify(s.finance!.eliminated)};
}
export function observeResearch(memory:ResearchMemory,b:GameState,a:Action,s:GameState,events:readonly EventPayload[]):ResearchMemory{
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))))return memory;
 const item=b.effects?.pending?.definitionId.slice(0,7),confirm=a.type==='item'&&a.action.type==='confirm';
 if(confirm&&item==='tool:10')return {};
 const id=b.players[b.active].id,selfTeleport=confirm&&item==='tool:11'&&a.action.type==='confirm'&&a.action.target.kind==='player'&&a.action.target.id===id;
 if(!selfTeleport&&!events.some(e=>e.type==='rolled'))return memory;
 // Remote dice is consumed before the engine's checkpoint; self teleport is consumed after it.
 const publicState=selfTeleport?b:s,next={...memory};
 if(publicState.effects!.inventory[id]['tool:10']>0)next[id]=publicObservation(publicState);else delete next[id];return next;
}
export function timeChoice(s:GameState,memory:ResearchMemory){
 const id=s.players[s.active].id,old=memory[id];if(!old||!s.effects!.inventory[id]['tool:10'])return null;
 const now=publicObservation(s),ally=s.g3!.allies[id]?.partner;
 if(old.allies!==now.allies||old.eliminated!==now.eliminated)return null;
 // Do not erase a friendly production pipeline or a new/current tool, vehicle or status gain.
 if(ally&&(old.value[ally]<now.value[ally]||old.protected[ally]!==now.protected[ally]))return null;
 if(old.protected[id]!==now.protected[id])return null;
 const gain=old.value[id]-now.value[id],enemyGain=s.players.filter(p=>p.id!==id&&p.id!==ally).reduce((n,p)=>n+Math.max(0,old.value[p.id]-now.value[p.id]),0);
 return gain>=5000&&gain-enemyGain>=3000?{target:{kind:'player' as const,id},score:gain-enemyGain}:null;
}
export function researchChoice(s:GameState,nodes:readonly MapNode[],item:string,memory:ResearchMemory={}):{target:Target;destination?:Target;score:number}|null{
 const id=s.players[s.active].id,ally=s.g3!.allies[id]?.partner,friendly=(p:string|null)=>p===id||!!ally&&p===ally;
 if(item==='tool:10')return timeChoice(s,memory);
 if(item==='tool:13'){
  const choices=g7Options(s,nodes,defs,item).flatMap(o=>{const hit=nuclearTargets(s,nodes,defs,Number(o.target.id));
   if(hit.players.some(friendly)||hit.properties.some(key=>{const p=s.economy!.properties.find(q=>q.id===key)!;return friendly(p.ownerId)||!!p.research&&friendly(p.research.ownerId??null);}))return [];
   // Keep useful gods, including wandering ones: long-range replacement is not predicted.
   if(hit.gods.some(key=>{const g=s.g6!.gods.find(g=>g.id===key)!;return ![5,6,7,8,10,15].includes(g.type)||!!g.carrier&&friendly(g.carrier);}))return [];
   const score=hit.players.length*3000+hit.properties.reduce((n,key)=>{const q=s.economy!.properties.find(p=>p.id===key)!;if(!q.ownerId)return n;const d=defs.find(d=>d.id===key)!;return n+propertyBase(q,d)+q.level*d.upgradeCost+(q.research?2000:0);},0);
   return score>=5000?[{target:o.target,score}]:[];
  });return choices.sort((a,b)=>b.score-a.score||Number(a.target.id)-Number(b.target.id))[0]??null;
 }
 if(item!=='tool:11')return null;
 // First increment intentionally teleports only self to a useful, public, safe owned laboratory.
 const option=g7Options(s,nodes,defs,item).find(o=>o.target.kind==='player'&&o.target.id===id);if(!option)return null;
 if(s.g5!.hazards.some(h=>h.carrier===id)||s.g5!.engineers[id])return null;
 const choices=option.destinations!.flatMap(dest=>{const n=Number(dest.target.id),d=defs.find(d=>d.kind==='facility'&&d.nodeIds.includes(n)),q=d&&s.economy!.properties.find(q=>q.id===d.id);
  if(!q||q.ownerId!==id||q.buildingType!==4||(q.priceStatus!&15)||q.research)return [];
  if(s.roadTools!.blocks.includes(n)||s.g5!.hazards.some(h=>!h.carrier&&h.node===n)||s.g6!.gods.some(g=>!g.carrier&&g.node===n))return [];
  const next=G7_GOODS.some(g=>g.level<=q.level&&!s.effects!.inventory[id][g.id]&&!s.economy!.properties.some(p=>p.research?.ownerId===id&&p.research.itemId===g.id));
  if(!next)return [];
  return[{target:option.target,destination:dest.target,score:300+q.level}];
 });return choices.sort((a,b)=>b.score-a.score||Number(a.destination.id)-Number(b.destination.id))[0]??null;
}
/** Small public route aid for reaching a research investment; no future event valuation. */
export function labRoute(s:GameState,nodes:readonly MapNode[]){
 const id=s.players[s.active].id,who=s.players[s.active],bag=s.effects!.inventory[id];
 if(G7_GOODS.every(g=>bag[g.id]>0))return null;
 const owned=s.economy!.properties.filter(q=>defs.some(d=>d.id===q.id&&d.kind==='facility')&&q.ownerId===id&&(q.buildingType===4||!q.level)&&(!(q.priceStatus!&15))&&(q.level<5||!q.research));
 const candidates=defs.filter(d=>d.kind==='facility'&&(owned.length?owned.some(q=>q.id===d.id):s.economy!.properties.some(q=>q.id===d.id&&!q.ownerId&&!q.level)));
 if(!candidates.length)return null;
 const goals=new Set(candidates.flatMap(d=>d.nodeIds)),byId=new Map(nodes.map(n=>[n.id,n])),distance=new Map<number,number>([...goals].map(n=>[n,0])),queue=[...goals];
 for(let i=0;i<queue.length;i++)for(const n of g1Adjacent(byId.get(queue[i])!))if(!distance.has(n)){distance.set(n,distance.get(queue[i])!+1);queue.push(n);}
 const hazards=new Set([...s.roadTools!.blocks,...s.g5!.hazards.filter(h=>!h.carrier).map(h=>h.node)]),memo=new Map<string,number>();
 const route=(node:number,prev:number,left:number):number=>{if(hazards.has(node))return -10000;if(!left)return -(distance.get(node)??1000);const key=node+'/'+prev+'/'+left;if(memo.has(key))return memo.get(key)!;const all=g1Adjacent(byId.get(node)!),next=all.filter(n=>n!==prev),score=Math.max(-10000,...(next.length?next:all).map(n=>route(n,node,left-1)));memo.set(key,score);return score;};
 const all=g1Adjacent(byId.get(who.node)!),next=all.filter(n=>n!==who.previous),first=next.length?next:all;
 const dice=[1,2,3,4,5,6].map(value=>({value,score:Math.max(-10000,...first.map(n=>route(n,who.node,value-1)))})).sort((a,b)=>b.score-a.score||a.value-b.value);
 return{distance,goals,hazards,dice};
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1',memory:ResearchMemory={}):ComputerDecision|null{
 if(policy!==RESEARCH_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=decisionPlayer(s),who=s.players[s.active],p=s.pending;
 if(id!==who.id)return previousDecision(s,nodes,'capital-v1');
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason}),bag=s.effects!.inventory[id],available=!actionLocked(s.g2!.players[id])&&!s.g4!.hotel[id]&&!s.finance!.eliminated.includes(id);
 const route=available?labRoute(s,nodes):null,m=s.g2!.players[id];
 const remote=route&&m.vehicle==='foot'&&m.diceCount===1&&!m.stop&&!m.turtle&&route.dice[0].score===0&&route.dice.some(d=>d.score<0)?route.dice[0]:null;
 const good=G7_GOODS.find(g=>g.effect===s.effects!.pending?.definitionId);
 if(p?.kind==='effect'&&good){if(!available)return null;const c=bag[good.id]>0?researchChoice(s,nodes,good.id,memory):null;
  return c?choose({type:'item',action:{type:'confirm',decisionId:p.id,target:c.target,...('destination'in c?{destination:c.destination as Target}:{})}},'重新核对公开科研目标与风险后执行；时光机仅用出发时的公开观察'):choose({type:'item',action:{type:'cancel',decisionId:p.id}},'公开收益、目标或库存失效，取消科研工具使用');
 }
 if(p?.kind==='effect'&&s.effects!.pending?.definitionId===REMOTE_EFFECT&&remote&&bag['tool:08']>0)return choose({type:'item',value:remote.value,action:{type:'confirm',decisionId:p.id,target:{kind:'player',id}}},'遥控到公开研究用地，确认前重新选路');
 if(available&&!p&&s.phase==='idle'){
  const choices=G7_GOODS.flatMap(g=>{const c=bag[g.id]>0?researchChoice(s,nodes,g.id,memory):null;return c?[{g,c}]:[];}).sort((a,b)=>b.c.score-a.c.score);
  if(choices[0])return choose({type:'item',action:{type:'begin',definitionId:choices[0].g.effect}},'使用'+choices[0].g.name+'：按当前公开风险与合法范围决策');
 }
 if(available&&!p&&['idle','turnEnd'].includes(s.phase)){
  const options=researchOptions(s,defs),g=[...G7_GOODS].reverse().find(g=>!bag[g.id]&&!s.economy!.properties.some(q=>q.research?.ownerId===id&&q.research.itemId===g.id)&&options.some(o=>o.itemId===g.id));
  if(g){const o=options.find(o=>o.itemId===g.id)!;return choose({type:'research',propertyId:o.propertyId,itemId:o.itemId},'在脚下自有研究所免费生产'+g.name+'，不覆盖任务、不重复囤货');}
 }
 if(p?.kind==='property'&&p.operation!=='rent'){
  const d=defs.find(d=>d.id===p.propertyId)!,q=s.economy!.properties.find(q=>q.id===d.id)!,budget=capitalBudget(s),b=s.economy!.balances[id];
  if(d.kind==='facility'&&(!q.level||q.buildingType===4)&&b.cash-p.amount>=3000&&budget.liquid-p.amount>=budget.reserve)return choose({type:'property',decisionId:p.id,accept:true,...(p.buildingChoices?{buildingType:4}:{})},'保留经营缓冲后建设自有研究所，沿既有楼级解锁生产');
 }
 if(available&&p?.kind==='branch'&&route){const choices=p.choices.filter(n=>!route.hazards.has(n));if(choices.length)return choose({type:'choose',decisionId:p.id,node:[...choices].sort((a,b)=>(route.distance.get(a)??1000)-(route.distance.get(b)??1000)||a-b)[0]},'沿公开道路接近自有或待售研究用地，避开当前道路危险');}
 if(available&&!p&&s.phase==='idle'&&bag['tool:08']>0&&remote)return choose({type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}},'遥控骰子可直接到达公开研究用地');
 if(p?.kind==='bank'&&!s.news!.business!.bankRejected?.[id]&&!s.news!.business!.loans[id]&&route){
  const b=s.economy!.balances[id],budget=capitalBudget(s),target=Math.min(15000,Math.max(5000,...defs.filter(d=>d.kind==='facility'&&d.nodeIds.some(n=>route.goals.has(n))).map(d=>(d.basePrice+5*d.upgradeCost)*consumerIndex(s)+3000))),amount=target-b.cash;
  if(amount>0&&b.bank>=amount&&budget.liquid>=budget.reserve+target)return choose({type:'bank',decisionId:p.id,operation:'withdraw',amount},'在预算内预留研究所购建现金，最多15000元，不借款建所');
  if(b.cash>target)return choose({type:'bank',decisionId:p.id,operation:'deposit',amount:b.cash-target},'保留科研现金，将多余资金存入银行');
  if(b.cash===target)return choose({type:'leaveBank',decisionId:p.id},'科研购建现金准备完成');
 }
 return previousDecision(s,nodes,'capital-v1');
}
