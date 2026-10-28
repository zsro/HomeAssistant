/** Legal original-map commands only. Planned routes are not browser acceptance. */
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,ROADS_GOODS,roadsChoices} from '../../frontend/src/features/richman/game/computer-roads';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {writeFileSync} from 'node:fs';
export function planComputerRoads(count:number,seed:string,required:readonly string[],limit=4000){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.filter((_,i)=>i>0);
 const e=new GameEngine(nodes,{gameId:'roads-plan',seed,characterIds:ids,rulesId:'japan-events-candidate-v44',initialFunds:100000,startDate:'1998-01-01'}),used=new Set<string>();let end=0,cancelled=false;const cross:{index:number;kind:string;computer:boolean}[]=[];
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,actor=decisionPlayer(s),ai=computerIds.includes(s.players.find(p=>p.id===actor)!.characterId);
  if(required.every(x=>used.has(x))&&!end)end=s.turn;
  if(end&&s.turn>end&&s.phase==='idle'&&!ai)return{replay:{...e.exportReplay(),control:{version:1 as const,policy:'roads-v1' as const,computerIds}},state:s,events:e.events,used:[...used],cancelled,cross};
  if(s.phase==='finished')break;
  const cancelGood=!ai&&!cancelled&&s.phase==='idle'&&!actionLocked(s.g2!.players[actor])&&!s.g4!.hotel[actor]?ROADS_GOODS.find(g=>s.effects!.inventory[actor][g.id]>0&&roadsChoices(s,nodes,g.id).length):undefined;
  const d=cancelGood?{playerId:actor,action:{type:'item' as const,action:{type:'begin' as const,definitionId:cancelGood.effect}}}:ai?decideComputer(s,nodes,'roads-v1'):computerDecision(s),action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
  if(!action)throw Error('No action '+s.phase);
  if(p?.kind==='auction')cross.push({index:i,kind:'auction',computer:ai});
  const r=e.dispatch({id:'roads-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({i,action,r}));
  if(!ai&&action.type==='item'&&action.action.type==='cancel')cancelled=true;
  for(const ev of r.events)if(ev.type==='hazardChanged'){if(ev.reason==='携带炸弹')used.add('bomb-carried');if(ev.reason==='移动倒数')used.add('bomb-moved');if(ev.reason==='相遇转交，不重置倒数')used.add('bomb-transferred');if(ev.reason==='踩中地雷')used.add('mine-hit');if(ev.reason==='倒数归零')used.add('bomb-exploded');}
  if(r.events.some(ev=>ev.type==='auctionSettled'&&ev.winnerId&&ev.sourceId!=='public'))used.add('winning-auction');
  if(ai&&action.type==='item'&&action.action.type==='confirm'&&s.effects?.pending){const item=s.effects.pending.definitionId.slice(0,7);if(ROADS_GOODS.some(g=>g.id===item))used.add(item);}
 }
 return{used:[...used],cancelled,cross};
}
if(process.env.RICHMAN_PLAN_ROADS){const n=Number(process.env.RICHMAN_PLAYERS??2),required=(process.env.RICHMAN_REQUIRE??'tool:01,tool:02,tool:03,tool:04,tool:07').split(',');for(let i=Number(process.env.RICHMAN_SEED_START??0);i<40;i++){const seed=`roads-${n}-${i}`,p=planComputerRoads(n,seed,required,Number(process.env.RICHMAN_LIMIT??3500));console.log(n,i,p.used,p.replay?.commands.length);if(p.replay){writeFileSync('/private/tmp/computer-roads-'+n+'.json',JSON.stringify(p));break;}}}
