/** Verify a real UI 4->5 ordinary-land upgrade and character voice. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {GameEngine,replayGame,type Command} from '../../frontend/src/features/richman/game/engine';
import {eventAudio} from '../../frontend/src/features/richman/audio-events';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import catalog from '../../frontend/src/features/richman/audio-catalog.json';

const character=process.env.RICHMAN_CHARACTER;
assert.ok(character&&character in catalog.characters);
const dir=`/private/tmp/richman-presentation-ui-upgrade-${process.env.RICHMAN_OUTPUT_TAG??character}`;
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const plan=read(`/private/tmp/presentation-paid-upgrade-${character}-voice.json`);
const replay=read(dir+'/replay.json'),report=read(dir+'/results.json'),media=read(dir+'/media.json');
assert.deepEqual(replay.config.characterIds,plan.replay.config.characterIds);
const normalize=(command:Command)=>{
  const action=structuredClone(command.action) as unknown as Record<string,unknown>;
  delete action.decisionId;delete action.token;
  if(action.action)delete (action.action as Record<string,unknown>).decisionId;
  return {playerId:command.playerId,action};
};
assert.deepEqual(replay.commands.filter((command:Command)=>command.action.type!=='pause').map(normalize),plan.replay.commands.map(normalize));
const engine=new GameEngine(nodes,replay.config);
const voice=String((catalog.characters as Record<string,Record<string,number>>)[character]['15']);
const targetPlayerId=`player-${plan.replay.config.characterIds.indexOf(character)+1}`;
let upgrades=0,voiceCues=0,paidAmount=0;
for(const command of replay.commands){
  const before=engine.state,result=engine.dispatch(command);
  assert.ok(result.ok);
  for(const event of result.events)if(event.type==='propertySettled'&&event.operation==='upgrade'&&event.playerId===targetPlayerId){
    const old=before.economy?.properties.find(property=>property.id===event.propertyId);
    const now=engine.state.economy?.properties.find(property=>property.id===event.propertyId);
    if(old?.level===4&&now?.level===5){upgrades++;paidAmount=event.amount;assert.ok(paidAmount>0);}
  }
  voiceCues+=eventAudio(before,engine.state,result.events).filter(cue=>cue.channel==='voice'&&cue.id===voice).length;
}
assert.equal(upgrades,1);assert.equal(voiceCues,1);
const played=media.events.filter((event:{type:string;src:string})=>event.type==='playing'&&event.src.endsWith(`/voice-${voice}.wav`));
assert.ok(played.length>0,`voice-${voice} must actually play`);
const full=replayGame(nodes,replay);
assert.deepEqual(full.state,engine.state);assert.deepEqual(full.events,engine.events);
const index=plan.index+2;
const prefix=replayGame(nodes,{...replay,commands:replay.commands.slice(0,index)});
for(const command of replay.commands.slice(index))assert.ok(prefix.dispatch(command).ok);
assert.deepEqual(prefix.state,engine.state);assert.deepEqual(prefix.events,engine.events);
assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});
const sha256=createHash('sha256').update(JSON.stringify(replay)).digest('hex');
const receipt={character,targetPlayerId,voice,actualCommands:replay.commands.length,businessCommands:plan.replay.commands.length,upgradeCommandIndex:index,paidAmount,paidOrdinaryUpgrade4to5:true,voiceCues,voicePlayingEvents:played.length,commandsMatchLegalPlan:true,fullReplay:true,prefixReplay:true,mediaReleased:report.media.released,cleanup:report.cleanup,errors:report.errors,replaySHA256:sha256};
writeFileSync(`frontend/src/features/richman/game/fixtures/presentation-v47-paid-upgrade-${character}-replay.json`,JSON.stringify(replay));
writeFileSync(`frontend/src/features/richman/game/fixtures/presentation-v47-paid-upgrade-${character}-manifest.json`,JSON.stringify(receipt,null,2)+'\n');
writeFileSync(dir+'/verified.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
