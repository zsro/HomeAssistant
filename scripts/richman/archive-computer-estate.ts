import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {verifyComputerEstate} from './verify-computer-estate';
for(const route of (process.env.RICHMAN_ROUTES??'2,3,4').split(',')){
 const dir='/private/tmp/richman-computer-estate-ui-'+route,replay=JSON.parse(readFileSync(dir+'/replay.json','utf8')),report=JSON.parse(readFileSync(dir+'/results.json','utf8')),plan=JSON.parse(readFileSync('/private/tmp/computer-estate-'+route+'.json','utf8'));
 assert.equal(report.normalSpeed,true);assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});assert.deepEqual(replay.control,plan.replay.control);
 for(const k of ['seed','characterIds','initialFunds','startDate','rulesId'])assert.deepEqual(replay.config[k],plan.replay.config[k]);
 const normalize=(c:{playerId:string;action:Record<string,unknown>})=>{const a=structuredClone(c.action);delete a.decisionId;delete a.token;if(a.action)delete(a.action as Record<string,unknown>).decisionId;return{playerId:c.playerId,action:a};};
 assert.deepEqual(replay.commands.filter((c:{action:{type:string}})=>c.action.type!=='pause').map(normalize),plan.replay.commands.map(normalize));
 const{state,events,...summary}=await verifyComputerEstate(replay);const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),base='frontend/src/features/richman/game/fixtures/computer-estate-v44-'+route;
 writeFileSync(base+'-replay.json',JSON.stringify(replay));writeFileSync(base+'-manifest.json',JSON.stringify({...summary,report,hashes:{replay:hash(replay),state:hash(state),events:hash(events)}},null,2)+'\n');console.log(route,summary.commands,summary.auto,summary.uses.length,summary.cancellations.length);
}
