import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import {verifyPayments} from './verify-payments';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const rows=[];
for(const route of (process.env.RICHMAN_PAYMENT_ROUTES??'fortune,company').split(',')){
 const source='/private/tmp/richman-unified-ui-03u-'+route,replay=JSON.parse(fs.readFileSync(source+'/replay.json','utf8')) as Replay,e=replayGame(nodes,replay),engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);if(!r.ok)throw Error(r.reason);for(const c of verifyPayments(before,engine.state,r.events))checks.add(c);}
 assert.equal(e.state.finance!.payments!.last!.kind,route);assert.equal(e.state.finance!.disposal!.last!.auctions.length,3);assert.ok(checks.size>=6);
 const row={route,seed:replay.config.seed,players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,endDate:e.state.calendar!.date,state:createHash('sha256').update(JSON.stringify(e.state)).digest('hex'),events:createHash('sha256').update(JSON.stringify(e.events)).digest('hex'),checks:[...checks],payment:e.state.finance!.payments!.last,disposal:e.state.finance!.disposal!.last};
 fs.copyFileSync(source+'/replay.json',`frontend/src/features/richman/game/fixtures/payments-v34-${route}-replay.json`);rows.push(row);
}
fs.writeFileSync('frontend/src/features/richman/game/fixtures/payments-v34-manifest.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows.map(({route,commands,turn,checks})=>({route,commands,turn,checks}))));
