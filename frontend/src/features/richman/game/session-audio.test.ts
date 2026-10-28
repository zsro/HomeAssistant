import { expect, it } from 'vitest';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import type { Manifest } from '../types';
import type { AudioPacket } from '../audio';
import { GameSession } from './session';
import { replayGame } from './engine';
const manifest:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['xiaomei','tuu','chyan','salonbus'].map(id=>({id,name:id,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
function create(){let serial=0;return new GameSession(manifest,{id:()=>`game-${++serial}`,seed:()=> 'audio-boundary'},'surrender');}
it('presentation observers are detached, non-throwing to rules, RNG and replay',()=>{
  const live=create(),silent=create();const packets:AudioPacket[]=[];
  live.onPresentation=p=>{packets.push(structuredClone(p));p.landings.length=0;p.gameId='malicious';throw new Error('media failed');};
  for(const s of [live,silent]){s.roll();for(let i=0;i<400&&!['turnEnd','property','bank','news','fortune','shop','magic','lottery','company','commerce','minigame','facility'].includes(s.state.phase);i++){if(s.state.phase==='choosing')s.choose(s.state.choices[0]);s.tick(50);}s.pause(true);s.pause(false);}
  expect(live.gameState).toEqual(silent.gameState);expect(live.exportReplay()).toEqual(silent.exportReplay());
  expect(packets.some(p=>p.landings.length>0)).toBe(true);expect(packets.some(p=>p.paused)).toBe(true);
  const count=packets.length;const replay=live.exportReplay()!;
  expect(replayGame(nodes,replay).state).toEqual(live.gameState);expect(packets).toHaveLength(count);
  live.reset();expect(packets.at(-1)?.gameId).not.toBe(packets[0].gameId);expect(packets.at(-1)?.landings).toEqual([]);
  const after=packets.length;live.dispose();live.tick(1000);live.roll();expect(packets).toHaveLength(after);
});
it('sandbox remains silent and rejected commands emit no presentation',()=>{
  const live=create();const packets:AudioPacket[]=[];live.onPresentation=p=>packets.push(p);
  live.choose(999);expect(packets).toHaveLength(0);
  live.start({mode:'sandbox',seed:'sandbox',characterIds:['xiaomei','tuu']});expect(packets.at(-1)?.active).toBe(false);
});
