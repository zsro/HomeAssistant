/** Legal original-map journey: arrive at 98, receive a card, then actually use that card. */
import fs from 'node:fs';
import { GameEngine, replayGame } from '../../frontend/src/features/richman/game/engine';
import type { Action } from '../../frontend/src/features/richman/game/engine';
import { MAP_EVENT_RULES } from '../../frontend/src/features/richman/game/map-events';
import { G2_GOODS, g2Options, actionLocked } from '../../frontend/src/features/richman/game/g2';
import { g1Adjacent } from '../../frontend/src/features/richman/game/g1';
import { REMOTE_EFFECT } from '../../frontend/src/features/richman/game/items';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,previous:number|null){const q:[number,number|null,number][]=[[node,previous,0]],seen=new Set<string>();for(let i=0;i<q.length;i++){const[n,p,d]=q[i];if(n===98)return d;const key=n+'/'+p;if(seen.has(key))continue;seen.add(key);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==p);for(const next of f.length?f:a)q.push([next,n,d+1]);}return 999;}
for(let seedNo=0;seedNo<80;seedNo++){
 const seed=process.env.RICHMAN_SEED||`map-event-${seedNo}`;
 const e=new GameEngine(nodes,{gameId:'map-event-plan',seed,rulesId:MAP_EVENT_RULES.id,characterIds:['xiaomei','tuu'],initialFunds:100000});
 let recipient='',item='',used=false,value=1,selected='';
 for(let step=0;step<1800;step++){
  const s=e.state,p=s.pending,player=s.players[s.active];let a:Action,actor=player.id;
  if(used&&s.phase==='turnEnd'){const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s)||JSON.stringify(copy.events)!==JSON.stringify(e.events))throw Error('replay');const output='/private/tmp/richman-unified-03a.json';fs.writeFileSync(output,JSON.stringify({replay,events:e.events,state:s,used:[item],recipient},null,2));console.log(JSON.stringify({seed,output,commands:replay.commands.length,turn:s.turn,item,recipient}));process.exit(0);}
  if(s.phase==='idle'){
   if(!used&&item&&recipient===player.id&&!actionLocked(s.g2!.players[actor])){const g=G2_GOODS.find(g=>g.id===item)!,o=g2Options(s,nodes,item).find(o=>o.target.id===actor);if(!o)break;selected=actor;a={type:'item',action:{type:'begin',definitionId:g.effect}};}
   else{const d=distance(player.node,player.previous);if(!item&&d>0&&d<=6&&s.effects!.inventory[actor]['tool:08']&&!actionLocked(s.g2!.players[actor])){value=d;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
  }else if(s.phase==='effect'){a={type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id:selected||actor}},...(selected?{}:{value})};if(selected){used=true;}}
  else if(s.phase==='turnEnd')a={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>distance(a,player.node)-distance(b,player.node))[0]};
  else if(p?.kind==='property')a={type:'property',decisionId:p.id,accept:p.operation==='rent'};
  else if(p?.kind==='shop')a={type:'leaveShop',decisionId:p.id};
  else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}
  else break;
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,s:s.phase,result:r}));
  const receipt=r.events.find(e=>e.type==='mapCardReceived');if(receipt?.type==='mapCardReceived'&&!item){if(!['card:14','card:30'].includes(receipt.itemId!))break;recipient=receipt.playerId;item=receipt.itemId!;}
 }
 if(process.env.RICHMAN_SEED)throw Error('Pinned seed failed');
}
throw Error('No legal journey found');
