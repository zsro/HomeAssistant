import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import {verifyEstateSales} from './verify-estate-sales';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const source='/private/tmp/richman-unified-ui-03s',replay=JSON.parse(fs.readFileSync(source+'/replay.json','utf8')) as Replay,e=replayGame(nodes,replay),engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);if(!r.ok)throw Error(r.reason);for(const c of verifyEstateSales(before,engine.state,r.events))checks.add(c);}
const row={route:'3',seed:replay.config.seed,players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,endDate:e.state.calendar!.date,state:createHash('sha256').update(JSON.stringify(e.state)).digest('hex'),events:createHash('sha256').update(JSON.stringify(e.events)).digest('hex'),checks:[...checks]};
if(checks.size!==5)throw Error('Missing arithmetic check: '+JSON.stringify([...checks]));
const dest='frontend/src/features/richman/game/fixtures';fs.copyFileSync(source+'/replay.json',dest+'/estate-sales-v32-3-replay.json');fs.writeFileSync(dest+'/estate-sales-v32-manifest.json',JSON.stringify([row],null,2)+'\n');console.log(JSON.stringify(row));
