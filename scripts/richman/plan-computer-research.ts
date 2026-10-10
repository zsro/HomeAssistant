import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,observeResearch} from '../../frontend/src/features/richman/game/computer-research';
import type {ResearchMemory} from '../../frontend/src/features/richman/game/computer-research';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';import {writeFileSync} from 'node:fs';
export function planComputerResearch(count:number,seed:string,required:string[],limit=6000){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.slice(1),e=new GameEngine(nodes,{gameId:'research-plan',seed,characterIds:ids,rulesId:'japan-events-candidate-v44',initialFunds:300000,startDate:'1998-01-05'}),used=new Set<string>(),cross:{index:number;kind:string;computer:boolean}[]=[];let end=0,memory:ResearchMemory={};
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,id=decisionPlayer(s),ai=computerIds.includes(s.players.find(p=>p.id===id)!.characterId);
  if(required.every(k=>used.has(k))&&!end)end=s.turn;
  if(end&&s.turn>end&&s.phase==='idle'&&!ai)return{replay:{...e.exportReplay(),control:{version:1 as const,policy:'research-v1' as const,computerIds}},state:s,events:e.events,used:[...used],cross};
  if(s.phase==='finished')break;
  const d=ai?decideComputer(s,nodes,'research-v1',memory):computerDecision(s),action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
  if(!action)throw Error('No action '+s.phase);
  if(p?.kind==='reaction'||p?.kind==='auction'||p?.kind==='property'&&p.payerId&&p.payerId!==s.players[s.active].id)cross.push({index:i,kind:p.kind,computer:ai});
  const r=e.dispatch({id:'research-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:id,action});if(!r.ok)throw Error(JSON.stringify({i,action,r}));memory=observeResearch(memory,s,action,e.state,r.events);
  if(ai&&action.type==='research')used.add('research:'+action.itemId);
  if(ai&&action.type==='item'&&action.action.type==='confirm')used.add(s.effects!.pending!.definitionId.slice(0,7));
 }
 return{used:[...used],state:e.state};
}
if(process.env.RICHMAN_PLAN_RESEARCH){const n=Number(process.env.RICHMAN_PLAYERS??2),required=(process.env.RICHMAN_REQUIRE??'tool:10,tool:11,tool:13').split(',');for(let i=Number(process.env.RICHMAN_SEED_START??0);i<12;i++){const p=planComputerResearch(n,`research-${n}-${i}`,required,Number(process.env.RICHMAN_LIMIT??6000));console.log(n,i,p.used,p.replay?.commands.length);if(p.replay){writeFileSync('/private/tmp/computer-research-'+(process.env.RICHMAN_ROUTE??n)+'.json',JSON.stringify(p));break;}}}
