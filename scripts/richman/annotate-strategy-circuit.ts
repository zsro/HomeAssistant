import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {readFileSync,writeFileSync} from 'node:fs';
for(const route of (process.env.RICHMAN_ROUTES??'liquidation').split(',')){
 const path='/private/tmp/strategy-circuit-'+route+'.json',p=JSON.parse(readFileSync(path,'utf8')),e=new GameEngine(nodes,p.replay.config);p.cross=[];
 for(let i=0;i<p.replay.commands.length;i++){const c=p.replay.commands[i],s=e.state,active=s.players[s.active].id;if(c.playerId!==active&&c.action.type!=='animationDone')p.cross.push({index:i,active,actor:c.playerId,kind:s.pending?.kind,computer:p.replay.control.computerIds.includes(s.players.find(x=>x.id===c.playerId)!.characterId)});if(!e.dispatch(c).ok)throw Error('Invalid route');}
 writeFileSync(path,JSON.stringify(p));console.log(route,p.cross);
}
