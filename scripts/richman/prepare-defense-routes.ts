/** Fixed ordinary-command plans; browser exports are required for acceptance. */
import {writeFileSync} from 'node:fs';import {planComputerDefense} from './plan-computer-defense';
for(const [count,seed,item] of [[2,'defense-2-1','card:17'],[3,'defense-3-1','card:16'],[4,'defense-4-0','card:17']] as const){const p=planComputerDefense(count,seed,item);if(!p)throw Error('Missing legal defense route '+count);writeFileSync('/private/tmp/computer-defense-'+count+'.json',JSON.stringify(p));console.log(count,p.replay.commands.length,p.state.turn);}
