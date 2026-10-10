/** Plans use only engine-accepted commands; these are not browser acceptance. */
import {writeFileSync} from 'node:fs';import {planComputerGods} from './plan-computer-gods';
for(const[count,seed,required]of [[2,'gods-2-5',['card:22','card:23']],[4,'gods-4-0',['card:25']]] as const){const p=planComputerGods(count,seed,required,1800);if(!p.replay)throw Error('Missing route '+count);writeFileSync('/private/tmp/computer-gods-'+count+'.json',JSON.stringify(p));console.log(count,p.replay.commands.length,p.used);}

const p=planComputerGods(3,'gods-3-4',['card:24'],3000,true);if(!p.replay)throw Error('Missing ally-red route');writeFileSync('/private/tmp/computer-gods-3.json',JSON.stringify(p));console.log(3,p.replay.commands.length,p.used);
