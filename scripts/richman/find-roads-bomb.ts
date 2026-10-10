import {planComputerRoads} from './plan-computer-roads';import {writeFileSync} from 'node:fs';
for(let i=0;i<40;i++){const p=planComputerRoads(2,'roads-bomb-'+i,['tool:04','bomb-moved'],1400);console.log(i,p.used,p.replay?.commands.length);if(p.replay){writeFileSync('/private/tmp/computer-roads-bomb.json',JSON.stringify(p));break;}}
