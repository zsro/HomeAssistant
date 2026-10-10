import {planSiteCircuit} from './plan-site-circuit';
import {writeFileSync} from 'node:fs';
const cases=[[2,'circuit'],[3,'facility'],[4,'nested']]as const;
for(const[count,goal]of cases){let best:ReturnType<typeof planSiteCircuit>=null;for(let i=0;i<12;i++){const r=planSiteCircuit(`site-circuit-${i}`,count,2200,goal);if(r&&(!best||r.state.turn<best.state.turn)){best=r;console.log('candidate',count,i,r.state.turn,r.replay.commands.length);}if(best&&best.state.turn<(goal==='facility'?90:count*18))break;}if(!best)throw Error('No route '+goal);writeFileSync(`/private/tmp/richman-unified-03ac-${count}.json`,JSON.stringify(best));console.log('selected',count,best.replay.config.seed,best.state.turn,best.replay.commands.length);}
