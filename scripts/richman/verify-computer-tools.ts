import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-tools';
import {REMOTE_EFFECT} from '../../frontend/src/features/richman/game/items';
import {NEARBY_WORKER_EFFECT,nearbyWorkerTargets} from '../../frontend/src/features/richman/game/nearby-construction';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
export async function verifyComputerTools(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'tools-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),used:Record<string,number>={},bought:unknown[]=[];let auto=0,human=0,dates=0;
 const mark=(k:string,i:number)=>{if(!prefixes.has(k))prefixes.set(k,i);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));
  const c=replay.commands[i],b=e.state,a=c.action,player=b.players.find(p=>p.id===c.playerId)!,ai=replay.control!.computerIds.includes(player.characterId);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){
   assert.equal(c.playerId,decisionPlayer(b));
   if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'tools-v1')!.action,a);if(a.type==='roll')mark('normal-roll',i);}else human++;
  }
  assert.ok(e.dispatch(c).ok);const s=e.state;
  if(b.calendar!.date!==s.calendar!.date)dates++;
  if(a.type==='pause')mark((b.effects?.pending?.definitionId??b.phase)+(s.paused?':paused':':resumed'),i+1);
  if(ai&&a.type==='item'){
   const id=a.action.type==='begin'?a.action.definitionId:b.effects!.pending!.definitionId;
   assert.ok([REMOTE_EFFECT,NEARBY_WORKER_EFFECT].includes(id));assert.equal(s.randomState,b.randomState);assert.deepEqual(s.economy!.balances,b.economy!.balances);
   const item=id===REMOTE_EFFECT?'tool:08':'tool:09';mark(item+':'+a.action.type,i);
   if(a.action.type==='begin'){assert.equal(s.phase,'effect');assert.deepEqual(s.effects!.inventory,b.effects!.inventory);}
   if(a.action.type==='confirm'){
    assert.equal(s.effects!.inventory[c.playerId][item],b.effects!.inventory[c.playerId][item]-1);used[item]=(used[item]??0)+1;mark(item+':after',i+1);
    if(id===REMOTE_EFFECT){assert.ok(Number.isInteger(a.value)&&a.value!>=1&&a.value!<=6);assert.equal(s.phase,'rolling');assert.equal(s.dice,a.value);assert.equal(s.items!.supply,b.items!.supply+1);}
    else{const target=a.action.target,p=b.economy!.properties.find(p=>p.id===target.id)!;assert.equal(target.kind,'property');assert.equal(p.ownerId,c.playerId);assert.ok(nearbyWorkerTargets(nodes.find(n=>n.id===player.node)!,PROPERTY_CATALOG.properties,b.economy!.properties).includes(p.id));assert.equal(s.economy!.properties.find(q=>q.id===p.id)!.level,p.level+1);assert.equal(s.phase,'idle');assert.equal(s.items!.supply,b.items!.supply);}
   }
   if(a.action.type==='cancel'){assert.deepEqual(s.effects!.inventory,b.effects!.inventory);assert.equal(s.phase,'idle');}
  }
  if(ai&&a.type==='buyItem'){
   assert.equal(a.itemId,'tool:08');assert.equal(b.effects!.inventory[c.playerId]['tool:08'],0);assert.equal(s.effects!.inventory[c.playerId]['tool:08'],1);assert.equal(b.items!.points[c.playerId]-s.items!.points[c.playerId],30);assert.equal(s.items!.supply,b.items!.supply-1);assert.deepEqual(s.economy!.balances,b.economy!.balances);assert.equal(s.randomState,b.randomState);assert.notEqual(s.pending!.id,b.pending!.id);assert.equal(s.pending?.kind,'shop');if(s.pending?.kind==='shop')assert.equal(s.pending.shelf!.tools.find(x=>x.itemId==='tool:08')!.available,false);bought.push({player:c.playerId,turn:s.turn,pointsBefore:b.items!.points[c.playerId],pointsAfter:s.items!.points[c.playerId],supplyBefore:b.items!.supply,supplyAfter:s.items!.supply});mark('refill-before',i);mark('refill-after',i+1);
  }
 }
 assert.ok(auto&&human&&dates&&used['tool:08']&&used['tool:09']);
 const copy=replayGame(nodes,replay);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);
 for(const i of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,i)});for(let j=i;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,auto,human,dates,used,bought,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
