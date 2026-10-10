import catalog from './audio-catalog.json';
import {VOICE_IDS} from './audio-events';
import type {AudioCue} from './audio-events';
/** Presentation-only. No engine state, replay data or game RNG is mutated here. */
export type AudioPacket = {
  gameId: string; revision: number; paused: boolean; active: boolean;
  turn?: number; flush?: boolean; cues?: AudioCue[];
  landings: { sequence: number; node: number; dreaming: boolean }[];
};
export type AudioManifest = { version: 1; music: { id: string; src: string }[]; effects: Record<string, string>; eventProfile?: 'event-audio-v1'; voices?: Record<string,string> };
export type AudioPreferences = { muted: boolean; music: number; effects: number; voice: number };
export type AudioStatus = AudioPreferences & { unlocked: boolean; ready: boolean; blocked: boolean; failed: boolean };
export const DEFAULT_AUDIO: AudioPreferences = { muted: false, music: 0.35, effects: 0.65, voice: .8 };
export const AUDIO_STORAGE = 'richman-audio-v1';
export function audioPreferences(raw: string | null): AudioPreferences {
  try {
    const value = JSON.parse(raw ?? '{}');
    const volume = (n: unknown, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
    return { muted: value?.muted === true, music: volume(value?.music, .35), effects: volume(value?.effects, .65), voice: volume(value?.voice, .8) };
  } catch { return { ...DEFAULT_AUDIO }; }
}
export function validAudioManifest(value: unknown): value is AudioManifest {
  if (!value || typeof value !== 'object') return false;
  const m = value as AudioManifest;
  return m.version === 1 && Array.isArray(m.music) && m.music.length === 8 &&
    m.music.every((x, i) => !!x && x.id === `track${String(i + 2).padStart(2, '0')}` && x.src === `${x.id}.mp3`) &&
    m.effects?.['43'] === 'effect-43.wav' && m.effects?.['48'] === 'effect-48.wav' &&
    Object.entries(m.effects).every(([id,src]) => ['43','48','49','50'].includes(id) && src === `effect-${id}.wav`) &&
    (m.eventProfile === undefined || (m.eventProfile === 'event-audio-v1' &&
      m.effects['49'] === 'effect-49.wav' && m.effects['50'] === 'effect-50.wav' &&
      VOICE_IDS.every(id => m.voices?.[id] === `voice-${id}.wav`))) &&
    (!m.voices || Object.entries(m.voices).every(([id,src]) => VOICE_IDS.includes(Number(id)) && src === `voice-${id}.wav`));
}
// MapDat.MKF Japan #2 + landing dispatcher slots 10/16 -> Effect.mkf #43/#48.
// Passing a bank, nested fortune and restored history are deliberately not landing cues.
export function landingSound(node: number): string | null {
  const id = (catalog.landings as Record<string,number>)[node];
  return id === undefined ? null : String(id);
}
export type AudioPort = Pick<HTMLAudioElement, 'src' | 'volume' | 'preload' | 'currentTime' | 'onended' | 'onerror' | 'play' | 'pause' | 'load' | 'removeAttribute'>;
export class RichmanAudio {
  private manifest: AudioManifest | null = null;
  private music: AudioPort | null = null;
  private effect: AudioPort | null = null;
  private voice: AudioPort | null = null;
  private queues: Record<'effect' | 'voice', AudioCue[]> = {effect:[],voice:[]};
  private current: Partial<Record<'effect' | 'voice', AudioCue>> = {};
  private cueSequence = -1;
  private turn: number | undefined;
  private track = 0;
  private generation = 0;
  private revision = -1;
  private sequence = -1;
  private gameId = '';
  private active = false;
  private paused = true;
  private hidden = false;
  private replay = false;
  private disposed = false;
  private playing = false;
  private value: AudioStatus;
  onChange: (value: AudioStatus) => void = () => undefined;
  constructor(private readonly factory: () => AudioPort = () => new Audio(), preferences = DEFAULT_AUDIO) {
    this.value = { ...audioPreferences(JSON.stringify(preferences)), unlocked: false, ready: false, blocked: false, failed: false };
  }
  get status() { return { ...this.value }; }
  private notify() { if (!this.disposed) this.onChange(this.status); }
  configure(manifest: unknown) {
    if (this.disposed) return;
    if (!validAudioManifest(manifest)) { this.value.failed = true; this.notify(); return; }
    this.manifest = manifest; this.value.ready = true; this.value.failed = false; this.notify(); this.sync();
  }
  unavailable() { if (!this.disposed) { this.value.failed = true; this.notify(); } }
  /** Must be called directly from a user gesture, never from replay/import/timers. */
  unlock() {
    if (this.disposed || !this.value.ready) return;
    this.value.unlocked = true; this.value.blocked = false; this.value.failed = false;
    this.notify(); this.sync();
  }
  preferences(next: Partial<AudioPreferences>) {
    if (this.disposed) return;
    Object.assign(this.value, audioPreferences(JSON.stringify({ ...this.value, ...next })));
    this.notify(); this.sync();
    if (this.effect) this.effect.volume = this.value.effects;
    if (this.voice) this.voice.volume = this.value.voice;
    if (this.value.voice === 0) this.dropChannel('voice');
    this.musicVolume();
    if (this.value.effects === 0 || this.value.muted) this.dropEffect();
  }
  visibility(hidden: boolean) { this.hidden = hidden; this.sync(); }
  setReplay(replay: boolean) { this.replay = replay; this.sync(); }
  receive(packet: AudioPacket) {
    if (this.disposed) return;
    if (packet.gameId !== this.gameId) {
      this.clear(); this.gameId = packet.gameId; this.revision = -1; this.sequence = -1; this.cueSequence = -1; this.turn = undefined; this.track = 0;
    }
    if (packet.revision <= this.revision) return;
    if (packet.flush || (packet.turn !== undefined && this.turn !== undefined && packet.turn !== this.turn)) this.dropTransients();
    this.turn = packet.turn;
    this.revision = packet.revision; this.active = packet.active; this.paused = packet.paused;
    this.sync();
    for (const landing of packet.landings) {
      if (landing.sequence <= this.sequence) continue;
      this.sequence = landing.sequence;
      const sound = landingSound(landing.node);
      if (!landing.dreaming && sound && this.allowed() && this.value.effects > 0) this.enqueue({sequence:landing.sequence,channel:'effect',id:sound,priority:1});
    }
    const floor = this.cueSequence;
    const seen = new Set<string>();
    for (const cue of packet.cues ?? []) {
      const key = `${cue.sequence}/${cue.channel}/${cue.id}`;
      if (cue.sequence <= floor || seen.has(key)) continue;
      seen.add(key); this.cueSequence = Math.max(this.cueSequence, cue.sequence);
      if (this.allowed() && this.volume(cue.channel) > 0) this.enqueue(cue);
    }
  }
  private allowed() {
    return !this.disposed && this.value.ready && this.value.unlocked && !this.value.muted && !this.value.blocked &&
      !this.value.failed && this.active && !this.paused && !this.hidden && !this.replay;
  }
  private release(port: AudioPort | null) {
    if (!port) return;
    port.onended = null; port.onerror = null; port.pause(); port.removeAttribute('src'); port.load();
  }
  private volume(channel: 'effect' | 'voice') { return channel === 'effect' ? this.value.effects : this.value.voice; }
  private musicVolume() { if (this.music) this.music.volume = this.value.music * (this.voice ? .35 : 1); }
  private dropChannel(channel: 'effect' | 'voice', queue = true) {
    this.release(this[channel]); this[channel] = null; delete this.current[channel];
    if (queue) this.queues[channel] = [];
    this.musicVolume();
  }
  private dropEffect() { this.dropChannel('effect'); }
  private dropTransients() { this.dropChannel('effect'); this.dropChannel('voice'); }
  private clear() {
    this.generation++; this.playing = false; this.release(this.music); this.music = null; this.dropTransients();
  }
  private failure(port: AudioPort, blocked: boolean, generation: number) {
    if (this.disposed || generation !== this.generation || (port !== this.music && port !== this.effect && port !== this.voice)) return;
    this.value.blocked = blocked; this.value.failed = !blocked; this.clear(); this.notify();
  }
  private play(port: AudioPort) {
    const generation = this.generation;
    const name = (error: unknown) => error && typeof error === 'object' && 'name' in error ? error.name : '';
    const failed = (error: unknown) => this.failure(port, name(error) === 'NotAllowedError', generation);
    port.onerror = () => this.failure(port, false, generation);
    try {
      void port.play().then(() => {
        // A stale promise must never restart audio after pause, reset or teardown.
        if (this.disposed || generation !== this.generation || !this.allowed() || (port === this.music && this.value.music === 0) || (port !== this.music && port !== this.effect && port !== this.voice)) port.pause();
      }).catch((error: unknown) => {
        if (name(error) === 'AbortError') return;
        failed(error);
      });
    } catch (error) { failed(error); }
  }
  private sync() {
    if (this.disposed) return;
    if (!this.allowed()) {
      this.music?.pause(); this.playing = false; this.dropTransients(); return;
    }
    if (this.value.music === 0) { if (this.music) { this.music.volume = 0; this.music.pause(); } this.playing = false; return; }
    if (!this.music) {
      this.music = this.factory(); this.music.preload = 'none';
      this.music.src = '/richman/generated/audio/' + this.manifest!.music[this.track].src;
      const port = this.music;
      port.onended = () => {
        if (port !== this.music || !this.allowed()) return;
        this.release(this.music); this.music = null; this.playing = false;
        this.track = (this.track + 1) % this.manifest!.music.length; this.sync();
      };
    }
    this.musicVolume();
    if (!this.playing) { this.playing = true; this.play(this.music); }
  }
  private enqueue(cue: AudioCue) {
    const src = cue.channel === 'effect' ? this.manifest?.effects[cue.id] : this.manifest?.voices?.[cue.id];
    if (!src) return; // Old foundation manifests remain usable.
    const current = this.current[cue.channel];
    if (current && cue.priority <= current.priority) {
      const queue = this.queues[cue.channel];
      queue.push(cue); queue.sort((a,b) => b.priority - a.priority || a.sequence - b.sequence);
      if (queue.length > 3) queue.pop();
      return;
    }
    if (current) this.dropChannel(cue.channel); // A higher-priority cue discards interrupted backlog.
    this.startCue(cue, src);
  }
  private startCue(cue: AudioCue, src: string) {
    if (!this.allowed() || this.volume(cue.channel) === 0) return;
    const port = this.factory(); this[cue.channel] = port; this.current[cue.channel] = cue;
    port.preload = 'none'; port.src = '/richman/generated/audio/' + src; port.volume = this.volume(cue.channel);
    this.musicVolume();
    port.onended = () => {
      if (port !== this[cue.channel]) return;
      this.dropChannel(cue.channel, false);
      const next = this.queues[cue.channel].shift();
      if (next) this.enqueue(next);
    };
    this.play(port);
  }
  dispose() { if (!this.disposed) { this.disposed = true; this.clear(); this.onChange = () => undefined; } }
}
