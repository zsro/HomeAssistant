import { describe, expect, it } from 'vitest';
import { RichmanAudio, audioPreferences, landingSound, validAudioManifest } from './audio';
import type { AudioManifest, AudioPacket, AudioPort } from './audio';
const manifest: AudioManifest = {version:1,music:Array.from({length:8},(_,i)=>({id:`track0${i+2}`,src:`track0${i+2}.mp3`})),effects:{43:'effect-43.wav',48:'effect-48.wav'}};
class Port {
  src=''; volume=1; preload:AudioPort['preload']='none'; currentTime=0; plays=0; pauses=0; loads=0;
  onended: AudioPort['onended']=null; onerror: AudioPort['onerror']=null;
  result:Promise<void>=Promise.resolve();
  play(){this.plays++;return this.result;}
  pause(){this.pauses++;}
  load(){this.loads++;}
  removeAttribute(){this.src='';}
  end(){this.onended?.call(this as unknown as HTMLAudioElement,new Event('ended'));}
  error(){this.onerror?.call(this as unknown as GlobalEventHandlers,new Event('error'));}
}
function setup() {
  const ports:Port[]=[];
  const audio=new RichmanAudio(()=>{const p=new Port();ports.push(p);return p;});
  audio.configure(manifest);
  return {audio,ports};
}
const packet=(revision=0, extra:Partial<AudioPacket>={}):AudioPacket=>({gameId:'one',revision,paused:false,active:true,landings:[],...extra});
const landing=(revision=1,node=13):AudioPacket=>packet(revision,{landings:[{sequence:revision,node,dreaming:false}]});
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
describe('audio presentation boundaries (mock media, not browser acceptance)',()=>{
  it('requires explicit interaction, drops locked cues instead of queuing',()=>{
    const {audio,ports}=setup();audio.receive(landing());expect(ports).toHaveLength(0);
    audio.unlock();expect(ports).toHaveLength(1);expect(ports[0].src).toContain('track02.mp3');
    audio.receive(landing());expect(ports).toHaveLength(1);
    audio.receive(landing(2));expect(ports[1].src).toContain('effect-43.wav');
  });
  it('routes only documented landing nodes; skips dream/passing and nested history',()=>{
    expect(landingSound(13)).toBe('43');expect(landingSound(1)).toBe('43');expect(landingSound(107)).toBe('43');expect(landingSound(81)).toBe('48');expect(landingSound(28)).toBe('43');
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();
    audio.receive(packet(1,{landings:[{sequence:1,node:13,dreaming:true}]}));
    audio.receive(packet(2));expect(ports).toHaveLength(1);
    audio.receive(landing(3,31));expect(ports[1].src).toContain('effect-48.wav');
  });
  it('deduplicates event sequence even in another newer presentation revision',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();const p=landing();audio.receive(p);audio.receive({...p,revision:2});expect(ports).toHaveLength(2);
  });
  it('pause freezes background and discards effects; resume keeps position without backlog',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();audio.receive(landing());ports[0].currentTime=30;
    audio.receive(packet(2,{paused:true,landings:[{sequence:2,node:13,dreaming:false}]}));
    expect(ports[1].src).toBe('');expect(ports[0].currentTime).toBe(30);
    audio.receive(packet(3));expect(ports).toHaveLength(2);expect(ports[0].plays).toBe(2);
  });
  it('mute/zero volume clamps preferences and never queues suppressed cues',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();audio.preferences({muted:true});audio.receive(landing());audio.preferences({muted:false,effects:0,music:4});audio.receive(landing(2));expect(ports).toHaveLength(1);expect(ports[0].volume).toBe(1);
    audio.preferences({music:0});expect(ports[0].volume).toBe(0);expect(ports[0].pauses).toBeGreaterThan(0);audio.preferences({effects:.4});audio.receive(landing(3));expect(ports[1].volume).toBe(.4);
  });
  it('hides and resumes without playing hidden cues',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();audio.visibility(true);audio.receive(landing());audio.visibility(false);expect(ports).toHaveLength(1);expect(ports[0].plays).toBe(2);
  });
  it('silent replay drains events and does not play them when returning live',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();audio.setReplay(true);audio.receive(landing());audio.setReplay(false);audio.receive(landing());expect(ports).toHaveLength(1);
  });
  it('new game resets playlist and sequence, removes all old callbacks',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();ports[0].end();expect(ports[1].src).toContain('track03.mp3');
    const oldEnd=ports[1].onended;audio.receive(packet(0,{gameId:'two'}));expect(ports[1].src).toBe('');expect(ports[1].onended).toBeNull();expect(ports[2].src).toContain('track02.mp3');
    oldEnd?.call(ports[1] as unknown as HTMLAudioElement,new Event('ended'));expect(ports).toHaveLength(3);
    audio.receive({...landing(),gameId:'two'});expect(ports[3].src).toContain('effect-43.wav');
  });
  it('cycles exactly eight documented background tracks without RNG',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();for(let i=0;i<8;i++)ports[i].end();expect(ports[8].src).toContain('track02.mp3');
  });
  it('restoring an older revision of the same game clears cues and accepts new live events',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();audio.receive(landing(20));
    const old=ports[1];audio.restore(packet(2,{paused:true}));
    expect(old.src).toBe('');expect(old.onended).toBeNull();
    const count=ports.length;
    audio.restore(packet(2));audio.receive(landing(3));
    expect(ports.length).toBeGreaterThan(count);
    expect(ports.at(-1)?.src).toContain('effect-43.wav');
  });
  it('failed play is caught, no repeated attempts each command, explicit retry allowed',async()=>{
    const ports:Port[]=[];const audio=new RichmanAudio(()=>{const p=new Port();if(ports.length===0)p.result=Promise.reject(new DOMException('gesture','NotAllowedError'));ports.push(p);return p;});
    audio.configure(manifest);audio.receive(packet());audio.unlock();await flush();expect(audio.status.blocked).toBe(true);audio.receive(packet(1));expect(ports).toHaveLength(1);audio.unlock();expect(ports[1].plays).toBe(1);
  });
  it('late play resolution cannot revive an old game or change new status',async()=>{
    let resolve!:()=>void;const {audio,ports}=setup();audio.receive(packet());audio.preferences({music:0});audio.unlock();audio.preferences({music:.3});
    const old=ports[0];old.result=new Promise<void>(r=>{resolve=r;});audio.receive(packet(1,{paused:true}));audio.receive(packet(2));audio.receive(packet(0,{gameId:'two'}));resolve();await flush();expect(old.src).toBe('');expect(old.pauses).toBeGreaterThan(0);expect(audio.status.failed).toBe(false);
  });
  it('media error and dispose stop both channels and remove handlers and sources',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();audio.receive(landing());ports[1].error();expect(audio.status.failed).toBe(true);expect(ports.every(p=>!p.src&&p.onended===null)).toBe(true);
    audio.unlock();audio.dispose();audio.receive(landing(2));audio.unlock();expect(ports).toHaveLength(3);expect(ports[2].src).toBe('');
  });
  it('finished game stops sounds and no landing effect escapes',()=>{
    const {audio,ports}=setup();audio.receive(packet());audio.unlock();audio.receive({...landing(),active:false});expect(ports).toHaveLength(1);expect(ports[0].pauses).toBeGreaterThan(0);
  });
  it('invalid/missing assets and preferences fail safely without arbitrary source URLs',()=>{
    const {audio,ports}=setup();audio.configure({version:1,music:[null]});expect(audio.status.failed).toBe(true);expect(ports).toHaveLength(0);
    expect(validAudioManifest({...manifest,music:[...manifest.music.slice(1),{id:'track09',src:'https://bad.example/music'}]})).toBe(false);
    expect(audioPreferences('broken')).toEqual({muted:false,music:.35,effects:.65,voice:.8});expect(audioPreferences('{"music":-3,"effects":2,"unlocked":true}')).toEqual({muted:false,music:0,effects:1,voice:.8});
  });
});
