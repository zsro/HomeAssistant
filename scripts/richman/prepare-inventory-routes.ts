import {writeFileSync} from 'node:fs';import {planComputerInventory} from './plan-computer-inventory';
for(const[count,seed]of [[2,'inventory-2-22'],[3,'inventory-3-4'],[4,'inventory-4-4']] as const){const p=planComputerInventory(count,seed,['card:13','card:29']);if(!p.replay)throw Error('Missing route '+count);writeFileSync('/private/tmp/computer-inventory-'+count+'.json',JSON.stringify(p));console.log(count,p.replay.commands.length,p.used,p.cancelled);}

import {planComputerInventoryManual} from './plan-computer-inventory-manual';
const manual=planComputerInventoryManual(3,'inventory-manual-3-8',[],900);if(!manual.replay)throw Error('Missing manual route');writeFileSync('/private/tmp/computer-inventory-manual.json',JSON.stringify(manual));console.log('manual',manual.replay.commands.length,manual.cancelled);
