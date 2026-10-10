import {verifyReactionCircuit} from './verify-reaction-circuit';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
for(const kind of ['attack','waiver','debt']){
 if(process.env.RICHMAN_ARCHIVE_KIND&&process.env.RICHMAN_ARCHIVE_KIND!==kind)continue;
 const dir=`/private/tmp/richman-unified-ui-05b-${kind}`,replay=JSON.parse(readFileSync(dir+'/replay.json','utf8')),ui=JSON.parse(readFileSync(dir+'/results.json','utf8'));
 assert.equal(ui.normalSpeed,true);assert.equal(ui.reactionCommon,true);assert.equal(ui.calendarCommon,true);assert.ok(ui.reactionChecks.length);assert.deepEqual(ui.errors,[]);assert.deepEqual(ui.cleanup,{raf:0,canvas:0});
 const {state,events,...summary}=await verifyReactionCircuit(replay,kind),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),base=`frontend/src/features/richman/game/fixtures/reaction-circuit-v44-${kind}`;
 writeFileSync(base+'-replay.json',JSON.stringify(replay));writeFileSync(base+'-manifest.json',JSON.stringify({...summary,report:{normalSpeed:ui.normalSpeed,map:ui.map,calendarCommon:ui.calendarCommon,reactionCommon:ui.reactionCommon,reactionChecks:ui.reactionChecks,errors:ui.errors,cleanup:ui.cleanup},hashes:{replay:hash(replay),state:hash(state),events:hash(events)}},null,2)+'\n');console.log(kind,summary.commands,summary.turn,summary.prefixes);
}
