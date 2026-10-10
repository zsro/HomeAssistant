/** Planning only, never browser acceptance. */
import {readFileSync} from 'node:fs';import {verifyComputerMobility} from './verify-computer-mobility';
for(const route of (process.env.RICHMAN_ROUTES??'2,3,4').split(',')){const p=JSON.parse(readFileSync('/private/tmp/computer-mobility-'+route+'.json','utf8'));const r=await verifyComputerMobility(p.replay);console.log(route,JSON.stringify({commands:r.commands,uses:r.uses,cancellations:r.cancellations,acquisitions:r.acquisitions}));}
