import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {MINIGAME_RULES as MAGIC_RULES} from '../../frontend/src/features/richman/game/minigames';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {G2_GOODS,g2Options,actionLocked} from '../../frontend/src/features/richman/game/g2';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,targets:number[]){const seen=new Set([node]),q=[[node,0]];for(const[n,d]of q){if(targets.includes(n))return d;for(const a of byId.get(n)!.adjacent)if(!seen.has(a)){seen.add(a);q.push([a,d+1]);}}return 999;}
export function planDreamCircuit(seed:string,count=4,limit=2000){
 const e=new GameEngine(nodes,{gameId:'site-circuit-plan',seed,rulesId:MAGIC_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:100000,startDate:'1998-01-01'});const done=new Set<string>();let remoteValue=1,dreamTarget='';
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,id=s.players[s.active].id;let action:Action,actor=id;
  const complete=done.has('dream-skip')&&done.has('dream-used')&&s.players.every(p=>!s.g2!.players[p.id].dream);
  if(complete&&s.phase==='idle'){const replay=e.exportReplay();if(JSON.stringify(replayGame(nodes,replay).state)!==JSON.stringify(s))throw Error('Replay');return{replay,state:s,events:e.events,used:[]};}
  if(s.finance!.winnerId)return null;
  const targets=!done.has('dream-bought')?[50,107]:[22,24,26],cache=new Map<string,number>();
  const score=(node:number)=>-distance(node,targets)+(targets.includes(node)?100:0);
  const routeScore=(node:number,previous:number,remaining:number):number=>{const key=`${node}:${previous}:${remaining}`;if(cache.has(key))return cache.get(key)!;if(!remaining)return score(node);const adj=g1Adjacent(byId.get(node)!),on=adj.filter(i=>i!==previous);const result=Math.max(...(on.length?on:adj).map(n=>routeScore(n,node,remaining-1)));cache.set(key,result);return result;};
  if(s.phase==='idle'){
   const inv=s.effects!.inventory[id],m=s.g2!.players[id];
   const dream=inv['card:16']&&!done.has('dream-used')?g2Options(s,nodes,'card:16').find(o=>distance(s.players.find(p=>p.id===o.target.id)!.node,[22,24,26])<8):null;
   if(dream){dreamTarget=dream.target.id;action={type:'item',action:{type:'begin',definitionId:G2_GOODS.find(g=>g.id==='card:16')!.effect}};}
   else if(inv['tool:08']>0&&!actionLocked(m)&&!m.stop&&!m.turtle&&!s.g4!.hotel[id]){const best=[1,2,3,4,5,6].map(value=>({value,score:routeScore(s.players[s.active].node,s.players[s.active].previous??-1,value)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=100){remoteValue=best.value;action={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else action={type:'roll'};}
   else action={type:'roll'};
  }else if(p?.kind==='magic'){
   if(p.stage==='choose'){
    action={type:'magic',decisionId:p.id,effect:6};
   }else if(p.stage==='build'){actor=p.responderId!;action={type:'magicBuild',decisionId:p.id,buildingType:4};}else action={type:'magic',decisionId:p.id};
  }else if(p?.kind==='minigame')action={type:'minigame',decisionId:p.id,input:{kind:p.stage==='ready'?'start':p.stage==='playing'?'tick':'ack'}};
  else if(p?.kind==='effect')action=dreamTarget&&!done.has('dream-used')?{type:'item',action:{type:'confirm',decisionId:p.id,target:{kind:'player',id:dreamTarget}}}:{type:'item',value:remoteValue,action:{type:'confirm',decisionId:p.id,target:{kind:'player',id}}};
  else if(s.phase==='turnEnd')action={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,s.players[s.active].node,s.remaining-1)-routeScore(a,s.players[s.active].node,s.remaining-1))[0]};
  else if(p?.kind==='property'){actor=p.payerId??id;const accept=p.operation==='rent'||s.economy!.balances[actor].cash>=p.amount;action={type:'property',decisionId:p.id,accept,...(accept&&p.buildingChoices?{buildingType:4}:{})};}
  else if(p?.kind==='bank')action={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='lottery')action=!done.has('lottery')&&s.lottery!.tickets.includes(null)?{type:'buyLottery',decisionId:p.id,number:s.lottery!.tickets.indexOf(null)+1}:{type:'leaveLottery',decisionId:p.id};
  else if(p?.kind==='debt'){actor=p.payerId??id;action={type:'settleDebt',decisionId:p.id};}
  else if(p?.kind==='facility')action={type:'facility',decisionId:p.id,targetId:s.items!.points[id]>=30?p.targets[0]??null:null};
  else if(p?.kind==='shop'){
   const bag=s.effects!.inventory[id],shelf=p.shelf!,available=[...shelf.cards,...shelf.tools].filter(x=>x.available).map(x=>x.itemId);
   if(!done.has('dream-bought')&&!available.includes('card:16'))return null;
   if(!done.has('selltool')&&bag['tool:09'])action={type:'sellItem',decisionId:p.id,itemId:'tool:09'};
   else if(!done.has('dream-bought')&&s.items!.points[id]>=25)action={type:'buyItem',decisionId:p.id,itemId:'card:16'};
   else action={type:'leaveShop',decisionId:p.id};
  }
  else if(p?.kind==='insurance')action={type:'spinInsurance',decisionId:p.id};
  else if(p?.kind==='construction')action={type:'constructCompany',decisionId:p.id,propertyId:null};
  else if(p?.kind==='subscription')action={type:'subscribeCompany',decisionId:p.id,quantity:null};
  else if(p?.kind==='company')action={type:'ackCompany',decisionId:p.id};
  else if(p?.kind==='fortune')action=p.collection?{type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]}:{type:'ackFortune',decisionId:p.id};
  else if(p?.kind==='news')action={type:'ackNews',decisionId:p.id};
  else if(p?.kind==='auction'){actor=p.responderId;action={type:'auction',decisionId:p.id,increment:p.magicBatchId&&!p.leader?100:null};}
  else if(p?.kind==='reaction'){actor=p.responderId;action={type:'reaction',decisionId:p.id,choice:'decline'};}
  else throw Error(s.phase);
  const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({action,r}));
  for(const ev of r.events){if(ev.type==='itemBought'&&ev.itemId==='card:16')done.add('dream-bought');if(ev.type==='effectConsumed'&&ev.itemId==='card:16')done.add('dream-used');if(ev.type==='landed'&&s.g2!.players[id].dream&&[22,24,26,50,107,35,73,55,78].includes(ev.node))done.add('dream-skip');if(ev.type==='minigameFinished'&&done.has('dream-skip'))done.add('after-dream-mini');if(ev.type==='minigameFinished')done.add('mini'+ev.node);if(ev.type==='shopTurnover'&&ev.receipt.turnover>0)done.add('shop');if(ev.type==='magicResolved')done.add('magic');if(ev.type==='magicNestedCompleted')done.add('nested');if(ev.type==='lotteryBought')done.add('lottery');if(ev.type==='facilityHelped')done.add('help');if(ev.type==='shopGift'&&ev.receipt.received)done.add(ev.receipt.kind);if(ev.type==='itemSold')done.add(ev.receipt.itemId.startsWith('card:')?'sellcard':'selltool');if(ev.type==='itemBought')done.add(ev.itemId.startsWith('card:')?'buycard':'buytool');if(ev.type==='companyDividends'&&ev.settlement.payments.some(p=>p.amount>0))done.add('dividend');}

 }
 return null;
}
