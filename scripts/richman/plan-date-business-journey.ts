import {itemSite,REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {g2Options,actionLocked} from '../../frontend/src/features/richman/game/g2';
import {marketAvailable} from '../../frontend/src/features/richman/game/g6-market';
import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {DATE_BUSINESS_RULES} from '../../frontend/src/features/richman/game/date-business';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,targets:number[]){const seen=new Set([node]),q=[[node,0]];for(const[n,d]of q){if(targets.includes(n))return d;for(const a of byId.get(n)!.adjacent)if(!seen.has(a)){seen.add(a);q.push([a,d+1]);}}return 999;}
export function planDateBusiness(seed:string,count:number,funds=30000,limit=4000,stopDate='1999-01-15'){
 const e=new GameEngine(nodes,{gameId:'insurance-plan',seed,rulesId:DATE_BUSINESS_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:funds,startDate:'1998-12-24'});const purchased=new Set<string>();let found=false,remoteValue=1;let subscribed=false;
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,id=s.players[s.active].id;let action:Action,actor=id;
  if(found&&s.phase==='turnEnd'){const replay=e.exportReplay();if(JSON.stringify(replayGame(nodes,replay).state)!==JSON.stringify(s))throw Error('Replay');return{replay,state:s,events:e.events,used:[]};}
  if(s.calendar!.date>'1999-02-16'||s.finance!.winnerId){if(process.env.RICHMAN_DEBUG_COMPANY)fs.writeFileSync('/private/tmp/company-debug.json',JSON.stringify({state:s,events:e.events}));return null;}
  const needBike=false,targets=(s.news!.business!.insurance!.terms[id]&127)<4?[92,93]:[2,19,45,66];
  const cache=new Map<string,number>();
  const score=(node:number)=>needBike&&s.items!.points[id]<80?(itemSite(byId.get(node)!)?.points??0)*10-distance(node,targets):-distance(node,targets)+(targets.includes(node)?100:0);
  const routeScore=(node:number,previous:number,remaining:number):number=>{const key=`${node}:${previous}:${remaining}`;if(cache.has(key))return cache.get(key)!;if(!remaining)return score(node);const adj=g1Adjacent(byId.get(node)!),on=adj.filter(i=>i!==previous);const result=Math.max(...(on.length?on:adj).map(n=>routeScore(n,node,remaining-1)));cache.set(key,result);return result;};
  if(s.phase==='idle'){
   const k=s.g6!.stocks.find(k=>['jp:25'].includes(k.id)&&!purchased.has(id+'/'+k.id));
   const inv=s.effects!.inventory[id],m=s.g2!.players[id];
   if(k&&marketAvailable(s)&&!s.news!.business!.halted[k.id]){action={type:'stockTrade',stockId:k.id,side:'buy',quantity:s.active===0?10:1};purchased.add(id+'/'+k.id);}
   else if(inv['tool:05']>0&&g2Options(s,nodes,'tool:05').length)action={type:'item',action:{type:'begin',definitionId:'tool:05:motorcycle-v1'}};
   else if(m.vehicle!=='foot'&&m.diceCount!==1)action={type:'traffic',diceCount:1};
   else if(inv['tool:08']>0&&!actionLocked(m)&&!m.stop&&!m.turtle&&!s.g4!.hotel[id]){const best=[1,2,3,4,5,6].map(value=>({value,score:routeScore(s.players[s.active].node,s.players[s.active].previous??-1,value)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=100){remoteValue=best.value;action={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else action={type:'roll'};}
   else action={type:'roll'};
  }
  else if(p?.kind==='effect'){action={type:'item',...(s.effects!.pending!.definitionId.startsWith('tool:08')?{value:remoteValue}:{}),action:{type:'confirm',decisionId:p.id,target:{kind:'player',id}}};}
  else if(s.phase==='turnEnd')action={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,s.players[s.active].node,s.remaining-1)-routeScore(a,s.players[s.active].node,s.remaining-1))[0]};
  else if(p?.kind==='lottery'){const n=s.lottery!.tickets.findIndex(x=>x===null)+1;action=n&&s.economy!.balances[id].cash>=1000&&!found?{type:'buyLottery',decisionId:p.id,number:n}:{type:'leaveLottery',decisionId:p.id};}
  else if(p?.kind==='property'){actor=p.payerId??id;action={type:'property',decisionId:p.id,accept:p.operation==='rent'||(p.operation==='buy'&&p.propertyId.startsWith('japan:facility:')&&s.economy!.balances[id].cash>=p.amount)};}
  else if(p?.kind==='bank')action={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='shop')action=s.items!.points[id]>=80&&s.g2!.supply['tool:05']>0&&s.g2!.players[id].vehicle==='foot'&&!s.effects!.inventory[id]['tool:05']?{type:'buyItem',decisionId:p.id,itemId:'tool:05'}:{type:'leaveShop',decisionId:p.id};
  else if(p?.kind==='insurance')action={type:'spinInsurance',decisionId:p.id};
  else if(p?.kind==='construction')action={type:'constructCompany',decisionId:p.id,propertyId:null};
  else if(p?.kind==='subscription')action={type:'subscribeCompany',decisionId:p.id,quantity:subscribed||p.companyId!=='japan:company:4'||s.news!.business!.companies[3].ownerId===id?null:Math.min(100,p.maximum)};
  else if(p?.kind==='company')action={type:'ackCompany',decisionId:p.id};
  else if(p?.kind==='fortune')action=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='news')action={type:'ackNews',decisionId:p.id};
  else if(p?.kind==='auction'){actor=p.responderId;action={type:'auction',decisionId:p.id,increment:null};}
  else if(p?.kind==='reaction'){actor=p.responderId;action={type:'reaction',decisionId:p.id,choice:'decline'};}
  else {if(process.env.RICHMAN_DEBUG_COMPANY)console.log(s.phase);return null;}
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({action,r}));
  for(const ev of r.events){if(ev.type==='companySubscribed')subscribed=true;if(ev.type==='companyDividends'&&ev.settlement.date>=stopDate)found=true;}


 }
 return null;
}

if(process.env.RICHMAN_RUN_DATE_PLAN){for(const [count,seed,funds,stopDate] of [[2,'date-business-2-24',30000,'1999-02-15'],[3,'date-business-3-17',30000,'1999-02-15'],[4,'date-short-4-27',10000,'1999-01-15']] as const){const plan=planDateBusiness(seed,count,funds,4000,stopDate);if(!plan)throw Error('No route '+count);fs.writeFileSync(`/private/tmp/richman-unified-03q-${count}.json`,JSON.stringify(plan,null,2));console.log(JSON.stringify({count,seed,commands:plan.replay.commands.length,max:plan.state.calendar!.business!.priceIndex}));}}
