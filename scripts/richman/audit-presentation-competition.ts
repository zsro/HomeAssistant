/** Read-only audit of cues produced by already captured real browser replays.
 * Multiple cues mean only a potential competitor, never proof of timed playback.
 */
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {eventAudio} from '../../frontend/src/features/richman/audio-events';
import {landingSound} from '../../frontend/src/features/richman/audio';
import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const dir='frontend/src/features/richman/game/fixtures';
const rows=[];
for(const file of readdirSync(dir).filter(f=>f.startsWith('presentation-')&&f.endsWith('-replay.json')).sort()){
 const bytes=readFileSync(`${dir}/${file}`),replay=JSON.parse(bytes.toString()),engine=new GameEngine(nodes,replay.config);
 const groups=new Map<string,{index:number;id:string;priority:number}[]>();let epoch=0;
 for(const [index,command] of replay.commands.entries()){
  const before=engine.state,result=engine.dispatch(command);assert.ok(result.ok,`${file} ${index}`);
  const after=engine.state;
  if(command.action.type==='pause'||result.events.some(e=>e.type==='effectCancelled'||e.type==='effectConsumed'&&e.itemId==='tool:10'))epoch++;
  const cues=eventAudio(before,after,result.events);
  for(const e of result.events)if(e.type==='landed'&&!before.g2?.players[e.playerId]?.dream){const id=landingSound(e.node);if(id)cues.push({sequence:e.sequence,channel:'effect',id,priority:1})}
  for(const cue of cues){const key=`${after.turn}/${epoch}/${cue.channel}`,row=groups.get(key)??[];row.push({index:index+1,id:cue.id,priority:cue.priority});groups.set(key,row)}
 }
 rows.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),commands:replay.commands.length,cueGroups:groups.size,potentialCompetitors:[...groups].filter(([,cues])=>cues.length>1).map(([turnEpochChannel,cues])=>({turnEpochChannel,cues}))});
}
const overlap=PROPERTY_CATALOG.properties.filter(p=>p.kind==='land').flatMap(p=>p.nodeIds.filter(n=>landingSound(n)!==null).map(node=>({property:p.id,node})));
const result={scope:'read-only replay-to-cue audit; no browser rerun, no timed queue acceptance',channelIsolation:'effect and voice are independent; same revision in distinct channels is not competing',flushEpochs:'pause commands, cancellation and time machine separate queue epochs',ordinaryLandLandingSoundOverlap:overlap,routes:rows,commands:rows.reduce((sum,row)=>sum+row.commands,0),potentialCompetitors:rows.reduce((sum,row)=>sum+row.potentialCompetitors.length,0)};
writeFileSync('/private/tmp/richman-native-tab/competition-audit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({routes:rows.length,commands:result.commands,potentialCompetitors:result.potentialCompetitors,ordinaryLandLandingSoundOverlap:overlap}));
