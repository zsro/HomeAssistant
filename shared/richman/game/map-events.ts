import type { EventPayload, GameState } from './engine';
import { G7_RULES, G7_FINGERPRINT } from './g7';
import { receiveRandomCard } from './g6';
import { hashSeed } from './random';

// effects-audit.json: statusBits & 0xff === 13; MapNode.kind is NOT an event code.
export const RANDOM_CARD_NODES = [98] as const;
export const MAP_EVENT_RULES = Object.freeze({
  id: 'japan-events-candidate-v14', version: 1, base: G7_RULES.id,
  randomCard: 'Japan98-code13;landing-only;skip-dream;weighted-remaining30-card-pool;15-slots-replace-first-cheapest;empty-no-draw;free;after-hazards-and-gods',
  random: 'v12-seeded-range-sampler;not-original-rand',
  scope: 'no-news-fortune-minigames-lottery-magic-house-calendar-interest;v13-unchanged',
});
export const MAP_EVENT_FINGERPRINT = hashSeed(JSON.stringify({ base: G7_FINGERPRINT, rules: MAP_EVENT_RULES, nodes: RANDOM_CARD_NODES })).toString(16);
export function settleMapCard(s: GameState, emit: (event: EventPayload) => void) {
  if (s.rulesId !== MAP_EVENT_RULES.id && !s.news) return;
  const player = s.players[s.active];
  if (!(RANDOM_CARD_NODES as readonly number[]).includes(player.node) || s.g2!.players[player.id].dream) return;
  // Same acquisition and finite pools as god gifts, with a distinct map-event record.
  const result = receiveRandomCard(s, player.id, () => undefined);
  emit({ type: 'mapCardReceived', node: player.node, itemId: result?.itemId ?? null, discarded: result?.discarded ?? null });
}
