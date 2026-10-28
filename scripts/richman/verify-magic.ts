import assert from 'node:assert/strict';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../shared/richman/japan-topology.fixture.json';
export function verifyMagic(replay:Replay){
 const e=replayGame(nodes,replay),events=e.events,receipts=events.filter(e=>e.type==='magicResolved').map(e=>e.receipt),effects=new Set<number>();
 assert.equal(replay.rulesId,'japan-events-candidate-v36');
 // Validate actual before/after worlds, not just internally consistent receipt text.
 const live=new GameEngine(nodes,replay.config);
 for(const command of replay.commands){
  const before=live.state;assert.ok(live.dispatch(command).ok);
  if(command.action.type!=='magic'||command.action.effect===undefined)continue;
  const after=live.state,r=after.magic!.last!;
  assert.deepEqual(after.calendar,before.calendar);assert.deepEqual(after.news,before.news);assert.deepEqual(after.g6!.holdings,before.g6!.holdings);assert.deepEqual(after.finance,before.finance);
  assert.deepEqual(after.players.map(p=>p.node),before.players.map(p=>p.node));assert.equal(after.turn,before.turn);assert.equal(after.active,before.active);
  for(const row of r.rows){
   const id=row.playerId,b=before.economy!.balances[id],a=after.economy!.balances[id];
   assert.equal(row.cashBefore,b.cash);assert.equal(row.bankBefore,b.bank);assert.equal(row.cashAfter,a.cash);assert.equal(row.bankAfter,a.bank);
   assert.equal(row.pointsBefore,before.items!.points[id]);assert.equal(row.pointsAfter,after.items!.points[id]);
   assert.equal(row.stopAfter,after.g2!.players[id].stop);
   if(r.effect===0||r.effect===8){
    const expected={...before.effects!.inventory[id]};if(r.effect===8){const m=before.g2!.players[id],engineer=before.g5!.engineers[id],v=engineer&&!engineer.suspended?'tool:12':m.vehicle;if(v!=='foot')expected[v]=(expected[v]??0)+1;}
    const category=r.effect===0?'card:':'tool:';
    assert.deepEqual(row.sold!.map(x=>[x.itemId,x.count]),Object.entries(expected).filter(([key,count])=>key.startsWith(category)&&count>0).sort(([a],[b])=>a.localeCompare(b)));
    assert.ok(Object.entries(after.effects!.inventory[id]).filter(([key])=>key.startsWith(category)).every(([,count])=>count===0));
   }
  }
 }
 assert.deepEqual(live.state,e.state);
 for(const r of receipts){
  assert.ok([35,73].includes(r.node));assert.deepEqual(r.rows.map(r=>r.playerId),r.targets);
  let real=false;
  for(const row of r.rows){
   if(row.skipped)continue;
   if(r.effect===0||r.effect===8){const category=r.effect===0?'card:':'tool:';assert.ok(row.sold!.every(x=>x.itemId.startsWith(category)));assert.equal(row.pointsAfter,(row.pointsBefore+row.sold!.reduce((n,x)=>n+x.count*x.price,0))&65535);assert.equal(row.cashAfter,row.cashBefore);assert.equal(row.bankAfter,row.bankBefore);real ||=!!row.sold!.length;}
   if(r.effect===3){assert.equal(row.stopAfter,(row.stopBefore+1)&127);real ||=row.stopAfter!==row.stopBefore;}
   if(r.effect===4){assert.equal(row.cashAfter,0);assert.equal(row.bankAfter,row.bankBefore+row.cashBefore);real ||=row.cashBefore>0;}
   if(r.effect===6){real ||=!!row.received;}
   if(r.effect===7){real=true;}
  }
  if(real)effects.add(r.effect);
 }
 assert.deepEqual([...effects].sort((a,b)=>a-b),[0,3,4,6,7,8]);
 assert.equal(events.filter(e=>e.type==='magicTargets').length,receipts.length);
 return {commands:replay.commands.length,turn:e.state.turn,date:e.state.calendar!.date,receipts:receipts.length,effects:[...effects].sort((a,b)=>a-b),groups:[...new Set(receipts.map(r=>r.group))],nodes:[...new Set(receipts.map(r=>r.node))],received:receipts.flatMap(r=>r.rows.filter(x=>x.received).map(x=>({playerId:x.playerId,...x.received}))),sold:receipts.flatMap(r=>r.rows.filter(x=>x.sold?.length).map(x=>({effect:r.effect,playerId:x.playerId,sold:x.sold,pointsBefore:x.pointsBefore,pointsAfter:x.pointsAfter}))),state:e.state,events};
}
