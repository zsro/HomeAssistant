import fs from 'node:fs';
import { GameEngine,replayGame } from '../../frontend/src/features/richman/game/engine';
import type { Action } from '../../frontend/src/features/richman/game/engine';
import { FORTUNE_RULES,FORTUNE_NODES } from '../../frontend/src/features/richman/game/fortune';
import { REMOTE_EFFECT } from '../../frontend/src/features/richman/game/items';
import { g1Adjacent } from '../../frontend/src/features/richman/game/g1';
import { actionLocked } from '../../frontend/src/features/richman/game/g2';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,prev:number|null){const q:[number,number|null,number][]=[[node,prev,0]],seen=new Set<string>();for(let i=0;i<q.length;i++){const[n,p,d]=q[i];if((FORTUNE_NODES as readonly number[]).includes(n))return d;const k=n+'/'+p;if(seen.has(k))continue;seen.add(k);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==p);for(const t of f.length?f:a)q.push([t,n,d+1]);}return 999;}
export function planFortune(seed:string,count=2,players=3){
const e=new GameEngine(nodes,{gameId:'fortune-plan',seed:seed,rulesId:FORTUNE_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,players),initialFunds:100000});const seen=new Set<number>();let value=1;
for(let step=0;step<6000;step++){
 const s=e.state,p=s.pending,player=s.players[s.active],id=player.id;let a:Action,actor=id;
 if(seen.size>=count&&s.phase==='turnEnd'){const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s)||JSON.stringify(copy.events)!==JSON.stringify(e.events))throw Error('replay');return {replay,state:s,events:e.events,used:[]};}
 if(s.phase==='idle'){
  const d=distance(player.node,player.previous);
  if(d>0&&d<=6&&s.effects!.inventory[id]['tool:08']&&!actionLocked(s.g2!.players[id])){value=d;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};
 }else if(s.phase==='effect')a={type:'item',value,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id}}};
 else if(p?.kind==='news'){a={type:'ackNews',decisionId:p.id};}
 else if(p?.kind==='fortune'){seen.add(p.fortuneId);a={type:'ackFortune',decisionId:p.id};}
 else if(s.phase==='turnEnd')a={type:'endTurn'};
 else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
 else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>distance(a,player.node)-distance(b,player.node))[0]};
 else if(p?.kind==='property')a={type:'property',decisionId:p.id,accept:p.operation==='rent'};
 else if(p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:null};}
 else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
 else if(p?.kind==='shop')a={type:'leaveShop',decisionId:p.id};
 else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}else throw Error(s.phase);
 const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r}));
}
throw Error('No complete journey');
}
if(process.argv[1]?.endsWith('plan-fortune-journey.ts')){const plan=planFortune(process.env.RICHMAN_SEED||'fortune-first',Number(process.env.RICHMAN_COUNT||16),Number(process.env.RICHMAN_PLAYERS||3));fs.writeFileSync(process.env.RICHMAN_OUTPUT||'/private/tmp/richman-unified-03g.json',JSON.stringify(plan,null,2));console.log(JSON.stringify({commands:plan.replay.commands.length,turn:plan.state.turn,fingerprint:plan.state.items!.fingerprint}));}
