import {initializePairs,removeGod,removePlayerGod,type GodPairState} from './god-pairs';
import type {MarketState} from './stock-market';
import type { MapNode } from '../types';
import type { EventPayload, GameState } from './engine';
import type { PropertyDefinition } from './economy';
import type { Target } from './effects';
import type { Stock, Holding } from './g6-market';
import { createEffectRegistry } from './effects';
import { G5_RULES, G5_EFFECTS, G5_FINGERPRINT, removeHazard } from './g5';
import { G5_GOODS } from './g5-catalog';
import { G4_GOODS, maximumLevel } from './g4';
import { G3_GOODS, cardPrices, consumeG3, returnSupply, hostility, syncCardSlots } from './g3';
import { G2_GOODS, actionLocked } from './g2';
import { G1_GOODS } from './g1';
import { g6Draw } from './g6-random';
import { EQUAL_CASH_EFFECT } from './cards';
import { WEALTH_EFFECT } from './wealth';
import { REMOTE_EFFECT } from './items';
import { NEARBY_WORKER_EFFECT, projectWorkerAnchor } from './nearby-construction';
import { ROADBLOCK_EFFECT, ROBOT_EFFECT } from './road-tools';
import { G6_GOODS, GODS, JAPAN_STOCKS } from './g6-catalog';
import { marketPrice, refreshQuota } from './g6-market';
import { hashSeed } from './random';
import { consumeCardSlot, receiveCardSlot } from './card-slots';
export const G6_RULES = Object.freeze({ id: 'japan-tools-candidate-v12', version: 1, base: G5_RULES.id,
  gods: 'types1-10,12,15;seeded-one-each-distinct-road;replenish-missing-every5-rounds;landing-encounter-after-hazards;invite-nearest-unattached-in440-anchor;replace-remove;incoming7-or13;bad5,6,7,8,10,15;dismiss-also-carried-bomb',
  godEffects: 'seeded-wheel0..999-small-0..9999-big;cash-first-capped-no-debt;small-god1-recipient-cash-5-recipient-bank;weighted-card-pool-replace-cheapest;7-one-8-half-drop;15-bag-clear-no-points-no-rent;ordinary-total-rent1-half2-zero5-onehalf6-double;landlord-free-owner;angel-devil-post-land-single;empty-facility-angel-hotel',
  market: 'Japan12;integer-cents;reference-tick-truncate-change-clamp1..9999;round-is-market-day;seeded-volatility-bounded10;history144;incoming-quota10..29.99%-or-all-if<=1000;no-company-control-weekend-dividend',
  trade: 'idle-turnEnd-actionable;positive-integer-shares;bank-only-floor-total-yuan;cost-proportional-floor-on-sale;no-fee;finite-global-pool',
  cards: 'red0x20-black2-overwrite;immediate-plusminus10%-of-base;decrement-before-round-market;black-positive-other-loss-over200-break-alliance;no-reactions',
  liquidation: 'after-final-rent-payer-reactions;minimum-shares-in-catalog-order-to-cover-cash+bank-deficit;market-value-in-summary;no-property-liquidation',
  scope: 'no-original-RNG-pixel-occlusion-god-stats-insurance-animations;new-semantics-v12-only;prior-fingerprints-preserved',
});
export const G6_EFFECTS = createEffectRegistry([
  ...[REMOTE_EFFECT, NEARBY_WORKER_EFFECT, ROADBLOCK_EFFECT, ROBOT_EFFECT, EQUAL_CASH_EFFECT, WEALTH_EFFECT,
    ...G1_GOODS.map(g => g.effect), ...G2_GOODS.map(g => g.effect), ...G3_GOODS.map(g => g.effect), ...G4_GOODS.map(g => g.effect), ...G5_GOODS.map(g => g.effect)].map(id => G5_EFFECTS.get(id)!),
  ...G6_GOODS.map(g => ({ id: g.effect, itemId: g.id, operation: g.effect, target: g.target, consume: 1, timings: ['beforeRoll'] as const, status: null })),
]);
export const G6_FINGERPRINT = hashSeed(JSON.stringify({ base: G5_FINGERPRINT, rules: G6_RULES, goods: G6_GOODS, gods: GODS, stocks: JAPAN_STOCKS, effects: G6_EFFECTS.fingerprint })).toString(16);
export type God = { id: string; type: number; node: number; carrier: string | null; remaining: number; slot?:15|16 };
export type G6State = { surrender?:{humanIds:string[];sourceId:string|null}; objects?:God[]; pairing?:GodPairState; market?:MarketState; supply: Record<string, number>; gods: God[]; serial: number; stocks: Stock[]; holdings: Record<string, Record<string, Holding>> };
export type G6Option = { target: Target; title: string; detail: string; buildingTypes?: number[] };
type Emit = (e: EventPayload) => void;
const notice = (emit: Emit, message: string) => emit({ type: 'g6Notice', message });
export const attachedGod = (s: Pick<GameState, 'g6'>, id: string) => s.g6?.gods.find(g => g.carrier === id);
const draw = (s: GameState, count: number) => { const d = g6Draw(s.randomState, count); s.randomState = d.state; return d.index; };
export function replenishGods(s: GameState, nodes: readonly MapNode[]) {
  if (!s.g6 || s.rulesId==='japan-events-candidate-v47') return;
  for (const def of GODS) if ((!s.g6.pairing || def.type>(s.g6.objects?12:10)) && !s.g6.gods.some(g => g.type === def.type)) {
    const available = nodes.filter(n => !s.g6!.gods.some(g => !g.carrier && g.node === n.id) && !s.g6!.objects?.some(g=>g.node===n.id) && !s.players.some(p => p.node === n.id));
    if (!available.length) continue;
    s.g6.gods.push({ id: `god-${++s.g6.serial}`, type: def.type, node: available[draw(s, available.length)].id, carrier: null, remaining: 0 });
  }
}
export function initializeG6(s: GameState, nodes: readonly MapNode[]) {
  s.g6 = { ...((s.rulesId==='japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))?{market:{last:null}}:{}), supply: Object.fromEntries(G6_GOODS.map(g => [g.id, g.supply])), gods: [], serial: 0,
    stocks: JAPAN_STOCKS.map(k => ({ ...((s.rulesId==='japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))?{momentum:0,noise:0}:{}), id: k.id, base: k.price, price: k.price, pool: k.shares, quota: 0, trend: null, remaining: 0, history: [k.price] })),
    holdings: Object.fromEntries(s.players.map(p => [p.id, Object.fromEntries(JAPAN_STOCKS.map(k => [k.id, { quantity: 0, cost: 0, ...((s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))?{average:0}:{}) }]))])) };
  for (const p of s.players) for (const g of G6_GOODS) s.effects!.inventory[p.id][g.id] = 0;
  if((s.rulesId==='japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))initializePairs(s,nodes);
  replenishGods(s, nodes); refreshQuota(s);
}
export function g6Options(s: GameState, nodes: readonly MapNode[], item: string): G6Option[] {
  if (!s.g6) return [];
  const p = s.players[s.active], god = attachedGod(s, p.id);
  if (actionLocked(s.g2!.players[p.id]) || s.g4!.hotel[p.id]) return [];
  if (item === 'card:22') {
    const bad = god && GODS.find(d => d.type === god.type)!.bad, bomb = s.g5!.hazards.some(h => h.carrier === p.id);
    return bad || bomb ? [{ target: { kind: 'player', id: p.id }, title: '送走自身不利附身 / 拆除携带炸弹', detail: `${bad ? `移除${GODS.find(d => d.type === god.type)!.name}。` : '保留当前有利附身。'}${bomb ? '移除携带炸弹并返还供应池。' : ''}已结算的资金/库存变化不会撤销。` }] : [];
  }
  if (item === 'card:23') {
    const center = nodes.find(n => n.id === p.node)!;
    const options = s.g6.gods.filter(g => !g.carrier).map(g => ({ g, n: nodes.find(n => n.id === g.node)! })).filter(({ n }) => { const a = projectWorkerAnchor(center, n); return a && a.x >= 0 && a.x < 440 && a.y >= 0 && a.y < 440; }).sort((a, b) => Math.hypot(a.n.x - center.x, a.n.y - center.y) - Math.hypot(b.n.x - center.x, b.n.y - center.y));
    const g = options[0]?.g;
    if (!g) return [];
    const d = GODS.find(d => d.type === g.type)!;
    return [{ target: { kind: 'god', id: g.id }, title: `${d.name} · 最近候选 · ${g.node}号路格`, detail: `替换现有附身。${d.detail}期限${g.type === 15 ? 13 : 7}次自身行动边界；数字转盘用种子确定，神仙扣款最多扣到现金及存款为零。` }];
  }
  if (!['card:24', 'card:25'].includes(item)) return [];
  return s.g6.stocks.map(k => ({ target: { kind: 'stock', id: k.id }, title: JAPAN_STOCKS.find(d => d.id === k.id)!.name,
    detail: `基准价${(k.base / 100).toFixed(2)}，当前${(k.price / 100).toFixed(2)} → ${(marketPrice(k.base, item === 'card:24' ? 10 : -10) / 100).toFixed(2)}元。覆盖此前红黑行情，立即生效并持续至下一轮行情；同轮重复不复利。交易均使用银行存款。` }));
}
function pool(s: GameState, id: string): number { return id === 'card:01' ? s.wealth!.supply : id === 'card:02' ? s.cards!.supply : [s.g6, s.g5, s.g4, s.g3, s.g2, s.g1].find(x => x && id in x.supply)?.supply[id] ?? 0; }
function drop(s: GameState, id: string, item: string) {
  s.effects!.inventory[id][item]--;
  if(!(s.rulesId==='japan-events-candidate-v47'&&item.startsWith('tool:')&&Number(item.slice(5))>=9))returnSupply(s, item);
  if (item.startsWith('card:')) s.g3!.slots[id] = consumeCardSlot(s.g3!.slots[id], item)!;
}
export function receiveRandomCard(s: GameState, id: string, emit: Emit) {
  const weighted = Object.keys(cardPrices).sort().flatMap(item => Array.from({ length: pool(s, item) }, () => item));
  if (!weighted.length) { notice(emit, '神仙赠卡：供应池已空。'); return null; }
  const item = weighted[draw(s, weighted.length)], result = receiveCardSlot(s.g3!.slots[id], item, cardPrices)!;
  if (result.discarded) drop(s, id, result.discarded);
  s.g3!.slots[id] = result.slots; s.effects!.inventory[id][item]++; returnSupply(s, item, -1);
  notice(emit, `玩家${id.split('-')[1]}获得${item}${result.discarded ? `，满包丢弃${result.discarded}` : ''}。`);
  return { itemId: item, discarded: result.discarded };
}
export function attach(s: GameState, g: God, emit: Emit) {
  const id = s.players[s.active].id;
  removePlayerGod(s,id,emit); if(s.g6!.pairing)g.node=s.players[s.active].node; g.carrier = id; g.remaining = g.type === 15 ? 13 : 7;
  notice(emit, `玩家${id.split('-')[1]}附身${GODS.find(d => d.type === g.type)!.name}，期限${g.remaining}次自身行动边界。`);
  syncCardSlots(s);
  if ([1, 2, 5, 6].includes(g.type)) {
    const amount = draw(s, g.type === 1 || g.type === 5 ? 1000 : 10000);
    const take = (from: string, to: string | null, cashRecipient: boolean) => {
      const b = s.economy!.balances[from], paid = Math.min(amount, b.cash + b.bank), cash = Math.min(paid, b.cash);
      b.cash -= cash; b.bank -= paid - cash;
      if (to) s.economy!.balances[to][cashRecipient ? 'cash' : 'bank'] += paid;
      notice(emit, `神仙结算：玩家${from.split('-')[1]}支付${paid}元${to ? `给玩家${to.split('-')[1]}` : ''}${paid < amount ? '（余额不足，候选规则截断）' : ''}。`);
    };
    if (g.type === 2) { s.economy!.balances[id].cash += amount; notice(emit, `大财神赠送现金${amount}元。`); }
    else if (g.type === 6) take(id, null, false);
    else for (const p of s.players.filter(p => p.id !== id && !s.finance!.eliminated.includes(p.id))) { if (g.type === 1) take(p.id, id, true); else take(id, p.id, false); }
  } else if (g.type === 3 || g.type === 4) for (let i = 0; i < (g.type === 3 ? 1 : 2); i++) receiveRandomCard(s, id, emit);
  else if (g.type === 7 || g.type === 8) {
    const count = g.type === 7 ? Math.min(1, s.g3!.slots[id].length) : Math.floor(s.g3!.slots[id].length / 2);
    for (let i = 0; i < count; i++) drop(s, id, s.g3!.slots[id][draw(s, s.g3!.slots[id].length)]);
    notice(emit, `丢弃${count}张卡片并返供应池。`);
  } else if (g.type === 15) {
    if(s.rulesId==='japan-events-candidate-v47'){
      const m=s.g2!.players[id],e=s.g5!.engineers[id],equipped=e&&!e.suspended?'tool:12':m.vehicle;
      if(equipped!=='foot')s.effects!.inventory[id][equipped]=(s.effects!.inventory[id][equipped]??0)+1;
      m.vehicle='foot';m.diceCount=1;m.savedVehicle='foot';m.savedDice=1;s.g5!.engineers[id]=null;
    }
    for (const [item, count] of Object.entries(s.effects!.inventory[id])) for (let i = 0; i < count; i++) drop(s, id, item);
    notice(emit, s.rulesId==='japan-events-candidate-v47'?'衰神清空装备和背包，不返还点数；已放物件保留。':'衰神清空背包，不返还点数；装备和已放物件保留。');
  }
}
export function applyG6(s: GameState, item: string, option: G6Option, emit: Emit) {
  const id = s.players[s.active].id;
  if (!consumeG3(s, id, item, emit)) return false;
  if (item === 'card:22') {
    for(const g of [...s.g6!.gods])if(g.carrier===id&&GODS.find(d=>d.type===g.type)!.bad)removeGod(s,g.id,emit);
    for (const h of [...s.g5!.hazards]) if (h.carrier === id) removeHazard(s, h.id, emit, '送神符移除');
    notice(emit, '送神符生效：移除自身不利神仙和携带炸弹。');
  } else if (item === 'card:23') attach(s, s.g6!.gods.find(g => g.id === option.target.id)!, emit);
  else {
    const k = s.g6!.stocks.find(k => k.id === option.target.id)!;
    const old = k.price;
    if((s.rulesId==='japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))k.momentum=item==='card:24'?10:-10;
    k.trend = item === 'card:24' ? 'red' : 'black'; k.remaining = 2; k.price = marketPrice(k.base, k.trend === 'red' ? 10 : -10); k.history[k.history.length - 1] = k.price;
    if (item === 'card:25') for (const p of s.players) if (p.id !== id && Math.floor(s.g6!.holdings[p.id][k.id].quantity * (old - k.price) / 100 / 200) > 0) hostility(s, p.id, id, emit);
    notice(emit, `${JAPAN_STOCKS.find(d => d.id === k.id)!.name}：${(old / 100).toFixed(2)} → ${(k.price / 100).toFixed(2)}元（${k.trend === 'red' ? '红' : '黑'}卡）。`);
  }
  s.effects!.pending = null; s.pending = null; s.phase = 'idle'; return true;
}
export function encounterGod(s: GameState, emit: Emit) {
  if (!s.g6) return;
  const p = s.players[s.active];
  const g = s.g6.gods.find(g => !g.carrier && g.node === p.node);
  if (g) attach(s, g, emit);
}
export function tickGods(s: GameState, emit: Emit) {
  const id = s.players[s.active].id, g = attachedGod(s, id);
  if (g && --g.remaining === 0) { removeGod(s,g.id,emit); notice(emit, `玩家${id.split('-')[1]}的神仙期限结束。`); }
}
export function godRent(s: GameState, id: string, amount: number) {
  const type = attachedGod(s, id)?.type;
  return type === 1 ? Math.floor(amount / 2) : type === 2 ? 0 : type === 5 ? amount + Math.floor(amount / 2) : type === 6 ? amount * 2 : amount;
}
export function godOwnsLanding(s: GameState, definitions: readonly PropertyDefinition[], emit: Emit) {
  const p = s.players[s.active];
  if (attachedGod(s, p.id)?.type !== 12) return false;
  const d = definitions.find(d => d.nodeIds.includes(p.node)); if (!d) return false;
  const q = s.economy!.properties.find(q => q.id === d.id)!;
  if (q.ownerId !== p.id) { hostility(s, q.ownerId, p.id, emit); q.ownerId = p.id; emit({ type: 'g4PropertyChanged', property: structuredClone(q), reason: '土地公取得产权' }); }
  return true;
}
export function finishGodLanding(s: GameState, definitions: readonly PropertyDefinition[], emit: Emit) {
  const p = s.players[s.active], type = attachedGod(s, p.id)?.type;
  if (s.g5?.landedTurn !== s.turn || !type || ![9, 10].includes(type) || s.finance!.eliminated.includes(p.id) || actionLocked(s.g2!.players[p.id]) || s.g4!.hotel[p.id]) return;
  for (const d of definitions.filter(d => d.nodeIds.includes(p.node))) {
    const q = s.economy!.properties.find(q => q.id === d.id)!;
    if (type === 9) { if (d.kind === 'facility' && !q.level) q.buildingType = 1; q.level = Math.min(q.level + 1, maximumLevel(q, d)); }
    else { if (q.level) hostility(s, q.ownerId, p.id, emit); q.level = d.kind === 'land' && q.buildingType === 1 ? 0 : Math.max(0, q.level - 1); if (!q.level) { q.buildingType = 0; q.research = null; } }
    emit({ type: 'g4PropertyChanged', property: structuredClone(q), reason: type === 9 ? '天使附身' : '恶魔附身' });
  }
}
