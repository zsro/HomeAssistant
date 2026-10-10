import {planComputer} from './plan-computer';import {GameEngine} from '../../frontend/src/features/richman/game/engine';import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';import {writeFileSync} from 'node:fs';
for(const seed of [7]){
 const plan=planComputer(4,'mixed-auction-'+seed,70),e=new GameEngine(nodes,plan.replay.config);let found=false,saved=false;
 for(const c of plan.replay.commands){const s=e.state,p=s.pending,ai=plan.replay.control.computerIds.includes(s.players.find(p=>p.id===c.playerId)!.characterId);if(p?.kind==='auction'&&c.playerId!==s.players[s.active].id&&ai)found=true;e.dispatch(c);const after=e.state;
  if(found&&after.phase==='turnEnd'&&!plan.replay.control.computerIds.includes(after.players[after.active].characterId)){writeFileSync('/private/tmp/computer-circuit-auction.json',JSON.stringify({replay:{...e.exportReplay(),control:plan.replay.control},state:after,events:e.events}));console.log('FOUND',seed,after.turn,e.exportReplay().commands.length);saved=true;break;}}
 if(saved)break;console.log('search',seed);
}
