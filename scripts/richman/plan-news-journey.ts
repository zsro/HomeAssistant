import fs from 'node:fs';
import { GameEngine,replayGame } from '../../frontend/src/features/richman/game/engine';
import type { Action } from '../../frontend/src/features/richman/game/engine';
import { NEWS_RULES,NEWS_NODES } from '../../frontend/src/features/richman/game/news';
import { REMOTE_EFFECT } from '../../frontend/src/features/richman/game/items';
import { g1Adjacent } from '../../frontend/src/features/richman/game/g1';
import { actionLocked } from '../../frontend/src/features/richman/game/g2';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,prev:number|null){const q:[number,number|null,number][]=[[node,prev,0]],seen=new Set<string>();for(let i=0;i<q.length;i++){const[n,p,d]=q[i];if((NEWS_NODES as readonly number[]).includes(n))return d;const k=n+'/'+p;if(seen.has(k))continue;seen.add(k);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==p);for(const t of f.length?f:a)q.push([t,n,d+1]);}return 999;}
const e=new GameEngine(nodes,{gameId:'news-plan',seed:process.env.RICHMAN_SEED||'news-first',rulesId:NEWS_RULES.id,characterIds:['xiaomei','tuu','chyan'],initialFunds:100000});const seen=new Set<number>(),traded=new Set<string>();let value=1;
for(let step=0;step<6000;step++){
 const s=e.state,p=s.pending,player=s.players[s.active],id=player.id;let a:Action,actor=id;
 if(seen.size===4&&s.phase==='turnEnd'){const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s)||JSON.stringify(copy.events)!==JSON.stringify(e.events))throw Error('replay');fs.writeFileSync('/private/tmp/richman-unified-03b.json',JSON.stringify({replay,state:s,events:e.events,used:[]},null,2));console.log(JSON.stringify({commands:replay.commands.length,turn:s.turn,news:[...seen]}));process.exit(0);}
 if(s.phase==='idle'){
  const d=distance(player.node,player.previous);
  if(!traded.has(id)&&!actionLocked(s.g2!.players[id])){a={type:'stockTrade',stockId:'jp:24',side:'buy',quantity:10};traded.add(id);}
  else if(d>0&&d<=6&&s.effects!.inventory[id]['tool:08']&&!actionLocked(s.g2!.players[id])){value=d;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};
 }else if(s.phase==='effect')a={type:'item',value,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id}}};
 else if(p?.kind==='news'){seen.add(p.newsId);a={type:'ackNews',decisionId:p.id};}
 else if(s.phase==='turnEnd')a={type:'endTurn'};
 else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
 else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>distance(a,player.node)-distance(b,player.node))[0]};
 else if(p?.kind==='property')a={type:'property',decisionId:p.id,accept:p.operation==='rent'};
 else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
 else if(p?.kind==='shop')a={type:'leaveShop',decisionId:p.id};
 else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}else throw Error(s.phase);
 const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r}));
}
throw Error('No complete journey');
