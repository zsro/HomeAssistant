import type {MagicDetention} from './magic-actions';
import {consumerIndex} from './price-index';
import type {CompanyFee} from './company-services';
import type {FortuneTravel} from './final-fortune';
import type {TrafficDetention} from './traffic-fortune';
import type { NewsProsecution } from './complete-news';
import { G7_GOODS } from './g7-catalog';
import { G6_GOODS } from './g6-catalog';
import { liquidateForRent } from './g6-market';
import { G5_GOODS } from './g5-catalog';
import type { Tax } from './g4';
import { G4_GOODS } from './g4-catalog';
import type { EventPayload, GameState } from './engine';
import type { MapNode } from '../types';
import type { PropertyDecision } from './economy';
import { createEffectRegistry } from './effects';
import { G2_EFFECTS, G2_FINGERPRINT, G2_GOODS, actionLocked, detained, enterDetention } from './g2';
import { G1_GOODS } from './g1';
import { EQUAL_CASH, equalCashTargets } from './cards';
import { WEALTH_CARD } from './wealth';
import { REMOTE_DICE, REMOTE_EFFECT } from './items';
import { WORKER } from './construction';
import { NEARBY_WORKER_EFFECT } from './nearby-construction';
import { ROAD_GOODS, ROADBLOCK_EFFECT, ROBOT_EFFECT } from './road-tools';
import { EQUAL_CASH_EFFECT } from './cards';
import { WEALTH_EFFECT } from './wealth';
import { consumeCardSlot, receiveCardSlot } from './card-slots';
import { hashSeed } from './random';

