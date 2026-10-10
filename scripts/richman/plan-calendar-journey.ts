import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {CALENDAR_RULES} from '../../frontend/src/features/richman/game/calendar';
import {marketAvailable} from '../../frontend/src/features/richman/game/g6-market';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
export function planCalendar(seed:string,count:number,startDate:string,goal:'loan'|'month',limit=5000){
 const e=new GameEngine(nodes,{gameId:'calendar-plan',seed,rulesId:CALENDAR_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:300000,startDate});let borrower='',traded=false,month=false,collected=false;
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,id=s.players[s.active].id;let action:Action,actor=id;
  if(s.phase==='turnEnd'&&traded&&month&&(goal==='month'?s.calendar!.elapsedDays>=5:collected)){const replay=e.exportReplay();if(JSON.stringify(replayGame(nodes,replay).state)!==JSON.stringify(s))throw Error('Replay mismatch');return {replay,state:s,events:e.events,used:[],borrower};}
  if(s.phase==='idle'){const stock=s.g6!.stocks.find(k=>k.pool>0&&k.quota>0);action=!traded&&stock&&marketAvailable(s)?{type:'stockTrade',stockId:stock.id,side:'buy',quantity:1}:{type:'roll'};}
  else if(s.phase==='turnEnd')action={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:p.choices[0]};
  else if(p?.kind==='property'){actor=p.payerId??id;action={type:'property',decisionId:p.id,accept:p.operation==='rent'};}
  else if(p?.kind==='bank'){action=goal==='loan'&&!borrower&&!s.news!.business!.noLoans[id]&&!s.news!.business!.bankRejected![id]?{type:'loan',decisionId:p.id,operation:'borrow',amount:10000}:{type:'leaveBank',decisionId:p.id};}
  else if(p?.kind==='shop')action={type:'leaveShop',decisionId:p.id};
  else if(p?.kind==='fortune')action=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='news')action={type:'ackNews',decisionId:p.id};
  else if(p?.kind==='auction'){actor=p.responderId;action={type:'auction',decisionId:p.id,increment:null};}
  else if(p?.kind==='reaction'){actor=p.responderId;action={type:'reaction',decisionId:p.id,choice:'decline'};}
  else return null;
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({action,result:r}));
  if(action.type==='loan')borrower=id;if(action.type==='stockTrade')traded=true;
  if(r.events.some(e=>e.type==='monthlyInterest'))month=true;
  if(r.events.some(e=>e.type==='loanNotice'&&e.notice.kind==='collected'&&e.notice.playerId===borrower))collected=true;
 }
 return null;
}
if(process.env.RICHMAN_RUN_CALENDAR_PLAN){for(const [name,count,start,goal] of [['loan',2,'1998-01-28','loan'],['year',3,'1998-12-31','month'],['leap',4,'2000-02-28','month']] as const){const plan=planCalendar('calendar-'+name+'-0',count,start,goal);if(!plan)throw Error('No route '+name);fs.writeFileSync('/private/tmp/richman-unified-03k-'+name+'.json',JSON.stringify(plan,null,2));console.log(JSON.stringify({name,count,commands:plan.replay.commands.length,turn:plan.state.turn,date:plan.state.calendar!.date,fingerprint:plan.replay.itemFingerprint,notices:plan.state.calendar!.notices}));}}
