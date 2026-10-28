import {strict as assert} from 'node:assert';import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';import type {GameState} from '../../frontend/src/features/richman/game/engine';import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';import {decideComputer,ROADS_GOODS} from '../../frontend/src/features/richman/game/computer-roads';import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';import {projectWorkerAnchor} from '../../frontend/src/features/richman/game/nearby-construction';import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';import nodes from '../../shared/richman/japan-topology.fixture.json';
const goods=ROADS_GOODS.map(g=>g.id as string),defs=PROPERTY_CATALOG.properties;
function route(b:GameState){let {node,previous}=b.players[b.active];const path:number[]=[];for(let i=0;i<9;i++){const all=nodes.find(n=>n.id===node)!.adjacent,next=all.filter(n=>n!==previous),to=Math.min(...(next.length?next:all));path.push(to);previous=node;node=to;}return path;}
function hit(b:GameState,node:number){const center=nodes.find(n=>n.id===node)!,inside=(p:{x:number;y:number})=>{const q=projectWorkerAnchor(center,p);return q&&q.x>=120&&q.x<320&&q.y>=120&&q.y<320;};return {properties:defs.filter(inside).map(d=>d.id),players:b.players.filter(p=>{const m=b.g2!.players[p.id];return !b.finance!.eliminated.includes(p.id)&&!m.prison&&!m.hospital&&!m.travel&&!b.g4!.hotel[p.id]&&inside(nodes.find(n=>n.id===p.node)!);}).map(p=>p.id),hazards:b.g5!.hazards.filter(h=>inside(nodes.find(n=>n.id===(h.carrier?b.players.find(p=>p.id===h.carrier)!.node:h.node))!)).map(h=>h.id),blocks:b.roadTools!.blocks.filter(n=>inside(nodes.find(p=>p.id===n)!))};}
export async function verifyComputerRoads(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'roads-v1');const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),acquisitions:unknown[]=[],uses:unknown[]=[],cancellations:unknown[]=[],hazardEvents:unknown[]=[],stops:unknown[]=[];let auto=0,human=0;const mark=(key:string,n:number)=>{if(!prefixes.has(key))prefixes.set(key,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[i],a=c.action,b=e.state,id=c.playerId,p=b.pending,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'roads-v1')!.action,a);}else human++;}
  const r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({i,c,r}));const s=e.state;
  for(const player of b.players)for(const item of goods)if(s.effects!.inventory[player.id][item]>b.effects!.inventory[player.id][item]){acquisitions.push({id:player.id,ai:replay.control!.computerIds.includes(player.characterId),item,turn:s.turn,action:a.type,events:r.events.filter(x=>['itemBought','shopGift','mapCardReceived','fortuneResolved','g6Notice','magicResolved','inventoryTransferred'].includes(x.type))});mark(item+'-acquired',i+1);}
  if(a.type==='buyItem'&&goods.includes(a.itemId)){assert.ok(p?.kind==='shop'&&p.shelf?.tools.some(x=>x.itemId===a.itemId&&x.available));assert.equal(s.items!.points[id],b.items!.points[id]-shopPrice(a.itemId));assert.equal(shopSupply(s,a.itemId),shopSupply(b,a.itemId)-1);assert.equal(s.effects!.inventory[id][a.itemId],b.effects!.inventory[id][a.itemId]+1);assert.deepEqual(s.economy!.balances,b.economy!.balances);}
  const item=b.effects?.pending?.definitionId.slice(0,7);
  if(a.type==='pause'&&item&&goods.includes(item))mark(item+(s.paused?'-paused':'-resumed'),i+1);
  if(a.type==='item'&&item&&goods.includes(item)){
   if(a.action.type==='cancel'){assert.deepEqual(s.effects!.inventory,b.effects!.inventory);assert.deepEqual(s.g5,b.g5);assert.deepEqual(s.roadTools,b.roadTools);assert.deepEqual(s.economy,b.economy);assert.equal(s.randomState,b.randomState);assert.equal(s.phase,'idle');cancellations.push({ai,id,item,turn:s.turn});mark('cancel-before',i);mark('cancel-after',i+1);}
   if(a.action.type==='confirm'){
    const target=a.action.target,expected=structuredClone(b),inventory=expected.effects!.inventory;inventory[id][item]--;let affected:ReturnType<typeof hit>|null=null;
    if(item==='tool:02'){expected.roadTools!.blocks.push(Number(target.id));expected.roadTools!.blocks.sort((a,b)=>a-b);}
    else if(item==='tool:03'||item==='tool:04'){expected.g5!.hazards.push({id:++expected.g5!.serial,itemId:item,node:Number(target.id),carrier:null,remaining:0});}
    else{
     const path=item==='tool:01'?route(b):[];affected=item==='tool:07'?hit(b,Number(target.id)):null;
     const removedBlocks=affected?.blocks??b.roadTools!.blocks.filter(n=>path.includes(n)),removedHazards=affected?.hazards??b.g5!.hazards.filter(h=>!h.carrier&&path.includes(h.node)).map(h=>h.id);
     expected.roadTools!.blocks=expected.roadTools!.blocks.filter(n=>!removedBlocks.includes(n));expected.roadTools!.supply['tool:02']+=removedBlocks.length;
     for(const h of b.g5!.hazards)if(removedHazards.includes(h.id))expected.g5!.supply[h.itemId]++;
     expected.g5!.hazards=expected.g5!.hazards.filter(h=>!removedHazards.includes(h.id));
     if(item==='tool:01'){expected.roadTools!.supply[item]++;expected.roadTools!.lastRobotPath=path;}
     else{
      expected.g5!.supply[item]++;
      for(const q of expected.economy!.properties.filter(p=>affected!.properties.includes(p.id))){const d=defs.find(d=>d.id===q.id)!;q.level=d.kind==='land'&&q.buildingType===1?0:Math.max(0,q.level-1);if(!q.level){q.buildingType=0;q.research=null;}else if(q.research){const required:Record<string,number>={'tool:09':1,'tool:10':2,'tool:11':3,'tool:12':4,'tool:13':5};if(q.level<required[q.research.itemId])q.research=null;}}
      for(const pid of affected!.players){const m=expected.g2!.players[pid];if(m.vehicle!=='foot')expected.g2!.supply[m.vehicle]++;m.vehicle='foot';m.diceCount=1;if(!expected.g5!.engineers[pid]?.suspended)expected.g5!.engineers[pid]=null;m.travel=0;m.hospital=((m.hospital&127)+3)&127;m.prison=0;expected.g4!.hotel[pid]=0;const player=expected.players.find(p=>p.id===pid)!;player.node=nodes.find(n=>n.kind===8001)!.id;player.previous=null;
       if(expected.news!.business!.insurance!.terms[pid]){const amount=6000*expected.calendar!.business!.priceIndex,company=expected.news!.business!.companies.find(c=>c.id==='japan:company:4')!;expected.economy!.balances[pid].cash+=amount;company.funds=(company.funds-amount)|0;company.cumulative=(company.cumulative-amount)|0;}
      }
     }
    }
    assert.deepEqual(s.effects!.inventory,expected.effects!.inventory);assert.deepEqual(s.g3!.slots,b.g3!.slots);assert.deepEqual(s.roadTools,expected.roadTools);assert.deepEqual(s.g5,expected.g5);assert.deepEqual(s.g2,expected.g2);assert.deepEqual(s.economy,expected.economy);assert.deepEqual(s.players,expected.players);assert.deepEqual(s.news!.business!.companies,expected.news!.business!.companies);
    for(const key of ['g6','calendar','finance','randomState','turn','active'] as const)assert.deepEqual(s[key],b[key]);assert.equal(s.news!.publicFund,b.news!.publicFund);assert.equal(s.phase,'idle');assert.equal(s.pending,null);assert.equal(s.effects!.pending,null);
    if(ai&&affected){const ally=b.g3!.allies[id]?.partner;assert.ok(!affected.players.some(p=>p===id||p===ally));assert.ok(!b.economy!.properties.some(p=>affected!.properties.includes(p.id)&&(p.ownerId===id||p.ownerId===ally)&&(p.level||p.research)));}
    uses.push({ai,id,item,target,turn:b.turn,phase:s.phase,affected,properties:affected?affected.properties.map(pid=>({before:b.economy!.properties.find(p=>p.id===pid),after:s.economy!.properties.find(p=>p.id===pid)})):[],events:r.events});mark(item+'-confirm-before',i);mark(item+'-confirm-after',i+1);
   }
  }
  for(const ev of r.events){
   if(ev.type==='roadblockStopped'){assert.ok(b.roadTools!.blocks.includes(ev.node));assert.ok(!s.roadTools!.blocks.includes(ev.node));assert.equal(s.roadTools!.supply['tool:02'],b.roadTools!.supply['tool:02']+1);stops.push(ev);mark('roadblock-stop-before',i);mark('roadblock-stop-after',i+1);}
   if(ev.type==='hazardChanged'){
    hazardEvents.push(ev);mark('hazard-'+ev.reason+'-before',i);mark('hazard-'+ev.reason+'-after',i+1);
    const old=b.g5!.hazards.find(h=>h.id===ev.hazard.id);
    if(ev.reason==='携带炸弹'){assert.ok(old&&!old.carrier);assert.equal(ev.hazard.remaining,38);assert.equal(ev.hazard.carrier,b.players[b.active].id);assert.equal(s.g5!.supply[ev.hazard.itemId],b.g5!.supply[ev.hazard.itemId]);}
    if(ev.reason==='移动倒数'||ev.reason==='相遇转交，不重置倒数'){assert.ok(old?.carrier);assert.equal(ev.hazard.remaining,old.remaining-1);assert.equal(ev.hazard.node,s.players.find(p=>p.id===old.carrier)!.node);if(ev.reason.startsWith('相遇'))assert.notEqual(ev.hazard.carrier,old.carrier);else assert.equal(ev.hazard.carrier,old.carrier);}
    if(ev.reason==='踩中地雷'||ev.reason==='倒数归零'){assert.equal(ev.removed,true);assert.equal(s.g5!.supply[ev.hazard.itemId],b.g5!.supply[ev.hazard.itemId]+1);if(ev.reason==='倒数归零')assert.equal(old!.remaining,1);assert.equal(s.g2!.players[b.players[b.active].id].hospital,ev.reason==='踩中地雷'?3:5);}
   }
  }
 }
 assert.ok(auto&&human&&uses.length);const full=replayGame(nodes,JSON.parse(JSON.stringify(replay)));assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,auto,human,acquisitions,uses,cancellations,hazardEvents,stops,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
