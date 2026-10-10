/** Read-only guard: legal paid 4->5 upgrades must also emit the mapped voice cue. */
import {readFileSync} from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {eventAudio} from '../../frontend/src/features/richman/audio-events';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
for(const character of (process.env.RICHMAN_CHARACTERS??'xiaomei,tuu,chyan,salonbus').split(',')){
  const plan=JSON.parse(readFileSync(`/private/tmp/presentation-paid-upgrade-${character}-voice.json`,'utf8'));
  const engine=new GameEngine(nodes,plan.replay.config);let cue:unknown=null,paid=0;
  for(const [index,command] of plan.replay.commands.entries()){
    const before=engine.state,result=engine.dispatch(command);if(!result.ok)throw Error(character+' '+index);
    if(index+1===plan.index){
      cue=eventAudio(before,engine.state,result.events);
      const event=result.events.find(event=>event.type==='propertySettled'&&event.operation==='upgrade');
      if(event?.type==='propertySettled')paid=event.amount;
    }
  }
  console.log(JSON.stringify({character,seed:plan.seed,index:plan.index,paid,cue}));
}
