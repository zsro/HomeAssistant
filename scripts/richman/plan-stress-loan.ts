import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {salesAvailable} from '../../frontend/src/features/richman/game/estate-sales';

import {dayNumber} from '../../frontend/src/features/richman/game/calendar-date';
import {loanCapacity} from '../../frontend/src/features/richman/game/news-business';
import {marketBuyLimit} from '../../frontend/src/features/richman/game/stock-market';
import {marketAvailable,priceLimit} from '../../frontend/src/features/richman/game/g6-market';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,targets:number[]){const seen=new Set([node]),q=[[node,0]];for(const[n,d]of q){if(targets.includes(n))return d;for(const a of byId.get(n)!.adjacent)if(!seen.has(a)){seen.add(a);q.push([a,d+1]);}}return 999;}
export function planStressLoan(seed:string,count=3,funds=100000,limit=6500){
 const e=new GameEngine(nodes,{gameId:'payment-plan',seed,rulesId:'japan-events-candidate-v44',characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:funds,startDate:'1998-01-01'});let found=false,borrowed=false,remoteValue=1,drained=false,listingId='';
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,id=s.players[s.active].id;let action:Action,actor=id;
  if(found&&!s.finance!.batches!.current&&!s.finance!.batches!.day&&!s.finance!.payments!.current){const replay=e.exportReplay();if(JSON.stringify(replayGame(nodes,replay).state)!==JSON.stringify(s))throw Error('Replay');return{replay,state:s,events:e.events,used:[]};}
  if(s.calendar!.date>'1999-04-16'||s.finance!.winnerId||(!found&&s.finance!.eliminated.includes('player-1')&&!s.finance!.batches!.current&&!s.finance!.payments!.current)){if(process.env.RICHMAN_DEBUG_BATCH)fs.writeFileSync('/private/tmp/batch-debug.json',JSON.stringify({drained,state:s,events:e.events}));return null;}
  const victim='player-1',balance=s.economy!.balances[id],owns=s.economy!.properties.filter(p=>p.ownerId===victim).length;

  const emptyNodes=PROPERTY_CATALOG.properties.filter(d=>d.kind==='land'&&!s.economy!.properties.find(p=>p.id===d.id)!.ownerId).flatMap(d=>d.nodeIds);
  const due=s.calendar!.due[victim],near=!!due&&dayNumber(due)-dayNumber(s.calendar!.date)<=10;
  const targets=id===victim&&!borrowed?[1]:id===victim&&owns<4?emptyNodes:[1,9,21,23,25,39,71,90];
  const cache=new Map<string,number>();
  const score=(node:number)=>-distance(node,targets)+(targets.includes(node)?100:0);
  const routeScore=(node:number,previous:number,remaining:number):number=>{const key=`${node}:${previous}:${remaining}`;if(cache.has(key))return cache.get(key)!;if(!remaining)return score(node);const adj=g1Adjacent(byId.get(node)!),on=adj.filter(i=>i!==previous);const result=Math.max(...(on.length?on:adj).map(n=>routeScore(n,node,remaining-1)));cache.set(key,result);return result;};
  if(s.phase==='idle'){
   const inv=s.effects!.inventory[id],m=s.g2!.players[id];
   const own=s.economy!.properties.find(p=>p.ownerId===id),record=Object.values(s.finance!.sales!.records).flat().find(r=>r.id===listingId);
   const share=s.g6!.stocks.find(k=>marketAvailable(s)&&!s.news!.business!.halted[k.id]&&priceLimit(k)!=='up'&&marketBuyLimit(balance.bank,k.price,k.pool,k.quota)>0);
   if(id===victim&&near&&share&&balance.bank>50)action={type:'stockTrade',stockId:share.id,side:'buy',quantity:marketBuyLimit(balance.bank,share.price,share.pool,share.quota)};
   else if(near&&id!==victim&&own&&salesAvailable(s)&&!record&&s.economy!.balances[victim].cash>0){const def=PROPERTY_CATALOG.properties.find(d=>d.id===own.id)!;const price=Math.min(s.economy!.balances[victim].cash,((own.basePrice??def.basePrice)+own.level*def.upgradeCost)*s.calendar!.business!.priceIndex*10);action={type:'listProperty',propertyId:own.id,price:Math.max(1,price)};}
   else if(near&&id===victim&&record&&salesAvailable(s)&&record.price<=balance.cash){action={type:'buyListing',listingId,price:record.price};drained=true;}
   else if(m.vehicle!=='foot'&&m.diceCount!==1)action={type:'traffic',diceCount:1};
   else if(inv['tool:08']>0&&!actionLocked(m)&&!m.stop&&!m.turtle&&!s.g4!.hotel[id]){const best=[1,2,3,4,5,6].map(value=>({value,score:routeScore(s.players[s.active].node,s.players[s.active].previous??-1,value)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=100){remoteValue=best.value;action={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else action={type:'roll'};}
   else action={type:'roll'};
  }
  else if(p?.kind==='effect'){action={type:'item',...(s.effects!.pending!.definitionId.startsWith('tool:08')?{value:remoteValue}:{}),action:{type:'confirm',decisionId:p.id,target:{kind:'player',id}}};}
  else if(s.phase==='turnEnd')action={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,s.players[s.active].node,s.remaining-1)-routeScore(a,s.players[s.active].node,s.remaining-1))[0]};
  else if(p?.kind==='lottery'){const n=s.lottery!.tickets.findIndex(x=>x===null)+1;action=n&&s.economy!.balances[id].cash>=1000&&!found?{type:'buyLottery',decisionId:p.id,number:n}:{type:'leaveLottery',decisionId:p.id};}
  else if(p?.kind==='property'){actor=p.payerId??id;action={type:'property',decisionId:p.id,accept:p.operation==='rent'||(p.operation==='buy'&&!p.buildingChoices&&(id===victim?owns<4:s.economy!.properties.filter(x=>x.ownerId===id).length<2)&&balance.cash>=p.amount)};}
  else if(p?.kind==='bank')action=id===victim&&!borrowed&&!s.news!.business!.bankRejected?.[id]&&!s.news!.business!.noLoans[id]&&loanCapacity(s,id,PROPERTY_CATALOG.properties)>=10000?{type:'loan',decisionId:p.id,operation:'borrow',amount:10000}:id===victim&&near&&balance.cash>0&&!s.news!.business!.bankRejected?.[id]?{type:'bank',decisionId:p.id,operation:'deposit',amount:balance.cash}:{type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='debt'){actor=p.payerId??id;action={type:'settleDebt',decisionId:p.id};}
  else if(p?.kind==='shop')action={type:'leaveShop',decisionId:p.id};
  else if(p?.kind==='facility')action={type:'facility',decisionId:p.id,targetId:null};
  else if(p?.kind==='magic')action={type:'magic',decisionId:p.id,...(p.stage==='choose'?{effect:6}:{})};
  else if(p?.kind==='minigame')action={type:'minigame',decisionId:p.id,input:{kind:p.stage==='ready'?'start':p.stage==='result'?'ack':'tick'}};
  else if(p?.kind==='insurance')action={type:'spinInsurance',decisionId:p.id};
  else if(p?.kind==='construction')action={type:'constructCompany',decisionId:p.id,propertyId:null};
  else if(p?.kind==='subscription')action={type:'subscribeCompany',decisionId:p.id,quantity:null};
  else if(p?.kind==='company')action={type:'ackCompany',decisionId:p.id};
  else if(p?.kind==='fortune')action=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='news')action={type:'ackNews',decisionId:p.id};
  else if(p?.kind==='auction'){actor=p.responderId;action={type:'auction',decisionId:p.id,increment:!p.leader&&s.economy!.balances[p.responderId].cash>=p.bid+100?100:null};}
  else if(p?.kind==='reaction'){actor=p.responderId;action={type:'reaction',decisionId:p.id,choice:'decline'};}
  else {if(process.env.RICHMAN_DEBUG_BATCH)console.log(s.phase);return null;}
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({action,r}));
  for(const ev of r.events){if(ev.type==='propertyListed')listingId=ev.record.id;if(ev.type==='loanChanged'&&ev.operation==='borrow'&&ev.targetId===victim)borrowed=true;if(ev.type==='paymentCompleted'&&ev.payment.kind==='loan')found=true;}

 }
 if(process.env.RICHMAN_DEBUG_BATCH)fs.writeFileSync('/private/tmp/batch-debug.json',JSON.stringify({drained,state:e.state,events:e.events}));
 return null;
}

if(process.env.RICHMAN_FIND_STRESS_LOAN){for(let i=Number(process.env.RICHMAN_SEED_START||0);i<Number(process.env.RICHMAN_SEED_END||40);i++){const seed='stress-loan-'+i,plan=planStressLoan(seed);if(plan){fs.writeFileSync('/private/tmp/richman-unified-05a-loan-3.json',JSON.stringify(plan));console.log(JSON.stringify({seed,commands:plan.replay.commands.length,turn:plan.state.turn,payment:plan.state.finance!.payments!.last,disposal:plan.state.finance!.disposal!.last}));break;}console.log('searched loan',i);}}
