import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import {verifyCompany} from './verify-company';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const root='frontend/src/features/richman/game/fixtures',manifest=[],routes=[];
for(const route of (process.env.RICHMAN_ROUTES||'2,3,4').split(',')){
 const dir='/private/tmp/richman-unified-ui-03n-'+route,report=JSON.parse(fs.readFileSync(dir+'/results.json','utf8')),replay=JSON.parse(fs.readFileSync(dir+'/replay.json','utf8')) as Replay;
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});assert.equal(report.normalSpeed,true);const e=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=e.state,r=e.dispatch(command);assert.ok(r.ok);if(r.ok)for(const c of verifyCompany(before,e.state,r.events))checks.add(c);}
 const copy=replayGame(nodes,replay);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);
 const row={route,seed:replay.config.seed,players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,startDate:replay.config.startDate,endDate:e.state.calendar!.date,dividends:e.state.news!.business!.dividends,state:createHash('sha256').update(JSON.stringify(e.state)).digest('hex'),events:createHash('sha256').update(JSON.stringify(e.events)).digest('hex')};
 fs.writeFileSync(`${root}/company-v27-${route}-replay.json`,JSON.stringify(replay,null,2));fs.writeFileSync(`${root}/company-v27-${route}-golden.json`,JSON.stringify(row,null,2));manifest.push(row);routes.push({...row,checks:[...checks],normalSpeed:true,map:report.map,cleanup:report.cleanup,errors:report.errors,screenshots:dir,serviceEvents:e.events.filter(e=>e.type==='companyService'||e.type==='companyDividends'||e.type==='stockTraded'||e.type==='newsResolved'||e.type==='lotteryDrawn')});
}
fs.writeFileSync(root+'/company-v27-manifest.json',JSON.stringify(manifest,null,2));fs.writeFileSync('/private/tmp/richman-03n-verified.json',JSON.stringify(routes,null,2));console.log(JSON.stringify({routes:routes.length,commands:routes.reduce((n,r)=>n+r.commands,0)}));
