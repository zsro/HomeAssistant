/** Legal original Japan commands only. This plan is not browser acceptance. */
import {writeFileSync} from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,observeResearch,type ResearchMemory} from '../../frontend/src/features/richman/game/computer-research';
import {GODS} from '../../frontend/src/features/richman/game/g6-catalog';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
for(const count of [2,3,4]){
 const goal=count===2?13:count===3?14:11;let found=false;
 for(let seed=0;seed<80&&!found;seed++){
  const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.slice(1),e=new GameEngine(nodes,{gameId:'objects-plan',rulesId:'japan-events-candidate-v46',seed:`special-${count}-${seed}`,characterIds:ids,initialFunds:100000,startDate:'1998-01-31'});
  let memory:ResearchMemory={},hit=false,month=false;const displayChecks=[];
  for(let i=0;i<180;i++){
   const s=e.state,p=s.pending,id=decisionPlayer(s),ai=computerIds.includes(s.players.find(p=>p.id===id)!.characterId);
   if(!ai&&s.phase==='idle'){
    if(!displayChecks.length||hit&&month)displayChecks.push({index:i,objects:structuredClone(s.g6!.objects),gods:s.g6!.gods.filter(g=>g.carrier).map(g=>({carrier:g.carrier,text:`${GODS.find(d=>d.type===g.type)!.name} · 剩余${g.remaining}次自身行动开始结算`}))});
    if(hit&&month){found=true;break;}
   }
   const d=ai?decideComputer(s,nodes,'research-v1',memory):computerDecision(s),action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
   if(!action)break;
   const r=e.dispatch({id:'special-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:id,action});if(!r.ok)throw Error(JSON.stringify(r));memory=observeResearch(memory,s,action,e.state,r.events);
   hit ||= r.events.some(e=>e.type==='specialObjectResolved'&&e.objectType===goal&&(goal!==11||e.outcome==='hospital'));
   month ||=r.events.some(e=>e.type==='specialObjectsRefreshed');
  }
  if(found){const plan={replay:{...e.exportReplay(),control:{version:1,policy:'research-v1',computerIds}},state:e.state,events:e.events,displayChecks:displayChecks.filter(c=>c.index<e.state.revision),cross:[]};writeFileSync(`/private/tmp/special-objects-${count}.json`,JSON.stringify(plan));console.log(count,'seed',seed,'commands',e.state.revision,JSON.stringify(e.events.filter(e=>e.type==='specialObjectResolved'||e.type==='specialObjectsRefreshed')));}
 }
 if(!found)throw Error(`No ${count}-player route`);
}
