/** Legal original-map route planner. No private-state writes; browser execution is separate evidence. */
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {marketAvailable,priceLimit} from '../../frontend/src/features/richman/game/g6-market';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {researchOptions} from '../../frontend/src/features/richman/game/g5';
import {g7Options,timeAvailable} from '../../frontend/src/features/richman/game/g7';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {writeFileSync} from 'node:fs';
import {g3Options,G3_GOODS} from '../../frontend/src/features/richman/game/g3';
import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const defs=PROPERTY_CATALOG.properties,byId=new Map(nodes.map(n=>[n.id,n]));
const distances=new Map<number,Map<number,number>>();for(const n of nodes){const d=new Map([[n.id,0]]),q=[n.id];for(let i=0;i<q.length;i++)for(const next of byId.get(q[i])!.adjacent)if(!d.has(next)){d.set(next,d.get(q[i])!+1);q.push(next);}distances.set(n.id,d);}
export function planRestoreCircuit(seed:string,count:number,limit=10000){
 const e=new GameEngine(nodes,{gameId:'restore-circuit',seed,rulesId:'japan-events-candidate-v44',characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:300000,startDate:'1998-01-09'}),bought=new Set<string>(),beforeTime=new Set<number>();let remote=1,timeUsed=false,restoreTurn=0,selected='',stopped=false,allied=false;
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,inv=s.effects!.inventory[id],m=s.g2!.players[id];let a:Action|undefined,actor=id;
  if(timeUsed&&s.turn>restoreTurn&&s.phase==='idle'){const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(s))throw Error('replay');return{replay,state:s,events:e.events,used:['tool:10'],kind:'time'};}
  if(s.finance!.winnerId||s.turn>600)return null;
  const ownedLabs=s.economy!.properties.filter(q=>q.ownerId===id&&q.buildingType===4);
  const targets=(ownedLabs.length?defs.filter(d=>ownedLabs.some(q=>q.id===d.id)).flatMap(d=>d.nodeIds):defs.filter(d=>d.kind==='facility'&&s.economy!.properties.some(q=>q.id===d.id&&(!q.ownerId||q.ownerId===id))).flatMap(d=>d.nodeIds));
  const score=(n:number)=>200-12*Math.min(...targets.map(t=>distances.get(n)!.get(t)??999));
  const cache=new Map<string,number>();function route(n:number,prev:number|null,left:number):number{const key=n+'/'+prev+'/'+left;if(cache.has(key))return cache.get(key)!;if(!left||s.roadTools!.blocks.includes(n))return score(n);const adj=g1Adjacent(byId.get(n)!),forward=adj.filter(x=>x!==prev);const v=Math.max(...(forward.length?forward:adj).map(to=>route(to,n,left-1)));cache.set(key,v);return v;}
  if(!timeUsed){const research=researchOptions(s,defs).find(o=>o.itemId==='tool:10'&&!s.economy!.properties.some(q=>q.research?.itemId==='tool:10')&&!Object.values(s.effects!.inventory).some(b=>b['tool:10']));if(research)a={type:'research',propertyId:research.propertyId,itemId:research.itemId};}
  if(!a&&s.phase==='idle'){
   const continuing=inv['tool:10']&&!timeUsed?researchOptions(s,defs).find(o=>o.itemId==='tool:09'):undefined;
   const history=Object.values(s.g7!.checkpoints).some(c=>c&&(count!==3||c.world.economy!.properties.some(q=>q.research))&&Object.values(c.world.effects!.inventory).some(inv=>inv['tool:10']));
   const ally=history&&inv['card:29']&&!allied?g3Options(s,nodes,'card:29')[0]:undefined;
   if(count>2&&history&&inv['card:14']&&!stopped){stopped=true;a={type:'item',action:{type:'begin',definitionId:'card:14:stop-v1'}};}
   else if(count>2&&ally){allied=true;selected=ally.id;a={type:'item',action:{type:'begin',definitionId:G3_GOODS.find(g=>g.id==='card:29')!.effect}};}
   else if(continuing)a={type:'research',propertyId:continuing.propertyId,itemId:continuing.itemId};
  }
  if(!a&&s.phase==='idle'){
   const k=marketAvailable(s)?s.g6!.stocks.find(k=>!bought.has(id+k.id)&&!s.news!.business!.halted[k.id]&&priceLimit(k)!=='up'&&k.quota>=19&&s.economy!.balances[id].bank>=k.price*19/100):undefined;
   if(k){a={type:'stockTrade',stockId:k.id,side:'buy',quantity:19};bought.add(id+k.id);}
   else if(!timeUsed&&timeAvailable(s)&&(count===2||s.g7!.checkpoints[id]!.world.economy!.properties.some(q=>q.research?.ownerId===id))&&g7Options(s,nodes,defs,'tool:10').length){
    const k=s.g6!.stocks.find(k=>marketAvailable(s)&&!s.news!.business!.halted[k.id]&&priceLimit(k)!=='up'&&k.quota>=3&&s.economy!.balances[id].bank>=k.price*3/100);
    const ally=inv['card:29']&&!allied?g3Options(s,nodes,'card:29')[0]:undefined;
    if(inv['card:14']&&!stopped){stopped=true;a={type:'item',action:{type:'begin',definitionId:'card:14:stop-v1'}};}
    else if(ally){allied=true;selected=ally.id;a={type:'item',action:{type:'begin',definitionId:G3_GOODS.find(g=>g.id==='card:29')!.effect}};}
    else if(k&&!beforeTime.has(s.turn)){beforeTime.add(s.turn);a={type:'stockTrade',stockId:k.id,side:'buy',quantity:3};}
    else a={type:'item',action:{type:'begin',definitionId:'tool:10:time-v1'}};
   }
   else if(inv['tool:08']&&!actionLocked(m)&&!s.g4!.hotel[id]&&!m.stop&&!m.turtle){const best=[1,2,3,4,5,6].map(v=>({v,score:route(player.node,player.previous,v)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=180){remote=best.v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
   else a={type:'roll'};
  }
  else if(!a&&p?.kind==='effect')a={type:'item',...(s.effects!.pending!.definitionId===REMOTE_EFFECT?{value:remote}:{}),action:{type:'confirm',decisionId:p.id,target:{kind:'player',id:s.effects!.pending!.definitionId.startsWith('card:29')?selected:id}}};
  else if(!a&&s.phase==='turnEnd')a={type:'endTurn'};
  else if(!a&&(p?.kind==='roll'||p?.kind==='segment'))a={type:'animationDone',token:p.id};
  else if(!a&&p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,player.node,s.remaining-1)-route(a,player.node,s.remaining-1))[0]};
  else if(!a&&p?.kind==='property'){actor=p.payerId??id;const d=defs.find(d=>d.id===p.propertyId)!;a={type:'property',decisionId:p.id,accept:p.operation==='rent'||d.kind==='facility'&&s.economy!.balances[id].cash>=p.amount,...(p.buildingChoices?{buildingType:4}:{})};}
  else if(!a&&p?.kind==='shop'){const wanted=['card:14','card:29','tool:08'].find(item=>!inv[item]&&s.items!.points[id]>=shopPrice(item)&&shopSupply(s,item)>0&&[...p.shelf!.cards,...p.shelf!.tools].some(x=>x.available&&x.itemId===item)&&s.g3!.slots[id].length<15);a=wanted?{type:'buyItem',decisionId:p.id,itemId:wanted}:{type:'leaveShop',decisionId:p.id};}
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
  for(const ev of r.events){if(ev.type==='g7Notice'&&ev.message.startsWith('时光机：')){timeUsed=true;restoreTurn=s.turn;}}
 }
 return null;
}

if(process.env.RICHMAN_RESTORE_SEARCH){const count=Number(process.env.RICHMAN_RESTORE_SEARCH);for(let i=Number(process.env.RICHMAN_SEED_START||0);i<20;i++){const seed='restore-circuit-'+count+'-'+i,plan=planRestoreCircuit(seed,count);console.log(count,seed,plan?.replay.commands.length);if(plan){writeFileSync('/private/tmp/richman-unified-05c-'+count+'.json',JSON.stringify(plan));break;}}}
