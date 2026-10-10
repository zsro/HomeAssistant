import {planComputerTools} from './plan-computer-tools';
import {writeFileSync} from 'node:fs';
for(const i of [0]){
 const p=planComputerTools(2,'tools-refill-'+i,90),event=p.events.find(e=>e.type==='itemBought'&&e.itemId==='tool:08'&&e.playerId==='player-2');
 if(event){writeFileSync('/private/tmp/computer-tools-refill.json',JSON.stringify(p));console.log('FOUND',i,p.replay.commands.length,p.state.turn,event);break;}
 console.log('searched',i);
}
