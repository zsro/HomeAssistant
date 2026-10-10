import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import {cardPrices} from '../../frontend/src/features/richman/game/g3';
import {TOOL_SELL_PRICES} from '../../frontend/src/features/richman/game/fortune-catalog';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {SHOP_ACQUISITION_RULES as MAGIC_RULES} from '../../frontend/src/features/richman/game/shop-acquisition';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(node:number,targets:number[]){const seen=new Set([node]),q=[[node,0]];for(const[n,d]of q){if(targets.includes(n))return d;for(const a of byId.get(n)!.adjacent)if(!seen.has(a)){seen.add(a);q.push([a,d+1]);}}return 999;}
export function planShopAcquisition(seed:string,count=4,limit=2000,goal:string='card'){
 const e=new GameEngine(nodes,{gameId:'shop-acquisition-plan',seed,rulesId:MAGIC_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:100000,startDate:'1998-01-14'});if(e.state.items!.fingerprint!=='72a3a480')throw Error('Noncanonical v40 fingerprint; load engine before helper modules');const done=new Set<string>();let remoteValue=1,after=0;
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,id=s.players[s.active].id;let action:Action,actor=id;
  if(done.has(goal)&&done.has('selltool')&&done.has('sellcard')&&done.has('buytool')&&done.has('buycard')&&done.has('dividend')&&++after>8&&s.phase==='idle'){const replay=e.exportReplay();if(JSON.stringify(replayGame(nodes,replay).state)!==JSON.stringify(s))throw Error('Replay');return{replay,state:s,events:e.events,used:[]};}
  if(s.finance!.winnerId)return null;
  const targets=[50,107],cache=new Map<string,number>();
  const score=(node:number)=>-distance(node,targets)+(targets.includes(node)?100:0);
  const routeScore=(node:number,previous:number,remaining:number):number=>{const key=`${node}:${previous}:${remaining}`;if(cache.has(key))return cache.get(key)!;if(!remaining)return score(node);const adj=g1Adjacent(byId.get(node)!),on=adj.filter(i=>i!==previous);const result=Math.max(...(on.length?on:adj).map(n=>routeScore(n,node,remaining-1)));cache.set(key,result);return result;};
  if(s.phase==='idle'&&id==='player-1'&&!s.g6!.holdings[id]['jp:26'].quantity)action={type:'stockTrade',stockId:'jp:26',side:'buy',quantity:1};
  else if(s.phase==='idle'){
   const inv=s.effects!.inventory[id],m=s.g2!.players[id];
   if(inv['tool:08']>0&&!actionLocked(m)&&!m.stop&&!m.turtle&&!s.g4!.hotel[id]){const best=[1,2,3,4,5,6].map(value=>({value,score:routeScore(s.players[s.active].node,s.players[s.active].previous??-1,value)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=100){remoteValue=best.value;action={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else action={type:'roll'};}
   else action={type:'roll'};
  }else if(p?.kind==='magic'){
   if(p.stage==='choose'){
    action={type:'magic',decisionId:p.id,effect:6};
   }else if(p.stage==='build'){actor=p.responderId!;action={type:'magicBuild',decisionId:p.id,buildingType:4};}else action={type:'magic',decisionId:p.id};
  }else if(p?.kind==='effect')action={type:'item',value:remoteValue,action:{type:'confirm',decisionId:p.id,target:{kind:'player',id}}};
  else if(s.phase==='turnEnd')action={type:'endTurn'};
  else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
  else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,s.players[s.active].node,s.remaining-1)-routeScore(a,s.players[s.active].node,s.remaining-1))[0]};
  else if(p?.kind==='property'){actor=p.payerId??id;const accept=p.operation==='rent'||s.economy!.balances[actor].cash>=p.amount;action={type:'property',decisionId:p.id,accept,...(accept&&p.buildingChoices?{buildingType:4}:{})};}
  else if(p?.kind==='bank')action={type:'leaveBank',decisionId:p.id};
  else if(p?.kind==='lottery')action={type:'leaveLottery',decisionId:p.id};
  else if(p?.kind==='debt'){actor=p.payerId??id;action={type:'settleDebt',decisionId:p.id};}
  else if(p?.kind==='facility')action={type:'facility',decisionId:p.id,targetId:s.items!.points[id]>=30?p.targets[0]??null:null};
  else if(p?.kind==='shop'){
   const bag=s.effects!.inventory[id],shelf=p.shelf!,available=[...shelf.cards,...shelf.tools].filter(x=>x.available).map(x=>x.itemId),price=(item:string)=>item.startsWith('card:')?cardPrices[item]:TOOL_SELL_PRICES[Number(item.slice(5))];
   const card=Object.keys(bag).find(k=>k.startsWith('card:')&&bag[k]>0),buyCard=available.find(k=>k.startsWith('card:')&&price(k)<=s.items!.points[id]&&s.g3!.slots[id].length<15),buyTool=available.find(k=>k.startsWith('tool:')&&price(k)<=s.items!.points[id]&&(bag[k]??0)<9);
   if(!done.has('selltool')&&bag['tool:09'])action={type:'sellItem',decisionId:p.id,itemId:'tool:09'};
   else if(!done.has('buycard')&&buyCard)action={type:'buyItem',decisionId:p.id,itemId:buyCard};
   else if(!done.has('sellcard')&&card)action={type:'sellItem',decisionId:p.id,itemId:card};
   else if(!done.has('buytool')&&buyTool)action={type:'buyItem',decisionId:p.id,itemId:buyTool};
   else if(!bag['tool:08']&&s.items!.points[id]>=30&&available.includes('tool:08'))action={type:'buyItem',decisionId:p.id,itemId:'tool:08'};
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
  for(const ev of r.events){if(ev.type==='shopGift'&&ev.receipt.received)done.add(ev.receipt.kind);if(ev.type==='itemSold')done.add(ev.receipt.itemId.startsWith('card:')?'sellcard':'selltool');if(ev.type==='itemBought')done.add(ev.itemId.startsWith('card:')?'buycard':'buytool');if(ev.type==='companyDividends'&&s.news!.business!.companies[0].funds>0)done.add('dividend');}

 }
 return null;
}
