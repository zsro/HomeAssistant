/** Original Japan journey, exclusively public commands. Engine plan is not browser evidence. */
import fs from 'node:fs';
import { GameEngine } from '../../frontend/src/features/richman/game/engine';
import type { Action } from '../../frontend/src/features/richman/game/engine';
import { G2_RULES, G2_GOODS, g2Options, actionLocked } from '../../frontend/src/features/richman/game/g2';
import { g1Adjacent } from '../../frontend/src/features/richman/game/g1';
import { REMOTE_DICE, REMOTE_EFFECT, itemSite } from '../../frontend/src/features/richman/game/items';
import { ROADBLOCK, ROADBLOCK_EFFECT, roadblockTargets } from '../../frontend/src/features/richman/game/road-tools';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
const distance=(start:number,targets:number[])=>{const seen=new Set([start]),queue=[[start,0]];for(let i=0;i<queue.length;i++){const [node,d]=queue[i];if(targets.includes(node))return d;for(const next of byId.get(node)!.adjacent)if(!seen.has(next)){seen.add(next);queue.push([next,d+1]);}}return 1000;};
let best:{replay:ReturnType<GameEngine['exportReplay']>;state:GameEngine['state'];events:GameEngine['events']}|null=null;
const seeds=process.env.RICHMAN_G2_SEARCH?Array.from({length:24},(_,i)=>`group-two-${i}`):[process.env.RICHMAN_G2_SEED||'group-two-7'];
for(const seed of seeds){
 const e=new GameEngine(nodes,{gameId:'g2-journey',seed,rulesId:G2_RULES.id,characterIds:['xiaomei','tuu'],initialFunds:100000});
 const used=new Set<string>();let selected='';let remoteValue=1;let endedAt=0;
 for(let step=0;step<4000;step++){
  const s=e.state,p=s.pending,player=s.players[s.active],inv=s.effects!.inventory[player.id],m=s.g2!.players[player.id];
  if(used.size===7&&!endedAt)endedAt=s.turn;
  if(endedAt&&s.turn>endedAt+12&&s.phase==='idle'&&Object.values(s.g2!.players).every(m=>!m.stop&&!m.turtle&&!m.winter&&!m.dream&&!m.prison)) {const candidate={replay:e.exportReplay(),state:s,events:e.events};if(!best||candidate.replay.commands.length<best.replay.commands.length)best=candidate;break;}
  const missing=G2_GOODS.filter(g=>!used.has(g.id)&&!Object.values(s.effects!.inventory).some(i=>i[g.id]>0));
  const threshold=missing.length?Math.min(...missing.map(g=>g.price)):20;
  const score=(node:number)=>s.items!.points[player.id]>=threshold&&missing.length?-10*distance(node,[50,107]):(itemSite(byId.get(node)!)?.points??0)*5-distance(node,[20,31]);
  const cache=new Map<string,number>();
  const routeScore=(node:number,previous:number,remaining:number):number=>{const key=`${node}:${previous}:${remaining}`;if(cache.has(key))return cache.get(key)!;if(!remaining || s.roadTools!.blocks.includes(node))return score(node);const adj=g1Adjacent(byId.get(node)!),on=adj.filter(id=>id!==previous);const n=Math.max(...(on.length?on:adj).map(to=>routeScore(to,node,remaining-1)));cache.set(key,n);return n;};
  let a:Action;
  if(s.phase==='idle'){
   const good=G2_GOODS.find(g=>!used.has(g.id)&&inv[g.id]>0&&g2Options(s,nodes,g.id).some(o=>o.playerIds.length&&!(g.id==='card:16'&&o.playerIds.some(id=>s.g2!.players[id].winter)))&&(g.id!=='tool:06'||e.events.some(e=>e.type==='diceRolled'&&e.values.length===2))&&(g.id!=='card:15'||used.size===6)&&(g.id!=='card:17'||!Object.values(s.g2!.players).some(m=>m.dream)));
   if(good){const options=g2Options(s,nodes,good.id);selected=(options.find(o=>o.playerIds.some(id=>s.g2!.players[id].vehicle!=='foot'))??options[0]).target.id;a={type:'item',action:{type:'begin',definitionId:good.effect}};}
   else if(!actionLocked(m)&&!m.stop&&!m.turtle&&inv[ROADBLOCK]>0&&missing.length&&roadblockTargets(byId.get(player.node)!,nodes,s.roadTools!.blocks).some(id=>id!==player.node&&(itemSite(byId.get(id)!)?.points??0)>=30)) { selected=String(roadblockTargets(byId.get(player.node)!,nodes,s.roadTools!.blocks).filter(id=>id!==player.node&&(itemSite(byId.get(id)!)?.points??0)>=30).sort((a,b)=>score(b)-score(a))[0]);a={type:'item',action:{type:'begin',definitionId:ROADBLOCK_EFFECT}}; }
   else if(!actionLocked(m)&&!m.stop&&!m.turtle&&inv[REMOTE_DICE]>0&&missing.length){const values=[1,2,3,4,5,6].map(value=>({value,score:routeScore(player.node,player.previous??-1,value)})).sort((a,b)=>b.score-a.score);if(values[0].score>=100){remoteValue=values[0].value;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
   else a={type:'roll'};
  }else if(s.phase==='effect'){
   const good=G2_GOODS.find(g=>g.effect===s.effects!.pending!.definitionId);
   if(good){used.add(good.id);a={type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id:selected}}};}
   else if(s.effects!.pending!.definitionId===ROADBLOCK_EFFECT)a={type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:'node',id:selected}}};
   else a={type:'item',value:remoteValue,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id:player.id}}};
  }else if(s.phase==='turnEnd')a={type:'endTurn'};
  else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,player.node,s.remaining-1)-routeScore(a,player.node,s.remaining-1))[0]};
  else if(p?.kind==='shop'){const good=missing.find(g=>s.items!.points[player.id]>=g.price&&s.g2!.supply[g.id]>0);a=good?{type:'buyItem',itemId:good.id,decisionId:p.id}:{type:'leaveShop',decisionId:p.id};}
  else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='property')a={type:'property',decisionId:p.id,accept:p.operation==='rent'||s.economy!.balances[player.id].cash>=p.amount};
  else if(p?.kind==='debt')a={type:'settleDebt',decisionId:p.id};
  else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
  else break;
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:player.id,action:a});if(!r.ok)throw Error(`${r.reason} ${JSON.stringify(a)}`);
 }
 console.log(JSON.stringify({seed,used:[...used],turn:e.state.turn,commands:e.state.revision}));
}
if(!best)throw Error('No complete seven-item journey');
const destination=process.env.RICHMAN_G2_PLAN||'/private/tmp/richman-g2-journey.json';fs.writeFileSync(destination,JSON.stringify(best,null,2));
console.log(JSON.stringify({destination,seed:best.replay.config.seed,turn:best.state.turn,commands:best.replay.commands.length,settlements:best.events.filter(e=>e.type==='g2Resolved').map(e=>({itemId:e.itemId,turn:e.turn,playerId:e.playerId,option:e.option}))}));
