/** Legal v44 original-map planning; not browser evidence. Humans follow scripted ordinary commands. */
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision} from '../../frontend/src/features/richman/game/computer';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {writeFileSync} from 'node:fs';
export function planComputer(count:number,seed:string,turns=65){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.filter((_,i)=>i%2===1);
 const e=new GameEngine(nodes,{gameId:'computer-plan',seed,characterIds:ids,rulesId:'japan-events-candidate-v44',initialFunds:10000,startDate:'1998-01-14'}),kinds:Record<string,number>={};
 for(let i=0;i<40000;i++){
  const s=e.state,p=s.pending;
  if(s.phase==='finished'||s.turn>=turns&&s.phase==='idle'&&!computerIds.includes(s.players[s.active].characterId))return{replay:{...e.exportReplay(),control:{version:1,policy:'basic-v1',computerIds}},state:s,events:e.events,kinds};
  const d=computerDecision(s),playerId=d?.playerId??s.players[s.active].id,action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
  if(!action)throw Error('Unhandled '+JSON.stringify(p));
  const k=p?.kind==='property'?p.operation:p?.kind??s.phase;kinds[k]=(kinds[k]??0)+1;
  const r=e.dispatch({id:'plan-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId,action});if(!r.ok)throw Error(JSON.stringify({r,action,p}));
 }
 throw Error('No completion within 40000 commands');
}
if(process.env.RICHMAN_PLAN_COMPUTER)for(const n of [2,3,4]){const plan=planComputer(n,'computer-'+n,Number(process.env.RICHMAN_TURNS??65));writeFileSync('/private/tmp/computer-plan-'+n+'.json',JSON.stringify(plan));console.log(n,plan.replay.commands.length,plan.state.turn,plan.state.phase,plan.kinds);}
