import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {FINAL_FORTUNE_RULES} from '../../frontend/src/features/richman/game/final-fortune';
import {FORTUNE_NODES} from '../../frontend/src/features/richman/game/fortune';
import {itemSite,REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,prev:number|null,targets:readonly number[]){const q:[number,number|null,number][]=[[node,prev,0]],seen=new Set<string>();for(let i=0;i<q.length;i++){const[n,p,d]=q[i];if(targets.includes(n))return d;const k=n+'/'+p;if(seen.has(k))continue;seen.add(k);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==p);for(const t of f.length?f:a)q.push([t,n,d+1]);}return 999;}
export function planFinalFortune(seed:string,required:number[],count=3,limit=1800){
 const reaction=process.env.RICHMAN_REACTION,desired=reaction==='redirect'?'card:19':reaction==='absolve'?'card:21':null,price=desired==='card:19'?40:desired==='card:21'?25:desired==='tool:05'?80:150;
 const e=new GameEngine(nodes,{gameId:'final-fortune-plan',seed,rulesId:FINAL_FORTUNE_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:300000}),seen=new Set<number>();let value=1, followup=false;let targetPlayer='';
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,m=s.g2!.players[id],inv=s.effects!.inventory[id];let a:Action,actor=id;
  if(required.every(n=>seen.has(n))&&s.phase==='turnEnd'&&(!process.env.RICHMAN_FOLLOWUP||followup)){const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s))throw Error('replay');return{replay,state:s,events:e.events,used:[]};}
  let destinations:readonly number[]=seen.size&&process.env.RICHMAN_FOLLOWUP&&required[0]<=3?[1]:FORTUNE_NODES;
  const needVehicle=!!desired&&!seen.has(required[0])&&(desired.startsWith('card')?!inv[desired]:m.vehicle!==desired);
  if(needVehicle)destinations=s.items!.points[id]>=price?[50,107]:[20,31];
  const score=(n:number,prev:number|null)=>needVehicle&&s.items!.points[id]<price?(itemSite(byId.get(n)!)?.points??0)*5-distance(n,prev,[20,31]):200-distance(n,prev,destinations)*12;
  const cache=new Map<string,number>();function route(n:number,prev:number|null,left:number):number{const key=n+'/'+prev+'/'+left;if(cache.has(key))return cache.get(key)!;if(!left||s.roadTools!.blocks.includes(n))return score(n,prev);const adj=g1Adjacent(byId.get(n)!),forward=adj.filter(x=>x!==prev);const v=Math.max(...(forward.length?forward:adj).map(to=>route(to,n,left-1)));cache.set(key,v);return v;}
  if(s.phase==='idle'){
   if(needVehicle&&desired!.startsWith('tool')&&inv[desired!]&&!actionLocked(m)&&!s.g4!.hotel[id]&&!s.g5!.engineers[id])a={type:'item',action:{type:'begin',definitionId:desired==='tool:05'?'tool:05:motorcycle-v1':'tool:06:car-v1'}};
   else if(m.vehicle!=='foot'&&m.diceCount!==1&&!actionLocked(m))a={type:'traffic',diceCount:1};
   else if(inv['tool:08']&&!actionLocked(m)&&!s.g4!.hotel[id]&&!m.stop&&!m.turtle){const values=[1,2,3,4,5,6].map(v=>({v,score:route(player.node,player.previous,v)})).sort((a,b)=>b.score-a.score);if(values[0].score>=100){value=values[0].v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
   else a={type:'roll'};
  }else if(s.phase==='effect')a=s.effects!.pending!.definitionId===REMOTE_EFFECT?{type:'item',value,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id}}}:{type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id}}};
  else if(p?.kind==='fortune')a=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='news')a={type:'ackNews',decisionId:p.id};
  else if(s.phase==='turnEnd')a={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,player.node,s.remaining-1)-route(a,player.node,s.remaining-1))[0]};
  else if(p?.kind==='property')a={type:'property',decisionId:p.id,accept:p.operation==='rent'};
  else if(p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:null};}
  else if(p?.kind==='bank'){if(seen.has(2)&&required[0]===2&&id===targetPlayer&&s.news!.business!.loans[id]>0)a={type:'loan',decisionId:p.id,operation:'repay',amount:s.news!.business!.loans[id]};else {if(seen.has(3)&&required[0]===3&&id===targetPlayer&&s.news!.business!.bankRejected![id])followup=true;a={type:'leaveBank',decisionId:p.id};}}
  else if(p?.kind==='shop')a=needVehicle&&s.items!.points[id]>=price&&!inv[desired!]&&(desired!.startsWith('card')?s.g3!.supply[desired!]:s.g2!.supply[desired!])>0?{type:'buyItem',itemId:desired!,decisionId:p.id}:!needVehicle&&s.items!.points[id]>=30&&inv['tool:08']<2&&s.items!.supply>0?{type:'buyItem',itemId:'tool:08',decisionId:p.id}:{type:'leaveShop',decisionId:p.id};
  else if(p?.kind==='reaction'){actor=p.responderId;a=reaction==='redirect'&&p.continuation.kind==='fortuneTravel'?{type:'reaction',decisionId:p.id,choice:'use',targetId:p.targets[0]}:{type:'reaction',decisionId:p.id,choice:'decline'};}
  else return null;
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r,turn:s.turn,pending:p,balance:s.economy!.balances[id]}));
  for(const ev of r.events)if(ev.type==='fortuneResolved'&&ev.change.final&&ev.change.code!==1&&(reaction==='redirect'?ev.change.final.redirected:reaction==='absolve'?ev.change.final.absolved:!ev.change.final.absolved)){seen.add(ev.fortuneId);if(required.includes(ev.fortuneId))targetPlayer=ev.change.final!.targetId??'';}
  if(seen.size&&process.env.RICHMAN_FOLLOWUP){if(required[0]===2&&r.events.some(e=>e.type==='loanChanged'&&e.operation==='repay'&&e.targetId===targetPlayer))followup=true;if(required[0]>=6&&targetPlayer&&e.state.g2!.players[targetPlayer].travel===0)followup=true;}
 }
 if(process.env.RICHMAN_PLAN_DEBUG)console.log(JSON.stringify({turn:e.state.turn,points:e.state.items!.points,vehicles:e.state.g2!.players,purchases:e.events.filter(e=>e.type==='itemBought'),fortunes:e.events.filter(e=>e.type==='fortuneResolved').map(e=>e.fortuneId)}));
 return null;
}
if(process.env.RICHMAN_RUN_FINAL_PLAN){const plan=planFinalFortune(process.env.RICHMAN_SEED||'final-group-12',(process.env.RICHMAN_FORTUNE||'6').split(',').map(Number),Number(process.env.RICHMAN_PLAYERS||3));if(!plan)throw Error('No complete route');fs.writeFileSync(process.env.RICHMAN_PLAN||'/private/tmp/richman-unified-03j.json',JSON.stringify(plan,null,2));console.log(JSON.stringify({commands:plan.replay.commands.length,turn:plan.state.turn,fortune:plan.events.filter(e=>e.type==='fortuneResolved').map(e=>e.fortuneId),fingerprint:plan.replay.itemFingerprint}));}
