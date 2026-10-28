import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import {verifyCalendar} from './verify-calendar';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const root='frontend/src/features/richman/game/fixtures',manifest=[],routes=[];
for(const route of (process.env.RICHMAN_ROUTES||'loan,year,leap').split(',')){
 const dir='/private/tmp/richman-unified-ui-03k-'+route,report=JSON.parse(fs.readFileSync(dir+'/results.json','utf8')),replay=JSON.parse(fs.readFileSync(dir+'/replay.json','utf8')) as Replay;
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});assert.equal(report.normalSpeed,true);const e=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=e.state,r=e.dispatch(command);assert.ok(r.ok);if(r.ok)for(const c of verifyCalendar(before,e.state,r.events))checks.add(c);}
 const copy=replayGame(nodes,replay);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);
 const row={route,seed:replay.config.seed,players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,startDate:replay.config.startDate,endDate:e.state.calendar!.date,elapsedDays:e.state.calendar!.elapsedDays,state:createHash('sha256').update(JSON.stringify(e.state)).digest('hex'),events:createHash('sha256').update(JSON.stringify(e.events)).digest('hex')};
 fs.writeFileSync(`${root}/calendar-v24-${route}-replay.json`,JSON.stringify(replay,null,2));fs.writeFileSync(`${root}/calendar-v24-${route}-golden.json`,JSON.stringify(row,null,2));manifest.push(row);routes.push({...row,checks:[...checks],normalSpeed:true,map:report.map,cleanup:report.cleanup,errors:report.errors,screenshots:dir,calendarEvents:e.events.filter(e=>['monthlyInterest','loanNotice','loanDateChanged','loanChanged'].includes(e.type)),tradeEvents:e.events.filter(e=>e.type==='stockTraded')});
}
fs.writeFileSync(root+'/calendar-v24-manifest.json',JSON.stringify(manifest,null,2));fs.writeFileSync('/private/tmp/richman-03k-verified.json',JSON.stringify(routes,null,2));console.log(JSON.stringify({routes:routes.length,commands:routes.reduce((n,r)=>n+r.commands,0)}));
