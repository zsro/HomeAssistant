/** Legal public-command search. No result here is browser acceptance. */
import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action,GameEvent} from '../../frontend/src/features/richman/game/engine';
import {COMPLETE_NEWS_RULES,NEWS_NODES} from '../../frontend/src/features/richman/game/news';
import {tradeAmount,marketAvailable} from '../../frontend/src/features/richman/game/g6-market';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {nearbyWorkerTargets,NEARBY_WORKER_EFFECT} from '../../frontend/src/features/richman/game/nearby-construction';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n])),defs=PROPERTY_CATALOG.properties;
function distance(start:number,prev:number|null,targets:readonly number[]=NEWS_NODES){const q:[number,number|null,number][]=[[start,prev,0]],seen=new Set<string>();for(let i=0;i<q.length;i++){const[n,p,d]=q[i],k=n+'/'+p;if(targets.includes(n))return d;if(seen.has(k))continue;seen.add(k);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==p);for(const to of f.length?f:a)q.push([to,n,d+1]);}return 999;}
const required=(process.env.RICHMAN_NEWS||'4,10,13,14,18,19,20,21,22,26,27,28,29,30,31,32,33,34,35').split(',').map(Number);
const seed=process.env.RICHMAN_SEED||'complete-news-1',count=Number(process.env.RICHMAN_PLAYERS||4);
const e=new GameEngine(nodes,{gameId:'complete-news-plan',seed,rulesId:COMPLETE_NEWS_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:300000});
const seen=new Set<number>(),effective=new Set<number>(),loans=new Set<string>();let value=1,restrictedBank=false;
function real(event:GameEvent){if(event.type!=='newsResolved'||!event.completeChanges)return false;const c=event.completeChanges;if([4,18,19,20,21].includes(event.newsId))return c.properties!.some(p=>p.before.level!==p.after.level||p.before.ownerId!==p.after.ownerId)||!!c.players?.length;return true;}
for(let step=0;step<Number(process.env.RICHMAN_STEPS||4000);step++){
 const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,inv=s.effects!.inventory[id],m=s.g2!.players[id];let a:Action,actor=id;
 if(required.every(id=>(process.env.RICHMAN_EFFECTIVE==='0'?seen:effective).has(id))&&s.phase==='turnEnd'&&(!process.env.RICHMAN_REQUIRE_LOAN||e.events.some(e=>e.type==='loanChanged'&&e.operation==='repay'))&&(!process.env.RICHMAN_REQUIRE_RESTRICTED_BANK||restrictedBank)){
  const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s)||JSON.stringify(copy.events)!==JSON.stringify(e.events))throw Error('replay');fs.writeFileSync(process.env.RICHMAN_PLAN||'/private/tmp/richman-unified-03f.json',JSON.stringify({replay,state:s,events:e.events,used:[]},null,2));console.log(JSON.stringify({seed,commands:replay.commands.length,turn:s.turn,news:[...seen],effective:[...effective],fingerprint:s.items!.fingerprint}));process.exit(0);
 }
 const score=(n:number,prev:number|null)=>200-distance(n,prev)*12;
 const cache=new Map<string,number>();function route(n:number,prev:number|null,left:number):number{const k=n+'/'+prev+'/'+left;if(cache.has(k))return cache.get(k)!;if(!left||s.roadTools!.blocks.includes(n))return score(n,prev);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==prev);const v=Math.max(...(f.length?f:a).map(to=>route(to,n,left-1)));cache.set(k,v);return v;}
 if(s.phase==='idle'){
  // Six company holdings are legal purchases; distribute control across real seats.
  const buy=s.g6!.stocks.filter(k=>!s.news!.business!.halted[k.id]&&s.g6!.holdings[id][k.id].quantity<10&&Number(k.id.slice(3))%count===s.active&&Number(k.id.slice(3))<30&&k.quota>=10&&s.economy!.balances[id].bank>=tradeAmount(k.price,10))[0];
  const targets=nearbyWorkerTargets(byId.get(player.node)!,defs,s.economy!.properties);
  if(buy&&marketAvailable(s))a={type:'stockTrade',stockId:buy.id,side:'buy',quantity:10-s.g6!.holdings[id][buy.id].quantity};
  else if(inv['tool:09']&&targets.length&&!actionLocked(m)&&!s.g4!.hotel[id])a={type:'item',action:{type:'begin',definitionId:NEARBY_WORKER_EFFECT}};
  else if(inv['tool:08']&&!actionLocked(m)&&!s.g4!.hotel[id]&&!m.stop&&!m.turtle){const values=[1,2,3,4,5,6].map(v=>({v,score:route(player.node,player.previous,v)})).sort((a,b)=>b.score-a.score);if(values[0].score>=100){value=values[0].v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
  else a={type:'roll'};
 }else if(s.phase==='effect'){
  if(s.effects!.pending!.definitionId===REMOTE_EFFECT)a={type:'item',value,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id}}};
  else {const targets=nearbyWorkerTargets(byId.get(player.node)!,defs,s.economy!.properties);const target=targets.sort((a,b)=>s.economy!.properties.find(p=>p.id===a)!.level-s.economy!.properties.find(p=>p.id===b)!.level)[0];a={type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:'property',id:target}}};}
 }
 else if(p?.kind==='news'){seen.add(p.newsId);a={type:'ackNews',decisionId:p.id};}
 else if(s.phase==='turnEnd')a={type:'endTurn'};
 else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
 else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,player.node,s.remaining-1)-route(a,player.node,s.remaining-1))[0]};
 else if(p?.kind==='property')a={type:'property',decisionId:p.id,accept:true,...(p.buildingChoices?{buildingType:4}:{})};
 else if(p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:null};}
 else if(p?.kind==='debt'){actor=p.payerId??actor;a={type:'settleDebt',decisionId:p.id};}
 else if(p?.kind==='bank'){
  if(s.news!.business!.noLoans[id])restrictedBank=true;
  if(!loans.has(id)&&!s.news!.business!.noLoans[id]){a={type:'loan',decisionId:p.id,operation:'borrow',amount:1000};loans.add(id);}
  else if(s.news!.business!.loans[id]>0)a={type:'loan',decisionId:p.id,operation:'repay',amount:s.news!.business!.loans[id]};
  else a={type:'leaveBank',decisionId:p.id};
 }
 else if(p?.kind==='shop')a=s.items!.points[id]>=30&&inv['tool:08']<2&&s.items!.supply>0?{type:'buyItem',itemId:'tool:08',decisionId:p.id}:{type:'leaveShop',decisionId:p.id};
 else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}else throw Error(s.phase);
 const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r,s:s.phase}));for(const event of r.events)if(real(event)&&event.type==='newsResolved')effective.add(event.newsId);
}
if(process.env.RICHMAN_KEEP_PARTIAL)fs.writeFileSync(process.env.RICHMAN_PLAN!,JSON.stringify({replay:e.exportReplay(),state:e.state,events:e.events,used:[]},null,2));
console.log(JSON.stringify({seed,failed:true,turn:e.state.turn,news:[...seen],effective:[...effective]}));process.exit(1);
