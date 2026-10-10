/** Engine planning check only; never a browser acceptance or fixture archive. */
import {readFileSync} from 'node:fs';import {verifyComputerInventory} from './verify-computer-inventory';
for(const route of ['2','3','4','manual']){const p=JSON.parse(readFileSync('/private/tmp/computer-inventory-'+route+'.json','utf8'));const r=await verifyComputerInventory(p.replay);console.log(route,r.commands,r.uses.length,r.prefixes.length);}
