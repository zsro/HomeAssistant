/** Legal original-map commands only. Planned routes are not browser acceptance. */
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,GODS_GOODS,godsChoice} from '../../frontend/src/features/richman/game/computer-gods';
import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';
import {marketAvailable,priceLimit} from '../../frontend/src/features/richman/game/g6-market';
import {marketBuyLimit} from '../../frontend/src/features/richman/game/stock-market';
import {g3Options} from '../../frontend/src/features/richman/game/g3';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {writeFileSync} from 'node:fs';
export function planComputerGods(count:number,seed:string,required:readonly string[],limit=4000,manual=false,stockMode='all'){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.filter((_,i)=>i>0);
 const e=new GameEngine(nodes,{gameId:'gods-plan',seed,characterIds:ids,rulesId:'japan-events-candidate-v44',initialFunds:100000,startDate:'1998-01-01'}),used=new Set<string>();let end=0,cancelled=false;const cross:{index:number;kind:string;computer:boolean}[]=[];
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,actor=decisionPlayer(s),ai=computerIds.includes(s.players.find(p=>p.id===actor)!.characterId);
  if(required.every(x=>used.has(x))&&(!manual||cancelled)&&!end)end=s.turn;
  if(end&&s.turn>end&&s.phase==='idle'&&!ai)return{replay:{...e.exportReplay(),control:{version:1 as const,policy:'gods-v1' as const,computerIds}},state:s,events:e.events,used:[...used],cancelled,cross};
  if(s.phase==='finished')break;
  const cancelGood=!ai&&!cancelled&&s.phase==='idle'&&!actionLocked(s.g2!.players[actor])&&!s.g4!.hotel[actor]?GODS_GOODS.find(g=>s.effects!.inventory[actor][g.id]>0&&godsChoice(s,nodes,g.id)):undefined;
  const purchase=manual&&!ai&&!cancelled&&p?.kind==='shop'?GODS_GOODS.find(g=>['card:22','card:23','card:24','card:25'].includes(g.id)&&!s.effects!.inventory[actor][g.id]&&s.items!.points[actor]>=shopPrice(g.id)&&shopSupply(s,g.id)>0&&p.shelf?.cards.some(x=>x.itemId===g.id&&x.available)):undefined;
  const stock=!ai&&marketAvailable(s)?s.g6!.stocks.find(k=>(stockMode==='all'||k.id==='jp:24')&&!s.news?.business?.halted[k.id]&&priceLimit(k)!=='up'&&s.g6!.holdings[actor][k.id].quantity<100&&marketBuyLimit(s.economy!.balances[actor].bank,k.price,k.pool,k.quota)>=100):undefined;
  const support=required.includes('card:24'),friend=!ai&&support&&!s.g3!.allies[actor]?g3Options(s,nodes,'card:29').find(o=>!s.g3!.allies[o.id]):undefined;
  const alliance=!ai&&support&&p?.kind==='shop'&&!s.effects!.inventory[actor]['card:29']&&s.g3!.slots[actor].length<15&&s.items!.points[actor]>=shopPrice('card:29')&&shopSupply(s,'card:29')>0&&p.shelf?.cards.some(x=>x.itemId==='card:29'&&x.available);
  const d=!ai&&support&&p?.kind==='branch'?{playerId:actor,action:{type:'choose' as const,decisionId:p.id,node:p.choices[(Math.floor(s.turn/count)+1)%p.choices.length]}}:alliance?{playerId:actor,action:{type:'buyItem' as const,decisionId:p!.id,itemId:'card:29'}}:!ai&&support&&p?.kind==='effect'&&s.effects!.pending?.definitionId.startsWith('card:29')&&friend?{playerId:actor,action:{type:'item' as const,action:{type:'confirm' as const,decisionId:p.id,target:{kind:'player' as const,id:friend.id}}}}:!ai&&support&&s.phase==='idle'&&!p&&friend&&s.effects!.inventory[actor]['card:29']>0?{playerId:actor,action:{type:'item' as const,action:{type:'begin' as const,definitionId:'card:29:ally-v1'}}}:stock?{playerId:actor,action:{type:'stockTrade' as const,stockId:stock.id,side:'buy' as const,quantity:100}}:purchase?{playerId:actor,action:{type:'buyItem' as const,decisionId:p!.id,itemId:purchase.id}}:cancelGood?{playerId:actor,action:{type:'item' as const,action:{type:'begin' as const,definitionId:cancelGood.effect}}}:ai?decideComputer(s,nodes,'gods-v1'):computerDecision(s),action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);
  if(!action)throw Error('No action '+s.phase);
  if(p?.kind==='auction')cross.push({index:i,kind:'auction',computer:ai});
  const r=e.dispatch({id:'gods-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({i,action,r}));
  if(!ai&&action.type==='item'&&action.action.type==='cancel')cancelled=true;
  for(const ev of r.events)if(ev.type==='hazardChanged'){if(ev.reason==='携带炸弹')used.add('bomb-carried');if(ev.reason==='移动倒数')used.add('bomb-moved');if(ev.reason==='相遇转交，不重置倒数')used.add('bomb-transferred');if(ev.reason==='踩中地雷')used.add('mine-hit');if(ev.reason==='倒数归零')used.add('bomb-exploded');}
  if(r.events.some(ev=>ev.type==='auctionSettled'&&ev.winnerId&&ev.sourceId!=='public'))used.add('winning-auction');
  if(ai&&action.type==='item'&&action.action.type==='confirm'&&s.effects?.pending){const item=s.effects.pending.definitionId.slice(0,7);if(GODS_GOODS.some(g=>g.id===item))used.add(item);}
 }
 return{used:[...used],cancelled,cross,state:e.state,events:e.events};
}
if(process.env.RICHMAN_PLAN_GODS){const n=Number(process.env.RICHMAN_PLAYERS??2),required=(process.env.RICHMAN_REQUIRE??'card:22,card:23').split(',');for(let i=Number(process.env.RICHMAN_SEED_START??0);i<30;i++){const seed=`gods-${n}-${i}`,p=planComputerGods(n,seed,required,Number(process.env.RICHMAN_LIMIT??3500),!!process.env.RICHMAN_MANUAL,process.env.RICHMAN_STOCK_MODE);console.log(n,i,p.used,p.replay?.commands.length);if(p.replay){writeFileSync('/private/tmp/computer-gods-'+(process.env.RICHMAN_MANUAL?'manual':n)+'.json',JSON.stringify(p));break;}}}
