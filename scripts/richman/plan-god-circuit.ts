/** Original-map command-only hotseat planner; plans are not browser evidence. */
import {GameEngine,type Action} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {shopSupply,shopPrice} from '../../frontend/src/features/richman/game/shop-acquisition';
import {writeFileSync} from 'node:fs';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const byId=new Map(nodes.map(n=>[n.id,n])),distance=new Map<number,Map<number,number>>();
for(const n of nodes){const d=new Map([[n.id,0]]),q=[n.id];for(let i=0;i<q.length;i++)for(const a of byId.get(q[i])!.adjacent)if(!d.has(a)){d.set(a,d.get(q[i])!+1);q.push(a);}distance.set(n.id,d);}
export function planGodCircuit(seed:string,count:number,goal:'pair'|'full',limit=5000){
 const e=new GameEngine(nodes,{gameId:'god-circuit',rulesId:'japan-events-candidate-v46',seed,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:300000,startDate:'1998-01-25'}),marks:{index:number;kind:string}[]=[];let remote=1,avoided=false,attached=false,expired=false,failed=false;
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,who=s.players[s.active],id=decisionPlayer(s),main=who.id==='player-1',bag=s.effects!.inventory[who.id],m=s.g2!.players[who.id];let a:Action|undefined;
  if((goal==='pair'?avoided&&attached&&expired:failed)&&s.phase==='idle')return{replay:e.exportReplay(),state:s,events:e.events,marks,goal,count};
  if(s.phase==='finished')return null;
  let targets:number[]=[];
  if(main){
   if(goal==='pair'){
    if(!avoided){if(m.vehicle!=='foot')targets=s.g6!.objects!.filter(g=>g.type===11).map(g=>g.node);else if(bag['tool:05']||bag['tool:06'])targets=[];else if(s.items!.points[who.id]>=80)targets=[50,107];else targets=[...s.g6!.objects!.filter(g=>g.type===14).map(g=>g.node),20,31];}
    else if(!attached)targets=s.g6!.gods.filter(g=>g.type===12&&!g.carrier).map(g=>g.node);
   }else if(bag['tool:03']>=9)targets=s.g6!.objects!.filter(g=>g.type===13).map(g=>g.node);
   else targets=s.items!.points[who.id]>=25?[50,107]:[...s.g6!.objects!.filter(g=>g.type===14).map(g=>g.node),20,31];
  }
  if(goal==='full'&&!main&&bag['tool:03'])targets=[50,107];
  const score=(n:number)=>goal==='full'&&s.g6!.gods.some(g=>g.type===15&&!g.carrier&&g.node===n)?-9999:targets.length?1000-20*Math.min(...targets.map(t=>distance.get(n)!.get(t)??999)):0,cache=new Map<string,number>();
  function route(n:number,prev:number|null,left:number):number{const key=n+'/'+prev+'/'+left;if(cache.has(key))return cache.get(key)!;if(!left||s.roadTools!.blocks.includes(n))return score(n);const all=g1Adjacent(byId.get(n)!),f=all.filter(a=>a!==prev),v=Math.max(...(f.length?f:all).map(a=>route(a,n,left-1)));cache.set(key,v);return v;}
  if(main&&s.phase==='idle'&&!actionLocked(m)&&!s.g4!.hotel[who.id]){
   if(goal==='pair'&&!avoided&&m.vehicle==='foot'&&(bag['tool:05']||bag['tool:06']))a={type:'item',action:{type:'begin',definitionId:bag['tool:05']?'tool:05:motorcycle-v1':'tool:06:car-v1'}};
   else if(targets.length&&bag['tool:08']&&!m.stop&&!m.turtle){const best=[1,2,3,4,5,6].map(v=>({v,score:route(who.node,who.previous,v)})).sort((a,b)=>b.score-a.score)[0];if(best.score===1000){remote=best.v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}}
  }
  if(!a&&p?.kind==='effect')a={type:'item',...(s.effects!.pending!.definitionId===REMOTE_EFFECT?{value:remote}:{}),action:{type:'confirm',decisionId:p.id,target:{kind:'player',id:who.id}}};
  if(!a&&p?.kind==='branch'&&targets.length)a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,who.node,s.remaining-1)-route(a,who.node,s.remaining-1))[0]};
  if(!a&&main&&p?.kind==='shop'){
   const wanted=(goal==='full'?['tool:03','tool:08']:['tool:05','tool:08']).find(k=>(bag[k]??0)<(k==='tool:03'?9:1)&&shopSupply(s,k)>0&&s.items!.points[who.id]>=shopPrice(k)&&p.shelf!.tools.some(t=>t.itemId===k&&t.available));
   if(wanted)a={type:'buyItem',decisionId:p.id,itemId:wanted};
  }
  if(!a&&goal==='full'&&!main&&p?.kind==='shop'&&bag['tool:03'])a={type:'sellItem',decisionId:p.id,itemId:'tool:03'};
  if(!a&&p?.kind==='property')a={type:'property',decisionId:p.id,accept:p.operation==='rent'};
  if(!a&&p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
  if(!a)a=computerDecision(s)?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone',token:p.id}:undefined);
  if(!a)return null;
  const r=e.dispatch({id:'god-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:id,action:a});if(!r.ok)throw Error(JSON.stringify({a,r}));
  for(const ev of r.events){if(ev.type==='specialObjectResolved'&&ev.targetId==='player-1'){if(ev.objectType===11&&ev.outcome==='vehicle'){avoided=true;marks.push({index:i+1,kind:'vehicle-avoid11'});}if(ev.objectType===13&&ev.outcome==='full'){failed=true;marks.push({index:i+1,kind:'tool13-full'});}}
   if(ev.type==='g6Notice'&&ev.message.includes('附身土地公')){attached=true;marks.push({index:i+1,kind:'attach12'});}
   if(attached&&ev.type==='g6Notice'&&ev.message.includes('11号槽出现在')){expired=true;marks.push({index:i+1,kind:'pair-back11'});}
  }
 }
 return null;
}
if(process.env.RICHMAN_GOD_GOAL){const goal=process.env.RICHMAN_GOD_GOAL as 'pair'|'full',count=goal==='pair'?2:3;for(let i=Number(process.env.RICHMAN_SEED_START??0);i<Number(process.env.RICHMAN_SEED_END??50);i++){const p=planGodCircuit(`god-circuit-${goal}-${i}`,count,goal,Number(process.env.RICHMAN_LIMIT??5000));console.log(goal,i,p?.replay.commands.length,p?.marks);if(p){writeFileSync(`/private/tmp/god-circuit-${goal}.json`,JSON.stringify(p));break;}}}
