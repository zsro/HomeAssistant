/** Find a previously recorded legal 4->5 paid upgrade; read-only discovery. */
import {readFileSync,readdirSync} from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const root='frontend/src/features/richman/game/fixtures';
const files=readdirSync(root).filter(f=>f.endsWith('-replay.json')).map(f=>{
 const o=JSON.parse(readFileSync(root+'/'+f,'utf8'));return{file:f,replay:o};
}).filter(x=>x.replay.commands.length<=10000).sort((a,b)=>a.replay.commands.length-b.replay.commands.length);
for(const {file,replay} of files){
 try{
  const e=new GameEngine(nodes,replay.config);
  for(let i=0;i<replay.commands.length;i++){
   const before=e.state,r=e.dispatch(replay.commands[i]);if(!r.ok)break;
   for(const event of r.events)if(event.type==='propertySettled'&&event.operation==='upgrade'){
    const old=before.economy?.properties.find(p=>p.id===event.propertyId),now=e.state.economy?.properties.find(p=>p.id===event.propertyId);
    if(old?.level===4&&now?.level===5&&PROPERTY_CATALOG.properties.some(p=>p.id===event.propertyId&&p.kind==='land')){console.log(JSON.stringify({file,commands:i+1,propertyId:event.propertyId,playerId:event.playerId,rulesId:replay.rulesId}));process.exit(0)}
   }
  }
 }catch{}
}
console.log('No paid 4->5 upgrade in <=10000-command saved routes');
