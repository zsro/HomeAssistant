/** Legal commands only; no private-state writes or hidden deck lookahead. */
import {GameEngine,type Action} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {g1Adjacent} from '../../frontend/src/features/richman/game/g1';
import {actionLocked} from '../../frontend/src/features/richman/game/g2';
import {researchOptions,g5Options} from '../../frontend/src/features/richman/game/g5';
import {g7Options,timeAvailable} from '../../frontend/src/features/richman/game/g7';
import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {writeFileSync} from 'node:fs';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const defs=PROPERTY_CATALOG.properties,byId=new Map(nodes.map(n=>[n.id,n])),distance=new Map<number,Map<number,number>>();
for(const n of nodes){const d=new Map([[n.id,0]]),q=[n.id];for(let i=0;i<q.length;i++)for(const a of byId.get(q[i])!.adjacent)if(!d.has(a)){d.set(a,d.get(q[i])!+1);q.push(a);}distance.set(n.id,d);}
export function planClosure(kind:'car'|'research',seed:string,limit=6500){
 const count=kind==='car'?3:4,computerIds=kind==='research'?['salonbus']:[],config={gameId:'god-closure',rulesId:'japan-events-candidate-v47',seed,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),humanIds:['player-1','player-2','player-3'],initialFunds:300000,startDate:'1998-01-09'};
 const e=new GameEngine(nodes,config),marks:{index:number;kind:string}[]=[];let remote=1,exited=false,attached=false,timeUsed=false,expired=false,exitTurn=0,produced=false;
 for(let i=0;i<limit;i++){
  const s=e.state,p=s.pending,id=decisionPlayer(s),who=s.players[s.active],bag=s.effects!.inventory[who.id],m=s.g2!.players[who.id],ai=id==='player-4';let a:Action|undefined;
  if(s.phase==='finished')return null;
  if(expired&&(kind==='car'||timeUsed)&&s.phase==='idle'){return{replay:{...e.exportReplay(),...(computerIds.length?{control:{version:1,policy:'basic-v1',computerIds}}:{})},state:s,events:e.events,marks,kind,count};}
  const targetReady=kind==='car'?s.g2!.players['player-2'].vehicle==='tool:06':!!s.g5!.engineers['player-2']&&!s.g5!.engineers['player-2']!.suspended;
  const labReady=s.economy!.properties.some(q=>q.ownerId==='player-3'&&q.buildingType===4&&q.level>=2);
  if(!exited&&id==='player-1'&&['idle','turnEnd'].includes(s.phase)&&targetReady&&(kind==='car'||labReady))a={type:'surrender'};
  if(p?.kind==='surrender')a={type:'chooseDeath',decisionId:p.id,targetId:'player-2'};
  if(!a&&ai)a=computerDecision(s)?.action;
  const main=who.id==='player-2',scientist=who.id==='player-3',needsLab=kind==='research'&&!exited&&(main||scientist),ownLab=s.economy!.properties.find(q=>q.ownerId===who.id&&q.buildingType===4);
  let targets:number[]=[];
  if(needsLab)targets=defs.filter(d=>ownLab?d.id===ownLab.id:d.kind==='facility'&&s.economy!.properties.some(q=>q.id===d.id&&!q.ownerId)).flatMap(d=>d.nodeIds);
  if(kind==='car'&&main&&!exited&&m.vehicle!=='tool:06')targets=s.items!.points[who.id]>=150?[50,107]:[...s.g6!.objects!.filter(g=>g.type===14).map(g=>g.node),20,31];
  // After attachment steer the carrier away from other gods that would replace it.
  const score=(n:number)=>attached&&main&&s.g6!.gods.some(g=>!g.carrier&&g.node===n)?-10000:targets.length?1000-20*Math.min(...targets.map(t=>distance.get(n)!.get(t)??999)):0,cache=new Map<string,number>();
  function route(n:number,prev:number|null,left:number):number{const key=n+'/'+prev+'/'+left;if(cache.has(key))return cache.get(key)!;if(!left||s.roadTools!.blocks.includes(n))return score(n);const all=g1Adjacent(byId.get(n)!),f=all.filter(x=>x!==prev),v=Math.max(...(f.length?f:all).map(x=>route(x,n,left-1)));cache.set(key,v);return v;}
  if(!a&&!ai&&s.phase==='idle'&&!actionLocked(m)&&!s.g4!.hotel[who.id]){
   if(kind==='research'){
    const item=main&&!exited?'tool:12':scientist&&exited&&!produced?'tool:10':null;
    const r=item&&!bag[item]?researchOptions(s,defs).find(o=>o.itemId===item):null;
    if(r)a={type:'research',propertyId:r.propertyId,itemId:r.itemId};
    if(main&&!exited&&bag['tool:12']&&labReady&&g5Options(s,nodes,defs,'tool:12').length)a={type:'item',action:{type:'begin',definitionId:'tool:12:engineer-v1'}};
    const c=s.g7!.checkpoints[who.id];
    if(scientist&&exited&&produced&&!timeUsed&&timeAvailable(s)&&c&&c.world.finance!.eliminated.includes('player-1')&&c.world.g6!.gods.some(g=>g.type===15)&&JSON.stringify(c.world.g6!.gods)!==JSON.stringify(s.g6!.gods)&&g7Options(s,nodes,defs,'tool:10').length)a={type:'item',action:{type:'begin',definitionId:'tool:10:time-v1'}};
   }
   if(!a&&kind==='car'&&main&&!exited&&bag['tool:06']&&m.vehicle!=='tool:06')a={type:'item',action:{type:'begin',definitionId:'tool:06:car-v1'}};
   if(!a&&targets.length&&bag['tool:08']&&!m.stop&&!m.turtle){const best=[1,2,3,4,5,6].map(v=>({v,score:route(who.node,who.previous,v)})).sort((a,b)=>b.score-a.score)[0];if(best.score>=980){remote=best.v;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}}
  }
  if(!a&&!ai&&p?.kind==='effect')a={type:'item',...(s.effects!.pending!.definitionId===REMOTE_EFFECT?{value:remote}:{}),action:{type:'confirm',decisionId:p.id,target:{kind:'player',id:who.id}}};
  if(!a&&!ai&&p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,who.node,s.remaining-1)-route(a,who.node,s.remaining-1))[0]};
  if(!a&&!ai&&p?.kind==='property'){const d=defs.find(d=>d.id===p.propertyId)!;a={type:'property',decisionId:p.id,accept:p.operation==='rent'||needsLab&&d.kind==='facility'&&s.economy!.balances[id].cash>=p.amount,...(p.buildingChoices&&needsLab&&s.economy!.balances[id].cash>=p.amount?{buildingType:4}:{})};}
  if(!a&&!ai&&p?.kind==='shop'){
   const wanted=(!exited?(kind==='car'&&main?['tool:06','tool:08']:needsLab?['tool:08']:[]):[]).find(k=>!bag[k]&&shopSupply(s,k)>0&&s.items!.points[id]>=shopPrice(k)&&p.shelf!.tools.some(t=>t.itemId===k&&t.available));if(wanted)a={type:'buyItem',decisionId:p.id,itemId:wanted};
  }
  if(!a&&!ai&&p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
  if(!a)a=computerDecision(s)?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone',token:p.id}:undefined);
  if(!a)throw Error('No decision '+s.phase);
  const result=e.dispatch({id:'c'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:id,action:a});if(!result.ok)throw Error(JSON.stringify({a,result}));
  if(a.type==='surrender'){exited=true;exitTurn=s.turn;marks.push({index:i,kind:'before-surrender'},{index:i+1,kind:'after-surrender'});}
  if(a.type==='chooseDeath'){attached=true;marks.push({index:i,kind:'equipped-before-attachment'},{index:i+1,kind:'cleared-after-attachment'});}
  if(a.type==='item'&&a.action.type==='confirm'&&['tool:06:car-v1','tool:12:engineer-v1'].includes(s.effects!.pending!.definitionId))marks.push({index:i+1,kind:'equipped'});
  if(exited&&scientist&&e.state.effects!.inventory[id]?.['tool:10']>0&&!produced){produced=true;marks.push({index:i+1,kind:'post-exit-research-produced'});}
  if(result.events.some(ev=>ev.type==='g7Notice'&&ev.message.startsWith('时光机：'))){timeUsed=true;marks.push({index:i,kind:'before-time'},{index:i+1,kind:'after-time'});}
  if(attached&&!e.state.g6!.gods.some(g=>g.type===15&&g.carrier==='player-2')){if(!result.events.some(ev=>ev.type==='g6Notice'&&ev.message==='玩家2的神仙期限结束。'))return null;expired=true;marks.push({index:i+1,kind:'death-expired'});}
  if(exited&&s.turn>exitTurn+130)return null;
 }
 return null;
}
if(process.env.RICHMAN_CLOSURE){const kind=process.env.RICHMAN_CLOSURE as 'car'|'research';for(let n=Number(process.env.RICHMAN_SEED_START??0);n<Number(process.env.RICHMAN_SEED_END??12);n++){const seed=`god-closure-${kind}-${n}`,p=planClosure(kind,seed);console.log(kind,n,p?.replay.commands.length,p?.marks);if(p){writeFileSync(`/private/tmp/god-closure-${kind}.json`,JSON.stringify(p));break;}}}
