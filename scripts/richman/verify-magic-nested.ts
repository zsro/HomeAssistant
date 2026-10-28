import assert from 'node:assert/strict';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG,propertyBase} from '../../frontend/src/features/richman/game/economy';
import nodes from '../../shared/richman/japan-topology.fixture.json';
/** Actual UI commands only. Check order and cash/ownership independently of final replay equality. */
export function verifyMagicNested(replay:Replay){
 assert.equal(replay.rulesId,'japan-events-candidate-v38');const live=new GameEngine(nodes,replay.config);let calls=0,collections=0,reactions=0,auctions=0,transfers=0,multiSeats=0,continuationCommands=0;
 for(const c of replay.commands){const before=live.state,b=before.magic?.nested,r=live.dispatch(c);assert.ok(r.ok);if(!r.ok)throw Error();const after=live.state,n=after.magic?.nested;
  const begins=c.action.type==='magic'&&[1,11].includes(c.action.effect!);
  if(b||begins){continuationCommands++;assert.equal(after.turn,before.turn);const {due:oldDue,...oldClock}=before.calendar!,{due:newDue,...newClock}=after.calendar!;assert.deepEqual(newClock,oldClock);for(const id of Object.keys(newDue)){if(newDue[id]===oldDue[id])continue;const oldLoan=before.news!.business!.loans[id],loan=after.news!.business!.loans[id];assert.ok(loan!==oldLoan||after.finance!.eliminated.includes(id));if(newDue[id]){assert.equal(oldDue[id],null);assert.ok(loan>0);assert.ok((Date.parse(newDue[id]!)-Date.parse(after.calendar!.date))/86400000>=90);}else assert.ok(!loan||after.finance!.eliminated.includes(id));}assert.equal(after.finance!.round,before.finance!.round);}
  for(const event of r.events.filter(e=>e.type==='magicNestedCall')){calls++;assert.equal(event.call,(b?.cursor===event.seat?b.calls:0)+1);if(b){assert.equal(c.action.type,'ackFortune');assert.equal(before.pending?.kind,'fortune');if(before.pending?.kind==='fortune')assert.equal(before.pending.collection,undefined);}else assert.ok(begins);}
  if(b?.waiting==='fortune'){
   if(c.action.type==='collectFortuneCard')collections++;
   if(c.action.type==='reaction')reactions++;
   if(!['ackFortune'].includes(c.action.type)&&after.phase!=='finished'){assert.equal(n!.cursor,b.cursor);assert.equal(n!.calls,b.calls);assert.deepEqual(n!.receipt.rows,b.receipt.rows);}
  }
  if(b?.waiting==='auction'&&before.pending?.kind==='auction'&&before.pending.magicBatchId){const a=before.pending,settled=r.events.find(e=>e.type==='auctionSettled');
   if(settled?.type==='auctionSettled'){auctions++;const old=before.economy!.properties.find(p=>p.id===a.propertyId)!,p=after.economy!.properties.find(p=>p.id===a.propertyId)!,d=PROPERTY_CATALOG.properties.find(p=>p.id===a.propertyId)!,expected=structuredClone(before.economy!.balances);
    assert.equal(a.reserve,Math.trunc(propertyBase(old,d)*(1+old.level/2))*before.calendar!.business!.priceIndex);
    if(settled.winnerId){transfers++;expected[settled.winnerId].cash-=settled.amount;expected[a.sourceId].bank+=settled.amount;assert.notEqual(settled.winnerId,a.sourceId);}else assert.equal(settled.amount,0);
    assert.deepEqual(after.economy!.balances,expected);assert.equal(after.news!.publicFund,before.news!.publicFund);assert.equal(p.ownerId,settled.winnerId??old.ownerId);for(const k of ['level','buildingType','basePrice','priceStatus'] as const)assert.equal(p[k],old[k]);
   }
  }
  for(const event of r.events.filter(e=>e.type==='magicResolved').filter(e=>[1,11].includes(e.receipt.effect))){const receipt=event.receipt,source=b?.sourceIndex??before.active;assert.equal(after.active,source);assert.equal(after.magic!.nested,null);assert.deepEqual(receipt.rows.map(r=>r.playerId),receipt.targets);
   if(receipt.effect===1){if(receipt.rows.length>1)multiSeats+=receipt.rows.length;for(const row of receipt.rows){if(!row.skipped)assert.equal(row.nested!.fortunes.length,3);const results=live.events.concat(r.events).filter(e=>e.type==='fortuneResolved'&&e.playerId===row.playerId);for(const f of row.nested!.fortunes)assert.ok(results.some(e=>e.type==='fortuneResolved'&&e.fortuneId===f.id&&e.cursor===f.cursor));}}
  }
 }
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,live.state);assert.deepEqual(full.events,live.events);assert.ok(calls>=3&&transfers>0);
 return{commands:replay.commands.length,turn:live.state.turn,date:live.state.calendar!.date,calls,collections,reactions,auctions,transfers,multiSeats,continuationCommands,receipts:live.events.filter(e=>e.type==='magicResolved').filter(e=>[1,11].includes(e.receipt.effect)).map(e=>e.receipt),state:live.state,events:live.events};
}
