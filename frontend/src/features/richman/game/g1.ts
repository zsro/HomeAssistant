import {consumerIndex} from './price-index';
import { propertyBase } from './economy';
import { createEffectRegistry } from './effects';
import type { Target } from './effects';
import { WEALTH_EFFECTS, WEALTH_EFFECT, WEALTH_FINGERPRINT } from './wealth';
import { EQUAL_CASH_EFFECT, cardCount } from './cards';
import { REMOTE_EFFECT } from './items';
import { ROADBLOCK_EFFECT, ROBOT_EFFECT } from './road-tools';
import { NEARBY_WORKER_EFFECT, projectWorkerAnchor } from './nearby-construction';
import type { PropertyDefinition, PropertyState } from './economy';
import type { GameState } from './engine';
import type { MapNode } from '../types';
import { directionFor } from '../traversal';
import { hashSeed } from './random';
import directions from './g1-directions.json';

export const G1_GOODS = [
  { id: 'card:03', name: '购地卡', price: 35, supply: 4, effect: 'card:03:buy-current-v1', target: 'property' },
  { id: 'card:04', name: '换地卡', price: 25, supply: 4, effect: 'card:04:swap-owners-v1', target: 'property' },
  { id: 'card:05', name: '换屋卡', price: 20, supply: 4, effect: 'card:05:swap-levels-v1', target: 'property' },
  { id: 'card:06', name: '转向卡', price: 20, supply: 3, effect: 'card:06:reverse-player-v1', target: 'player' },
  { id: 'card:12', name: '拆除卡', price: 15, supply: 5, effect: 'card:12:demolish-land-v1', target: 'property' },
] as const;
export const G1_RULES = Object.freeze({ id: 'japan-tools-candidate-v7', handlerVersion: 1,
  acquisition: 'shop-only-zero-initial', capacity: 15, target: 'ordinary-land-nearby-anchor-candidate',
  buy: 'current-opponent-cash-only-base-plus-level-times-upgrade-receipt-bank',
  swaps: 'current-land-plus-different-nearby-land-no-owner-restriction', demolition: 'non-self-owned-level-positive-minus-one',
  turn: 'facing-plus-four-mod-eight-replace-previous-uniform-allowed-excluding-old-null-if-empty',
  random: 'mulberry32-rejection-range-v1-even-one-candidate', bankruptcy: 'return-pools-no-proceeds' });
export const G1_EFFECTS = createEffectRegistry([
  ...[REMOTE_EFFECT, NEARBY_WORKER_EFFECT, ROADBLOCK_EFFECT, ROBOT_EFFECT, EQUAL_CASH_EFFECT, WEALTH_EFFECT].map(id => WEALTH_EFFECTS.get(id)!),
  ...G1_GOODS.map(g => ({ id: g.effect, itemId: g.id, operation: g.effect, target: g.target, consume: 1, timings: ['beforeRoll'] as const, status: null })),
]);
export const G1_FINGERPRINT = hashSeed(JSON.stringify({ base: WEALTH_FINGERPRINT, rules: G1_RULES, goods: G1_GOODS, directions, effects: G1_EFFECTS.fingerprint })).toString(16);
export type G1State = { supply: Record<string, number>; facing: Record<string, number> };
export type G1Option = { target: Target; title: string; detail: string; changes: { before: PropertyState; after: PropertyState }[];
  transfer?: { from: string; to: string; amount: number }; turn?: { playerId: string; candidates: number[]; direction: number } };
