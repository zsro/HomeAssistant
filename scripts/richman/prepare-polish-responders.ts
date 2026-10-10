import {readFileSync,writeFileSync} from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
for(const [name,file,length,mode] of [['auction','operating-news-v17',30,'operatingNews'],['reaction','magic-actions-v37-nested',284,'magicActions']] as const){
 const r=JSON.parse(readFileSync(`frontend/src/features/richman/game/fixtures/${file}-replay.json`,'utf8'));r.commands=r.commands.slice(0,length);
 const e=new GameEngine(nodes,r.config),targets=[];
 for(let i=0;i<r.commands.length;i++){const c=r.commands[i],s=e.state;if(c.action.type===name)targets.push({index:i,phase:s.phase,active:s.players[s.active].id,actor:c.playerId,nonCurrent:c.playerId!==s.players[s.active].id});if(!e.dispatch(c).ok)throw Error('Invalid prefix');}
 if(!targets.some(t=>t.nonCurrent))throw Error('No non-current responder');
 writeFileSync(`/private/tmp/s3-05c-${name}-plan.json`,JSON.stringify({source:file,mode,replay:r,targets}));console.log({name,length,targets});
}
