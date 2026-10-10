/** Accepted original Japan commands; plans are not browser acceptance. */
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-capital';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';import {writeFileSync} from 'node:fs';
export function planComputerCapital(count:number,seed:string,required:string[],limit=1800,funds=100000){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.slice(1),e=new GameEngine(nodes,{gameId:'capital-plan',seed,characterIds:ids,rulesId:'japan-events-candidate-v44',initialFunds:funds,startDate:'1998-01-05'}),used=new Set<string>(),cross:{index:number;kind:string;computer:boolean}[]=[];let end=0;
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,id=decisionPlayer(s),ai=computerIds.includes(s.players.find(p=>p.id===id)!.characterId);
  if(required.every(k=>used.has(k))&&!end)end=s.turn;
  if(end&&s.turn>end&&s.phase==='idle'&&!ai)return{replay:{...e.exportReplay(),control:{version:1 as const,policy:'capital-v1' as const,computerIds}},state:s,events:e.events,used:[...used],cross};
  if(s.phase==='finished')break;
  const d=ai?decideComputer(s,nodes,'capital-v1'):computerDecision(s),action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
  if(!action)throw Error('No action '+s.phase);
  if(p?.kind==='reaction'||p?.kind==='auction'||p?.kind==='property'&&p.payerId&&p.payerId!==s.players[s.active].id)cross.push({index:i,kind:p.kind,computer:ai});
  const r=e.dispatch({id:'capital-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:id,action});if(!r.ok)throw Error(JSON.stringify({i,action,r}));
  if(r.events.some(ev=>ev.type==='stockTraded'&&ev.forced))used.add('forced');if(action.type==='reaction')used.add('reaction');if(e.state.finance!.eliminated.length>s.finance!.eliminated.length)used.add('exit');
  if(ai){if(action.type==='stockTrade')used.add(action.side);if(action.type==='subscribeCompany'&&action.quantity)used.add('subscription');if(action.type==='loan')used.add(action.operation);if(action.type==='bank')used.add(action.operation);if(action.type==='item'&&action.action.type==='confirm'&&s.effects!.pending?.definitionId.startsWith('card:24'))used.add('red');}
 }
 return{state:e.state,events:e.events,used:[...used],cross};
}
if(process.env.RICHMAN_PLAN_CAPITAL){const n=Number(process.env.RICHMAN_PLAYERS??2),required=(process.env.RICHMAN_REQUIRE??'buy,sell').split(',');for(let i=Number(process.env.RICHMAN_SEED_START??0);i<30;i++){const p=planComputerCapital(n,`capital-${n}-${i}`,required,Number(process.env.RICHMAN_LIMIT??1200),Number(process.env.RICHMAN_FUNDS??100000));console.log(n,i,p.used,p.replay?.commands.length);if(p.replay){writeFileSync('/private/tmp/computer-capital-'+(process.env.RICHMAN_ROUTE??n)+'.json',JSON.stringify(p));break;}}}
