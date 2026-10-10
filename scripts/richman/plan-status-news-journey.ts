/** Public-command route search; plans are never browser evidence. */
import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {STATUS_NEWS_RULES,NEWS_NODES} from '../../frontend/src/features/richman/game/news';
import {g2Options,actionLocked} from '../../frontend/src/features/richman/game/g2';
import {g5Options,blastTargets} from '../../frontend/src/features/richman/game/g5';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {REMOTE_EFFECT,itemSite} from '../../frontend/src/features/richman/game/items';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n])),defs=PROPERTY_CATALOG.properties;
function distance(start:number,prev:number|null,targets:readonly number[]){const q:[number,number|null,number][]=[[start,prev,0]],seen=new Set<string>();for(let i=0;i<q.length;i++){const[n,p,d]=q[i],k=n+'/'+p;if(targets.includes(n))return d;if(seen.has(k))continue;seen.add(k);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==p);for(const to of f.length?f:a)q.push([to,n,d+1]);}return 999;}
const required=(process.env.RICHMAN_STATUS_NEWS||'0,1').split(',').map(Number);
const stopAfter=process.env.RICHMAN_STOP_AFTER?process.env.RICHMAN_STOP_AFTER.split(',').map(Number):required;
const seed=process.env.RICHMAN_SEED||'status-news-10';
const e=new GameEngine(nodes,{gameId:'status-news-plan',seed,rulesId:STATUS_NEWS_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'],initialFunds:300000});const seen=new Set<number>();let selected={kind:'player' as 'player'|'node',id:''},value=1;
for(let step=0;step<Number(process.env.RICHMAN_STEPS||3200);step++){
 const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,inv=s.effects!.inventory[id],m=s.g2!.players[id];let a:Action,actor=id;
 if(stopAfter.every(id=>seen.has(id))&&s.phase==='turnEnd'){
  const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s))throw Error('replay');fs.writeFileSync(process.env.RICHMAN_PLAN||'/private/tmp/richman-unified-03e-prison.json',JSON.stringify({replay,state:s,events:e.events,used:[]},null,2));console.log(JSON.stringify({seed,commands:replay.commands.length,turn:s.turn,news:[...seen],fingerprint:s.items!.fingerprint}));process.exit(0);
 }
 const needPrison=required.some(n=>[0,1].includes(n)&&!seen.has(n)),needHospital=required.some(n=>[2,3].includes(n)&&!seen.has(n)),needCar=required.includes(17)&&!seen.has(17);
 const pool=(item:string)=>Object.values(s.effects!.inventory).reduce((v,i)=>v+(i[item]??0),0);
 const wants=[...(needPrison&&pool('card:17')<2?[{id:'card:17',price:20}]:[]),...(needHospital&&pool('tool:07')<2?[{id:'tool:07',price:100}]:[]),...(needCar&&!Object.values(s.g2!.players).some(m=>m.vehicle!=='foot')&&pool('tool:05')===0?[{id:'tool:05',price:80}]:[])];
 wants.sort((a,b)=>b.price-a.price);
 const ready=s.news!.detention!.prison.length>0||s.news!.detention!.hospital.length>0||!wants.length;
 const score=(n:number,prev:number|null)=>{if(ready)return 200-distance(n,prev,NEWS_NODES)*12;const affordable=wants.length>0&&s.items!.points[id]>=wants[0].price;return affordable?150-distance(n,prev,[50,107])*10:(itemSite(byId.get(n)!)?.points??0)*5-distance(n,prev,[20,31]);};
 const cache=new Map<string,number>();function route(n:number,prev:number|null,left:number):number{const k=n+'/'+prev+'/'+left;if(cache.has(k))return cache.get(k)!;if(!left||s.roadTools!.blocks.includes(n))return score(n,prev);const a=g1Adjacent(byId.get(n)!),f=a.filter(x=>x!==prev);const v=Math.max(...(f.length?f:a).map(to=>route(to,n,left-1)));cache.set(k,v);return v;}
 if(s.phase==='idle'){
  const prison=needPrison&&!s.news!.detention!.prison.length&&inv['card:17']>0?g2Options(s,nodes,'card:17'):[];
  const missile=needHospital&&!s.news!.detention!.hospital.length&&inv['tool:07']>0?g5Options(s,nodes,defs,'tool:07').filter(o=>blastTargets(s,nodes,defs,Number(o.target.id)).players.some(p=>p!==id)):[];
  if(prison.length){selected={kind:'player',id:prison[0].target.id};a={type:'item',action:{type:'begin',definitionId:'card:17:prison-v1'}};}
  else if(missile.length){const option=missile.sort((a,b)=>{const score=(o:typeof a)=>{const ids=blastTargets(s,nodes,defs,Number(o.target.id)).players;return (ids.includes(id)?-100:0)+ids.length;};return score(b)-score(a);})[0];selected={kind:'node',id:option.target.id};a={type:'item',action:{type:'begin',definitionId:'tool:07:missile-v1'}};}
  else if(needCar&&inv['tool:05']>0&&g2Options(s,nodes,'tool:05').length){selected={kind:'player',id};a={type:'item',action:{type:'begin',definitionId:'tool:05:motorcycle-v1'}};}
  else if(inv['tool:08']&&!actionLocked(m)&&!s.g4!.hotel[id]&&!m.stop&&!m.turtle){const values=[1,2,3,4,5,6].map(v=>({v,score:route(player.node,player.previous,v)})).sort((a,b)=>b.score-a.score);if(values[0].score>=100){value=values[0].v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
  else a={type:'roll'};
 }else if(s.phase==='effect')a=s.effects!.pending!.definitionId===REMOTE_EFFECT?{type:'item',value,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id}}}:{type:'item',action:{type:'confirm',decisionId:p!.id,target:selected}};
 else if(p?.kind==='news'){seen.add(p.newsId);a={type:'ackNews',decisionId:p.id};}
 else if(s.phase==='turnEnd')a={type:'endTurn'};
 else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
 else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,player.node,s.remaining-1)-route(a,player.node,s.remaining-1))[0]};
 else if(p?.kind==='property')a={type:'property',decisionId:p.id,accept:p.operation==='rent'};
 else if(p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:null};}
 else if(p?.kind==='debt'){actor=p.payerId??actor;a={type:'settleDebt',decisionId:p.id};}
 else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
 else if(p?.kind==='shop'){const want=wants[0]&&wants[0].price<=s.items!.points[id]&&(s.g2!.supply[wants[0].id]??s.g5!.supply[wants[0].id])>0?wants[0]:undefined;a=want?{type:'buyItem',itemId:want.id,decisionId:p.id}:!wants.length&&s.items!.points[id]>=30&&inv['tool:08']<2&&s.items!.supply>0?{type:'buyItem',itemId:'tool:08',decisionId:p.id}:{type:'leaveShop',decisionId:p.id};}
 else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}else throw Error(s.phase);
 const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r,s:s.phase}));
}
if(process.env.RICHMAN_KEEP_PARTIAL)fs.writeFileSync(process.env.RICHMAN_PLAN!,JSON.stringify({replay:e.exportReplay(),state:e.state,events:e.events,used:[]},null,2));
console.log(JSON.stringify({seed,failed:true,turn:e.state.turn,news:[...seen],purchases:e.events.filter(e=>e.type==='itemBought').map(e=>e.itemId),hospital:e.events.filter(e=>e.type==='g5Notice').map(e=>e.message)}));process.exit(1);
