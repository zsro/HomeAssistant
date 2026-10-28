import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {salesAvailable} from '../../frontend/src/features/richman/game/estate-sales';
import {BATCH_RULES} from '../../frontend/src/features/richman/game/payment-batches';
import {marketAvailable} from '../../frontend/src/features/richman/game/g6-market';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,targets:number[]){const seen=new Set([node]),q=[[node,0]];for(const[n,d]of q){if(targets.includes(n))return d;for(const a of byId.get(n)!.adjacent)if(!seen.has(a)){seen.add(a);q.push([a,d+1]);}}return 999;}
export function planBatch(seed:string,count:number,kind:'landTax'|'stockTax'|'dividend',funds=10000,limit=3000){
 const e=new GameEngine(nodes,{gameId:'payment-plan',seed,rulesId:BATCH_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:funds,startDate:'1998-01-01'});let found=false,remoteValue=1,drained=false,listingId='';
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,id=s.players[s.active].id;let action:Action,actor=id;
  if(found&&!s.finance!.batches!.current&&!s.finance!.batches!.day&&!s.finance!.payments!.current){const replay=e.exportReplay();if(JSON.stringify(replayGame(nodes,replay).state)!==JSON.stringify(s))throw Error('Replay');return{replay,state:s,events:e.events,used:[]};}
  if(s.calendar!.date>'1999-04-16'||s.finance!.winnerId||(!found&&s.finance!.eliminated.includes('player-1')&&!s.finance!.batches!.current)){if(process.env.RICHMAN_DEBUG_BATCH)fs.writeFileSync('/private/tmp/batch-debug.json',JSON.stringify({drained,state:s,events:e.events}));return null;}
  const victim='player-1',balance=s.economy!.balances[id],owns=s.economy!.properties.filter(p=>p.ownerId===victim).length;
  const rentNodes=[13,61,94];
  const emptyNodes=PROPERTY_CATALOG.properties.filter(d=>d.kind==='land'&&!s.economy!.properties.find(p=>p.id===d.id)!.ownerId).flatMap(d=>d.nodeIds);
  const invested=kind!=='dividend'||Object.values(s.g6!.holdings[victim]).some(h=>h.quantity>0);
  const targets=id===victim&&balance.bank>0&&invested?[1]:owns>=4?rentNodes:emptyNodes;
  const cache=new Map<string,number>();
  const score=(node:number)=>-distance(node,targets)+(targets.includes(node)?100:0);
  const routeScore=(node:number,previous:number,remaining:number):number=>{const key=`${node}:${previous}:${remaining}`;if(cache.has(key))return cache.get(key)!;if(!remaining)return score(node);const adj=g1Adjacent(byId.get(node)!),on=adj.filter(i=>i!==previous);const result=Math.max(...(on.length?on:adj).map(n=>routeScore(n,node,remaining-1)));cache.set(key,result);return result;};
  if(s.phase==='idle'){
   const inv=s.effects!.inventory[id],m=s.g2!.players[id];
   const own=s.economy!.properties.find(p=>p.ownerId===id),record=Object.values(s.finance!.sales!.records).flat().find(r=>r.id===listingId);
   const company=s.news!.business!.companies.find(c=>c.id==='japan:company:5')!;
   const candidate=kind==='dividend'?s.news!.business!.companies.find(c=>c.funds<0):company;const share=candidate&&s.g6!.stocks.find(k=>k.id===candidate.stockId);
   if(id===victim&&kind!=='landTax'&&share&&!s.g6!.holdings[id][share.id].quantity&&marketAvailable(s)&&!s.news!.business!.halted[share.id]&&share.quota>0&&balance.bank>Math.ceil(share.price/100))action={type:'stockTrade',stockId:share.id,side:'buy',quantity:kind==='stockTax'?Math.min(share.quota,share.pool,Math.floor(balance.bank*100/share.price)):1};
   else if((!drained||kind!=='dividend')&&owns>=4&&id!==victim&&own&&salesAvailable(s)&&!record&&s.economy!.balances[victim].bank===0){const def=PROPERTY_CATALOG.properties.find(d=>d.id===own.id)!;const price=Math.min(s.economy!.balances[victim].cash,((own.basePrice??def.basePrice)+own.level*def.upgradeCost)*s.calendar!.business!.priceIndex*10);action={type:'listProperty',propertyId:own.id,price:Math.max(1,price)};}
   else if((!drained||kind!=='dividend')&&id===victim&&record&&salesAvailable(s)&&record.price<=balance.cash){action={type:'buyListing',listingId,price:record.price};drained=true;}
   else if(m.vehicle!=='foot'&&m.diceCount!==1)action={type:'traffic',diceCount:1};
   else if(inv['tool:08']>0&&!actionLocked(m)&&!m.stop&&!m.turtle&&!s.g4!.hotel[id]){const best=[1,2,3,4,5,6].map(value=>({value,score:routeScore(s.players[s.active].node,s.players[s.active].previous??-1,value)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=100){remoteValue=best.value;action={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else action={type:'roll'};}
   else action={type:'roll'};
  }
  else if(p?.kind==='effect'){action={type:'item',...(s.effects!.pending!.definitionId.startsWith('tool:08')?{value:remoteValue}:{}),action:{type:'confirm',decisionId:p.id,target:{kind:'player',id}}};}
  else if(s.phase==='turnEnd')action={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,s.players[s.active].node,s.remaining-1)-routeScore(a,s.players[s.active].node,s.remaining-1))[0]};
  else if(p?.kind==='lottery'){const n=s.lottery!.tickets.findIndex(x=>x===null)+1;action=n&&s.economy!.balances[id].cash>=1000&&!found?{type:'buyLottery',decisionId:p.id,number:n}:{type:'leaveLottery',decisionId:p.id};}
  else if(p?.kind==='property'){actor=p.payerId??id;action={type:'property',decisionId:p.id,...(p.buildingChoices&&((id!==victim||!drained)&&s.economy!.balances[id].cash>=p.amount)?{buildingType:4}:{}),accept:p.operation==='rent'||((id!==victim||!drained)&&s.economy!.balances[id].cash>=p.amount)};}
  else if(p?.kind==='bank')action=id===victim&&balance.bank>0&&invested&&!s.news!.business!.bankRejected?.[id]?{type:'bank',decisionId:p.id,operation:'withdraw',amount:balance.bank}:{type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='debt'){actor=p.payerId??id;action={type:'settleDebt',decisionId:p.id};}
  else if(p?.kind==='shop')action=s.items!.points[id]>=80&&s.g2!.supply['tool:05']>0&&s.g2!.players[id].vehicle==='foot'&&!s.effects!.inventory[id]['tool:05']?{type:'buyItem',decisionId:p.id,itemId:'tool:05'}:{type:'leaveShop',decisionId:p.id};
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
  for(const ev of r.events){if(ev.type==='propertyListed')listingId=ev.record.id;if(ev.type==='newsResolved'&&kind==='landTax'&&ev.newsId!==12)drained=false;if(ev.type==='batchCompleted'&&ev.batch.kind===kind&&ev.batch.rows.some(r=>r.bankrupt)&&(process.env.RICHMAN_REQUIRE_THREE!=='1'||e.state.finance!.disposal!.last?.auctions.length===3))found=true;}

 }
 if(process.env.RICHMAN_DEBUG_BATCH)fs.writeFileSync('/private/tmp/batch-debug.json',JSON.stringify({drained,state:e.state,events:e.events}));
 return null;
}

if(process.env.RICHMAN_RUN_BATCH_PLAN){const kind=(process.env.RICHMAN_PLAN_KIND||'landTax') as 'landTax'|'stockTax'|'dividend';for(let i=Number(process.env.RICHMAN_SEED_START||0);i<Number(process.env.RICHMAN_SEED_END||100);i++){const seed='batch-'+i,plan=planBatch(seed,Number(process.env.RICHMAN_PLAYER_COUNT||3),kind,kind==='stockTax'?30000:10000,1800);if(plan){fs.writeFileSync('/private/tmp/richman-unified-03v-'+kind+'.json',JSON.stringify(plan,null,2));console.log(JSON.stringify({kind,seed,commands:plan.replay.commands.length,turn:plan.state.turn,fingerprint:plan.state.items!.fingerprint,batch:plan.state.finance!.batches!.last}));break;}if(i%10===0)console.log('searched',kind,i);}}
