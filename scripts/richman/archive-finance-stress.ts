import {verifyFinanceStress} from './verify-finance-stress';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
for(const[kind,count]of [['rent',2],['dividend',4],['loan',3]]as const){
 if(process.env.RICHMAN_ARCHIVE_KIND&&process.env.RICHMAN_ARCHIVE_KIND!==kind)continue;
 const dir=`/private/tmp/richman-unified-ui-05a-${kind}-${count}`,r=JSON.parse(readFileSync(dir+'/replay.json','utf8')),ui=JSON.parse(readFileSync(dir+'/results.json','utf8'));
 assert.equal(ui.normalSpeed,true);assert.equal(ui.calendarCommon,true);assert.deepEqual(ui.errors,[]);assert.deepEqual(ui.cleanup,{raf:0,canvas:0});
 const {state,events,...summary}=await verifyFinanceStress(r,kind),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),base=`frontend/src/features/richman/game/fixtures/finance-stress-v44-${kind}`;
 writeFileSync(base+'-replay.json',JSON.stringify(r));writeFileSync(base+'-manifest.json',JSON.stringify({...summary,report:{normalSpeed:ui.normalSpeed,map:ui.map,calendarCommon:ui.calendarCommon,errors:ui.errors,cleanup:ui.cleanup},hashes:{replay:hash(r),state:hash(state),events:hash(events)}},null,2)+'\n');console.log(kind,summary.commands,summary.turn,summary.prefixes);
}
