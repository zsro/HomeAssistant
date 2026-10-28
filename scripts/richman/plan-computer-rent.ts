/** Original-map commands only; plans are not UI acceptance. */
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-reactions';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {writeFileSync} from 'node:fs';
export function planComputerRent(count:number,seed:string,limit=3500,required=['free','redirect']){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.filter((_,i)=>i%2===1),e=new GameEngine(nodes,{gameId:'rent-plan',seed,characterIds:ids,rulesId:'japan-events-candidate-v44',initialFunds:30000,startDate:'1998-01-14'}),used=new Set<string>();
 const cross:unknown[]=[];let end=0;
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,actor=decisionPlayer(s),ai=computerIds.includes(s.players.find(p=>p.id===actor)!.characterId);
  if(required.every(x=>used.has(x))&&!end)end=s.turn;
  if((end&&s.turn>end&&s.phase==='idle'&&!ai)||s.phase==='finished')return{replay:{...e.exportReplay(),control:{version:1 as const,policy:'rent-v1' as const,computerIds}},state:s,events:e.events,coverage:[...used],cross};
  const d=ai?decideComputer(s,nodes,'rent-v1'):computerDecision(s);
  const action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
  if(!action)throw Error('No action '+s.phase);
  if(p?.kind==='reaction'||p?.kind==='debt'||p?.kind==='property'&&p.operation==='rent')cross.push({index:i,kind:p.kind,computer:ai,active:s.players[s.active].id,actor});
  const r=e.dispatch({id:'rent-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:d?.playerId??actor,action});if(!r.ok)throw Error(JSON.stringify({i,action,r}));
  if(ai&&p?.kind==='reaction'&&p.continuation.kind==='rent'&&action.type==='reaction'&&action.choice==='use')used.add(p.stage);
 }
 return null;
}
if(process.env.RICHMAN_PLAN_RENT)for(const count of [2,3,4])for(let i=0;i<30;i++){
 const seed=`rent-ai-${count}-${i}`,p=planComputerRent(count,seed);console.log(count,i,p?.replay.commands.length,p?.coverage);
 if(p&&p.coverage.includes('free')&&p.coverage.includes('redirect')){writeFileSync('/private/tmp/computer-rent-'+count+'.json',JSON.stringify(p));break;}
}
