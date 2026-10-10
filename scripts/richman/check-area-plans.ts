/** Domain planning check only, never browser acceptance. */
import {readFileSync} from 'node:fs';import {verifyComputerArea} from './verify-computer-area';
for(const route of ['2','3','4','manual']){const p=JSON.parse(readFileSync('/private/tmp/computer-area-'+route+'.json','utf8'));const r=await verifyComputerArea(p.replay);console.log(route,JSON.stringify({commands:r.commands,uses:r.uses,cancellations:r.cancellations,acquisitions:r.acquisitions}));}
