import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {itemSite,REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {ESTATE_RULES,salesAvailable} from '../../frontend/src/features/richman/game/estate-sales';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,targets:number[]){const seen=new Set([node]),q=[[node,0]];for(const[n,d]of q){if(targets.includes(n))return d;for(const a of byId.get(n)!.adjacent)if(!seen.has(a)){seen.add(a);q.push([a,d+1]);}}return 999;}
export function planEstateSales(seed:string,count:number,funds=30000,limit=4000){
 const e=new GameEngine(nodes,{gameId:'insurance-plan',seed,rulesId:ESTATE_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:funds,startDate:'1998-01-01'});let stage=0,auctionWon=false,aged=false,found=false,remoteValue=1;let propertyId='',listingId='';
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,id=s.players[s.active].id;let action:Action,actor=id;
  if(found&&s.phase==='turnEnd'){const replay=e.exportReplay();if(JSON.stringify(replayGame(nodes,replay).state)!==JSON.stringify(s))throw Error('Replay');return{replay,state:s,events:e.events,used:[]};}
  if(s.calendar!.date>'1999-04-16'||s.finance!.winnerId){if(process.env.RICHMAN_DEBUG_COMPANY)fs.writeFileSync('/private/tmp/estate-debug.json',JSON.stringify({stage,auctionWon,aged,state:s,events:e.events}));return null;}
  const needBike=false;
  const targets=[13,61,94];
  const cache=new Map<string,number>();
  const score=(node:number)=>needBike&&s.items!.points[id]<80?(itemSite(byId.get(node)!)?.points??0)*10-distance(node,targets):-distance(node,targets)+(targets.includes(node)?100:0);
  const routeScore=(node:number,previous:number,remaining:number):number=>{const key=`${node}:${previous}:${remaining}`;if(cache.has(key))return cache.get(key)!;if(!remaining)return score(node);const adj=g1Adjacent(byId.get(node)!),on=adj.filter(i=>i!==previous);const result=Math.max(...(on.length?on:adj).map(n=>routeScore(n,node,remaining-1)));cache.set(key,result);return result;};
  if(s.phase==='idle'){
   const inv=s.effects!.inventory[id],m=s.g2!.players[id];
   const own=s.economy!.properties.find(p=>p.ownerId===id),record=Object.values(s.finance!.sales!.records).flat().find(r=>r.id===listingId);
   if(stage===0&&own&&salesAvailable(s)){propertyId=own.id;action={type:'listProperty',propertyId,price:1000};stage=1;}
   else if(stage===1&&record?.sellerId===id&&salesAvailable(s)){action={type:'listProperty',propertyId,price:1200};stage=2;}
   else if(stage===2&&record?.sellerId===id&&salesAvailable(s)){action={type:'cancelListing',listingId};stage=3;}
   else if(stage===3&&salesAvailable(s)){action={type:'listProperty',propertyId,price:1500};stage=4;}
   else if(stage===4&&record&&record.sellerId!==id&&salesAvailable(s)){action={type:'buyListing',listingId,price:1500};stage=5;}
   else if(stage===5&&own&&salesAvailable(s)){propertyId=own.id;action={type:'listProperty',propertyId,price:1600};stage=6;}
   else if(m.vehicle!=='foot'&&m.diceCount!==1)action={type:'traffic',diceCount:1};
   else if(inv['tool:08']>0&&!actionLocked(m)&&!m.stop&&!m.turtle&&!s.g4!.hotel[id]){const best=[1,2,3,4,5,6].map(value=>({value,score:routeScore(s.players[s.active].node,s.players[s.active].previous??-1,value)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=100){remoteValue=best.value;action={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else action={type:'roll'};}
   else action={type:'roll'};
  }
  else if(p?.kind==='effect'){action={type:'item',...(s.effects!.pending!.definitionId.startsWith('tool:08')?{value:remoteValue}:{}),action:{type:'confirm',decisionId:p.id,target:{kind:'player',id}}};}
  else if(s.phase==='turnEnd')action={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,s.players[s.active].node,s.remaining-1)-routeScore(a,s.players[s.active].node,s.remaining-1))[0]};
  else if(p?.kind==='lottery'){const n=s.lottery!.tickets.findIndex(x=>x===null)+1;action=n&&s.economy!.balances[id].cash>=1000&&!found?{type:'buyLottery',decisionId:p.id,number:n}:{type:'leaveLottery',decisionId:p.id};}
  else if(p?.kind==='property'){actor=p.payerId??id;action={type:'property',decisionId:p.id,...(p.buildingChoices?{buildingType:4}:{}),accept:p.operation==='rent'||(p.operation!=='rent'&&s.economy!.balances[id].cash>=p.amount)};}
  else if(p?.kind==='bank')action={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='shop')action=s.items!.points[id]>=80&&s.g2!.supply['tool:05']>0&&s.g2!.players[id].vehicle==='foot'&&!s.effects!.inventory[id]['tool:05']?{type:'buyItem',decisionId:p.id,itemId:'tool:05'}:{type:'leaveShop',decisionId:p.id};
  else if(p?.kind==='insurance')action={type:'spinInsurance',decisionId:p.id};
  else if(p?.kind==='construction')action={type:'constructCompany',decisionId:p.id,propertyId:null};
  else if(p?.kind==='subscription')action={type:'subscribeCompany',decisionId:p.id,quantity:null};
  else if(p?.kind==='company')action={type:'ackCompany',decisionId:p.id};
  else if(p?.kind==='fortune')action=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='news')action={type:'ackNews',decisionId:p.id};
  else if(p?.kind==='auction'){actor=p.responderId;action={type:'auction',decisionId:p.id,increment:p.leader?null:100};}
  else if(p?.kind==='reaction'){actor=p.responderId;action={type:'reaction',decisionId:p.id,choice:'decline'};}
  else {if(process.env.RICHMAN_DEBUG_COMPANY)console.log(s.phase);return null;}
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({action,r}));
  for(const ev of r.events){if(ev.type==='propertyListed')listingId=ev.record.id;if(ev.type==='auctionSettled'&&ev.winnerId)auctionWon=true;if(ev.type==='salesAged')aged=true;}
  found=stage===6&&auctionWon&&aged;


 }
 if(process.env.RICHMAN_DEBUG_COMPANY)fs.writeFileSync('/private/tmp/estate-debug.json',JSON.stringify({stage,auctionWon,aged,state:e.state,events:e.events}));
 return null;
}


if(process.env.RICHMAN_RUN_ESTATE_PLAN){const plan=planEstateSales('estate-73',3,300000,3000);if(!plan)throw Error('No route');fs.writeFileSync('/private/tmp/richman-unified-03s.json',JSON.stringify(plan,null,2));console.log(JSON.stringify({commands:plan.replay.commands.length,turn:plan.state.turn,fingerprint:plan.state.items!.fingerprint,events:plan.events.filter(e=>['saleCompleted','auctionSettled'].includes(e.type))}));}
