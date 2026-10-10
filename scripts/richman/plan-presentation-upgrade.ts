/** Search only legal original-map commands for an ordinary paid land 4->5 upgrade. */
import {GameEngine,type Action} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {writeFileSync} from 'node:fs';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const defs=PROPERTY_CATALOG.properties,lands=defs.filter(d=>d.kind==='land'),byId=new Map(nodes.map(n=>[n.id,n]));
const distances=new Map<number,Map<number,number>>();for(const n of nodes){const d=new Map([[n.id,0]]),q=[n.id];for(let i=0;i<q.length;i++)for(const next of byId.get(q[i])!.adjacent)if(!d.has(next)){d.set(next,d.get(q[i])!+1);q.push(next)}distances.set(n.id,d)}
function plan(seed:string,characters:string[],limit=12000){
 const e=new GameEngine(nodes,{gameId:'paid-upgrade',seed,rulesId:'japan-events-candidate-v47',characterIds:characters,humanIds:characters.map((_,i)=>`player-${i+1}`),initialFunds:300000,startDate:'1998-01-01'});
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,bal=s.economy!.balances[id];let a:Action|undefined,actor=id;
  const owned=s.economy!.properties.filter(q=>q.ownerId===id&&lands.some(d=>d.id===q.id)).sort((a,b)=>b.level-a.level);
  const goals=owned.length?lands.filter(d=>d.id===owned[0].id).flatMap(d=>d.nodeIds):lands.filter(d=>s.economy!.properties.find(q=>q.id===d.id)?.ownerId===null).flatMap(d=>d.nodeIds);
  const score=(n:number)=>Math.min(...goals.map(t=>distances.get(n)!.get(t)??999));
  if(s.phase==='idle')a={type:'roll'};
  else if(s.phase==='turnEnd')a={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')a={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((x,y)=>score(x)-score(y))[0]};
  else if(p?.kind==='property'){
   actor=p.payerId??id;
   const def=defs.find(d=>d.id===p.propertyId)!;
   a={type:'property',decisionId:p.id,accept:p.operation==='rent'||def.kind==='land'&&bal.cash>=p.amount};
  }
  else if(p?.kind==='shop')a={type:'leaveShop',decisionId:p.id};
  else if(p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='lottery')a={type:'leaveLottery',decisionId:p.id};
  else if(p?.kind==='facility')a={type:'facility',decisionId:p.id,targetId:null};
  else if(p?.kind==='magic')a={type:'magic',decisionId:p.id,...(p.stage==='choose'?{effect:6}:{})};
  else if(p?.kind==='minigame')a={type:'minigame',decisionId:p.id,input:{kind:p.stage==='ready'?'start':p.stage==='playing'?'tick':'ack'}};
  else if(p?.kind==='news')a={type:'ackNews',decisionId:p.id};
  else if(p?.kind==='fortune')a=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='insurance')a={type:'spinInsurance',decisionId:p.id};
  else if(p?.kind==='construction')a={type:'constructCompany',decisionId:p.id,propertyId:null};
  else if(p?.kind==='subscription')a={type:'subscribeCompany',decisionId:p.id,quantity:null};
  else if(p?.kind==='company')a={type:'ackCompany',decisionId:p.id};
  else if(p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:null}}
  else if(p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'}}
  else if(p?.kind==='debt'){actor=p.payerId??id;a={type:'settleDebt',decisionId:p.id}}
  else if(p?.kind==='effect')a={type:'item',action:{type:'cancel'}};
  if(!a)throw Error(JSON.stringify({seed,i,phase:s.phase,pending:p}));
  const before=s,r=e.dispatch({gameId:s.gameId,id:`u${i}`,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({seed,i,a,r}));
  for(const ev of r.events)if(ev.type==='propertySettled'&&ev.operation==='upgrade'){
   const old=before.economy!.properties.find(q=>q.id===ev.propertyId),now=e.state.economy!.properties.find(q=>q.id===ev.propertyId);
   if(old?.level===4&&now?.level===5&&ev.playerId===(process.env.RICHMAN_UPGRADE_TARGET??'player-1')&&lands.some(d=>d.id===ev.propertyId))return {replay:e.exportReplay(),index:i+1,event:ev,characters,seed};
  }
  if(s.finance?.winnerId||s.phase==='finished')return null;
 }
 return null;
}
const characters=(process.env.RICHMAN_UPGRADE_CHARACTERS??'xiaomei,tuu').split(',');
const label=process.env.RICHMAN_UPGRADE_LABEL??characters[Number((process.env.RICHMAN_UPGRADE_TARGET??'player-1').split('-')[1])-1];
let best:ReturnType<typeof plan>=null;
for(let i=Number(process.env.RICHMAN_SEED_START??0);i<Number(process.env.RICHMAN_SEED_END??12);i++){
 const seed=`paid-upgrade-${i}`;try{const result=plan(seed,characters,Number(process.env.RICHMAN_UPGRADE_LIMIT??12000));console.log(seed,result?.index??'none');if(result&&(!best||result.index<best.index)){best=result;writeFileSync(`/private/tmp/presentation-paid-upgrade-${label}.json`,JSON.stringify(result))}}catch(e){console.log(seed,'error',String(e))}
}
console.log('best',best?.seed,best?.index);
