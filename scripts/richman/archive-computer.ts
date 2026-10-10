import {readFileSync,writeFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {verifyComputer} from './verify-computer';
for(const n of [2,3,4]){
 const path='/private/tmp/richman-computer-ui-'+n,replay=JSON.parse(readFileSync(path+'/replay.json','utf8')),report=JSON.parse(readFileSync(path+'/results.json','utf8')),plan=JSON.parse(readFileSync('/private/tmp/computer-plan-'+n+'.json','utf8'));
 for(const key of ['seed','characterIds','rulesId','initialFunds','startDate'])assert.deepEqual(replay.config[key],plan.replay.config[key]);
 assert.equal(report.normalSpeed,true);assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});
 const strip=(c:{playerId:string;action:Record<string,unknown>})=>{const a={...c.action};delete a.decisionId;delete a.token;return {playerId:c.playerId,action:a};};
 assert.deepEqual(replay.commands.filter((c:{action:{type:string}})=>c.action.type!=='pause').map(strip),plan.replay.commands.map(strip));
 const{state,events,...summary}=await verifyComputer(replay),hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const base=`frontend/src/features/richman/game/fixtures/computer-v44-${n}`;
 writeFileSync(base+'-replay.json',JSON.stringify(replay));writeFileSync(base+'-manifest.json',JSON.stringify({...summary,report,hashes:{replay:hash(replay),state:hash(state),events:hash(events)}},null,2)+'\n');console.log(n,summary);
}
