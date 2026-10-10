import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {marketAvailable,priceLimit} from '../../frontend/src/features/richman/game/g6-market';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {FORTUNE_NODES} from '../../frontend/src/features/richman/game/fortune-catalog';
import {researchOptions} from '../../frontend/src/features/richman/game/g5';
import {g7Options,timeAvailable} from '../../frontend/src/features/richman/game/g7';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {writeFileSync} from 'node:fs';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const defs=PROPERTY_CATALOG.properties,byId=new Map(nodes.map(n=>[n.id,n]));
const distances=new Map<number,Map<number,number>>();for(const n of nodes){const d=new Map([[n.id,0]]),q=[n.id];for(let i=0;i<q.length;i++)for(const next of byId.get(q[i])!.adjacent)if(!d.has(next)){d.set(next,d.get(q[i])!+1);q.push(next);}distances.set(n.id,d);}
export function planCircuit(seed:string,count:number,kind:'commerce'|'fortune'|'time',limit=3000){
 const e=new GameEngine(nodes,{gameId:'stock-circuit',seed,rulesId:'japan-events-candidate-v44',characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:300000,startDate:'1998-01-09'}),bought=new Set<string>(),fortunes=new Set<number>(),beforeTime=new Set<number>();let subscribed=false,trendDate='',remote=1,timeUsed=false;
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,inv=s.effects!.inventory[id],m=s.g2!.players[id];let a:Action|undefined,actor=id;
  const done=kind==='commerce'?subscribed&&trendDate&&s.calendar!.date>trendDate:kind==='fortune'?fortunes.has(8)&&fortunes.has(9):timeUsed;
  if(done&&s.phase==='turnEnd'){const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s))throw Error('replay');return{replay,state:s,events:e.events,used:[],kind};}
  if(s.finance!.winnerId||s.turn>180)return null;
  const ownedLabs=s.economy!.properties.filter(q=>q.ownerId===id&&q.buildingType===4);
  const targets=kind==='time'?(ownedLabs.length?defs.filter(d=>ownedLabs.some(q=>q.id===d.id)).flatMap(d=>d.nodeIds):defs.filter(d=>d.kind==='facility'&&s.economy!.properties.some(q=>q.id===d.id&&(!q.ownerId||q.ownerId===id))).flatMap(d=>d.nodeIds)):kind==='commerce'&&!subscribed?[59,60,67,68,92,93,101,102]:kind==='fortune'?[...FORTUNE_NODES]:[13,61,94];
  const score=(n:number)=>200-12*Math.min(...targets.map(t=>distances.get(n)!.get(t)??999));
  const cache=new Map<string,number>();function route(n:number,prev:number|null,left:number):number{const key=n+'/'+prev+'/'+left;if(cache.has(key))return cache.get(key)!;if(!left||s.roadTools!.blocks.includes(n))return score(n);const adj=g1Adjacent(byId.get(n)!),forward=adj.filter(x=>x!==prev);const v=Math.max(...(forward.length?forward:adj).map(to=>route(to,n,left-1)));cache.set(key,v);return v;}
  if(kind==='time'&&!timeUsed){const research=researchOptions(s,defs).find(o=>o.itemId==='tool:10'&&!s.economy!.properties.some(q=>q.research?.itemId==='tool:10')&&!Object.values(s.effects!.inventory).some(b=>b['tool:10']));if(research)a={type:'research',propertyId:research.propertyId,itemId:research.itemId};}
  if(!a&&s.phase==='idle'){
   const k=marketAvailable(s)?s.g6!.stocks.find(k=>!bought.has(id+k.id)&&!s.news!.business!.halted[k.id]&&priceLimit(k)!=='up'&&k.quota>=19&&s.economy!.balances[id].bank>=k.price*19/100):undefined;
   if(k){a={type:'stockTrade',stockId:k.id,side:'buy',quantity:19};bought.add(id+k.id);}
   else if(kind==='time'&&!timeUsed&&timeAvailable(s)&&g7Options(s,nodes,defs,'tool:10').length){
    const k=s.g6!.stocks.find(k=>marketAvailable(s)&&!s.news!.business!.halted[k.id]&&priceLimit(k)!=='up'&&k.quota>=3&&s.economy!.balances[id].bank>=k.price*3/100);
    if(k&&!beforeTime.has(s.turn)){beforeTime.add(s.turn);a={type:'stockTrade',stockId:k.id,side:'buy',quantity:3};}
    else a={type:'item',action:{type:'begin',definitionId:'tool:10:time-v1'}};
   }
   else if(inv['tool:08']&&!actionLocked(m)&&!s.g4!.hotel[id]&&!m.stop&&!m.turtle){const best=[1,2,3,4,5,6].map(v=>({v,score:route(player.node,player.previous,v)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=180){remote=best.v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
   else a={type:'roll'};
  }
  else if(!a&&p?.kind==='effect')a={type:'item',...(s.effects!.pending!.definitionId===REMOTE_EFFECT?{value:remote}:{}),action:{type:'confirm',decisionId:p.id,target:{kind:'player',id}}};
  else if(!a&&s.phase==='turnEnd')a={type:'endTurn'};
  else if(!a&&(p?.kind==='roll'||p?.kind==='segment'))a={type:'animationDone',token:p.id};
  else if(!a&&p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,player.node,s.remaining-1)-route(a,player.node,s.remaining-1))[0]};
  else if(!a&&p?.kind==='property'){actor=p.payerId??id;const d=defs.find(d=>d.id===p.propertyId)!;a={type:'property',decisionId:p.id,accept:p.operation==='rent'||kind==='time'&&d.kind==='facility'&&s.economy!.balances[id].cash>=p.amount,...(p.buildingChoices?{buildingType:4}:{})};}
  else if(!a&&p?.kind==='shop')a=s.items!.points[id]>=30&&inv['tool:08']<2&&s.items!.supply>0&&p.shelf?.tools.some(x=>x.itemId==='tool:08'&&x.available)?{type:'buyItem',decisionId:p.id,itemId:'tool:08'}:{type:'leaveShop',decisionId:p.id};
  else if(!a&&p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
  else if(!a&&p?.kind==='lottery')a={type:'leaveLottery',decisionId:p.id};
  else if(!a&&p?.kind==='facility')a={type:'facility',decisionId:p.id,targetId:null};
  else if(!a&&p?.kind==='magic')a={type:'magic',decisionId:p.id,...(p.stage==='choose'?{effect:6}:{})};
  else if(!a&&p?.kind==='minigame')a={type:'minigame',decisionId:p.id,input:{kind:p.stage==='ready'?'start':p.stage==='playing'?'tick':'ack'}};
  else if(!a&&p?.kind==='news')a={type:'ackNews',decisionId:p.id};
  else if(!a&&p?.kind==='fortune')a=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(!a&&p?.kind==='insurance')a={type:'spinInsurance',decisionId:p.id};
  else if(!a&&p?.kind==='construction')a={type:'constructCompany',decisionId:p.id,propertyId:defs[0].id};
  else if(!a&&p?.kind==='subscription')a={type:'subscribeCompany',decisionId:p.id,quantity:Math.min(13,p.maximum)};
  else if(!a&&p?.kind==='company')a={type:'ackCompany',decisionId:p.id};
  else if(!a&&p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:null};}
  else if(!a&&p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}
  else if(!a&&p?.kind==='debt'){actor=p.payerId??id;a={type:'settleDebt',decisionId:p.id};}
  if(!a)throw Error(s.phase);
  const r=e.dispatch({gameId:s.gameId,id:'c'+s.revision,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r,turn:s.turn}));
  for(const ev of r.events){if(ev.type==='companySubscribed')subscribed=true;if(ev.type==='newsResolved'&&ev.completeChanges?.company&&ev.stocks.length)trendDate=s.calendar!.date;if(ev.type==='fortuneResolved'&&ev.change.assets?.stocks?.some(x=>x.before>x.after))fortunes.add(ev.fortuneId);if(ev.type==='g7Notice'&&ev.message.startsWith('时光机：'))timeUsed=true;}
 }
 return null;
}
if(process.env.RICHMAN_FIND_CIRCUIT){const kind=process.env.RICHMAN_FIND_CIRCUIT as 'commerce'|'fortune'|'time',count=kind==='commerce'?2:kind==='fortune'?3:4;for(let i=0;i<120;i++){const seed='stock-circuit-'+kind+'-'+i;
 const probe=new GameEngine(nodes,{gameId:'probe',seed,rulesId:'japan-events-candidate-v44',characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:300000,startDate:'1998-01-09'}).state;
 if(kind==='fortune'&&![8,9].every(x=>probe.fortune!.order.slice(0,8).includes(x)))continue;
 if(kind==='commerce'&&!probe.news!.order.slice(0,1).some(x=>[30,31,32,33,34].includes(x)))continue;
 const r=planCircuit(seed,count,kind,kind==='time'?5000:2500);console.log(kind,i,r?.replay.commands.length);if(r){writeFileSync('/private/tmp/richman-unified-04c-'+kind+'.json',JSON.stringify(r));console.log('FOUND',seed,r.state.turn);break;}}
}