export function g1PurchaseReason(inventory: Record<string, number>, points: number, supply: number, price: number) {
  return cardCount(inventory) >= 15 ? '卡片背包已满' : supply <= 0 ? '暂时售罄' : points < price ? '点数不足' : '';
}
export function g1Adjacent(node: MapNode): number[] {
  const original = directions.node;
  const same = node.id === original.id && node.x === original.x && node.y === original.y && JSON.stringify(node.adjacent) === JSON.stringify(original.adjacentSlots.filter(Boolean));
  return [...new Set(node.adjacent)].filter(id => !same || !directions.blocked.includes(id));
}
export function g1Draw(state: number, count: number): { state: number; index: number } {
  if (!Number.isSafeInteger(count) || count < 1 || count > 4) throw new Error('Invalid direction count');
  const ceiling = Math.floor(4294967296 / count) * count;
  let value: number;
  do {
    state = (state + 0x6d2b79f5) >>> 0;
    let bits = Math.imul(state ^ state >>> 15, state | 1);
    bits ^= bits + Math.imul(bits ^ bits >>> 7, bits | 61);
    value = (bits ^ bits >>> 14) >>> 0;
  } while (value >= ceiling);
  return { state, index: value % count };
}
function inView(center: MapNode, point: { x: number; y: number }) {
  const p = projectWorkerAnchor(center, point);
  return p !== null && p.x >= 0 && p.y >= 0 && p.x < 440 && p.y < 440;
}
export function g1Options(state: GameState, nodes: readonly MapNode[], definitions: readonly PropertyDefinition[], itemId: string): G1Option[] {
  if (!state.g1 || !state.economy) return [];
  const player = state.players[state.active], center = nodes.find(n => n.id === player.node)!;
  const owner = (id: string | null) => id ? `玩家 ${state.players.findIndex(p => p.id === id) + 1}` : '待售';
  if (itemId === 'card:06') return state.players.flatMap(p => {
    const node = nodes.find(n => n.id === p.node)!, prev = nodes.find(n => n.id === p.previous);
    if (state.finance?.eliminated.includes(p.id) || state.g2?.players[p.id].prison || state.g2?.players[p.id].hospital || state.g4?.hotel[p.id] || !inView(center, node)) return [];
    const candidates = g1Adjacent(node).filter(id => id !== p.previous);
    const direction = ((state.g1!.facing[p.id] ?? (prev ? directionFor(node.x - prev.x, node.y - prev.y) : 4)) + 4) % 8;
    return [{ target: { kind: 'player', id: p.id }, title: `${owner(p.id)}${p.id === player.id ? '（你）' : ''} · ${p.node} 号路格`,
      detail: `原地转身，下次移动按新方向选路。${candidates.length > 1 ? '岔路方向在确认时按对局种子抽取，随后仍可能需要选路。' : ''}不立刻移动或掷骰。`,
      changes: [], turn: { playerId: p.id, candidates, direction } }];
  });
  const currentDef = definitions.find(p => p.kind === 'land' && p.nodeIds.includes(player.node));
  const current = state.economy.properties.find(p => p.id === currentDef?.id);
  if (itemId === 'card:03') {
    if (!currentDef || !current?.ownerId || current.ownerId === player.id || state.finance?.eliminated.includes(current.ownerId)) return [];
    const amount = (propertyBase(current, currentDef) + current.level * currentDef.upgradeCost) * consumerIndex(state);
    if (!Number.isSafeInteger(amount) || amount < 0 || state.economy.balances[player.id].cash < amount || !Number.isSafeInteger(state.economy.balances[current.ownerId].bank + amount)) return [];
    return [{ target: { kind: 'property', id: current.id }, title: `${currentDef.name} · 脚下地产`,
      detail: `支付现金 ${amount.toLocaleString()} 元，存入${owner(current.ownerId)}的银行。归属改为你，建筑保持 ${current.level} 级；不用存款补足。`,
      changes: [{ before: { ...current }, after: { ...current, ownerId: player.id } }], transfer: { from: player.id, to: current.ownerId, amount } }];
  }
  if (!['card:04', 'card:05', 'card:12'].includes(itemId) || (itemId !== 'card:12' && !current)) return [];
  return definitions.flatMap(def => {
    const target = state.economy!.properties.find(p => p.id === def.id);
    if (def.kind !== 'land' || !target || !inView(center, def)) return [];
    if (itemId === 'card:12') {
      if (target.ownerId === player.id || target.level < 1) return [];
      return [{ target: { kind: 'property' as const, id: target.id }, title: `${def.name} · ${def.nodeIds.join('/')} 号路格`,
        detail: `${owner(target.ownerId)}的建筑：${target.level} → ${target.level - 1} 级。归属不变，不支付现金。`,
        changes: [{ before: { ...target }, after: { ...target, level: state.g4 && target.buildingType === 1 ? 0 : target.level - 1, ...(state.g4 && target.buildingType === 1 ? { buildingType: 0 } : {}) } }] }];
    }
    if (target.id === current!.id) return [];
    const land = itemId === 'card:04', noChange = land ? current!.ownerId === target.ownerId : current!.level === target.level && (!state.g4 || current!.buildingType === target.buildingType);
    return [{ target: { kind: 'property' as const, id: target.id }, title: `${def.name} · ${def.nodeIds.join('/')} 号路格`,
      detail: land ? `脚下${currentDef!.name}：${owner(current!.ownerId)} → ${owner(target.ownerId)}；目标${def.name}：${owner(target.ownerId)} → ${owner(current!.ownerId)}。楼级和现金不变。${noChange ? '归属相同，确认仍消耗卡片。' : ''}`
        : `脚下${currentDef!.name}：${current!.level} → ${target.level} 级；目标${def.name}：${target.level} → ${current!.level} 级。${state.g4 ? '建筑类型一起交换；' : ''}产权和现金不变。${noChange ? '楼级相同，确认仍消耗卡片。' : ''}`,
      changes: [{ before: { ...current! }, after: { ...current!, ...(land ? { ownerId: target.ownerId } : { level: target.level, ...(state.g4 ? { buildingType: target.buildingType } : {}) }) } },
        { before: { ...target }, after: { ...target, ...(land ? { ownerId: current!.ownerId } : { level: current!.level, ...(state.g4 ? { buildingType: current!.buildingType } : {}) }) } }] }];
  });
}
export function g1UnavailableReason(itemId: string) {
  return itemId === 'card:03' ? '需站在他人的普通地产上，且现金足额（存款不补足）'
    : itemId === 'card:12' ? '附近没有非己方且高于 0 级的普通建筑'
      : itemId === 'card:06' ? '附近没有可转向的玩家' : '需站在普通地产上，并有另一块附近普通地产';
}
