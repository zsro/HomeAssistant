import { createEffectRegistry } from './effects';
import { CARD_EFFECTS, CARD_FINGERPRINT, EQUAL_CASH_EFFECT, cardCount } from './cards';
import { REMOTE_EFFECT } from './items';
import { NEARBY_WORKER_EFFECT } from './nearby-construction';
import { ROBOT_EFFECT, ROADBLOCK_EFFECT } from './road-tools';
import { hashSeed } from './random';

export const WEALTH_CARD = 'card:01';
export const WEALTH_EFFECT = 'card:01:average-all-cash-v1';
export const WEALTH_RULES = Object.freeze({ id: 'japan-tools-candidate-v6', handlerVersion: 1,
  price: 200, supply: 1, capacity: 15, initialPerPlayer: 0, acquisition: 'shop-only',
  participants: 'all-non-eliminated-including-source-no-distance-or-day-filters',
  average: 'cash-only-floor-discard-remainder', confirmation: 'web-preview-cancellable-before-consumption',
  random: 'no-draw', bankruptcy: 'return-inventory-no-sale-proceeds' });
export const WEALTH_EFFECTS = createEffectRegistry([
  ...[REMOTE_EFFECT, NEARBY_WORKER_EFFECT, ROBOT_EFFECT, ROADBLOCK_EFFECT, EQUAL_CASH_EFFECT].map(id => CARD_EFFECTS.get(id)!),
  { id: WEALTH_EFFECT, itemId: WEALTH_CARD, operation: 'average-all-cash', target: 'self', consume: 1, timings: ['beforeRoll'], status: null },
]);
export const WEALTH_FINGERPRINT = hashSeed(JSON.stringify({ base: CARD_FINGERPRINT, rules: WEALTH_RULES, effects: WEALTH_EFFECTS.fingerprint })).toString(16);
export function wealthPurchaseReason(inventory: Readonly<Record<string, number>>, points: number, supply: number) {
  return cardCount(inventory) >= WEALTH_RULES.capacity ? '卡片背包已满' : supply <= 0 ? '均富卡已售罄' : points < WEALTH_RULES.price ? '点数不足' : '';
}
export function wealthParticipants(players: readonly { id: string }[], eliminated: readonly string[]): string[] {
  return players.filter(player => !eliminated.includes(player.id)).map(player => player.id);
}
export function wealthPreview(cash: readonly number[]): { average: number; discarded: number } | null {
  if (!cash.length || !cash.every(n => Number.isSafeInteger(n) && n >= 0)) return null;
  const sum = cash.reduce((total, amount) => total + BigInt(amount), 0n), count = BigInt(cash.length);
  return { average: Number(sum / count), discarded: Number(sum % count) };
}
