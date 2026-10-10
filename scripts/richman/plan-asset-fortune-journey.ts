import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {ASSET_FORTUNE_RULES} from '../../frontend/src/features/richman/game/asset-fortune';
import {FORTUNE_NODES} from '../../frontend/src/features/richman/game/fortune';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {NEARBY_WORKER_EFFECT,nearbyWorkerTargets} from '../../frontend/src/features/richman/game/nearby-construction';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import {marketAvailable,tradeAmount} from '../../frontend/src/features/richman/game/g6-market';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n])),defs=PROPERTY_CATALOG.properties;
function distance(node:number,prev:number|null,targets:readonly number[]){const q:[number,number|null,number][]=[[node,prev,0]],seen=new Set<string>();for(let i=0;i<q.length;i++){const[n,p,d]=q[i];if(targets.includes(n))return d;const k=n+'/'+p;if(seen.has(k))continue;seen.add(k);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==p);for(const t of f.length?f:a)q.push([t,n,d+1]);}return 999;}
export function planAssetFortune(seed:string,required:number[],count=3,limit=1800){
 const minDonors=Number(process.env.RICHMAN_DONORS||1);
 const e=new GameEngine(nodes,{gameId:'asset-fortune-plan',seed,rulesId:ASSET_FORTUNE_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:300000}),seen=new Set<number>();let value=1,worker='';
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,m=s.g2!.players[id],inv=s.effects!.inventory[id];let a:Action,actor=id;
  if(required.every(n=>seen.has(n))&&s.phase==='turnEnd'){const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s))throw Error('replay');return{replay,state:s,events:e.events,used:[]};}
  let destinations:readonly number[]=FORTUNE_NODES;
  const owned=s.economy!.properties.filter(p=>p.ownerId===id&&defs.find(d=>d.id===p.id)!.kind==='land');
  if(required.some(n=>(n===0||n===1)&&!seen.has(n))&&!owned.length)destinations=defs.filter(d=>d.kind==='land'&&s.economy!.properties.find(p=>p.id===d.id)!.ownerId===null).flatMap(d=>d.nodeIds);
  if(required.includes(5)&&!seen.has(5)&&Object.values(s.g3!.slots).filter(slots=>slots.length).length<minDonors)destinations=[98,...s.g6!.gods.filter(g=>!g.carrier&&[3,4].includes(g.type)).map(g=>g.node)];
  const score=(n:number,prev:number|null)=>200-distance(n,prev,destinations)*12;
  const cache=new Map<string,number>();function route(n:number,prev:number|null,left:number):number{const key=n+'/'+prev+'/'+left;if(cache.has(key))return cache.get(key)!;if(!left||s.roadTools!.blocks.includes(n))return score(n,prev);const adj=g1Adjacent(byId.get(n)!),forward=adj.filter(x=>x!==prev);const v=Math.max(...(forward.length?forward:adj).map(to=>route(to,n,left-1)));cache.set(key,v);return v;}
  if(s.phase==='idle'){
   const buy=required.some(n=>(n===8||n===9)&&!seen.has(n))&&marketAvailable(s)?s.g6!.stocks.find(k=>['jp:24','jp:25'].includes(k.id)&&s.g6!.holdings[id][k.id].quantity<19&&!s.news!.business!.halted[k.id]&&k.quota>=19&&s.economy!.balances[id].bank>=tradeAmount(k.price,19)):undefined;
   const targets=nearbyWorkerTargets(byId.get(player.node)!,defs,s.economy!.properties).filter(pid=>s.economy!.properties.find(p=>p.id===pid)!.ownerId===id);
   if(buy)a={type:'stockTrade',stockId:buy.id,side:'buy',quantity:19-s.g6!.holdings[id][buy.id].quantity};
   else if(required.includes(0)&&!seen.has(0)&&inv['tool:09']&&targets.length&&!actionLocked(m)&&!s.g4!.hotel[id]){worker=targets[0];a={type:'item',action:{type:'begin',definitionId:NEARBY_WORKER_EFFECT}};}
   else if(inv['tool:08']&&!actionLocked(m)&&!s.g4!.hotel[id]&&!m.stop&&!m.turtle){const values=[1,2,3,4,5,6].map(v=>({v,score:route(player.node,player.previous,v)})).sort((a,b)=>b.score-a.score);if(values[0].score>=100){value=values[0].v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
   else a={type:'roll'};
  }else if(s.phase==='effect')a=s.effects!.pending!.definitionId===REMOTE_EFFECT?{type:'item',value,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id}}}:{type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:'property',id:worker}}};
  else if(p?.kind==='fortune')a=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='news')a={type:'ackNews',decisionId:p.id};
  else if(s.phase==='turnEnd')a={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,player.node,s.remaining-1)-route(a,player.node,s.remaining-1))[0]};
  else if(p?.kind==='property')a={type:'property',decisionId:p.id,accept:p.operation==='rent'||s.economy!.balances[id].cash>=p.amount,...(p.buildingChoices?{buildingType:p.buildingChoices[0]}:{})};
  else if(p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:null};}
  else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='shop')a=s.items!.points[id]>=30&&inv['tool:08']<2&&s.items!.supply>0?{type:'buyItem',itemId:'tool:08',decisionId:p.id}:{type:'leaveShop',decisionId:p.id};
  else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}
  else return null;
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r,turn:s.turn,pending:p,balance:s.economy!.balances[id]}));
  for(const ev of r.events)if(ev.type==='fortuneResolved'&&ev.change.assets&&(ev.change.assets.property||(ev.change.assets.cards?.filter(c=>c.itemId).length??0)>=minDonors||ev.change.assets.stocks?.some(k=>k.before>k.after)))seen.add(ev.fortuneId);
 }
 return null;
}
if(process.env.RICHMAN_RUN_ASSET_PLAN){const plan=planAssetFortune(process.env.RICHMAN_SEED||'asset-first',(process.env.RICHMAN_FORTUNE||'0,1,5,8,9').split(',').map(Number),Number(process.env.RICHMAN_PLAYERS||3));if(!plan)throw Error('No complete route');fs.writeFileSync(process.env.RICHMAN_PLAN||'/private/tmp/richman-unified-03h.json',JSON.stringify(plan,null,2));console.log(JSON.stringify({commands:plan.replay.commands.length,turn:plan.state.turn,fortune:plan.events.filter(e=>e.type==='fortuneResolved'&&e.change.assets).map(e=>e.fortuneId)}));}
