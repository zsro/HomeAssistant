/** Fixed legal routes used by this batch; generation alone is not UI acceptance. */
import {planComputerRent} from './plan-computer-rent';
import {planRentPayer} from './plan-computer-rent-payer';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import {writeFileSync} from 'node:fs';
for(const route of ['2','3a','payer']){
 const p=route==='payer'?planRentPayer('reaction-debt-0','debt',4,4000):planComputerRent(route==='2'?2:3,route==='2'?'rent-ai-2-4':'rent-ai-3-13',3500,route==='2'?['free','redirect']:['redirect']);
 if(!p)throw Error('Missing route '+route);
 const cross:unknown[]=[],e=new GameEngine(nodes,p.replay.config);
 for(let i=0;i<p.replay.commands.length;i++){
  const c=p.replay.commands[i],s=e.state,pending=s.pending,ai=p.replay.control.computerIds.includes(s.players.find(p=>p.id===c.playerId)!.characterId);
  if(pending?.kind==='reaction'||pending?.kind==='debt'||pending?.kind==='property'&&pending.operation==='rent')cross.push({index:i,kind:pending.kind,computer:ai,active:s.players[s.active].id,actor:c.playerId});
  if(!e.dispatch(c).ok)throw Error('Invalid route');
 }
 writeFileSync('/private/tmp/computer-rent-'+route+'.json',JSON.stringify({...p,cross}));console.log(route,p.replay.commands.length,p.state.turn,p.coverage);
}
