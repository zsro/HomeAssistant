import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import {verifyTrafficFortune} from './verify-traffic-fortune';
const root='frontend/src/features/richman/game/fixtures',manifest=[],routes=[];
for(const i of (process.env.RICHMAN_ROUTES||'10,11,12,13,14,15,16,41,42,43,44').split(',')){
 const dir=`/private/tmp/richman-unified-ui-03i-${i}`,report=JSON.parse(fs.readFileSync(dir+'/results.json','utf8')),replay=JSON.parse(fs.readFileSync(dir+'/replay.json','utf8')) as Replay;
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});
 const e=new GameEngine(nodes,replay.config),checks=[];
 for(const command of replay.commands){const before=e.state,r=e.dispatch(command);assert.ok(r.ok);if(r.ok){const checked=verifyTrafficFortune(before,e.state,r.events);if('traffic' in checked)checks.push(checked);}}
 const copy=replayGame(nodes,replay);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);assert.ok(checks.length);
 const hashes=Object.fromEntries(['state','events'].map(k=>[k,createHash('sha256').update(JSON.stringify(k==='state'?e.state:e.events)).digest('hex')]));
 const row={route:i,seed:replay.config.seed,commands:replay.commands.length,turn:e.state.turn,players:replay.config.characterIds.length,...hashes,fortune:checks.map(c=>c.fortuneId)};
 fs.writeFileSync(`${root}/traffic-fortune-v22-${i}-replay.json`,JSON.stringify(replay,null,2));fs.writeFileSync(`${root}/traffic-fortune-v22-${i}-golden.json`,JSON.stringify(row,null,2));manifest.push(row);routes.push({...row,checks,normalSpeed:report.normalSpeed,map:report.map,cleanup:report.cleanup,errors:report.errors,releases:report.events.filter((e:{type:string;reason?:string})=>e.type==='mobilityChanged'&&e.reason==='离开设施'),purchases:report.purchases,screenshots:dir});
}
fs.writeFileSync(`${root}/traffic-fortune-v22-manifest.json`,JSON.stringify(manifest,null,2));fs.writeFileSync('/private/tmp/richman-03i-verified.json',JSON.stringify(routes,null,2));console.log(JSON.stringify({routes:routes.length,commands:routes.reduce((n,r)=>n+r.commands,0)}));
