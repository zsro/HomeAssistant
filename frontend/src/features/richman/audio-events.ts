import catalog from './audio-catalog.json';
import type { GameEvent, GameState } from './game/engine';
import { PROPERTY_CATALOG } from './game/economy';
export type AudioCue = { sequence: number; channel: 'effect' | 'voice'; id: string; priority: 1 | 2 };
type PublicSoundState = Pick<GameState, 'players' | 'g2' | 'economy'>;
const voices: Record<string, Record<string, number>> = catalog.characters;
export const VOICE_IDS = Object.values(voices).flatMap(slots => Object.values(slots));
export function eventAudio(before: PublicSoundState, after: PublicSoundState, events: readonly GameEvent[]): AudioCue[] {
  const cues: AudioCue[] = [];
  for (const event of events) {
    const player = before.players.find(p => p.id === event.playerId);
    if (!player) continue;
    const state = before.g2?.players[player.id];
    // Native player_say +51/+54/+55: disappearance, sleeping, sleepwalking.
    const silent = !!(state?.travel || state?.winter || state?.dream);
    const voice = (slot: number, priority: 1 | 2) => {
      const id = voices[player.characterId]?.[String(slot)];
      if (!silent && id !== undefined) cues.push({ sequence: event.sequence, channel: 'voice', id: String(id), priority });
    };
    if (event.type === 'pointsAwarded' && events.some(e => e.type === 'landed' && e.node === event.node && e.playerId === player.id)) {
      // Only these original map calls. Ten-point nodes have NO player_say call.
      if (event.amount === 50 && [20, 31].includes(event.node)) voice(event.sequence % 2, 1);
      if (event.amount === 30 && [23, 27, 83].includes(event.node)) voice(2, 1);
    }
    if (event.type === 'propertySettled' && PROPERTY_CATALOG.properties.some(p => p.id === event.propertyId && p.kind === 'land')) {
      const old = before.economy?.properties.find(p => p.id === event.propertyId);
      const current = after.economy?.properties.find(p => p.id === event.propertyId);
      if (!old || !current || current.ownerId !== player.id) continue;
      if (event.operation === 'buy' && old.ownerId === null) cues.push({ sequence: event.sequence, channel: 'effect', id: '49', priority: 2 });
      if (event.operation === 'upgrade' && old.ownerId === player.id && current.level === old.level + 1) {
        cues.push({ sequence: event.sequence, channel: 'effect', id: '50', priority: 2 });
        if (old.level === 4 && current.level === 5) voice(15, 2);
      }
    }
  }
  return cues;
}
