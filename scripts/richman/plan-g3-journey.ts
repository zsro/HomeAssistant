/** Legal original-map planning only. Actual browser evidence is collected separately. */
import fs from 'node:fs';
import { GameEngine } from '../../frontend/src/features/richman/game/engine';
import type { Action, GameEvent } from '../../frontend/src/features/richman/game/engine';
import { G3_RULES, G3_GOODS, g3Options } from '../../frontend/src/features/richman/game/g3';
import { G2_GOODS, g2Options, actionLocked } from '../../frontend/src/features/richman/game/g2';
import { g1Adjacent } from '../../frontend/src/features/richman/game/g1';
import { WORKER } from '../../frontend/src/features/richman/game/construction';
import { NEARBY_WORKER_EFFECT, nearbyWorkerTargets } from '../../frontend/src/features/richman/game/nearby-construction';
import { PROPERTY_CATALOG, rentLines } from '../../frontend/src/features/richman/game/economy';
import { REMOTE_DICE, REMOTE_EFFECT, itemSite } from '../../frontend/src/features/richman/game/items';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
const distance=(start:number,targets:number[])=>{const seen=new Set([start]),queue=[[start,0]];for(let i=0;i<queue.length;i++){const [node,d]=queue[i];if(targets.includes(node))return d;for(const next of byId.get(node)!.adjacent)if(!seen.has(next)){seen.add(next);queue.push([next,d+1]);}}return 1000;};
let best:{replay:ReturnType<GameEngine['exportReplay']>;state:GameEngine['state'];events:GameEngine['events']}|null=null;
const seeds=process.env.RICHMAN_G3_SEARCH?Array.from({length:12},(_,i)=>`group-three-${i}`):[process.env.RICHMAN_G3_SEED||'group-three-9'];
for(const seed of seeds){
 const e=new GameEngine(nodes,{gameId:'g3-journey',seed,rulesId:G3_RULES.id,characterIds:['xiaomei','tuu','chyan'],initialFunds:100000});
 const done=new Set<string>();let selected='',stolen='',remote=1;let recent:GameEvent[]=[];let earnedFree=false,cardTheft=false,toolTheft=false;
 const purchased:Record<string,string[]>={'player-1':[],'player-2':[],'player-3':[]};
 for(let step=0;step<6500;step++){
  const s=e.state,p=s.pending,player=s.players[s.active],inv=s.effects!.inventory[player.id],m=s.g2!.players[player.id];
  for(const event of recent){
    if(event.type==='g3Resolved')done.add(event.itemId);
    if(event.type==='itemBought')purchased[event.playerId].push(event.itemId);
    if(event.type==='rentWaived'&&event.reason==='免费卡')earnedFree=true;
    if(event.type==='inventoryTransferred'){if(event.itemId.startsWith('card:'))cardTheft=true;else toolTheft=true;}
  }
  if(done.size===6&&earnedFree&&cardTheft&&toolTheft&&s.phase==='idle'&&Object.values(s.g2!.players).every(m=>!m.dream&&!m.prison)){
    const candidate={replay:e.exportReplay(),state:s,events:e.events};if(!best||candidate.replay.commands.length<best.replay.commands.length)best=candidate;break;
  }
  if(s.phase==='finished')break;
  const wished=player.id==='player-1'?['card:29','card:13','card:13','card:16','card:16','card:16']:['card:21','card:19','card:18','card:20','card:14'];
  const missing=wished.filter((id,i)=>purchased[player.id].filter(x=>x===id).length<=wished.slice(0,i).filter(x=>x===id).length);
  if(!done.has('card:18')&&player.id==='player-1'&&!inv['card:16']&&!missing.includes('card:16'))missing.push('card:16');
  const threshold=missing.length?Math.min(...missing.map(id=>[...G3_GOODS,...G2_GOODS].find(g=>g.id===id)!.price)):20;
  const rentTargets=inv['card:20']&&!earnedFree?PROPERTY_CATALOG.properties.filter(d=>d.kind==='land'&&s.economy!.properties.some(p=>p.id===d.id&&p.ownerId&&p.ownerId!==player.id)&&rentLines(d,s.economy!.properties,PROPERTY_CATALOG.properties).reduce((n,l)=>n+l.amount,0)>=2000).flatMap(d=>d.nodeIds):[];
  const score=(node:number)=>rentTargets.length? -10*distance(node,rentTargets):s.items!.points[player.id]>=threshold&&missing.length?-10*distance(node,[50,107]):missing.length?(itemSite(byId.get(node)!)?.points??0)*5-distance(node,[20,31]): -distance(node,s.players.filter(p=>p.id!==player.id).map(p=>p.node));
  const cache=new Map<string,number>();
  const routeScore=(node:number,previous:number,remaining:number):number=>{const key=`${node}:${previous}:${remaining}`;if(cache.has(key))return cache.get(key)!;if(!remaining)return score(node);const adj=g1Adjacent(byId.get(node)!),on=adj.filter(id=>id!==previous);const n=Math.max(...(on.length?on:adj).map(to=>routeScore(to,node,remaining-1)));cache.set(key,n);return n;};
  let a:Action,actor=player.id;
  if(s.phase==='idle'){
    const robbery=g3Options(s,nodes,'card:13').find(o=>o.items.some(id=>(!cardTheft&&id==='card:14')||(!toolTheft&&id===WORKER)));
    const ally=g3Options(s,nodes,'card:29')[0];
    const attack=g2Options(s,nodes,'card:16').find(o=>{const id=o.target.id,bag=s.effects!.inventory[id];return !s.g2!.players[id].dream && ((!done.has('card:21')&&bag['card:21'])||(!done.has('card:19')&&!bag['card:21']&&bag['card:19'])||(!done.has('card:18')&&!bag['card:21']&&bag['card:18']));});
    const build=!actionLocked(m)&&inv[WORKER]>0?nearbyWorkerTargets(byId.get(player.node)!,PROPERTY_CATALOG.properties,s.economy!.properties).filter(id=>s.economy!.properties.find(p=>p.id===id)!.ownerId).sort((a,b)=>{
      const value=(id:string)=>{const d=PROPERTY_CATALOG.properties.find(d=>d.id===id)!,p=s.economy!.properties.find(p=>p.id===id)!;return d.rents[p.level+1];};return value(b)-value(a);
    })[0]:undefined;
    if(inv['card:29']&&ally&&!done.has('card:29')){selected=ally.id;a={type:'item',action:{type:'begin',definitionId:G3_GOODS[5].effect}};}
    else if(inv['card:13']&&robbery){selected=robbery.id;stolen=robbery.items.find(id=>!cardTheft&&id==='card:14')??WORKER;a={type:'item',action:{type:'begin',definitionId:G3_GOODS[0].effect}};}
    else if(inv['card:16']&&attack){selected=attack.target.id;a={type:'item',action:{type:'begin',definitionId:G2_GOODS[2].effect}};}
    else if(build&&(player.id==='player-1'||toolTheft)){selected=build;a={type:'item',action:{type:'begin',definitionId:NEARBY_WORKER_EFFECT}};}
    else if(!actionLocked(m)&&!m.stop&&!m.turtle&&inv[REMOTE_DICE]>0){const ranked=[1,2,3,4,5,6].map(n=>({n,score:routeScore(player.node,player.previous??-1,n)})).sort((a,b)=>b.score-a.score);if(ranked[0].score>=100||rentTargets.length){remote=ranked[0].n;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
    else a={type:'roll'};
  }else if(s.phase==='effect'){
    const effect=s.effects!.pending!.definitionId;
    a={type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:effect===NEARBY_WORKER_EFFECT?'property':'player',id:effect===REMOTE_EFFECT?player.id:selected}},...(effect===REMOTE_EFFECT?{value:remote}:{}),...(effect===G3_GOODS[0].effect?{stolenItemId:stolen}:{})};
  }else if(p?.kind==='reaction'){
    actor=p.responderId;
    if(p.stage==='free')a={type:'reaction',decisionId:p.id,choice:'use'};
    else if(done.has('card:19')&&p.continuation.kind==='attack')a={type:'reaction',decisionId:p.id,choice:'decline'};
    else a={type:'reaction',decisionId:p.id,choice:'use',targetId:p.targets.find(id=>id!==p.continuation.sourceId)??p.targets[0]};
  }else if(s.phase==='turnEnd')a={type:'endTurn'};
  else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,player.node,s.remaining-1)-routeScore(a,player.node,s.remaining-1))[0]};
  else if(p?.kind==='shop'){const good=[...G3_GOODS,...G2_GOODS].find(g=>missing.includes(g.id)&&s.items!.points[player.id]>=g.price&&(s.g3!.supply[g.id]??s.g2!.supply[g.id])>0);a=good?{type:'buyItem',itemId:good.id,decisionId:p.id}:{type:'leaveShop',decisionId:p.id};}
  else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='property'){actor=p.payerId??actor;a={type:'property',decisionId:p.id,accept:p.operation==='rent'||s.economy!.balances[player.id].cash>=p.amount};}
  else if(p?.kind==='debt'){actor=p.payerId??actor;a={type:'settleDebt',decisionId:p.id};}
  else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
  else break;
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(`${r.reason} ${JSON.stringify(a)}`);recent=r.events;
 }
 console.log(JSON.stringify({seed,done:[...done],earnedFree,cardTheft,toolTheft,turn:e.state.turn,commands:e.state.revision}));
}
if(!best)throw Error('No complete G3 journey');
const destination=process.env.RICHMAN_G3_PLAN||'/private/tmp/richman-g3-journey.json';fs.writeFileSync(destination,JSON.stringify(best,null,2));
console.log(JSON.stringify({destination,seed:best.replay.config.seed,turn:best.state.turn,commands:best.replay.commands.length,settlements:best.events.filter(e=>e.type==='g3Resolved'||e.type==='inventoryTransferred'||e.type==='allianceChanged')}));
