import {readFileSync} from 'node:fs';import {verifyComputerResearch} from './verify-computer-research';
for(const n of [2,3,4]){const p=JSON.parse(readFileSync('/private/tmp/computer-research-'+n+'.json','utf8'));const {commands,auto,production,uses,prefixes}=await verifyComputerResearch(p.replay,false);console.log(JSON.stringify({domainPlanOnly:true,n,commands,auto,production,uses,prefixes}));}
