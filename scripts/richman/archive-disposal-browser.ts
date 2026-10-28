import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import {verifyDisposal} from './verify-disposal';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const source='/private/tmp/richman-unified-ui-03t',replay=JSON.parse(fs.readFileSync(source+'/replay.json','utf8')) as Replay,e=replayGame(nodes,replay),engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);if(!r.ok)throw Error(r.reason);for(const c of verifyDisposal(before,engine.state,r.events))checks.add(c);}
if(checks.size!==6)throw Error('Missing check: '+JSON.stringify([...checks]));
const row={route:'3',seed:replay.config.seed,players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,endDate:e.state.calendar!.date,state:createHash('sha256').update(JSON.stringify(e.state)).digest('hex'),events:createHash('sha256').update(JSON.stringify(e.events)).digest('hex'),checks:[...checks],receipt:e.state.finance!.disposal!.last};
const dest='frontend/src/features/richman/game/fixtures';fs.copyFileSync(source+'/replay.json',dest+'/disposal-v33-3-replay.json');fs.writeFileSync(dest+'/disposal-v33-manifest.json',JSON.stringify([row],null,2)+'\n');console.log(JSON.stringify(row));
