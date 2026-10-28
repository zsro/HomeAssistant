import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {verifyFortune} from './verify-fortune';
const root='frontend/src/features/richman/game/fixtures',manifest=[],routes=[];
for(let i=0;i<8;i++){
 const dir=`/private/tmp/richman-unified-ui-03g-${i}`,report=JSON.parse(fs.readFileSync(dir+'/results.json','utf8')),replay=JSON.parse(fs.readFileSync(dir+'/replay.json','utf8')) as Replay;
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});
 const engine=new GameEngine(nodes,replay.config),checks=[];
 for(const command of replay.commands){const before=engine.state,result=engine.dispatch(command);assert.ok(result.ok);if(result.ok){const check=verifyFortune(before,engine.state,result.events);if(check)checks.push(check);}}
 const again=replayGame(nodes,replay);assert.deepEqual(again.state,engine.state);assert.deepEqual(again.events,engine.events);
 const hashes=Object.fromEntries(['state','events'].map(k=>[k,createHash('sha256').update(JSON.stringify(k==='state'?engine.state:engine.events)).digest('hex')]));
 const row={route:String(i),seed:replay.config.seed,commands:replay.commands.length,turn:engine.state.turn,players:replay.config.characterIds.length,...hashes,fortune:checks.map(c=>c.fortuneId)};
 fs.writeFileSync(`${root}/fortune-v20-${i}-replay.json`,JSON.stringify(replay,null,2));fs.writeFileSync(`${root}/fortune-v20-${i}-golden.json`,JSON.stringify(row,null,2));manifest.push(row);
 routes.push({...row,normalSpeed:report.normalSpeed,map:report.map,checks,cleanup:report.cleanup,errors:report.errors,screenshots:dir});
}
fs.writeFileSync(`${root}/fortune-v20-manifest.json`,JSON.stringify(manifest,null,2));fs.writeFileSync('/private/tmp/richman-03g-verified.json',JSON.stringify(routes,null,2));console.log(JSON.stringify({routes:routes.length,commands:routes.reduce((n,r)=>n+r.commands,0),fortune:[...new Set(routes.flatMap(r=>r.fortune))].sort((a,b)=>a-b)}));
