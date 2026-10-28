/** Legal original-map route search. Commands only; no mutable world injection. */
import fs from 'node:fs';
import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-reactions';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {g2Options,actionLocked,G2_GOODS} from '../../frontend/src/features/richman/game/g2';
import {g3Options,G3_GOODS} from '../../frontend/src/features/richman/game/g3';
import {REMOTE_EFFECT,itemSite} from '../../frontend/src/features/richman/game/items';
import {NEARBY_WORKER_EFFECT,nearbyWorkerTargets} from '../../frontend/src/features/richman/game/nearby-construction';
import {PROPERTY_CATALOG,rentLines} from '../../frontend/src/features/richman/game/economy';
import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';
import {salesAvailable} from '../../frontend/src/features/richman/game/estate-sales';
import {marketAvailable,priceLimit} from '../../frontend/src/features/richman/game/g6-market';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(start:number,targets:number[]){const seen=new Set([start]),q=[[start,0]];for(const[n,d]of q){if(targets.includes(n))return d;for(const a of byId.get(n)!.adjacent)if(!seen.has(a)){seen.add(a);q.push([a,d+1]);}}return 999;}
export function planRentPayer(seed:string,kind:'attack'|'waiver'|'debt',count:number,limit=9000){
 const aiId=kind==='attack'?'player-4':'player-3',aiCharacter=kind==='attack'?'salonbus':'chyan';
 const e=new GameEngine(nodes,{gameId:'reaction-circuit',seed,rulesId:'japan-events-candidate-v44',characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:30000,startDate:'1998-01-01'});
 const done=new Set<string>();let selected='',value=1,traded=false,drained=false,listingId='',completedTurn=0;
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,inv=s.effects!.inventory[id],m=s.g2!.players[id],balance=s.economy!.balances[id];let a:Action,actor=id;
  const complete=kind==='attack'?done.has('ai-reaction'):done.has('ai-payer');
  if(complete&&!completedTurn)completedTurn=s.turn;
  if(completedTurn&&s.turn>completedTurn&&s.phase==='idle')return{replay:{...e.exportReplay(),control:{version:1,policy:'rent-v1',computerIds:[aiCharacter]}},state:s,events:e.events,used:[],coverage:[...done]};
  if(s.phase==='finished'||s.calendar!.date>'1999-01-01')break;
  const desired=kind==='attack'?(id==='player-1'?['card:17']:['card:19']):kind==='waiver'?['card:20','card:29']:id==='player-1'?[]:['card:19','card:20'];
  const missing=desired.filter(item=>!inv[item] && !(item==='card:21'&&done.has('immune')) && !(item==='card:18'&&done.has('revenge')) && !(item==='card:19'&&kind==='attack'&&done.has('redirect')) && !(item==='card:20'&&done.has('free')) && !(item==='card:29'&&done.has('allied')));
  if(kind==='debt'&&drained&&!done.has('substitute-sale')&&s.economy!.balances['player-1'].cash+s.economy!.balances['player-1'].bank>400)drained=false;
  const canDrain=done.has('ai-payer');
  const ownCount=s.economy!.properties.filter(x=>x.ownerId==='player-1').length;
  const candidates=PROPERTY_CATALOG.properties.filter(d=>{const x=s.economy!.properties.find(x=>x.id===d.id)!;return d.kind==='land'&&x.ownerId&&x.ownerId!==id;});
  const rents=candidates.filter(d=>kind==='waiver'?s.g3!.allies[id]?.partner===s.economy!.properties.find(x=>x.id===d.id)!.ownerId||(!done.has('free')&&!!inv['card:20']&&rentLines(d,s.economy!.properties,PROPERTY_CATALOG.properties).reduce((n,x)=>n+x.amount,0)>=2000):kind==='debt'&&id!=='player-1'&&(drained||!done.has('ai-payer'))&&inv['card:19']&&(!done.has('ai-payer')||s.economy!.properties.find(x=>x.id===d.id)!.ownerId!=='player-1')&&(done.has('ai-payer')||s.economy!.properties.find(x=>x.id===d.id)!.ownerId!==aiId)&&rentLines(d,s.economy!.properties,PROPERTY_CATALOG.properties).reduce((n,x)=>n+x.amount,0)>=2000).flatMap(d=>d.nodeIds);
  const needShop=missing.length>0 && s.items!.points[id]>=Math.min(...missing.map(shopPrice));
  const ownBuild=PROPERTY_CATALOG.properties.filter(d=>d.kind==='land'&&s.economy!.properties.some(x=>x.id===d.id&&x.ownerId===id&&x.level<4)).flatMap(d=>d.nodeIds);
  const targets=kind==='debt'&&id==='player-1'&&canDrain&&!drained&&balance.bank>0?[1]:rents.length?rents:missing.length?(needShop?[50,107]:[20,31]):kind==='attack'?s.players.filter(x=>id==='player-1'?x.id===aiId:x.id!==id).map(x=>x.node):ownBuild.length?ownBuild:PROPERTY_CATALOG.properties.filter(d=>d.kind==='land'&&(!s.economy!.properties.find(x=>x.id===d.id)!.ownerId||s.economy!.properties.find(x=>x.id===d.id)!.ownerId===id)).flatMap(d=>d.nodeIds);
  const cache=new Map<string,number>();
  const score=(n:number)=>-distance(n,targets)+(targets.includes(n)?100:0)+(!needShop&&missing.length?(itemSite(byId.get(n)!)?.points??0):0);
  const route=(n:number,prev:number,left:number):number=>{const key=`${n}:${prev}:${left}`;if(cache.has(key))return cache.get(key)!;if(!left)return score(n);const adj=g1Adjacent(byId.get(n)!),next=adj.filter(x=>x!==prev),result=Math.max(...(next.length?next:adj).map(x=>route(x,n,left-1)));cache.set(key,result);return result;};
  if(s.phase==='idle'){
   const ally=kind==='waiver'&&!done.has('allied')&&inv['card:29']&&!s.g3!.allies[id]?g3Options(s,nodes,'card:29').find(o=>s.economy!.properties.some(x=>x.ownerId===o.id)):undefined;
   const attack=kind==='attack'&&id==='player-1'&&inv['card:17']?g2Options(s,nodes,'card:17').find(o=>o.target.id==='player-4'&&!s.g2!.players[o.target.id].prison&&!!s.effects!.inventory[o.target.id]['card:19']):undefined;
   const build=kind!=='attack'&&inv['tool:09']&&!actionLocked(m)?nearbyWorkerTargets(byId.get(player.node)!,PROPERTY_CATALOG.properties,s.economy!.properties).filter(x=>s.economy!.properties.find(p=>p.id===x)!.ownerId && (kind!=='debt'||s.economy!.properties.find(p=>p.id===x)!.ownerId!=='player-1')).sort((a,b)=>{const rent=(id:string)=>{const d=PROPERTY_CATALOG.properties.find(d=>d.id===id)!,x=s.economy!.properties.find(p=>p.id===id)!;return d.rents[x.level+1];};return rent(b)-rent(a);})[0]:undefined;
   const record=Object.values(s.finance!.sales!.records).flat().find(x=>x.id===listingId),own=s.economy!.properties.find(x=>x.ownerId===id);
   const share=s.g6!.stocks.find(k=>Number(k.id.slice(3))>=30&&marketAvailable(s)&&!s.news!.business!.halted[k.id]&&priceLimit(k)!=='up'&&k.quota>=19&&balance.bank>Math.ceil(k.price*20/100));
   if(kind==='debt'&&id==='player-1'&&!traded&&share){a={type:'stockTrade',stockId:share.id,side:'buy',quantity:19};traded=true;}
   else if(kind==='debt'&&canDrain&&!drained&&ownCount>=4&&id!=='player-1'&&own&&salesAvailable(s)&&!record&&s.economy!.balances['player-1'].bank===0){const d=PROPERTY_CATALOG.properties.find(d=>d.id===own.id)!;a={type:'listProperty',propertyId:own.id,price:Math.max(1,Math.min(s.economy!.balances['player-1'].cash,((own.basePrice??d.basePrice)+own.level*d.upgradeCost)*s.calendar!.business!.priceIndex*10))};}
   else if(kind==='debt'&&!drained&&id==='player-1'&&record&&salesAvailable(s)&&record.price<=balance.cash){a={type:'buyListing',listingId,price:record.price};}
   else if(ally){selected=ally.id;a={type:'item',action:{type:'begin',definitionId:G3_GOODS.find(x=>x.id==='card:29')!.effect}};}
   else if(attack){selected=attack.target.id;a={type:'item',action:{type:'begin',definitionId:G2_GOODS.find(x=>x.id==='card:17')!.effect}};}
   else if(build){selected=build;a={type:'item',action:{type:'begin',definitionId:NEARBY_WORKER_EFFECT}};}
   else if(m.vehicle!=='foot'&&m.diceCount!==1)a={type:'traffic',diceCount:1};
   else if(inv['tool:08']&&!actionLocked(m)&&!m.stop&&!m.turtle&&!s.g4!.hotel[id]){const best=[1,2,3,4,5,6].map(v=>({v,score:route(player.node,player.previous??-1,v)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=100){value=best.v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else a={type:'roll'};}
   else a={type:'roll'};
  }else if(p?.kind==='effect'){const effect=s.effects!.pending!.definitionId;a={type:'item',action:{type:'confirm',decisionId:p.id,target:{kind:effect===NEARBY_WORKER_EFFECT?'property':'player',id:effect===REMOTE_EFFECT?id:selected}},...(effect===REMOTE_EFFECT?{value}:{})};}
  else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};if(p.continuation.kind==='attack')a={type:'reaction',decisionId:p.id,choice:done.has('redirect')?'decline':'use',...(!done.has('redirect')?{targetId:p.continuation.sourceId}:{})};else if(p.continuation.kind==='rent'){if(kind==='waiver'&&p.stage==='free')a={type:'reaction',decisionId:p.id,choice:'use'};else if(kind==='debt'&&p.stage==='redirect'&&p.responderId!=='player-1'&&(!done.has('ai-payer')||p.continuation.decision.recipientId!=='player-1')&&(!done.has('ai-payer')||!s.finance!.eliminated.includes('player-1')))a={type:'reaction',decisionId:p.id,choice:'use',targetId:!done.has('ai-payer')&&p.continuation.decision.recipientId!==aiId&&!s.finance!.eliminated.includes(aiId)?aiId:'player-1'};}}
  else if(s.phase==='turnEnd')a={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,player.node,s.remaining-1)-route(a,player.node,s.remaining-1))[0]};
  else if(p?.kind==='shop'){const good=[...missing,...(inv['tool:08']<2?['tool:08']:[])].find(item=>s.items!.points[id]>=shopPrice(item)&&shopSupply(s,item)>0&&[...p.shelf!.cards,...p.shelf!.tools].some(x=>x.itemId===item&&x.available)&&(!item.startsWith('card:')||s.g3!.slots[id].length<15));a=good?{type:'buyItem',decisionId:p.id,itemId:good}:{type:'leaveShop',decisionId:p.id};}
  else if(p?.kind==='property'){actor=p.payerId??id;const accept=p.operation==='rent'||kind!=='attack'&&!(kind==='debt'&&id==='player-1'&&(drained||ownCount>=4))&&balance.cash>=p.amount;a={type:'property',decisionId:p.id,accept,...(accept&&p.buildingChoices?{buildingType:4}:{})};}
  else if(p?.kind==='bank')a=kind==='debt'&&id==='player-1'&&canDrain&&!drained&&balance.bank>0&&!s.news!.business!.bankRejected?.[id]?{type:'bank',decisionId:p.id,operation:'withdraw',amount:balance.bank}:kind==='debt'&&id!=='player-1'&&balance.bank>0&&!s.news!.business!.bankRejected?.[id]?{type:'bank',decisionId:p.id,operation:'withdraw',amount:balance.bank}:{type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='debt'){actor=p.payerId??id;a={type:'settleDebt',decisionId:p.id};}
  else if(p?.kind==='lottery')a={type:'leaveLottery',decisionId:p.id};
  else if(p?.kind==='facility')a={type:'facility',decisionId:p.id,targetId:null};
  else if(p?.kind==='magic')a={type:'magic',decisionId:p.id,...(p.stage==='choose'?{effect:6}:{})};
  else if(p?.kind==='minigame')a={type:'minigame',decisionId:p.id,input:{kind:kind==='attack'&&!process.env.RICHMAN_QUICK_ATTACK?(p.stage==='ready'?'start':p.stage==='result'?'ack':'tick'):(p.stage==='result'?'ack':'quit')}};
  else if(p?.kind==='insurance')a={type:'spinInsurance',decisionId:p.id};
  else if(p?.kind==='construction')a={type:'constructCompany',decisionId:p.id,propertyId:null};
  else if(p?.kind==='subscription')a={type:'subscribeCompany',decisionId:p.id,quantity:null};
  else if(p?.kind==='company')a={type:'ackCompany',decisionId:p.id};
  else if(p?.kind==='fortune')a=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='news')a={type:'ackNews',decisionId:p.id};
  else if(p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:p.leader||s.economy!.balances[p.responderId].cash<p.bid+100?null:100};}
  else throw Error(s.phase);
  if(decisionPlayer(s)===aiId&&p?.kind!=='roll'&&p?.kind!=='segment'){const d=decideComputer(s,nodes,'rent-v1');if(!d)throw Error('No computer decision');a=d.action;actor=d.playerId;}
  if(actor!==id){if(actor===aiId&&p?.kind==='reaction')done.add('ai-reaction');if(actor===aiId&&['property','debt'].includes(p?.kind??''))done.add('ai-payer');if(actor===aiId&&p?.kind==='auction')done.add('ai-auction');}
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({seed,step,a,r}));
  if(a.type==='buyListing'){const b=e.state.economy!.balances['player-1'];drained=b.cash+b.bank<=400;}
  for(const v of r.events){if(v.type==='propertyListed')listingId=v.record.id;if(v.type==='g3Resolved'&&v.itemId==='card:21')done.add('immune');if(v.type==='attackResolved'&&v.targetId===v.sourceId)done.add('redirect');if(v.type==='g3Resolved'&&v.itemId==='card:18')done.add('revenge');if(v.type==='rentWaived')done.add(v.reason==='免费卡'?'free':v.reason?.includes('同盟')?'allied':'waived');if(v.type==='stockTraded'&&v.forced&&v.traderId==='player-1'&&id!=='player-1')done.add('substitute-sale');if(v.type==='disposalCompleted'&&v.receipt.payerId==='player-1'&&id!=='player-1')done.add('substitute-exit');}
 }
 if(process.env.RICHMAN_DEBUG_REACTION)fs.writeFileSync('/private/tmp/reaction-debug-'+kind+'.json',JSON.stringify({done:[...done],drained,traded,state:e.state,events:e.events}));
 return null;
}


if(process.env.RICHMAN_PAYER_SEARCH)for(let i=0;i<15;i++){const seed='reaction-debt-'+i,p=planRentPayer(seed,'debt',4,4000);console.log(i,p?.replay.commands.length,p?.coverage);if(p){fs.writeFileSync('/private/tmp/computer-rent-payer.json',JSON.stringify(p));break;}}
