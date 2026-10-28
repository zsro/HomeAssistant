import {strict as assert} from 'node:assert';import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,observeResearch,publicObservation,researchChoice} from '../../frontend/src/features/richman/game/computer-research';import type {ResearchMemory} from '../../frontend/src/features/richman/game/computer-research';
import {nuclearTargets} from '../../frontend/src/features/richman/game/g7';import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';import nodes from '../../shared/richman/japan-topology.fixture.json';
export async function verifyComputerResearch(replay:ControlledReplay,checkPrefixes=true){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'research-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),production:unknown[]=[],deliveries:unknown[]=[],uses:unknown[]=[],cancellations:unknown[]=[];let auto=0,human=0,memory:ResearchMemory={};
 const mark=(k:string,n:number)=>{if(!prefixes.has(k))prefixes.set(k,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[i],a=c.action,b=e.state,id=c.playerId,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId),item=b.effects?.pending?.definitionId.slice(0,7),scientific=item&&['tool:10','tool:11','tool:13'].includes(item);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'research-v1',memory)!.action,a);}else human++;}
  const observation=memory[id],r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({i,c,r}));const s=e.state;memory=observeResearch(memory,b,a,s,r.events);
  if(a.type==='research'){
   const before=b.economy!.properties.find(p=>p.id===a.propertyId)!,after=s.economy!.properties.find(p=>p.id===a.propertyId)!;assert.equal(before.ownerId,id);assert.equal(before.buildingType,4);assert.ok(!before.research);assert.deepEqual(after.research,{ownerId:id,itemId:a.itemId,remaining:5});assert.deepEqual(s.economy!.balances,b.economy!.balances);production.push({ai,id,item:a.itemId,property:a.propertyId,level:before.level,turn:s.turn});mark(a.itemId+'-research-before',i);mark(a.itemId+'-research-after',i+1);
  }
  for(const ev of r.events)if(ev.type==='g5Notice'&&ev.message.startsWith('研究完成')){deliveries.push(ev);mark(ev.message,i+1);}
  if(a.type==='pause'&&scientific)mark(item+(s.paused?'-paused':'-resumed'),i+1);
  if(a.type==='item'&&scientific){
   if(a.action.type==='cancel'){assert.deepEqual(s.effects!.inventory,b.effects!.inventory);assert.deepEqual(s.g7,b.g7);assert.equal(s.randomState,b.randomState);cancellations.push({ai,id,item});mark(item+'-cancel',i+1);}
   if(a.action.type==='confirm'){
    assert.equal(r.events.filter(ev=>ev.type==='effectConsumed'&&ev.itemId===item&&ev.playerId===id).length,1);let details:unknown;
    if(item==='tool:10'){
     assert.ok(observation);const expected=structuredClone(b.g7!.checkpoints[id]!.world);expected.effects!.inventory[id][item]--;expected.effects!.serial=Math.max(b.effects!.serial,expected.effects!.serial);expected.effects!.pending=null;expected.g5!.landedTurn=0;
     for(const k of Object.keys(expected) as (keyof typeof expected)[])assert.deepEqual(s[k],expected[k]);
     for(const k of ['active','turn','randomState','serial','gameId','completed','paused','seed','rulesId','mapFingerprint','schemaVersion'] as const)assert.deepEqual(s[k],b[k]);assert.equal(s.revision,b.revision+1);assert.equal(s.phase,'idle');assert.equal(s.pending,null);assert.equal(s.dice,0);assert.equal(s.remaining,0);assert.deepEqual(memory,{});assert.ok(Object.values(s.g7!.checkpoints).every(x=>x===null));
     const changed=Object.keys(expected).filter(k=>JSON.stringify(b[k as keyof typeof b])!==JSON.stringify(s[k as keyof typeof s]));details={observation,currentPublic:publicObservation(b),choice:researchChoice(b,nodes,item,{[id]:observation}),changed,dateBefore:b.calendar!.date,dateAfter:s.calendar!.date,rng:s.randomState,logs:e.events.length};
    }else if(item==='tool:11'){
     assert.equal(a.action.target.kind,'player');assert.equal(a.action.target.id,id);assert.equal(s.players.find(p=>p.id===id)!.node,Number(a.action.destination!.id));assert.equal(s.effects!.inventory[id][item],b.effects!.inventory[id][item]-1);assert.ok(s.g7!.checkpoints[id]);assert.equal(s.randomState,b.randomState);assert.deepEqual(s.calendar,b.calendar);assert.equal(s.turn,b.turn);assert.ok(s.phase==='property'||s.phase==='turnEnd');details={target:a.action.target,destination:a.action.destination,phase:s.phase,landing:s.pending,positionBefore:b.players.find(p=>p.id===id)!.node,positionAfter:s.players.find(p=>p.id===id)!.node};
    }else{
     const hit=nuclearTargets(b,nodes,PROPERTY_CATALOG.properties,Number(a.action.target.id)),ally=b.g3!.allies[id]?.partner;assert.ok(!hit.players.includes(id)&&(!ally||!hit.players.includes(ally)));
     for(const key of hit.properties){const before=b.economy!.properties.find(p=>p.id===key)!,after=s.economy!.properties.find(p=>p.id===key)!;assert.notEqual(before.ownerId,id);if(ally)assert.notEqual(before.ownerId,ally);assert.deepEqual(after,{...before,ownerId:null,level:0,buildingType:0,research:null});}
     for(const pid of hit.players){assert.ok(s.g2!.players[pid].hospital);assert.equal(s.g2!.players[pid].vehicle,'foot');}
     assert.ok(!s.g5!.hazards.some(h=>hit.hazards.includes(h.id)));assert.ok(!s.g6!.gods.some(g=>hit.gods.includes(g.id)));assert.ok(!s.roadTools!.blocks.some(n=>hit.blocks.includes(n)));assert.equal(s.roadTools!.supply['tool:02'],b.roadTools!.supply['tool:02']+hit.blocks.length);assert.equal(s.effects!.inventory[id][item],b.effects!.inventory[id][item]-1);assert.equal(s.phase,'idle');assert.ok(!r.events.some(ev=>ev.type==='reactionOffered'));details={hit,target:a.action.target};
    }
    uses.push({ai,id,item,turn:s.turn,details});mark(item+'-confirm-before',i);mark(item+'-confirm-after',i+1);
   }
  }
  if(r.events.some(ev=>ev.type==='rolled')&&memory[id]){mark('public-observation-before',i);mark('public-observation-after',i+1);}
 }
 assert.ok(auto&&human&&production.length&&uses.length);const full=replayGame(nodes,JSON.parse(JSON.stringify(replay)));assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 // Rebuild host observation from the accepted public command prefix, never seed it from g7.world.
 for(const n of (checkPrefixes?new Set(prefixes.values()):[])){const copy=new GameEngine(nodes,replay.config);let observed:ResearchMemory={},checkedNext=false;for(let j=0;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[j],b=copy.state,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===c.playerId)!.characterId);if(!checkedNext&&j>=n&&ai&&c.action.type!=='pause'&&c.action.type!=='animationDone'&&!(c.action.type==='minigame'&&c.action.input.kind==='tick')){assert.deepEqual(decideComputer(b,nodes,'research-v1',observed)!.action,c.action);checkedNext=true;}const r=copy.dispatch(c);assert.ok(r.ok);observed=observeResearch(observed,b,c.action,copy.state,r.events);if(j+1===n)observed=JSON.parse(JSON.stringify(observed));}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);assert.deepEqual(observed,memory);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,auto,human,production,deliveries,uses,cancellations,prefixes:[...prefixes.keys()],memory,state:e.state,events:e.events};
}