export const G3_GOODS = [
  { id: 'card:13', name: '抢夺卡', price: 25, supply: 4, effect: 'card:13:rob-v1', passive: false },
  { id: 'card:18', name: '复仇卡', price: 20, supply: 4, effect: 'card:18:revenge-v1', passive: true },
  { id: 'card:19', name: '嫁祸卡', price: 40, supply: 4, effect: 'card:19:redirect-v1', passive: true },
  { id: 'card:20', name: '免费卡', price: 25, supply: 4, effect: 'card:20:free-v1', passive: true },
  { id: 'card:21', name: '免罪卡', price: 25, supply: 4, effect: 'card:21:absolve-v1', passive: true },
  { id: 'card:29', name: '同盟卡', price: 40, supply: 2, effect: 'card:29:ally-v1', passive: false },
] as const;
export const G3_RULES = Object.freeze({ id: 'japan-tools-candidate-v9', version: 1,
  theft: 'one-selected-inventory-card-or-tool;receive-before-consume;cards-first-cheapest-on-full',
  reactions: 'dream-frame:automatic-absolution-optional-redirect-effect-automatic-revenge;no-recursion;winter-gates-original-dream',
  redirect: 'all-other-solvent-including-detained;self-attacker4-others5-revenge5',
  rent: 'ordinary:ally-waiver;amount>=2000-or-insolvent:optional-free-then-redirect;new-payer-debt',
  ally: 'mutual-replace7;incoming-player-raw-clock128;bilateral-expiry-elimination-positive-hostility',
  target: 'existing440-projection;no-special-players;no-ai-hostility-score',
  hostility: 'wealth:loser-and-average>=100;equalCash:target-loss>=100;G1-buy-demolish;G2-winter-dream-frame;theft',
});
export const G3_EFFECTS = createEffectRegistry([
  ...[REMOTE_EFFECT, NEARBY_WORKER_EFFECT, ROADBLOCK_EFFECT, ROBOT_EFFECT, EQUAL_CASH_EFFECT, WEALTH_EFFECT, ...G1_GOODS.map(g => g.effect), ...G2_GOODS.map(g => g.effect)].map(id => G2_EFFECTS.get(id)!),
  ...G3_GOODS.map(g => ({ id: g.effect, itemId: g.id, operation: g.effect, target: 'otherPlayer' as const, consume: 1, timings: [g.passive ? 'reaction' as const : 'beforeRoll' as const], status: null })),
]);
export const G3_FINGERPRINT = hashSeed(JSON.stringify({ base: G2_FINGERPRINT, rules: G3_RULES, goods: G3_GOODS, effects: G3_EFFECTS.fingerprint })).toString(16);
export type G3State = { supply: Record<string, number>; slots: Record<string, string[]>; allies: Record<string, { partner: string; remaining: number } | null> };
export type Attack = { kind: 'attack'; itemId: 'card:16' | 'card:17'; sourceId: string; originalId: string };
export type Rent = { kind: 'rent'; sourceId: string; decision: PropertyDecision };
export type ReactionDecision = { kind: 'reaction'; id: string; responderId: string; stage: 'free' | 'redirect'; continuation: MagicDetention | CompanyFee | Attack | Rent | Tax | NewsProsecution | TrafficDetention | FortuneTravel; targets: string[] };
export type G3Option = { id: string; items: string[] };
type Emit = (event: EventPayload) => void;
const allGoods = [...G1_GOODS, ...G2_GOODS, ...G3_GOODS, ...G4_GOODS, ...G5_GOODS, ...G6_GOODS, ...G7_GOODS, ...ROAD_GOODS];
export const itemName = (id: string) => allGoods.find(g => g.id === id)?.name ?? (id === EQUAL_CASH ? '均贫卡' : id === WEALTH_CARD ? '均富卡' : id === REMOTE_DICE ? '遥控骰子' : id === WORKER ? '机器工人' : id);
export const cardPrices: Record<string, number> = Object.fromEntries([...allGoods.filter(g => g.id.startsWith('card:')).map(g => [g.id, g.price]), [EQUAL_CASH, 200], [WEALTH_CARD, 200]]);
export function g3Options(s: GameState, nodes: readonly MapNode[], itemId: string): G3Option[] {
  if (!s.g3 || actionLocked(s.g2?.players[s.players[s.active].id]) || !['card:13', 'card:29'].includes(itemId)) return [];
  const excluded = [...(s.finance?.eliminated ?? []), ...s.players.filter(p => detained(s.g2?.players[p.id]) || !!s.g4?.hotel[p.id]).map(p => p.id)];
  return equalCashTargets(s.players, s.active, excluded, nodes).flatMap(id => {
    const items = [...new Set([...s.g3!.slots[id], ...Object.keys(s.effects!.inventory[id]).filter(k => k.startsWith('tool:') && s.effects!.inventory[id][k] > 0)])];
    return itemId === 'card:13' && !items.length ? [] : [{ id, items }];
  });
}
export function returnSupply(s: GameState, item: string, amount = 1) {
  if (item === EQUAL_CASH) s.cards!.supply += amount;
  else if (item === WEALTH_CARD) s.wealth!.supply += amount;
  else if (item === REMOTE_DICE) s.items!.supply += amount;
  else if (s.g6 && item in s.g6.supply) s.g6.supply[item] += amount;
  else if (s.g5 && item in s.g5.supply) s.g5.supply[item] += amount;
  else if (s.g4 && item in s.g4.supply) s.g4.supply[item] += amount;
  else if (item in s.g3!.supply) s.g3!.supply[item] += amount;
  else if (item in s.g2!.supply) s.g2!.supply[item] += amount;
  else if (item in s.g1!.supply) s.g1!.supply[item] += amount;
  else if (item in s.roadTools!.supply) s.roadTools!.supply[item] += amount;
}
export function consumeG3(s: GameState, id: string, item: string, emit: Emit) {
  const inventory = s.effects!.inventory[id];
  if (!(inventory[item] > 0)) return false;
  inventory[item]--; returnSupply(s, item);
  if (item.startsWith('card:')) s.g3!.slots[id] = consumeCardSlot(s.g3!.slots[id], item)!;
  emit({ type: 'effectConsumed', playerId: id, itemId: item, amount: 1 });
  return true;
}
/** Legacy handlers still own their counts/pools; v9 adds acquisition order without changing any old profile. */
export function syncCardSlots(s: GameState) {
  if (!s.g3) return;
  for (const [id, inventory] of Object.entries(s.effects!.inventory)) {
    let slots = s.g3.slots[id];
    for (const item of new Set(slots)) while (slots.filter(x => x === item).length > (inventory[item] ?? 0)) slots = consumeCardSlot(slots, item)!;
    for (const [item, count] of Object.entries(inventory)) if (item.startsWith('card:')) while (slots.filter(x => x === item).length < count) slots.push(item);
    if (slots.length > 15) throw new Error('Card capacity invariant');
    s.g3.slots[id] = slots;
  }
}
export function breakAlliance(s: GameState, id: string, reason: string, emit: Emit) {
  const old = s.g3?.allies[id];
  if (!old) return;
  s.g3!.allies[id] = null; s.g3!.allies[old.partner] = null;
  emit({ type: 'allianceChanged', players: [id, old.partner], remaining: 0, reason });
}
export function hostility(s: GameState, victim: string | null, source: string, emit: Emit) {
  if (victim && s.g3?.allies[victim]?.partner === source) breakAlliance(s, victim, '敌对行为解除同盟', emit);
}
export function tickAlliance(s: GameState, id: string, emit: Emit) {
  const ally = s.g3?.allies[id];
  if (!ally) return;
  if (ally.remaining === 128) breakAlliance(s, id, '同盟到期', emit);
  else { ally.remaining = ally.remaining === 1 ? 128 : ally.remaining - 1; emit({ type: 'allianceTicked', playerId: id, remaining: ally.remaining }); }
}
export function applyG3(s: GameState, itemId: string, targetId: string, stolen: string | undefined, emit: Emit) {
  const sourceId = s.players[s.active].id;
  if (itemId === 'card:29') {
    consumeG3(s, sourceId, itemId, emit);
    breakAlliance(s, sourceId, '重新结盟', emit); breakAlliance(s, targetId, '重新结盟', emit);
    s.g3!.allies[sourceId] = { partner: targetId, remaining: 7 }; s.g3!.allies[targetId] = { partner: sourceId, remaining: 7 };
    emit({ type: 'allianceChanged', players: [sourceId, targetId], remaining: 7, reason: '建立同盟' });
  } else {
    const item = stolen!, bag = s.effects!.inventory;
    // Reference transfers first, then consumes the attack card (which may itself be discarded on a full bag).
    bag[targetId][item]--;
    let discarded: string | null = null;
    if (item.startsWith('card:')) {
      s.g3!.slots[targetId] = consumeCardSlot(s.g3!.slots[targetId], item)!;
      const received = receiveCardSlot(s.g3!.slots[sourceId], item, cardPrices)!;
      s.g3!.slots[sourceId] = received.slots; discarded = received.discarded;
      if (discarded) { bag[sourceId][discarded]--; returnSupply(s, discarded); }
    }
    const received = item.startsWith('card:') || (bag[sourceId][item] ?? 0) < 9;
    if (received) bag[sourceId][item] = (bag[sourceId][item] ?? 0) + 1;
    else returnSupply(s, item);
    hostility(s, targetId, sourceId, emit);
    consumeG3(s, sourceId, itemId, emit);
    emit({ type: 'inventoryTransferred', sourceId: targetId, targetId: sourceId, itemId: item, discarded, received });
  }
  emit({ type: 'g3Resolved', itemId, sourceId, targetId });
  s.effects!.pending = null; s.pending = null; s.phase = 'idle';
}
export function openReaction(s: GameState, continuation: MagicDetention | CompanyFee | Attack | Rent | Tax | NewsProsecution | TrafficDetention | FortuneTravel, responderId: string, stage: ReactionDecision['stage'], token: () => string, emit: Emit) {
  s.phase = 'reaction';
  s.pending = { kind: 'reaction', id: token(), responderId, stage, continuation,
    targets: s.players.filter(p => p.id !== responderId && !s.finance!.eliminated.includes(p.id)).map(p => p.id) };
  emit({ type: 'reactionOffered', decision: structuredClone(s.pending) });
}
function applyAttack(s: GameState, nodes: readonly MapNode[], attack: Attack, targetId: string, emit: Emit) {
  const { sourceId, originalId, itemId } = attack;
  const apply = (id: string, turns: number) => {
    const m = s.g2!.players[id];
    if (itemId === 'card:17') enterDetention(s, nodes, id, 'prison', turns,emit);
    else {
      m.dream = turns; m.savedVehicle = m.vehicle; m.savedDice = m.diceCount;
      if (m.vehicle !== 'foot') s.effects!.inventory[id][m.vehicle]++;
      m.vehicle = 'foot'; m.diceCount = 1;
    }
    emit({ type: 'mobilityChanged', targetId: id, mobility: structuredClone(m), reason: itemName(itemId) });
  };
  apply(targetId, targetId === sourceId ? 4 : 5);
  if (targetId === originalId && consumeG3(s, originalId, 'card:18', emit)) {
    apply(sourceId, 5);
    emit({ type: 'g3Resolved', itemId: 'card:18', sourceId: originalId, targetId: sourceId });
  }
  emit({ type: 'attackResolved', itemId, sourceId, originalId, targetId });
  s.pending = null; s.phase = detained(s.g2!.players[sourceId]) ? 'turnEnd' : 'idle';
}
export function startAttack(s: GameState, nodes: readonly MapNode[], attack: Attack, token: () => string, emit: Emit) {
  s.effects!.pending = null; s.pending = null; s.phase = 'idle';
  // Original target winter guard precedes every reaction; redirected targets are not checked again.
  if (attack.itemId === 'card:16' && s.g2!.players[attack.originalId].winter) {
    emit({ type: 'attackResolved', itemId: attack.itemId, sourceId: attack.sourceId, originalId: attack.originalId, targetId: null }); return;
  }
  hostility(s, attack.originalId, attack.sourceId, emit);
  if (consumeG3(s, attack.originalId, 'card:21', emit)) {
    emit({ type: 'g3Resolved', itemId: 'card:21', sourceId: attack.originalId, targetId: attack.sourceId });
    emit({ type: 'attackResolved', itemId: attack.itemId, sourceId: attack.sourceId, originalId: attack.originalId, targetId: null });
  } else if (s.effects!.inventory[attack.originalId]['card:19'] > 0) openReaction(s, attack, attack.originalId, 'redirect', token, emit);
  else applyAttack(s, nodes, attack, attack.originalId, emit);
}
export function offerRent(s: GameState, rent: Rent, payerId: string, token: () => string, emit: Emit, reactions = true) {
  const d = rent.decision, balance = s.economy!.balances[payerId];
  let available = balance.cash + balance.bank;
  if (reactions && (d.amount >= 2000 * consumerIndex(s) || available < d.amount)) {
    if (!d.hotelTurns && s.effects!.inventory[payerId]['card:20'] > 0) { openReaction(s, rent, payerId, 'free', token, emit); return; }
    if (s.effects!.inventory[payerId]['card:19'] > 0) { openReaction(s, rent, payerId, 'redirect', token, emit); return; }
  }
  if (payerId === d.recipientId) { if (s.g4 && d.hotelTurns) s.g4.hotel[payerId] = d.hotelTurns - 1 || 128;  s.pending = null; s.phase = 'turnEnd'; emit({ type: 'rentWaived', propertyId: d.propertyId, ownerId: payerId, reason: '租金转给业主本人' }); return; }
  liquidateForRent(s, payerId, d.amount, emit);
  available = balance.cash + balance.bank;
  if (available < d.amount) {
    s.phase = 'debt'; s.pending = { kind: 'debt', id: token(), propertyId: d.propertyId, recipientId: d.recipientId!, amount: d.amount, available, shortfall: d.amount - available, lines: d.lines, payerId };
    emit({ type: 'debtOffered', decision: structuredClone(s.pending) });
  } else { s.phase = 'property'; s.pending = { ...d, id: token(), payerId }; emit({ type: 'propertyOffered', decision: structuredClone(s.pending) }); }
}
export function reactG3(s: GameState, nodes: readonly MapNode[], choice: 'use' | 'decline', targetId: string | undefined, token: () => string, emit: Emit) {
  const pending = s.pending as ReactionDecision, { continuation: c, responderId, stage } = pending;
  if (c.kind === 'magicDetention' || c.kind === 'companyFee' || c.kind === 'tax' || c.kind === 'newsProsecution' || c.kind === 'trafficDetention' || c.kind === 'fortuneTravel') return false;
  if (!['use', 'decline'].includes(choice) || (choice === 'use' && stage === 'redirect' && !pending.targets.includes(targetId!)) || (targetId !== undefined && (choice === 'decline' || stage === 'free'))) return false;
  if (choice === 'use' && !consumeG3(s, responderId, stage === 'free' ? 'card:20' : 'card:19', emit)) return false;
  emit({ type: 'reactionAnswered', responderId, stage, choice, ...(targetId ? { targetId } : {}) });
  if (choice === 'use') emit({ type: 'g3Resolved', itemId: stage === 'free' ? 'card:20' : 'card:19', sourceId: responderId, targetId: targetId ?? responderId });
  if (c.kind === 'attack') applyAttack(s, nodes, c, choice === 'use' ? targetId! : c.originalId, emit);
  else if (stage === 'free' && choice === 'use') {
    s.pending = null; s.phase = 'turnEnd'; emit({ type: 'rentWaived', propertyId: c.decision.propertyId, ownerId: c.decision.recipientId!, reason: '免费卡' });
  } else if (stage === 'free' && s.effects!.inventory[responderId]['card:19'] > 0) openReaction(s, c, responderId, 'redirect', token, emit);
  else offerRent(s, c, stage === 'redirect' && choice === 'use' ? targetId! : responderId, token, emit, false);
  return true;
}
