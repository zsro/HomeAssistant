import fs from 'node:fs';
import {replayGame} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const selections: {file:string;seed:string;stop:number;required:number[]}[]=JSON.parse(fs.readFileSync(process.env.RICHMAN_SELECTIONS||'/private/tmp/richman-03f-search/selected.json','utf8'));
for(const route of selections){const plan=JSON.parse(fs.readFileSync(route.file,'utf8'));plan.replay.commands=plan.replay.commands.slice(0,route.stop);const e=replayGame(nodes,plan.replay);if(e.state.phase!=='turnEnd')throw Error('Route must end after acknowledgement');fs.writeFileSync('/private/tmp/richman-unified-03f-'+route.seed.split('-').at(-1)+'.json',JSON.stringify({replay:plan.replay,state:e.state,events:e.events,used:[]},null,2));}
console.log(JSON.stringify(selections.map(r=>({seed:r.seed,commands:r.stop,required:r.required}))));
