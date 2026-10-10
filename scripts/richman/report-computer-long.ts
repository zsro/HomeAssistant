import {planComputer} from './plan-computer';
import {writeFileSync} from 'node:fs';
const report=[];
for(const n of [2,3,4]){const p=planComputer(n,'computer-'+n,300);const r={players:n,commands:p.replay.commands.length,turn:p.state.turn,phase:p.state.phase,winner:p.state.finance!.winnerId,kinds:p.kinds};report.push(r);console.log(r);}
writeFileSync('/private/tmp/computer-long.json',JSON.stringify(report,null,2));
