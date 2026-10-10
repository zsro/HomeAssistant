import {readFileSync} from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const file=process.env.RICHMAN_PLAN;
if(!file)throw Error('RICHMAN_PLAN required');
const p=JSON.parse(readFileSync(file,'utf8')),replay=p.replay??p,e=new GameEngine(nodes,replay.config);
let found=0;
for(let i=0;i<replay.commands.length;i++){
 const c=replay.commands[i],before=e.state,r=e.dispatch(c);if(!r.ok)throw Error(JSON.stringify({i,r}));
 if(r.events.some(ev=>ev.type==='g7Notice'&&ev.message.startsWith('时光机：'))){
  const ids=(s:typeof before)=>[...(s.g6?.gods??[]),...(s.g6?.objects??[])].map(g=>g.id).sort();
  const b=ids(before),a=ids(e.state);console.log(JSON.stringify({index:i,command:c.action,before:b,after:a,changed:b.join()!=a.join(),beforeObjects:before.g6?.objects,afterObjects:e.state.g6?.objects}));found++;
 }
}
console.log(JSON.stringify({commands:replay.commands.length,found}));
