import { createEffectRegistry } from './effects';
import { ROAD_EFFECTS, ROAD_FINGERPRINT, ROBOT_EFFECT, ROADBLOCK_EFFECT } from './road-tools';
import { NEARBY_WORKER_EFFECT, projectWorkerAnchor } from './nearby-construction';
import { REMOTE_EFFECT } from './items';
import { hashSeed } from './random';
import type { MapNode } from '../types';

export const EQUAL_CASH = 'card:02';
export const EQUAL_CASH_EFFECT = 'card:02:average-cash-v1';
export const CARD_RULES = Object.freeze({ id: 'japan-tools-candidate-v5', handlerVersion: 1,
  price: 200, supply: 2, capacity: 15, initialPerPlayer: 0, acquisition: 'shop-only',
  average: 'cash-only-floor-both-discard-odd-unit', target: 'other-solvent-player-anchor-in-440-view',
  orientation: 0, center: 'active-player-node', random: 'no-draw', bankruptcy: 'return-cards-no-sale-proceeds' });
export const CARD_EFFECTS = createEffectRegistry([
  ...[REMOTE_EFFECT, NEARBY_WORKER_EFFECT, ROBOT_EFFECT, ROADBLOCK_EFFECT].map(id => ROAD_EFFECTS.get(id)!),
  { id: EQUAL_CASH_EFFECT, itemId: EQUAL_CASH, operation: 'average-cash', target: 'otherPlayer', consume: 1, timings: ['beforeRoll'], status: null },
]);
export const CARD_FINGERPRINT = hashSeed(JSON.stringify({ base: ROAD_FINGERPRINT, rules: CARD_RULES, effects: CARD_EFFECTS.fingerprint })).toString(16);
export type CardsState = { supply: number };
export function cardCount(inventory: Readonly<Record<string, number>>): number {
  return Object.entries(inventory).filter(([id]) => id.startsWith('card:')).reduce((sum, [, count]) => sum + count, 0);
}
export function cardPurchaseReason(inventory: Readonly<Record<string, number>>, points: number, supply: number): string {
  return cardCount(inventory) >= CARD_RULES.capacity ? '卡片背包已满' : supply <= 0 ? '均贫卡已售罄' : points < CARD_RULES.price ? '点数不足' : '';
}
/** Reference cash division truncates toward zero; all current legal balances are nonnegative integers. */
export function equalCashPreview(sourceCash: number, targetCash: number): { average: number; discarded: number } | null {
  if (![sourceCash, targetCash].every(n => Number.isSafeInteger(n) && n >= 0)) return null;
  const remainder = sourceCash % 2 + targetCash % 2;
  return { average: Math.floor(sourceCash / 2) + Math.floor(targetCash / 2) + Math.floor(remainder / 2), discarded: remainder % 2 };
}
/** Candidate targeting uses fixed actor anchors, never the UI camera or pixel masks. */
export function equalCashTargets(players: readonly { id: string; node: number }[], active: number,
  eliminated: readonly string[], nodes: readonly MapNode[]): string[] {
  const current = players[active], center = nodes.find(node => node.id === current?.node);
  if (!current || !center || eliminated.includes(current.id)) return [];
  return players.filter(player => {
    if (player.id === current.id || eliminated.includes(player.id)) return false;
    const node = nodes.find(n => n.id === player.node);
    const point = node && projectWorkerAnchor(center, node);
    return !!point && point.x >= 0 && point.y >= 0 && point.x < 440 && point.y < 440;
  }).map(player => player.id);
}
