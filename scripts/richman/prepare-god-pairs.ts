/** Engine-accepted original Japan route planning; not browser evidence. */
import {writeFileSync} from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,observeResearch,type ResearchMemory} from '../../frontend/src/features/richman/game/computer-research';
import {GODS} from '../../frontend/src/features/richman/game/g6-catalog';
import nodes from '../../shared/richman/japan-topology.fixture.json';
for(const count of [2,3,4]){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.slice(1);
 const e=new GameEngine(nodes,{gameId:'pairs-plan',rulesId:'japan-events-candidate-v45',seed:'paired-'+count,characterIds:ids,initialFunds:100000,startDate:'1998-01-14'});
 let memory:ResearchMemory={},last='',pairs=0;const displayChecks=[];
 for(let i=0;i<1800;i++){
  const s=e.state,p=s.pending,id=decisionPlayer(s),ai=computerIds.includes(s.players.find(p=>p.id===id)!.characterId);
  if(!ai&&p?.kind!=='roll'&&p?.kind!=='segment'){
   const gods=s.g6!.gods.filter(g=>g.carrier),sig=gods.map(g=>g.carrier+':'+g.type).join();
   if(sig!==last){displayChecks.push({index:i,gods:gods.map(g=>({carrier:g.carrier,text:`${GODS.find(d=>d.type===g.type)!.name} · 剩余${g.remaining}次自身行动开始结算`}))});last=sig;}
   if(pairs>=2&&s.phase==='idle'&&s.turn>=20)break;
  }
  const d=ai?decideComputer(s,nodes,'research-v1',memory):computerDecision(s),action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
  if(!action)throw Error('No action '+s.phase);
  const r=e.dispatch({id:'pair-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:id,action});if(!r.ok)throw Error(JSON.stringify(r));memory=observeResearch(memory,s,action,e.state,r.events);
  pairs+=r.events.filter(e=>e.type==='g6Notice'&&e.message.startsWith('配对补位：')&&e.message.includes('出现在')).length;
 }
 if(pairs<2||e.state.phase!=='idle'||e.state.active!==0)throw Error('route incomplete');
 const plan={replay:{...e.exportReplay(),control:{version:1,policy:'research-v1',computerIds}},state:e.state,events:e.events,displayChecks:displayChecks.filter(c=>c.index<e.state.revision),cross:[]};
 writeFileSync(`/private/tmp/god-pairs-${count}.json`,JSON.stringify(plan));console.log(count,plan.replay.commands.length,'pairs',pairs,'checks',displayChecks.length,'turn',e.state.turn);
}
