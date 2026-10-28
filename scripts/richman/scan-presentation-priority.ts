/** Locate real low-priority landing / high-priority property cues within one turn. */
import {readFileSync} from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {eventAudio, type AudioCue} from '../../frontend/src/features/richman/audio-events';
import {landingSound} from '../../frontend/src/features/richman/audio';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const file=process.env.RICHMAN_PLAN;if(!file)throw Error('RICHMAN_PLAN required');
const plan=JSON.parse(readFileSync(file,'utf8'));
const engine=new GameEngine(nodes,plan.replay.config),turns=new Map<number,{low:{index:number;node:number;sound:string}[];high:{index:number;cue:AudioCue}[]}>();
for(const [index,command] of plan.replay.commands.entries()){
  const before=engine.state,turn=before.turn,result=engine.dispatch(command);if(!result.ok)throw Error(String(index));
  const row=turns.get(turn)??{low:[],high:[]};turns.set(turn,row);
  for(const event of result.events)if(event.type==='landed'){
    const sound=landingSound(event.node);if(sound)row.low.push({index:index+1,node:event.node,sound});
  }
  for(const cue of eventAudio(before,engine.state,result.events))if(cue.priority===2&&cue.channel==='effect')row.high.push({index:index+1,cue});
}
const lowThenHigh=[...turns].flatMap(([turn,row])=>row.low.flatMap(low=>row.high.filter(high=>high.index>low.index).map(high=>({turn,low,high}))));
const highThenLow=[...turns].flatMap(([turn,row])=>row.high.flatMap(high=>row.low.filter(low=>low.index>high.index).map(low=>({turn,high,low}))));
const multipleHigh=[...turns].filter(([,row])=>row.high.length>1).map(([turn,row])=>({turn,high:row.high}));
console.log(JSON.stringify({commands:plan.replay.commands.length,lowThenHigh,highThenLow,multipleHigh},null,2));
