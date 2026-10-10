import {marketAvailable} from '../../frontend/src/features/richman/game/g6-market';
import fs from 'node:fs';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {DIVIDEND_RULES} from '../../frontend/src/features/richman/game/dividends';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
export function planDividends(seed:string,count:number,goal:'positive'|'negative'|'carry',limit=1100){
 const e=new GameEngine(nodes,{gameId:'dividend-plan',seed,rulesId:DIVIDEND_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:300000,startDate:'1998-01-07'});const purchased=new Set<string>();let found=false;
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,id=s.players[s.active].id;let action:Action,actor=id;
  if(found&&s.phase==='turnEnd'){const replay=e.exportReplay();if(JSON.stringify(replayGame(nodes,replay).state)!==JSON.stringify(s))throw Error('Replay');return{replay,state:s,events:e.events,used:[]};}
  if(s.calendar!.date>'1998-01-17')return null;
  if(s.phase==='idle'){
   const k=s.g6!.stocks.find(k=>s.news!.business!.companies.some(c=>c.stockId===k.id)&&!purchased.has(id+'/'+k.id)&&(goal!=='carry'||k.id!=='jp:26'));
   if(k&&marketAvailable(s)&&!s.news!.business!.halted[k.id]){action={type:'stockTrade',stockId:k.id,side:'buy',quantity:s.active+1};purchased.add(id+'/'+k.id);}else action={type:'roll'};
  }
  else if(s.phase==='turnEnd')action={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:p.choices[0]};
  else if(p?.kind==='lottery'){const n=s.lottery!.tickets.findIndex(x=>x===null)+1;action=n&&s.economy!.balances[id].cash>=1000&&!found?{type:'buyLottery',decisionId:p.id,number:n}:{type:'leaveLottery',decisionId:p.id};}
  else if(p?.kind==='property'){actor=p.payerId??id;action={type:'property',decisionId:p.id,accept:p.operation==='rent'};}
  else if(p?.kind==='bank')action={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='shop')action={type:'leaveShop',decisionId:p.id};
  else if(p?.kind==='fortune')action=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='news')action={type:'ackNews',decisionId:p.id};
  else if(p?.kind==='auction'){actor=p.responderId;action={type:'auction',decisionId:p.id,increment:null};}
  else if(p?.kind==='reaction'){actor=p.responderId;action={type:'reaction',decisionId:p.id,choice:'decline'};}
  else return null;
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({action,r}));
  for(const ev of r.events)if(ev.type==='companyDividends'&&(goal==='positive'?ev.settlement.payments.some(p=>p.amount>0):goal==='negative'?ev.settlement.payments.some(p=>p.amount<0):ev.settlement.companies.some(c=>!c.shares&&c.funds!==0)))found=true;
 }
 return null;
}
if(process.env.RICHMAN_RUN_DIVIDEND_PLAN){for(const[count,goal]of [[2,'positive'],[3,'negative'],[4,'carry']] as const){let plan;for(let seed=0;seed<400&&!plan;seed++){const p=planDividends('dividend-'+count+'-'+seed,count,goal);if(p)plan=p;}if(!plan)throw Error('No route '+count);fs.writeFileSync(`/private/tmp/richman-unified-03m-${count}.json`,JSON.stringify(plan,null,2));console.log(JSON.stringify({count,seed:plan.replay.config.seed,commands:plan.replay.commands.length,turn:plan.state.turn,dividend:plan.state.news!.business!.dividends,fingerprint:plan.replay.itemFingerprint}));}}
