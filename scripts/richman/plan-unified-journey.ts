/** Plans use legal engine commands on the unchanged Japan map. Browser proof is separate. */
import fs from 'node:fs';
import { GameEngine, replayGame } from '../../frontend/src/features/richman/game/engine';
import type { Action } from '../../frontend/src/features/richman/game/engine';
import type { Target } from '../../frontend/src/features/richman/game/effects';
import { G7_RULES,g7Options,timeAvailable } from '../../frontend/src/features/richman/game/g7';
import { G7_GOODS } from '../../frontend/src/features/richman/game/g7-catalog';
import { G4_GOODS,g4Options } from '../../frontend/src/features/richman/game/g4';
import { G5_GOODS } from '../../frontend/src/features/richman/game/g5-catalog';
import { g5Options,researchOptions,blastTargets } from '../../frontend/src/features/richman/game/g5';
import { G6_GOODS } from '../../frontend/src/features/richman/game/g6-catalog';
import { g6Options } from '../../frontend/src/features/richman/game/g6';
import { actionLocked } from '../../frontend/src/features/richman/game/g2';
import { g1Adjacent } from '../../frontend/src/features/richman/game/g1';
import { PROPERTY_CATALOG } from '../../frontend/src/features/richman/game/economy';
import { itemSite, REMOTE_EFFECT } from '../../frontend/src/features/richman/game/items';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const group=process.env.RICHMAN_GROUP||'4567',count=Number(process.env.RICHMAN_PLAYERS||2),seed=process.env.RICHMAN_SEED||'unified-0';
const goods=[...(group.includes('4')?G4_GOODS:[]),...(group.includes('5')?G5_GOODS:[]),...(group.includes('6')?G6_GOODS:[]),...(group.includes('7')?G7_GOODS:[])];
const byId=new Map(nodes.map(n=>[n.id,n])),defs=PROPERTY_CATALOG.properties;
const allDistances=new Map<number,Map<number,number>>();
for(const n of nodes){const d=new Map([[n.id,0]]),q=[n.id];for(let i=0;i<q.length;i++)for(const next of byId.get(q[i])!.adjacent)if(!d.has(next)){d.set(next,d.get(q[i])!+1);q.push(next);}allDistances.set(n.id,d);}
const distance=(a:number,targets:number[])=>Math.min(...targets.map(b=>allDistances.get(a)!.get(b)??999));
const e=new GameEngine(nodes,{gameId:`unified-${group}-${count}`,seed,rulesId:G7_RULES.id,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),initialFunds:100000});
const used=new Set<string>(),acquired=new Set<string>(),researchStarted=new Set<string>();
let selected:Target={kind:'player',id:'player-1'},destination:Target|undefined,value:number|undefined;
let mineHit=false,bombCarried=false,bombExploded=false,engineerHit=false,timeRestored=false;
const stamps:unknown[]=[];
for(let step=0;step<Number(process.env.RICHMAN_MAX_COMMANDS||12000);step++){
 const s=e.state,p=s.pending,player=s.players[s.active],id=player.id,inv=s.effects!.inventory[id],mob=s.g2!.players[id];
 const researchNeeded=goods.filter(g=>g.id.startsWith('tool:')&&['tool:10','tool:11','tool:12','tool:13'].includes(g.id)&&!used.has(g.id));
 const ownedLabs=s.economy!.properties.filter(q=>q.ownerId===id&&q.buildingType===4);
 const labTargets=ownedLabs.length?defs.filter(d=>ownedLabs.some(q=>q.id===d.id)).flatMap(d=>d.nodeIds):defs.filter(d=>d.kind==='facility'&&s.economy!.properties.some(q=>q.id===d.id&&(!q.ownerId||q.ownerId===id))).flatMap(d=>d.nodeIds);
 const totalHeld=(item:string)=>Object.values(s.effects!.inventory).reduce((n,b)=>n+(b[item]||0),0);
 const wished=goods.filter(g=>!used.has(g.id)&&!['tool:10','tool:11','tool:12','tool:13'].includes(g.id)&&!totalHeld(g.id));
 const ready=wished.filter(g=>g.price<=s.items!.points[id]);
 const hazardsWanted=s.g5!.hazards.filter(h=>!h.carrier&&((h.itemId==='tool:03'&&!mineHit)||(h.itemId==='tool:04'&&!bombCarried))).map(h=>h.node);
 const researchHere=researchOptions(s,defs).find(o=>researchNeeded.some(g=>g.id===o.itemId)&&!totalHeld(o.itemId)&&!s.economy!.properties.some(q=>q.research?.itemId===o.itemId));
 const needLab=researchNeeded.length>0&&!researchNeeded.every(g=>totalHeld(g.id)||s.economy!.properties.some(q=>q.research?.itemId===g.id));
 const score=(node:number)=>hazardsWanted.length?200-20*distance(node,hazardsWanted):needLab&&labTargets.length?200-15*distance(node,labTargets):ready.length?200-15*distance(node,[50,107]):wished.length?(itemSite(byId.get(node)!)?.points??0)*10-distance(node,[20,31]):100-distance(node,defs.filter(d=>s.economy!.properties.some(q=>q.id===d.id&&q.level>0&&q.ownerId!==id)).flatMap(d=>d.nodeIds));
 const cache=new Map<string,number>();
 const route=(node:number,prev:number,n:number):number=>{const key=`${node}/${prev}/${n}`;if(cache.has(key))return cache.get(key)!;if(n===0)return score(node);const adj=g1Adjacent(byId.get(node)!),forward=adj.filter(x=>x!==prev);const r=Math.max(...(forward.length?forward:adj).map(x=>route(x,node,n-1)));cache.set(key,r);return r;};
 let a:Action|undefined,actor=id;
 if(s.phase==='idle'||s.phase==='turnEnd'){
  if(researchHere){a={type:'research',propertyId:researchHere.propertyId,itemId:researchHere.itemId};researchStarted.add(researchHere.itemId);}
 }
 if(!a&&s.phase==='idle'){
  if(!actionLocked(mob)&&!s.g4!.hotel[id]){
   for(const g of goods){
    if(a||!inv[g.id]||used.has(g.id))continue;
    let option: {target:Target;buildingTypes?:number[];destinations?:{target:Target;title:string}[]}|undefined;
    value=undefined;destination=undefined;
    if(G4_GOODS.some(x=>x.id===g.id)){
     const opts=g4Options(s,nodes,defs,g.id);
     option=opts.find(o=>{const q=s.economy!.properties.find(q=>q.id===o.target.id);return g.id==='card:26'?s.economy!.balances[o.target.id].cash>0:!q?.research&&(g.id!=='card:08'||!ownedLabs.some(l=>l.id===q?.id));});
     if(option?.buildingTypes)value=1;
    }else if(G5_GOODS.some(x=>x.id===g.id)){
     const opts=g5Options(s,nodes,defs,g.id);
     if(g.id==='card:09')option=opts.find(o=>{const q=s.economy!.properties.find(q=>q.id===o.target.id)!;return q.level<5&&(defs.find(d=>d.id===q.id)!.kind==='land'||q.buildingType===4);});
     else if(['card:10','card:11'].includes(g.id))option=opts.find(o=>{const q=s.economy!.properties.find(q=>q.id===o.target.id)!;return q.level>0&&defs.find(d=>d.id===q.id)!.kind==='land';});
     else if(g.id==='tool:03'||g.id==='tool:04')option=[...opts].sort((a,b)=>distance(player.node,[Number(a.target.id)])-distance(player.node,[Number(b.target.id)])).find(o=>Number(o.target.id)!==player.node);
     else if(g.id==='tool:07')option=opts.find(o=>{const hit=blastTargets(s,nodes,defs,Number(o.target.id));return hit.players.length>0&&hit.properties.some(id=>s.economy!.properties.some(q=>q.id===id&&q.level>0&&defs.find(d=>d.id===id)!.kind==='land'))&&!hit.properties.some(id=>ownedLabs.some(q=>q.id===id));});
     else option=opts[0];
     if(option?.buildingTypes)value=4;
    }else if(G6_GOODS.some(x=>x.id===g.id))option=g6Options(s,nodes,g.id)[0];
    else {
     const opts=g7Options(s,nodes,defs,g.id);
     if(g.id==='tool:10'&&timeAvailable(s)&&!timeRestored)option=opts[0];
     if(g.id==='tool:11'&&(!group.includes('7')||used.has('tool:10'))){option=opts.find(o=>o.target.kind==='player'&&o.target.id===id);destination=option?.destinations?.find(d=>[50,107].includes(Number(d.target.id)))?.target;}
     if(g.id==='tool:13'&&goods.filter(g=>g.id!=='tool:13').every(g=>used.has(g.id)))option=opts.find(o=>o.target.id===String(player.node));
    }
    if(option){selected=option.target;a={type:'item',action:{type:'begin',definitionId:g.effect}};}
   }
   // A real bank-funded holding precedes red/black/time tests.
   if(!a&&group.includes('6')&&!s.g6!.holdings[id]['jp:24'].quantity&&s.economy!.balances[id].bank>=160&&s.g6!.stocks[0].quota>0)a={type:'stockTrade',stockId:'jp:24',side:'buy',quantity:1};
   if(!a&&inv['tool:08']&&!mob.turtle&&!mob.stop){const ranked=[1,2,3,4,5,6].map(n=>({n,score:route(player.node,player.previous??-1,n)})).sort((a,b)=>b.score-a.score);if(ranked[0].score>=180){selected={kind:'player',id};destination=undefined;value=ranked[0].n;a={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};}}
  }
  a??={type:'roll'};
 }else if(!a&&s.phase==='effect')a={type:'item',action:{type:'confirm',decisionId:p!.id,target:selected,...(destination?{destination}:{})},...(value!==undefined?{value}:{})};
 else if(!a&&s.phase==='turnEnd')a={type:'endTurn'};
 else if(!a&&p?.kind==='branch')a={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>route(b,player.node,s.remaining-1)-route(a,player.node,s.remaining-1))[0]};
 else if(!a&&p?.kind==='shop'){
  const g=ready.find(g=>{const pool=[s.g4,s.g5,s.g6].find(x=>x&&g.id in x.supply);return pool&&pool.supply[g.id]>0;});
  a=g?{type:'buyItem',decisionId:p.id,itemId:g.id}:needLab&&!inv['tool:08']&&s.items!.points[id]>=30&&s.items!.supply>0?{type:'buyItem',decisionId:p.id,itemId:'tool:08'}:{type:'leaveShop',decisionId:p.id};
 }else if(!a&&p?.kind==='property'){
  actor=p.payerId??id;const d=defs.find(d=>d.id===p.propertyId)!;const allowed=(d.kind==='land'&&group!=='7'&&(p.operation==='buy'||s.economy!.properties.find(q=>q.id===d.id)!.level<2))||labTargets.includes(player.node);const accept=p.operation==='rent'||allowed&&s.economy!.balances[actor].cash>=p.amount;
  a={type:'property',decisionId:p.id,accept,...(accept&&p.buildingChoices?{buildingType:4}:{})};
 }else if(!a&&p?.kind==='bank'){const b=s.economy!.balances[id];a=b.cash<15000&&b.bank>5000?{type:'bank',decisionId:p.id,operation:'withdraw',amount:Math.floor(b.bank-5000)}:{type:'leaveBank',decisionId:p.id};}
 else if(!a&&p?.kind==='auction'){actor=p.responderId;a={type:'auction',decisionId:p.id,increment:p.leader?null:100};}
 else if(!a&&p?.kind==='reaction'){actor=p.responderId;a={type:'reaction',decisionId:p.id,choice:'decline'};}
 else if(!a&&p?.kind==='debt'){actor=p.payerId??id;a={type:'settleDebt',decisionId:p.id};}
 else if(!a&&(p?.kind==='roll'||p?.kind==='segment'))a={type:'animationDone',token:p.id};
 if(!a)break;
 const effect=a.type==='item'&&a.action.type==='confirm'?s.effects!.pending?.definitionId:undefined;
 const r=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:actor,action:a});if(!r.ok)throw Error(JSON.stringify({reason:r.reason,a,turn:s.turn}));
 for(const ev of r.events){if(ev.type==='itemBought')acquired.add(ev.itemId);if(ev.type==='g5Notice'&&ev.message.startsWith('研究完成'))for(const g of goods)if(ev.message.includes(g.name))acquired.add(g.id);if(ev.type==='hazardChanged'){if(ev.reason==='踩中地雷')mineHit=true;if(ev.reason==='携带炸弹')bombCarried=true;if(ev.reason==='倒数归零')bombExploded=true;}if(ev.type==='g4PropertyChanged'&&ev.reason==='工程车落点拆除')engineerHit=true;}
 if(effect){const g=goods.find(g=>g.effect===effect);if(g){used.add(g.id);if(g.id==='tool:10')timeRestored=true;stamps.push({item:g.id,turn:s.turn,command:s.revision,events:r.events});console.log('used',g.id,s.turn);}}
 if(step%500===0)console.log(JSON.stringify({step,turn:e.state.turn,used:[...used],research:[...researchStarted],mineHit,bombCarried,bombExploded,engineerHit}));
 if(goods.every(g=>used.has(g.id))&&(!group.includes('5')||(mineHit&&bombCarried&&bombExploded&&engineerHit))){const replay=e.exportReplay(),copy=replayGame(nodes,replay);if(JSON.stringify(copy.state)!==JSON.stringify(e.state)||JSON.stringify(copy.events)!==JSON.stringify(e.events))throw Error('Replay mismatch');const output=process.env.RICHMAN_PLAN||`/private/tmp/richman-unified-${group}.json`;fs.writeFileSync(output,JSON.stringify({replay,state:e.state,events:e.events,stamps,acquired:[...acquired],used:[...used],mineHit,bombCarried,bombExploded,engineerHit},null,2));console.log(JSON.stringify({output,commands:replay.commands.length,turn:e.state.turn,used:[...used]}));process.exit(0);}
}
fs.writeFileSync(`/private/tmp/richman-incomplete-${group}.json`,JSON.stringify({replay:e.exportReplay(),state:e.state,used:[...used],acquired:[...acquired]},null,2));throw Error(`Incomplete ${[...used]} turn=${e.state.turn}`);
