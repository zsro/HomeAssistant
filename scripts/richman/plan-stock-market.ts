import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {marketAvailable,priceLimit} from '../../frontend/src/features/richman/game/g6-market';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {writeFileSync} from 'node:fs';
export function planMarket(seed:string,count:number){const e=new GameEngine(nodes,{gameId:'market-route',seed,rulesId:'japan-events-candidate-v42',characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:100000,startDate:'1998-01-09'}),done=new Set<string>();for(let i=0;i<1800;i++){const s=e.state,p=s.pending,id=s.players[s.active].id;let a:Action,actor=id;
 if(s.calendar!.date>='1998-01-13'&&s.phase==='idle'){const replay=e.exportReplay();if(JSON.stringify(replayGame(nodes,replay).state)!==JSON.stringify(s))throw Error('replay');return{replay,state:s,events:e.events,used:[]};}
 if(s.finance!.winnerId)return null;
 if(s.phase==='idle'&&marketAvailable(s)&&s.g6!.stocks.some(k=>!done.has(s.calendar!.date+id+k.id)&&!s.news!.business!.halted[k.id]&&priceLimit(k)!==(s.calendar!.date==='1998-01-09'?'up':'down')&&(s.calendar!.date==='1998-01-09'||s.g6!.holdings[id][k.id].quantity))){const k=s.g6!.stocks.find(k=>!done.has(s.calendar!.date+id+k.id)&&!s.news!.business!.halted[k.id]&&priceLimit(k)!==(s.calendar!.date==='1998-01-09'?'up':'down')&&(s.calendar!.date==='1998-01-09'||s.g6!.holdings[id][k.id].quantity))!;done.add(s.calendar!.date+id+k.id);a={type:'stockTrade',stockId:k.id,side:s.calendar!.date==='1998-01-09'?'buy':'sell',quantity:s.calendar!.date==='1998-01-09'?10:1};}
 else if(s.phase==='idle')a={type:'roll'};
 else if(s.phase==='turnEnd')a={type:'endTurn'};
 else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
 else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:p.choices[0]};
 else if(p?.kind==='property'){actor=p.payerId??id;a={type:'property',decisionId:p.id,accept:p.operation==='rent'};}
 else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
 else if(p?.kind==='lottery')a={type:'leaveLottery',decisionId:p.id};
 else if(p?.kind==='shop')a={type:'leaveShop',decisionId:p.id};
 else if(p?.kind==='facility')a={type:'facility',decisionId:p.id,targetId:null};
 else if(p?.kind==='magic')a={type:'magic',decisionId:p.id,...(p.stage==='choose'?{effect:6}:{})};
 else if(p?.kind==='minigame')a={type:'minigame',decisionId:p.id,input:{kind:p.stage==='ready'?'start':p.stage==='playing'?'tick':'ack'}};
 else if(p?.kind==='news')a={type:'ackNews',decisionId:p.id};
 else if(p?.kind==='fortune')a=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
 else if(p?.kind==='insurance')a={type:'spinInsurance',decisionId:p.id};
 else if(p?.kind==='construction')a={type:'constructCompany',decisionId:p.id,propertyId:null};
 else if(p?.kind==='subscription')a={type:'subscribeCompany',decisionId:p.id,quantity:null};
 else if(p?.kind==='company')a={type:'ackCompany',decisionId:p.id};
 else if(p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:null};}
 else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}
 else if(p?.kind==='debt'){actor=p.payerId??id;a={type:'settleDebt',decisionId:p.id};}
 else throw Error(s.phase);
 const r=e.dispatch({gameId:s.gameId,id:`c${s.revision}`,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r}));
 }return null;}
for(const n of[2,3,4]){const r=planMarket('stock-market-'+n,n);if(!r)throw Error('no route');writeFileSync(`/private/tmp/richman-unified-04a-${n}.json`,JSON.stringify(r));console.log(n,r.state.turn,r.replay.commands.length,r.events.filter(e=>e.type==='stockMarketUpdated').length);}
