/** Deterministic legal plans only; acceptance must come from exported browser commands. */
import {strict as assert} from 'node:assert';
import {writeFileSync} from 'node:fs';
import {planComputer} from './plan-computer';
for(const n of [2,3,4]){
 const p=planComputer(n,'computer-terminal-'+n+'-0',160);
 assert.equal(p.state.phase,'finished');
 writeFileSync('/private/tmp/computer-circuit-terminal-'+n+'.json',JSON.stringify(p));
 console.log(n,p.state.turn,p.replay.commands.length);
}
