import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import {verifyBatchReplay} from './verify-batches';
const rows=[];
for(const route of (process.env.RICHMAN_BATCH_ROUTES??'terminal,dividend,landTax,stockTax').split(',')){
 const source='/private/tmp/richman-unified-ui-03v-'+route,replay=JSON.parse(fs.readFileSync(source+'/replay.json','utf8')) as Replay,ui=JSON.parse(fs.readFileSync(source+'/results.json','utf8'));
 assert.deepEqual(ui.errors,[]);assert.deepEqual(ui.cleanup,{raf:0,canvas:0});
 const {engine:e,checks,receipts}=verifyBatchReplay(replay),last=e.state.finance!.batches!.last!;assert.ok(last.rows.some(r=>r.bankrupt));assert.equal(last.kind,route==='terminal'?'dividend':route);assert.ok(checks.length>=4);
 const row={route,seed:replay.config.seed,players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,endDate:e.state.calendar!.date,state:createHash('sha256').update(JSON.stringify(e.state)).digest('hex'),events:createHash('sha256').update(JSON.stringify(e.events)).digest('hex'),checks,batch:last,disposal:e.state.finance!.disposal!.last,batchCount:receipts.length,ui:source};
 fs.copyFileSync(source+'/replay.json',`frontend/src/features/richman/game/fixtures/batches-v35-${route}-replay.json`);rows.push(row);
}
fs.writeFileSync('frontend/src/features/richman/game/fixtures/batches-v35-manifest.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows.map(({route,commands,turn,checks})=>({route,commands,turn,checks}))));
