/** Plans use ordinary commands only. Browser completion/export is separate evidence. */
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-tools';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import {writeFileSync} from 'node:fs';
export function planComputerTools(count:number,seed:string,turns=35){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.filter((_,i)=>i%2===1);
 const e=new GameEngine(nodes,{gameId:'tools-computer-plan',seed,characterIds:ids,rulesId:'japan-events-candidate-v44',initialFunds:30000,startDate:'1998-01-14'}),used=new Set<string>();
 for(let i=0;i<4000;i++){
  const s=e.state,p=s.pending,actor=decisionPlayer(s),ai=computerIds.includes(s.players.find(p=>p.id===actor)!.characterId);
  if(s.phase==='finished'||s.turn>=turns&&s.phase==='idle'&&!ai){return{replay:{...e.exportReplay(),control:{version:1 as const,policy:'tools-v1' as const,computerIds}},state:s,events:e.events,used:[...used]};}
  const d=ai?decideComputer(s,nodes,'tools-v1'):computerDecision(s);
  const action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
  if(!action)throw Error('No action '+s.phase);
  const r=e.dispatch({id:'tools-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:d?.playerId??actor,action});if(!r.ok)throw Error(JSON.stringify({i,action,r}));
  for(const ev of r.events)if(ai&&ev.type==='effectConsumed')used.add(ev.itemId);
 }
 throw Error('Plan exceeded limit');
}
if(process.env.RICHMAN_PLAN_TOOLS)for(const n of [2,3,4]){const p=planComputerTools(n,'tools-ai-'+n,Number(process.env.RICHMAN_TURNS??35));writeFileSync('/private/tmp/computer-tools-'+n+'.json',JSON.stringify(p));console.log(n,p.replay.commands.length,p.state.turn,p.used,p.events.filter(x=>x.type==='itemBought').length);}
