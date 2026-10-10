import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay,GameState} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import {strict as assert} from 'node:assert';
const unaffected=(s:GameState)=>({economy:s.economy,effects:s.effects,g2:s.g2,g3:s.g3,g6:s.g6,news:s.news,calendar:s.calendar,finance:s.finance,g1:s.g1,g4:s.g4,g5:s.g5,roadTools:s.roadTools,cards:s.cards,wealth:s.wealth});
/** Independent accounting around every actual mini command; exact replay and intermediate continuation. */
export function verifyMinigames(r:Replay){
 assert.equal(r.rulesId,'japan-events-candidate-v41');assert.equal(r.itemFingerprint,'31214035');const e=new GameEngine(nodes,r.config),prefixes=new Map<string,number>();let inputs=0,ticks=0,settlements=0;
 for(let i=0;i<r.commands.length;i++){const c=r.commands[i],before=e.state,a=c.action,p=before.pending;const result=e.dispatch(c);assert.ok(result.ok);const after=e.state;
  if(a.type!=='minigame')continue;assert.equal(p?.kind,'minigame');if(p?.kind!=='minigame')throw Error('pending');assert.deepEqual(unaffected(after),unaffected(before));assert.equal(after.turn,before.turn);assert.equal(after.active,before.active);
  if(a.input.kind==='ack'){settlements++;assert.equal(p.stage,'result');assert.equal(after.items!.points[c.playerId],(before.items!.points[c.playerId]+(p.score&65535))&65535);assert.equal(after.pending,null);assert.equal(after.phase,'turnEnd');for(const id of before.players.map(p=>p.id))if(id!==c.playerId)assert.equal(after.items!.points[id],before.items!.points[id]);prefixes.set('beforeAck',i);}
  else{assert.deepEqual(after.items,before.items);if(a.input.kind==='point'||a.input.kind==='dig'){inputs++;if(!prefixes.has('beforeInput'))prefixes.set('beforeInput',i);}if(a.input.kind==='tick'){ticks++;if(!prefixes.has('midplay')&&p.tick>10)prefixes.set('midplay',i);}if(a.input.kind==='start')prefixes.set('beforeStart',i);}
 }
 const copy=replayGame(nodes,r);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);
 for(const i of prefixes.values()){const partial=replayGame(nodes,{...r,commands:r.commands.slice(0,i)});for(const c of r.commands.slice(i))assert.ok(partial.dispatch(c).ok);assert.deepEqual(partial.state,e.state);assert.deepEqual(partial.events,e.events);}
 assert.equal(settlements,1);assert.ok(inputs>0);assert.ok(ticks>0);const receipts=e.events.filter(e=>e.type==='minigameFinished');assert.equal(receipts.length,1);assert.ok(receipts[0].score>0);
 return{commands:r.commands.length,inputs,ticks,settlements,prefixes:[...prefixes.keys()],receipts,state:e.state,events:e.events};
}
