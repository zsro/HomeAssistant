import {verifyRestoreCircuit} from './verify-restore-circuit';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
for(const players of [2,3,4]){
 if(process.env.RICHMAN_ARCHIVE_PLAYERS&&Number(process.env.RICHMAN_ARCHIVE_PLAYERS)!==players)continue;
 const dir=`/private/tmp/richman-unified-ui-05c-${players}`,replay=JSON.parse(readFileSync(dir+'/replay.json','utf8')),ui=JSON.parse(readFileSync(dir+'/results.json','utf8'));
 assert.equal(ui.normalSpeed,true);assert.equal(ui.circuitCommon,true);assert.equal(ui.calendarCommon,true);assert.ok(ui.completed.some((x:{id:string})=>x.id==='tool:10'));assert.deepEqual(ui.errors,[]);assert.deepEqual(ui.cleanup,{raf:0,canvas:0});
 const {state,events,...summary}=await verifyRestoreCircuit(replay),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),base=`frontend/src/features/richman/game/fixtures/restore-circuit-v44-${players}`;
 writeFileSync(base+'-replay.json',JSON.stringify(replay));writeFileSync(base+'-manifest.json',JSON.stringify({...summary,report:{normalSpeed:ui.normalSpeed,map:ui.map,circuitCommon:ui.circuitCommon,calendarCommon:ui.calendarCommon,completed:ui.completed,errors:ui.errors,cleanup:ui.cleanup},hashes:{replay:hash(replay),state:hash(state),events:hash(events)}},null,2)+'\n');console.log(players,summary.commands,summary.turn,summary.prefixes);
}
