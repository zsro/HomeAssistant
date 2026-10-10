import {describe,expect,it} from 'vitest';
import {RichmanAudio,validAudioManifest,audioPreferences} from './audio';
import type {AudioManifest,AudioPacket,AudioPort} from './audio';
import type {AudioCue} from './audio-events';
import {VOICE_IDS} from './audio-events';
class Port {
 src='';volume=1;preload:AudioPort['preload']='none';currentTime=0;plays=0;
 onended:AudioPort['onended']=null;onerror:AudioPort['onerror']=null;result:Promise<void>=Promise.resolve();
 play(){this.plays++;return this.result;}pause(){}load(){}removeAttribute(){this.src='';}
 end(){this.onended?.call(this as unknown as HTMLAudioElement,new Event('ended'));}
 error(){this.onerror?.call(this as unknown as GlobalEventHandlers,new Event('error'));}
}
const manifest:AudioManifest={version:1,eventProfile:'event-audio-v1',music:Array.from({length:8},(_,i)=>({id:`track0${i+2}`,src:`track0${i+2}.mp3`})),effects:{43:'effect-43.wav',48:'effect-48.wav',49:'effect-49.wav',50:'effect-50.wav'},voices:Object.fromEntries(VOICE_IDS.map(id=>[id,`voice-${id}.wav`]))};
const packet=(revision:number,cues:AudioCue[]=[],extra:Partial<AudioPacket>={}):AudioPacket=>({gameId:'one',revision,turn:1,active:true,paused:false,landings:[],cues,...extra});
const voice=(sequence:number,id='1293',priority:1|2=1):AudioCue=>({sequence,id,priority,channel:'voice'});
function setup(){const ports:Port[]=[];const audio=new RichmanAudio(()=>{const p=new Port();ports.push(p);return p;});audio.configure(manifest);audio.receive(packet(0));audio.unlock();return {audio,ports};}
describe('bounded presentation queues; mock media only',()=>{
 it('voice coexists with site effect, ducks only music and restores it on end',()=>{
  const {audio,ports}=setup();audio.receive(packet(1,[voice(2)],{landings:[{sequence:1,node:20,dreaming:false}]}));
  expect(ports.map(p=>p.src.split('/').at(-1))).toEqual(['track02.mp3','effect-48.wav','voice-1293.wav']);expect(ports[0].volume).toBeCloseTo(.35*.35);expect(ports[1].volume).toBe(.65);
  ports[2].end();expect(ports[0].volume).toBe(.35);
 });
 it('keeps three waiting per channel and drops overflow; equal priority FIFO',()=>{
  const {audio,ports}=setup();audio.receive(packet(1,[voice(1),voice(2,'1294'),voice(3,'1295'),voice(4,'1308'),voice(5,'1158')]));
  expect(ports).toHaveLength(2);ports[1].end();ports[2].end();ports[3].end();ports[4].end();expect(ports).toHaveLength(5);expect(ports[4].src).toBe('');
 });
 it('higher priority interrupts lower voice and clears its stale backlog, old ended cannot advance',()=>{
  const {audio,ports}=setup();audio.receive(packet(1,[voice(1),voice(2)]));const oldEnd=ports[1].onended;
  audio.receive(packet(2,[voice(3,'1308',2)]));expect(ports[1].src).toBe('');expect(ports[2].src).toContain('1308');oldEnd?.call(ports[1] as unknown as HTMLAudioElement,new Event('ended'));expect(ports).toHaveLength(3);ports[2].end();expect(ports).toHaveLength(3);
 });
 it('deduplicates same packet and newer revision while permitting effect/voice from one event',()=>{
  const {audio,ports}=setup();const cues=[voice(1),voice(1),{...voice(1,'50',2),channel:'effect' as const}];audio.receive(packet(1,cues));audio.receive(packet(2,cues));expect(ports).toHaveLength(3);ports[1].end();expect(ports).toHaveLength(3);
 });
 it.each(['pause','mute','hidden','replay','flush','turn','reset','dispose','voiceZero'] as const)('%s cancels active/queued voices without stale callbacks',mode=>{
  const {audio,ports}=setup();audio.receive(packet(1,[voice(1),voice(2)]));const ended=ports[1].onended;
  if(mode==='pause')audio.receive(packet(2,[],{paused:true}));
  if(mode==='mute')audio.preferences({muted:true});
  if(mode==='hidden')audio.visibility(true);
  if(mode==='replay')audio.setReplay(true);
  if(mode==='flush')audio.receive(packet(2,[],{flush:true}));
  if(mode==='turn')audio.receive(packet(2,[],{turn:2}));
  if(mode==='reset')audio.receive(packet(0,[],{gameId:'two'}));
  if(mode==='dispose')audio.dispose();
  if(mode==='voiceZero')audio.preferences({voice:0});
  expect(ports[1].src).toBe('');const count=ports.length;ended?.call(ports[1] as unknown as HTMLAudioElement,new Event('ended'));expect(ports).toHaveLength(count);
 });
 it('silent/locked events are consumed, independent voice volume and defaults migrate',()=>{
  const {audio,ports}=setup();audio.preferences({voice:0});audio.receive(packet(1,[voice(1)]));audio.preferences({voice:.2});audio.receive(packet(2,[voice(1)]));expect(ports).toHaveLength(1);audio.receive(packet(3,[voice(2)]));expect(ports[1].volume).toBe(.2);
  expect(audioPreferences('{"music":0.1}').voice).toBe(.8);
 });
 it('voice failure releases all queues; retry does not replay old speech',()=>{
  const {audio,ports}=setup();audio.receive(packet(1,[voice(1),voice(2)]));ports[1].error();expect(audio.status.failed).toBe(true);expect(ports.every(p=>!p.src)).toBe(true);audio.unlock();expect(ports).toHaveLength(3);
 });
 it('late rejected old voice cannot block new game',async()=>{
  let reject!:(error:unknown)=>void;const ports:Port[]=[];
  const audio=new RichmanAudio(()=>{const p=new Port();if(ports.length===1)p.result=new Promise((_,r)=>{reject=r;});ports.push(p);return p;});audio.configure(manifest);audio.receive(packet(0));audio.unlock();audio.receive(packet(1,[voice(1)]));audio.receive(packet(0,[],{gameId:'two'}));reject(new DOMException('blocked','NotAllowedError'));await Promise.resolve();await Promise.resolve();expect(audio.status.blocked).toBe(false);expect(ports[2].src).toContain('track02');
 });
 it('rejects unsafe/partial profile, supports foundation assets with speech absent',()=>{
  expect(validAudioManifest(manifest)).toBe(true);expect(validAudioManifest({...manifest,voices:{1293:'https://bad.test/a.wav'}})).toBe(false);expect(validAudioManifest({...manifest,voices:{}})).toBe(false);
  const {audio,ports}=setup();audio.configure({...manifest,eventProfile:undefined,voices:undefined});audio.receive(packet(1,[voice(1)]));expect(ports).toHaveLength(1);
 });
});
