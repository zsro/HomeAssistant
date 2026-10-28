import { PROPERTY_CATALOG } from '../../frontend/src/features/richman/game/economy';
import { NEARBY_WORKER_EFFECT,nearbyWorkerTargets } from '../../frontend/src/features/richman/game/nearby-construction';
import fs from 'node:fs';
import { GameEngine,replayGame } from '../../frontend/src/features/richman/game/engine';
import type { Action } from '../../frontend/src/features/richman/game/engine';
import { PROPERTY_NEWS_RULES,NEWS_NODES } from '../../frontend/src/features/richman/game/news';
import { REMOTE_EFFECT } from '../../frontend/src/features/richman/game/items';
import { g1Adjacent } from '../../frontend/src/features/richman/game/g1';
import { actionLocked } from '../../frontend/src/features/richman/game/g2';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,prev:number|null){const q:[number,number|null,number][]=[[node,prev,0]],seen=new Set<string>();for(let i=0;i<q.length;i++){const[n,p,d]=q[i];if((NEWS_NODES as readonly number[]).includes(n))return d;const k=n+'/'+p;if(seen.has(k))continue;seen.add(k);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==p);for(const t of f.length?f:a)q.push([t,n,d+1]);}return 999;}
const e=new GameEngine(nodes,{gameId:'property-news-plan',seed:process.env.RICHMAN_SEED||'property-news-4',rulesId:PROPERTY_NEWS_RULES.id,characterIds:['xiaomei','tuu','chyan'],initialFunds:300000});const seen=new Set<number>(),used=new Set<string>();let value=1;
for(let step=0;step<3000;step++){
 const s=e.state,p=s.pending,player=s.players[s.active],id=player.id;let a:Action,actor=id;
 if([5,8,9,15].every(id=>seen.has(id))&&s.phase==='turnEnd'){const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s)||JSON.stringify(copy.events)!==JSON.stringify(e.events))throw Error('replay');fs.writeFileSync(process.env.RICHMAN_PLAN||'/private/tmp/richman-unified-03c.json',JSON.stringify({replay,state:s,events:e.events,used:[]},null,2));console.log(JSON.stringify({commands:replay.commands.length,turn:s.turn,news:[...seen]}));process.exit(0);}
 if(s.phase==='idle'){
  const d=distance(player.node,player.previous);const targets=nearbyWorkerTargets(byId.get(player.node)!,PROPERTY_CATALOG.properties,s.economy!.properties);
  if(!used.has(id)&&targets.length&&!actionLocked(s.g2!.players[id])&&!s.g4!.hotel[id]){a={type:'item',action:{type:'begin',definitionId:NEARBY_WORKER_EFFECT}};used.add(id);}
  else if(d>0&&d<=6&&s.effects!.inventory[id]['tool:08']&&!actionLocked(s.g2!.players[id])){value=d;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};
 }else if(s.phase==='effect'){if(s.effects!.pending!.definitionId===NEARBY_WORKER_EFFECT){const targets=nearbyWorkerTargets(byId.get(player.node)!,PROPERTY_CATALOG.properties,s.economy!.properties);const target=targets.sort((a,b)=>s.economy!.properties.find(p=>p.id===a)!.level-s.economy!.properties.find(p=>p.id===b)!.level)[0];a={type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:'property',id:target}}};}else a={type:'item',value,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id}}};}
 else if(p?.kind==='news'){seen.add(p.newsId);a={type:'ackNews',decisionId:p.id};}
 else if(s.phase==='turnEnd')a={type:'endTurn'};
 else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
 else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>distance(a,player.node)-distance(b,player.node))[0]};
 else if(p?.kind==='property')a={type:'property',decisionId:p.id,accept:true,...(p.buildingChoices?{buildingType:4}:{})};
 else if(p?.kind==='debt'){actor=p.payerId??actor;a={type:'settleDebt',decisionId:p.id};}
 else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
 else if(p?.kind==='shop')a={type:'leaveShop',decisionId:p.id};
 else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}else throw Error(s.phase);
 const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r}));
}
throw Error('No complete journey');
