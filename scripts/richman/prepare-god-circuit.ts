/** Fixed legal plans only. UI acceptance is recorded separately. */
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {planGodCircuit} from './plan-god-circuit';
import {planGodRestore} from './plan-god-restore';
for(const route of ['pair','full-known','restore']){
 const p=route==='restore'?planGodRestore('god-restore-4-0',4):planGodCircuit(route==='pair'?'god-circuit-pair-2':'god-circuit-full-29',route==='pair'?2:3,route==='pair'?'pair':'full',5000);
 assert.ok(p);
 const marks=route==='restore'?(()=>{const ev=p.events.find(e=>e.type==='g7Notice'&&e.message.startsWith('时光机：'))!;const index=p.replay.commands.findIndex(c=>c.id===ev.commandId);return[{index,kind:'before-time-special-world'},{index:index+1,kind:'after-time-special-world'}];})():('marks' in p?p.marks:[]);
 const path='/private/tmp/god-circuit-'+route+'.json';
 if(existsSync(path))assert.deepEqual(p.replay,JSON.parse(readFileSync(path,'utf8')).replay,'fixed legal route must stay identical');
 writeFileSync(path,JSON.stringify({...p,marks}));console.log(route,p.replay.commands.length);
}
