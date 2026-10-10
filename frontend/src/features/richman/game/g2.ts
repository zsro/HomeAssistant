import {priceIndex} from './price-index';
import {claimInsurance} from './insurance-state';
import { createEffectRegistry } from './effects';
import type { Target } from './effects';
import { G1_EFFECTS, G1_FINGERPRINT, G1_GOODS } from './g1';
import { WEALTH_EFFECT } from './wealth';
import { EQUAL_CASH_EFFECT, cardCount } from './cards';
import { REMOTE_EFFECT } from './items';
import { NEARBY_WORKER_EFFECT, projectWorkerAnchor } from './nearby-construction';
import { ROADBLOCK_EFFECT, ROBOT_EFFECT } from './road-tools';
import { hashSeed } from './random';
import type { EventPayload, GameState } from './engine';
import type { MapNode } from '../types';

export const G2_GOODS = [
  { id: 'card:14', name: '停留卡', price: 20, supply: 4, effect: 'card:14:stop-v1', target: 'player' },
  { id: 'card:15', name: '冬眠卡', price: 100, supply: 2, effect: 'card:15:winter-v1', target: 'self' },
  { id: 'card:16', name: '梦游卡', price: 25, supply: 4, effect: 'card:16:dream-v1', target: 'otherPlayer' },
  { id: 'card:17', name: '陷害卡', price: 20, supply: 4, effect: 'card:17:prison-v1', target: 'otherPlayer' },
  { id: 'card:30', name: '乌龟卡', price: 70, supply: 3, effect: 'card:30:turtle-v1', target: 'player' },
  { id: 'tool:05', name: '机车', price: 80, supply: 10, effect: 'tool:05:motorcycle-v1', target: 'self' },
  { id: 'tool:06', name: '汽车', price: 150, supply: 10, effect: 'tool:06:car-v1', target: 'self' },
] as const;
export type Vehicle = 'foot' | 'tool:05' | 'tool:06';
export type StatusKey = 'stop' | 'winter' | 'dream' | 'prison' | 'hospital' | 'turtle';
export type Mobility = Record<StatusKey, number> & { travel?: number; vehicle: Vehicle; diceCount: number; savedVehicle: Vehicle; savedDice: number };
export type G2State = { supply: Record<string, number>; players: Record<string, Mobility>; lastDice: number[] };
export type G2Option = { target: Target; title: string; detail: string; playerIds: string[] };
export const G2_RULES = Object.freeze({ id: 'japan-tools-candidate-v8', handlerVersion: 1,
  clock: 'target-turn-start-clear-128-then-decrement-to-128;detention-freezes-winter-dream-turtle',
  stop: 'self128-other1-no-roll-no-landing', turtle: 'self2-other3-one-step-no-rng',
  winter: 'other-present-not-detained-5-clear-dream-no-auto-restore', dream: 'other-present-5-suspend-vehicle-no-buy-upgrade-sites-bank;pay-rent',
  prison: 'other-present-5-move-to-kind8002-no-landing;release-next-after-last-skip',
  vehicles: 'shop-zero-initial-reserved-pool;equip-swaps-to-inventory;select1-to-max',
  movement: 'independent-seeded-dice;remote-total1-to6;dream-seeded-branch-choice',
  remoteRestricted: 'reject-while-stop-or-turtle-instead-of-consuming-ignored-choice',
  rent: 'waive-when-owner-detained-winter-or-dream',
  scope: 'ordinary-players-no-hotel-disappear-reactions-insurance-hostility;hospital-entry-reserved-G5',
});
export const G2_EFFECTS = createEffectRegistry([
  ...[REMOTE_EFFECT, NEARBY_WORKER_EFFECT, ROADBLOCK_EFFECT, ROBOT_EFFECT, EQUAL_CASH_EFFECT, WEALTH_EFFECT, ...G1_GOODS.map(g => g.effect)].map(id => G1_EFFECTS.get(id)!),
  ...G2_GOODS.map(g => ({ id: g.effect, itemId: g.id, operation: g.effect, target: g.target, consume: 1, timings: ['beforeRoll'] as const, status: null })),
]);
// Persistence uses the domain clock below: raw expiry markers and detention freeze cannot be represented by a uniform duration.
export const G2_FINGERPRINT = hashSeed(JSON.stringify({ base: G1_FINGERPRINT, rules: G2_RULES, goods: G2_GOODS, effects: G2_EFFECTS.fingerprint })).toString(16);
export function emptyMobility(): Mobility { return { stop: 0, winter: 0, dream: 0, prison: 0, hospital: 0, turtle: 0, vehicle: 'foot', diceCount: 1, savedVehicle: 'foot', savedDice: 1 }; }
export const vehicleName = (v: Vehicle) => v === 'tool:05' ? '机车' : v === 'tool:06' ? '汽车' : '步行';
export const maxDice = (v: Vehicle) => v === 'tool:05' ? 2 : v === 'tool:06' ? 3 : 1;
export const detained = (m?: Mobility) => !!m && !!(m.prison || m.hospital || m.travel);
export const actionLocked = (m?: Mobility) => !!m && !!(detained(m) || m.winter || m.dream);
export const cannotCollectRent = (m?: Mobility) => actionLocked(m);
const statusNames: Record<StatusKey, string> = { stop: '停留', winter: '冬眠', dream: '梦游', prison: '监禁', hospital: '住院', turtle: '乌龟' };
export function mobilityText(m: Mobility, active = false) {
  const statuses = (Object.keys(statusNames) as StatusKey[]).filter(k => m[k]).map(k => `${statusNames[k]} ${m[k] === 128 ? (active ? '本次后结束' : '下次解除') : `${m[k]}（行动计时）`}`);
  if(m.travel)statuses.push(`${m.travel&64?'外星人绑架':'出国观光'} ${m.travel&128?'下次返回':`${m.travel&63}（行动计时）`}`);
  return `${vehicleName(m.vehicle)} · ${m.diceCount} 骰${statuses.length ? ' · ' + statuses.join(' · ') : ''}`;
}
export function g2PurchaseReason(inventory: Record<string, number>, points: number, supply: number, id: string, price: number) {
  return id.startsWith('card:') && cardCount(inventory) >= 15 ? '卡片背包已满' : id.startsWith('tool:') && (inventory[id] ?? 0) >= 9 ? '已达到持有上限' : supply < 1 ? '暂时售罄' : points < price ? '点数不足' : '';
}
export function detentionNode(nodes: readonly MapNode[], kind: 'prison' | 'hospital') { return nodes.find(n => n.kind === (kind === 'prison' ? 8002 : 8001)); }
export function g2Options(state: GameState, nodes: readonly MapNode[], itemId: string): G2Option[] {
  if (!state.g2) return [];
  const source = state.players[state.active], own = state.g2.players[source.id];
  if (actionLocked(own) || state.g4?.hotel[source.id]) return [];
  const title = (id: string) => `玩家 ${state.players.findIndex(p => p.id === id) + 1}${id === source.id ? '（你）' : ''}`;
  if (itemId === 'tool:05' || itemId === 'tool:06') return state.g5?.engineers[source.id] ? [] : own.vehicle === itemId ? [] : [{ target: { kind: 'player', id: source.id }, title: title(source.id), playerIds: [source.id],
    detail: `改用${vehicleName(itemId)}，默认 ${maxDice(itemId)} 颗骰子，可选 1–${maxDice(itemId)} 颗。${own.vehicle !== 'foot' ? '原车辆回到背包。' : ''}装备的车辆不返还商店池，遥控骰子仍指定总步数 1–6。` }];
  if (itemId === 'card:15') {
    const ids = state.players.filter(p => p.id !== source.id && !state.finance?.eliminated.includes(p.id) && !detained(state.g2!.players[p.id]) && !state.g4?.hotel[p.id] && nodes.find(n => n.id === p.node)?.x !== 0).map(p => p.id);
    return [{ target: { kind: 'player', id: source.id }, title: '全图合格对手', playerIds: ids,
      detail: `${ids.length ? ids.map(title).join('、') : '没有合格对手'}：冬眠 5 次行动，清除梦游；不改变资金。监禁/住院玩家不受影响。确认消耗 1 张${ids.length ? '' : '（本次无目标生效）'}。` }];
  }
  if (!['card:14', 'card:16', 'card:17', 'card:30'].includes(itemId) || (itemId === 'card:17' && !detentionNode(nodes, 'prison'))) return [];
  const center = nodes.find(n => n.id === source.node)!;
  return state.players.flatMap(p => {
    if (state.finance?.eliminated.includes(p.id) || detained(state.g2!.players[p.id]) || state.g4?.hotel[p.id] || (['card:16', 'card:17'].includes(itemId) && p.id === source.id)) return [];
    const node = nodes.find(n => n.id === p.node)!;
    const anchor = projectWorkerAnchor(center, node);
    if (!anchor || anchor.x < 0 || anchor.y < 0 || anchor.x >= 440 || anchor.y >= 440) return [];
    const detail = itemId === 'card:14' ? `${p.id === source.id ? '本次' : '下次'}行动不移动、不掷骰，不重复结算落点；掷骰前仍可用卡。`
      : itemId === 'card:30' ? `${p.id === source.id ? '含本次在内' : '接下来'}共 3 次行动，每次固定走 1 格；不抽骰，车辆保留。`
      : itemId === 'card:17' ? '送至监狱，暂停 5 次行动；释放后从监狱路格出发。资金、地产和车辆不变。'
      : state.g2!.players[p.id].winter ? '目标正在冬眠：本次梦游不会生效，确认仍消耗 1 张。'
      : '梦游 5 次行动，暂时改为步行，车辆入包；不能用卡、买地或升级，仍需付租。正常到期尝试恢复原车辆。';
    return [{ target: { kind: 'player' as const, id: p.id }, title: `${title(p.id)} · ${p.node} 号路格`, detail, playerIds: [p.id] }];
  });
}
function tickRaw(value: number) { return value === 128 ? 0 : value > 1 ? value - 1 : value === 1 ? 128 : 0; }
/** Runs once at the incoming player's turn boundary, never per animation frame or global round. */
export function tickMobility(m: Mobility, inventory: Record<string, number>) {
  const travelReleased=!!((m.travel??0)&128);
  if(m.travel!==undefined){if(travelReleased)m.travel=0;else if(m.travel){m.travel=(m.travel-1)&255;if(!(m.travel&63))m.travel|=128;}}
  const released = travelReleased ? 'travel' : m.prison === 128 ? 'prison' : m.hospital === 128 ? 'hospital' : null;
  m.prison = tickRaw(m.prison); m.hospital = tickRaw(m.hospital);
  if (!detained(m)) {
    if (m.dream === 128) {
      if (m.savedVehicle !== 'foot' && (inventory[m.savedVehicle] ?? 0) > 0) {
        inventory[m.savedVehicle]--; m.vehicle = m.savedVehicle; m.diceCount = m.savedDice;
      } else { m.vehicle = 'foot'; m.diceCount = 1; }
      m.savedVehicle = 'foot'; m.savedDice = 1;
    }
    m.winter = tickRaw(m.winter); m.dream = tickRaw(m.dream); m.turtle = tickRaw(m.turtle);
  }
  m.stop = tickRaw(m.stop);
  return released;
}
/** Applies only after the host validates and consumes the proposal, keeping all mutations atomic. */
export function applyG2(state: GameState, nodes: readonly MapNode[], itemId: string, option: G2Option, emit: (e: EventPayload)=>void=()=>{}) {
  const g2 = state.g2!;
  for (const id of option.playerIds) {
    const m = g2.players[id], inventory = state.effects!.inventory[id];
    if (itemId === 'tool:05' || itemId === 'tool:06') {
      if (m.vehicle !== 'foot') inventory[m.vehicle] = (inventory[m.vehicle] ?? 0) + 1;
      m.vehicle = itemId; m.diceCount = maxDice(itemId);
    } else if (itemId === 'card:14') m.stop = id === state.players[state.active].id ? 128 : 1;
    else if (itemId === 'card:30') m.turtle = id === state.players[state.active].id ? 2 : 3;
    else if (itemId === 'card:15') { m.winter = 5; m.dream = 0; m.savedVehicle = 'foot'; m.savedDice = 1; }
    else if (itemId === 'card:16' && !m.winter) {
      m.dream = 5; m.savedVehicle = m.vehicle; m.savedDice = m.diceCount;
      if (m.vehicle !== 'foot') inventory[m.vehicle] = (inventory[m.vehicle] ?? 0) + 1;
      m.vehicle = 'foot'; m.diceCount = 1;
    } else if (itemId === 'card:17') enterDetention(state, nodes, id, 'prison', 5,emit);
  }
  if (itemId.startsWith('card:')) g2.supply[itemId]++;
}
export function enterDetention(state: GameState, nodes: readonly MapNode[], id: string, kind: 'prison' | 'hospital', turns: number,emit:(e:EventPayload)=>void=()=>{}) {
  const node = detentionNode(nodes, kind);
  if (!node || !Number.isInteger(turns) || turns < 1 || turns > 127 || !state.g2?.players[id]) throw new Error('Invalid detention');
  if (state.g4) state.g4.hotel[id] = 0;
  if(state.g2.players[id].travel!==undefined)state.g2.players[id].travel=0;
  const m = state.g2.players[id], player = state.players.find(p => p.id === id)!;
  if(state.news?.detention){const roster=state.news.detention;roster[kind]=[...new Set([...roster[kind],id])];const other=kind==='prison'?'hospital':'prison';roster[other]=roster[other].filter(p=>p!==id);}
  m[kind] = ((m[kind] & 127) + turns) & 127;
  m[kind === 'prison' ? 'hospital' : 'prison'] = 0;
  player.node = node.id; player.previous = null;
  if (state.g1) delete state.g1.facing[id];
  claimInsurance(state,id,turns*2000*priceIndex(state),kind==='hospital'?'住院':'监禁',emit);
}
