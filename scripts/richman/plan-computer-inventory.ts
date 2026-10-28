/** Legal original-map commands only. Planned routes are not browser acceptance. */
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,INVENTORY_GOODS,inventoryChoices} from '../../frontend/src/features/richman/game/computer-inventory';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {writeFileSync} from 'node:fs';
export function planComputerInventory(count:number,seed:string,required:readonly string[],limit=4000){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.filter((_,i)=>i>0);
 const e=new GameEngine(nodes,{gameId:'inventory-plan',seed,characterIds:ids,rulesId:'japan-events-candidate-v44',initialFunds:100000,startDate:'1998-01-01'}),used=new Set<string>();let end=0,cancelled=false;
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,actor=decisionPlayer(s),ai=computerIds.includes(s.players.find(p=>p.id===actor)!.characterId);
  if(required.every(x=>used.has(x))&&!end)end=s.turn;
  if(end&&s.turn>end&&s.phase==='idle'&&!ai)return{replay:{...e.exportReplay(),control:{version:1 as const,policy:'inventory-v1' as const,computerIds}},state:s,events:e.events,used:[...used],cancelled};
  if(s.phase==='finished')break;
  const cancelGood=!ai&&!cancelled&&s.phase==='idle'&&!actionLocked(s.g2!.players[actor])&&!s.g4!.hotel[actor]?INVENTORY_GOODS.find(g=>s.effects!.inventory[actor][g.id]>0&&inventoryChoices(s,nodes,g.id).length):undefined;
  const d=cancelGood?{playerId:actor,action:{type:'item' as const,action:{type:'begin' as const,definitionId:cancelGood.effect}}}:ai?decideComputer(s,nodes,'inventory-v1'):computerDecision(s),action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
  if(!action)throw Error('No action '+s.phase);
  const r=e.dispatch({id:'inventory-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({i,action,r}));
  if(!ai&&action.type==='item'&&action.action.type==='cancel')cancelled=true;
  for(const ev of r.events)if(ai&&(ev.type==='g3Resolved'&&['card:13','card:29'].includes(ev.itemId)))used.add(ev.itemId);
 }
 return{used:[...used],cancelled};
}
if(process.env.RICHMAN_PLAN_INVENTORY){const n=Number(process.env.RICHMAN_PLAYERS??2),required=(process.env.RICHMAN_REQUIRE??'card:13,card:29').split(',');for(let i=Number(process.env.RICHMAN_SEED_START??0);i<40;i++){const seed=`inventory-${n}-${i}`,p=planComputerInventory(n,seed,required,Number(process.env.RICHMAN_LIMIT??3500));console.log(n,i,p.used,p.replay?.commands.length);if(p.replay){writeFileSync('/private/tmp/computer-inventory-'+n+'.json',JSON.stringify(p));break;}}}
