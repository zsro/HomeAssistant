/** Exported real session commands: actor ownership, legal decisions, funds and exact continuation. */
import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
export async function verifyComputer(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'basic-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),kinds:Record<string,number>={};let computer=0,human=0,dates=0,alternate=0;const mark=(k:string,i:number)=>{if(!prefixes.has(k))prefixes.set(k,i);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));
  const c=replay.commands[i],s=e.state,p=s.pending,isComputer=replay.control!.computerIds.includes(s.players.find(p=>p.id===c.playerId)!.characterId);
  if(c.action.type!=='animationDone'&&c.action.type!=='pause'){
   assert.equal(c.playerId,decisionPlayer(s));
   const key=p?.kind==='property'?p.operation:p?.kind??s.phase;kinds[key]=(kinds[key]??0)+1;
   if(isComputer){const d=computerDecision(s)!;assert.ok(d);assert.deepEqual(c.action,d.action);assert.equal(c.playerId,d.playerId);computer++;mark('computer-first',i);if(key==='upgrade')mark('computer-upgrade',i);if(key==='bank')mark('computer-bank',i);if(c.playerId!==s.players[s.active].id){alternate++;mark('alternate-responder',i);}}
   else{human++;if(computer)mark('return-human',i);}
   if(['debt','auction','reaction'].includes(key))mark(key,i);
  }
  if(c.action.type==='pause')mark(c.action.value?'paused':'resumed',i+1);
  const r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({c,r}));
  if(e.state.calendar!.date!==s.calendar!.date){dates++;mark('date',i+1);}
  for(const b of Object.values(e.state.economy!.balances)){assert.ok(b.cash>=0&&b.bank>=0);}
 }
 assert.ok(computer&&human&&dates);const copy=replayGame(nodes,replay);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);
 for(const i of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,i)});for(const c of replay.commands.slice(i))assert.ok(copy.dispatch(c).ok);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,computer,human,dates,alternate,turn:e.state.turn,phase:e.state.phase,kinds,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
