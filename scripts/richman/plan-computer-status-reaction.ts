/** Original-map legal command route. Human route planning is separate from the computer policy. */
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import type {Action} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-status';
import {g2Options,actionLocked,G2_GOODS} from '../../frontend/src/features/richman/game/g2';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {REMOTE_EFFECT,itemSite} from '../../frontend/src/features/richman/game/items';
import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import {writeFileSync} from 'node:fs';
const byId=new Map(nodes.map(n=>[n.id,n]));
function distance(start:number,targets:number[]){const seen=new Set([start]),q=[[start,0]];for(const[n,d]of q){if(targets.includes(n))return d;for(const a of byId.get(n)!.adjacent)if(!seen.has(a)){seen.add(a);q.push([a,d+1]);}}return 999;}
export function planComputerStatusReaction(count:number,seed:string,item:'card:16'|'card:17',limit=4000){
 const ids=['xiaomei','tuu','chyan','salonbus'].slice(0,count),aiId='player-'+count,computerIds=[ids[count-1]];
 const e=new GameEngine(nodes,{gameId:'defense-plan',seed,rulesId:'japan-events-candidate-v44',characterIds:ids,initialFunds:30000,startDate:'1998-01-01'}),cross:unknown[]=[],done=new Set<string>();let value=1,selected='',end=0,cancelled=false;
 for(let step=0;step<limit;step++){
  const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,actor=decisionPlayer(s),ai=actor===aiId,inv=s.effects!.inventory[id],m=s.g2!.players[id];let action:Action;
  if(done.has('redirect')&&!end)end=s.turn;
  if(end&&s.turn>end&&s.phase==='idle'&&id!==aiId)return{replay:{...e.exportReplay(),control:{version:1 as const,policy:'status-v1' as const,computerIds}},state:s,events:e.events,cross,coverage:[...done],cancelled};
  if(s.phase==='finished'||s.calendar!.date>'1999-01-01')return null;
  if(ai&&p?.kind!=='roll'&&p?.kind!=='segment'){
   const d=decideComputer(s,nodes,'status-v1');if(!d)throw Error('No AI decision '+s.phase);action=d.action;
  }else{
   const missing=inv[item]>0?[]:[item],needShop=missing.length>0&&s.items!.points[id]>=shopPrice(item);
   const targets=missing.length?(needShop?[50,107]:[20,31]):[s.players[count-1].node];
   const cache=new Map<string,number>();
   const score=(n:number)=>-distance(n,targets)+(targets.includes(n)?100:0)+(!needShop&&missing.length?(itemSite(byId.get(n)!)?.points??0):0);
   const route=(n:number,prev:number,left:number):number=>{const key=`${n}:${prev}:${left}`;if(cache.has(key))return cache.get(key)!;if(!left)return score(n);const adj=g1Adjacent(byId.get(n)!),next=adj.filter(x=>x!==prev),v=Math.max(...(next.length?next:adj).map(x=>route(x,n,left-1)));cache.set(key,v);return v;};
   if(s.phase==='idle'){
    const target=inv[item]>0?g2Options(s,nodes,item).find(o=>o.target.id===aiId&&!!s.effects!.inventory[aiId]['card:19']):undefined;
    if(target){selected=aiId;action={type:'item',action:{type:'begin',definitionId:G2_GOODS.find(x=>x.id===item)!.effect}};}
    else if(m.vehicle!=='foot'&&m.diceCount!==1)action={type:'traffic',diceCount:1};
    else if(inv['tool:08']&&!actionLocked(m)&&!m.stop&&!m.turtle&&!s.g4!.hotel[id]){const best=[1,2,3,4,5,6].map(v=>({v,score:route(player.node,player.previous??-1,v)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=100){value=best.v;action={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}else action={type:'roll'};}
    else action={type:'roll'};
   }else if(p?.kind==='effect'&&s.effects!.pending!.definitionId.startsWith(item)&&!cancelled){action={type:'item',action:{type:'cancel',decisionId:p.id}};cancelled=true;}
   else if(p?.kind==='effect')action={type:'item',action:{type:'confirm',decisionId:p.id,target:{kind:'player',id:s.effects!.pending!.definitionId===REMOTE_EFFECT?id:selected}},...(s.effects!.pending!.definitionId===REMOTE_EFFECT?{value}:{})};
   else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
   else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,player.node,s.remaining-1)-route(a,player.node,s.remaining-1))[0]};
   else if(p?.kind==='shop'){const good=[...missing,...(inv['tool:08']<1?['tool:08']:[])].find(item=>s.items!.points[id]>=shopPrice(item)&&shopSupply(s,item)>0&&[...p.shelf!.cards,...p.shelf!.tools].some(x=>x.itemId===item&&x.available)&&(!item.startsWith('card:')||s.g3!.slots[id].length<15));action=good?{type:'buyItem',decisionId:p.id,itemId:good}:{type:'leaveShop',decisionId:p.id};}
   else{const d=computerDecision(s);if(!d)throw Error('No human route '+s.phase);action=d.action;}
  }
  if(p?.kind==='reaction'&&p.continuation.kind==='attack')cross.push({index:step,active:id,actor,kind:'reaction',computer:ai,item:p.continuation.itemId});
  const r=e.dispatch({id:'defense-'+step,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action});if(!r.ok)throw Error(JSON.stringify({seed,step,action,r}));
  for(const ev of r.events){if(ev.type==='g3Resolved'&&ev.itemId==='card:21')done.add('immune');if(ev.type==='g3Resolved'&&ev.itemId==='card:18')done.add('revenge');if(ev.type==='attackResolved'&&ev.originalId===aiId&&ev.targetId===ev.sourceId)done.add('redirect');}
 }
 return null;
}
if(process.env.RICHMAN_PLAN_STATUS_REACTION){const count=3,item='card:17';for(let i=0;i<30;i++){const seed=`status-reaction-${i}`,p=planComputerStatusReaction(count,seed,item,2500);console.log(i,p?.replay.commands.length,p?.coverage);if(p){writeFileSync('/private/tmp/computer-status-reaction.json',JSON.stringify(p));break;}}}
