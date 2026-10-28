import assert from 'node:assert/strict';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import nodes from '../../shared/richman/japan-topology.fixture.json';
/** Independently checks actual command worlds, including multiple rows in a single command. */
export function verifyMagicActions(replay:Replay,requireAll=true){
 assert.equal(replay.rulesId,'japan-events-candidate-v37');const live=new GameEngine(nodes,replay.config);const effects=new Set<number>();let rows=0,reactions=0,buildChoices=0;
 for(const command of replay.commands){const before=live.state,r=live.dispatch(command);assert.ok(r.ok);if(!r.ok)throw Error();const after=live.state,steps=r.events.filter(e=>e.type==='magicStep');
  if(command.action.type==='magicBuild')buildChoices++;
  if(command.action.type==='reaction'&&before.pending?.kind==='reaction'&&before.pending.continuation.kind==='magicDetention')reactions++;
  if(!steps.length)continue;
  assert.deepEqual(after.calendar,before.calendar);assert.equal(after.turn,before.turn);assert.equal(after.active,before.active);assert.deepEqual(after.g6,before.g6);assert.deepEqual(after.finance,before.finance);assert.equal(after.news!.publicFund,before.news!.publicFund);
  const properties=structuredClone(before.economy!.properties),mobility=structuredClone(before.g2!.players),balances=structuredClone(before.economy!.balances),positions=before.players.map(p=>p.node);
  const effect=before.magic!.current?.receipt.effect??(command.action.type==='magic'?command.action.effect:undefined);assert.ok(effect!==undefined&&[2,5,9,10].includes(effect));
  let claims=0;
  for(const event of steps){rows++;const row=event.row,c=row.change;if(row.skipped)continue;if(c?.propertyBefore){const expected=properties.find(p=>p.id===c.propertyBefore!.id)!,d=PROPERTY_CATALOG.properties.find(d=>d.id===expected.id)!;assert.deepEqual(c.propertyBefore,expected);let level=expected.level,type=expected.buildingType??0;
    if(effect===5){if(d.kind==='facility'&&!level){assert.equal(command.action.type,'magicBuild');if(command.action.type==='magicBuild')type=command.action.buildingType;}const cap=d.kind==='land'?(type===0?5:type===1?1:level):[1,5,5,1,5][type];if(level<cap)level++;}else if(level){level--;if(d.kind==='land'&&type){level=0;type=0;}if(d.kind==='facility'&&!level)type=0;}
    assert.ok(c.propertyAfter);assert.equal(c.propertyAfter.level,level);assert.equal(c.propertyAfter.buildingType,type);assert.equal(c.propertyAfter.ownerId,expected.ownerId);assert.equal(c.propertyAfter.basePrice,expected.basePrice);assert.equal(c.propertyAfter.priceStatus,expected.priceStatus);Object.assign(expected,c.propertyAfter);if(c.propertyBefore.level!==level)effects.add(effect!);
   }else if(c?.kind){const id=c.targetId!,m=mobility[id],raw=m[c.kind];assert.equal(c.before,raw);assert.equal(c.after,(raw+3)&127);m[c.kind]=(raw+3)&127;if(!raw){m[c.kind==='hospital'?'prison':'hospital']=0;m.travel=0;positions[before.players.findIndex(p=>p.id===id)]=nodes.find(n=>n.kind===(c.kind==='hospital'?8001:8002))!.id;}
    assert.equal(after.g2!.players[id].vehicle,m.vehicle);assert.equal(after.g2!.players[id].diceCount,m.diceCount);assert.equal(after.g2!.players[id].winter,m.winter);assert.equal(after.g2!.players[id].dream,m.dream);
    if(before.news!.business!.insurance!.terms[id]){balances[id].cash+=6000*before.calendar!.business!.priceIndex;claims++;}effects.add(effect!);
   }else assert.equal(c?.immune,true);
  }
  assert.deepEqual(after.economy!.balances,balances);assert.deepEqual(after.economy!.properties,properties);assert.deepEqual(after.players.map(p=>p.node),positions);for(const id of Object.keys(mobility)){assert.equal(after.g2!.players[id].prison,mobility[id].prison);assert.equal(after.g2!.players[id].hospital,mobility[id].hospital);}assert.equal(r.events.filter(e=>e.type==='insuranceClaim').length,claims);
 }
 const copy=replayGame(nodes,replay);assert.deepEqual(copy.state,live.state);assert.deepEqual(copy.events,live.events);if(requireAll)assert.deepEqual([...effects].sort((a,b)=>a-b),[2,5,9,10]);
 const receipts=live.events.filter(e=>e.type==='magicResolved').map(e=>e.receipt);for(const r of receipts)assert.deepEqual(r.rows.map(r=>r.playerId),r.targets);
 return{commands:replay.commands.length,turn:live.state.turn,date:live.state.calendar!.date,effects:[...effects].sort((a,b)=>a-b),rows,reactions,buildChoices,receipts:receipts.map(r=>({effect:r.effect,group:r.group,targets:r.targets,rows:r.rows})),state:live.state,events:live.events};
}
