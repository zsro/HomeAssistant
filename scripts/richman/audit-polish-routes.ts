/** Read-only existing legal prefixes; never inject these states into the browser. */
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const root='frontend/src/features/richman/game/fixtures';const rows=[];
for(const file of readdirSync(root).filter(n=>/^(computer-circuit|reaction-circuit|polish).*replay.json$/.test(n))){
 const r=JSON.parse(readFileSync(root+'/'+file,'utf8')),e=new GameEngine(nodes,r.config);const found=new Set();
 for(let i=0;i<r.commands.length;i++){
  const c=r.commands[i],s=e.state,kind=s.pending?.kind;
  if(['reaction','auction','property'].includes(kind??'')&&c.playerId!==s.players[s.active].id&&c.action.type!=='animationDone'&&!found.has(kind)){
   found.add(kind);rows.push({file,index:i,kind,active:s.players[s.active].id,actor:c.playerId,action:c.action.type,phase:s.phase,control:r.control??null});
  }
  if(!e.dispatch(c).ok)throw Error(file+':'+i);
 }
}
writeFileSync('/private/tmp/s3-05c-route-audit.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
