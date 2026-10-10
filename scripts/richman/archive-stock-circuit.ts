import {verifyStockCircuit} from './verify-stock-circuit';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
for(const kind of ['commerce','fortune','time']){
 const dir=`/private/tmp/richman-unified-ui-04c-${kind}`,r=JSON.parse(readFileSync(dir+'/replay.json','utf8')),ui=JSON.parse(readFileSync(dir+'/results.json','utf8'));
 assert.equal(ui.normalSpeed,true);assert.equal(ui.circuitCommon,true);assert.deepEqual(ui.errors,[]);assert.deepEqual(ui.cleanup,{raf:0,canvas:0});
 const {state,events,...summary}=verifyStockCircuit(r,kind),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),base=`frontend/src/features/richman/game/fixtures/stock-circuit-v44-${kind}`;
 writeFileSync(base+'-replay.json',JSON.stringify(r));writeFileSync(base+'-manifest.json',JSON.stringify({...summary,report:{normalSpeed:ui.normalSpeed,map:ui.map,circuitCommon:ui.circuitCommon,completed:ui.completed,errors:ui.errors,cleanup:ui.cleanup},hashes:{replay:hash(r),state:hash(state),events:hash(events)}},null,2)+'\n');console.log(summary);
}
