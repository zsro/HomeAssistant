/** Manual seat builds a computer-owned lab through legal Nissan services. No state writes. */
import {GameEngine} from '../../frontend/src/features/richman/game/engine';import type {Action} from '../../frontend/src/features/richman/game/engine';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-mobility';import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';import {actionLocked} from '../../frontend/src/features/richman/game/g2';import {marketAvailable,priceLimit} from '../../frontend/src/features/richman/game/g6-market';import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';import {writeFileSync} from 'node:fs';
const defs=PROPERTY_CATALOG.properties,byId=new Map(nodes.map(n=>[n.id,n])),distances=new Map<number,Map<number,number>>();for(const n of nodes){const d=new Map([[n.id,0]]),q=[n.id];for(let i=0;i<q.length;i++)for(const next of byId.get(q[i])!.adjacent)if(!d.has(next)){d.set(next,d.get(q[i])!+1);q.push(next);}distances.set(n.id,d);}
export function planEngineer(seed:string,count=2,limit=6000){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),computerIds=ids.slice(1),e=new GameEngine(nodes,{gameId:'mobility-engineer',seed,characterIds:ids,rulesId:'japan-events-candidate-v44',initialFunds:300000,startDate:'1998-01-01'});let remote=1,used=false,expired=false,hit=false;const progress:unknown[]=[];
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,actor=decisionPlayer(s),ai=actor!=='player-1',id=s.players[s.active].id,who=s.players[s.active],m=s.g2!.players[id],bag=s.effects!.inventory[id];let a:Action|undefined;
  if(used&&expired&&hit&&s.phase==='idle'&&!ai)return{replay:{...e.exportReplay(),control:{version:1 as const,policy:'mobility-v1' as const,computerIds}},state:s,events:e.events,used:['tool:12'],progress};
  if(s.phase==='finished')break;
  if(ai)a=decideComputer(s,nodes,'mobility-v1')?.action;
  else{
   const company=s.news!.business!.companies.find(c=>c.id==='japan:company:3')!,stock=s.g6!.stocks.find(k=>k.id===company.stockId)!;
   const target=s.economy!.properties.filter(q=>q.ownerId!=='player-1'&&defs.find(d=>d.id===q.id)!.kind==='facility'&&(!q.level||q.buildingType===4)&&q.level<4).sort((a,b)=>b.level-a.level)[0];
   const ready=s.economy!.properties.some(q=>q.ownerId&&q.ownerId!=='player-1'&&q.buildingType===4&&q.level>=4);
   const destinations=target&&!ready?[...company.nodeIds]:[50,107];
   // Nissan's fixed company node comes from current map, not an inferred label.
   const companyNode=company.nodeIds;if(target&&companyNode.length)destinations.splice(0,destinations.length,...companyNode);
   const score=(n:number)=>200-12*Math.min(...destinations.map(to=>distances.get(n)!.get(to)??999)),cache=new Map<string,number>();
   function route(n:number,prev:number|null,left:number):number{const key=n+'/'+prev+'/'+left;if(cache.has(key))return cache.get(key)!;if(!left||s.roadTools!.blocks.includes(n))return score(n);const all=g1Adjacent(byId.get(n)!),forward=all.filter(n=>n!==prev);const value=Math.max(...(forward.length?forward:all).map(to=>route(to,n,left-1)));cache.set(key,value);return value;}
   if(s.phase==='idle'&&!actionLocked(m)&&!s.g4!.hotel[id]){
    if(company.ownerId!==id&&marketAvailable(s)&&!s.news!.business!.halted[stock.id]&&priceLimit(stock)!=='up'&&stock.quota>0&&s.economy!.balances[id].bank>=stock.price/100)a={type:'stockTrade',stockId:stock.id,side:'buy',quantity:Math.min(100,stock.quota)};
    else if(bag['tool:08']&&!m.stop&&!m.turtle){const best=[1,2,3,4,5,6].map(v=>({v,score:route(who.node,who.previous,v)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=180){remote=best.v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}}
   }
   if(!a&&p?.kind==='effect')a={type:'item',value:remote,action:{type:'confirm',decisionId:p.id,target:{kind:'player',id}}};
   if(!a&&p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,who.node,s.remaining-1)-route(a,who.node,s.remaining-1))[0]};
   if(!a&&p?.kind==='construction'&&target)a={type:'constructCompany',decisionId:p.id,propertyId:target.id,...(p.options.find(o=>o.id===target.id)?.buildingTypes?{buildingType:4}:{})};
   if(!a&&p?.kind==='property'){const accept=p.operation==='rent'||defs.find(d=>d.id===p.propertyId)!.kind==='land'&&s.economy!.balances[id].cash-p.amount>=1000;a={type:'property',decisionId:p.id,accept,...(accept&&p.buildingChoices?{buildingType:0}:{})};}
   if(!a&&p?.kind==='shop'){const item=['tool:08'].find(item=>!bag[item]&&s.items!.points[id]>=shopPrice(item)&&shopSupply(s,item)>0&&p.shelf!.tools.some(x=>x.itemId===item&&x.available));if(item)a={type:'buyItem',decisionId:p.id,itemId:item};}
   a??=computerDecision(s)?.action;
  }
  a??=(p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone',token:p.id}:undefined;if(!a)throw Error('Missing '+s.phase);
  const r=e.dispatch({id:'engineer-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({a,r,i}));
  if(a.type==='research'||a.type==='constructCompany')progress.push({i,turn:s.turn,a});
  if(ai&&a.type==='item'&&a.action.type==='confirm'&&s.effects?.pending?.definitionId==='tool:12:engineer-v1'){used=true;progress.push({i,turn:s.turn,engineer:true});}
  for(const ev of r.events){if(ev.type==='g5Notice'&&ev.message.includes('工程车到期'))expired=true;if(ev.type==='g4PropertyChanged'&&ev.reason==='工程车落点拆除')hit=true;}
 }
 return{used,expired,hit,progress,state:e.state};
}
if(process.env.RICHMAN_ENGINEER_SEARCH)for(let i=Number(process.env.RICHMAN_SEED_START??0);i<20;i++){const p=planEngineer('mobility-engineer-'+i,Number(process.env.RICHMAN_PLAYERS??2),Number(process.env.RICHMAN_LIMIT??6000));console.log(i,p.replay?.commands.length,p.used,p.expired,p.hit,p.progress,p.state.turn);if(p.replay){writeFileSync('/private/tmp/computer-mobility-engineer.json',JSON.stringify(p));break;}}
