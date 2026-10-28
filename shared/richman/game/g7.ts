import {removeGod,allRoadGods} from './god-pairs';
import type { GameState, EventPayload } from './engine';
import type { MapNode } from '../types';
import type { PropertyDefinition } from './economy';
import type { Target } from './effects';
import { createEffectRegistry } from './effects';
import { G6_EFFECTS, G6_FINGERPRINT } from './g6';
import { G6_GOODS, GODS } from './g6-catalog';
import { G5_GOODS } from './g5-catalog';
import { hospital, removeHazard } from './g5';
import { G4_GOODS } from './g4-catalog';
import { G3_GOODS, consumeG3, hostility } from './g3';
import { G2_GOODS, detained, actionLocked } from './g2';
import { G1_GOODS, g1Adjacent } from './g1';
import { EQUAL_CASH_EFFECT } from './cards';
import { WEALTH_EFFECT } from './wealth';
import { REMOTE_EFFECT } from './items';
import { NEARBY_WORKER_EFFECT, projectWorkerAnchor } from './nearby-construction';
import { ROADBLOCK_EFFECT, ROBOT_EFFECT } from './road-tools';
import { directionFor } from '../traversal';
import { hashSeed } from './random';
import { G7_GOODS } from './g7-catalog';
export const G7_RULES = Object.freeze({ id: 'japan-tools-candidate-v13', version: 1,
  research: 'tool10-level2-tool11-level3-tool13-level5;free5-owner-turns;zero-initial;not-shop;cap9',
  time: 'per-player-last-departure-before-roll-or-self-teleport;restore-world-players-assets-properties-pools-status-gods-market-round;keep-rng-command-turn-revision-serial;require-current-and-saved-time-tool;consume-saved-one;invalidate-all-checkpoints;idle',
  teleport: 'source-near440-anchors-player-unattached-object-property;destination-any-road-or-same-kind-unowned-zero-land;no-same-location;nearest-heading-legal-exit;self-landing-only;carry-bomb-no-step-tick;property-owner-level-type-move-research-cancel-price-stays',
  nuclear: 'any-road-center;440-square-unique-projection-anchors;clear-owner-building-type-research-preserve-price;present-players-hospital3-destroy-vehicle;remove-objects-and-gods-including-carried;no-reactions',
  scope: 'no-special-players-pixel-hitmaps-original-calendar-or-animations;checkpoint-Web-coherent-domain-copy-no-recursive-history;v12-unchanged',
});
export const G7_EFFECTS = createEffectRegistry([
  ...[REMOTE_EFFECT, NEARBY_WORKER_EFFECT, ROADBLOCK_EFFECT, ROBOT_EFFECT, EQUAL_CASH_EFFECT, WEALTH_EFFECT,
    ...G1_GOODS.map(g => g.effect), ...G2_GOODS.map(g => g.effect), ...G3_GOODS.map(g => g.effect), ...G4_GOODS.map(g => g.effect), ...G5_GOODS.map(g => g.effect), ...G6_GOODS.map(g => g.effect)].map(id => G6_EFFECTS.get(id)!),
  ...G7_GOODS.map(g => ({ id: g.effect, itemId: g.id, operation: g.effect, target: g.target, consume: 1, timings: ['beforeRoll'] as const, status: null })),
]);
export const G7_FINGERPRINT = hashSeed(JSON.stringify({ base: G6_FINGERPRINT, rules: G7_RULES, goods: G7_GOODS, effects: G7_EFFECTS.fingerprint })).toString(16);
const WORLD_KEYS = ['players', 'economy', 'finance', 'items', 'effects', 'roadTools', 'cards', 'wealth', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const;
type World = Pick<GameState, typeof WORLD_KEYS[number]> & Pick<GameState, 'news' | 'fortune' | 'calendar' | 'lottery' | 'magic' | 'siteServices'>;
export type Checkpoint = { turn: number; round: number; world: World };
export type G7State = { checkpoints: Record<string, Checkpoint | null> };
export type G7Option = { target: Target; title: string; detail: string; destinations?: { target: Target; title: string }[] };
type Emit = (e: EventPayload) => void;
const note = (emit: Emit, message: string) => emit({ type: 'g7Notice', message });
const match = (a: Target, b?: Target) => a.kind === b?.kind && a.id === b.id;
const inView = (center: { x: number; y: number }, point: { x: number; y: number }) => { const a = projectWorkerAnchor(center, point); return !!a && a.x >= 0 && a.x < 440 && a.y >= 0 && a.y < 440; };
export function saveCheckpoint(s: GameState) {
  if (!s.g7) return;
  const world = structuredClone(Object.fromEntries(WORLD_KEYS.map(k => [k, s[k]]))) as unknown as World;
  if(s.siteServices)world.siteServices=structuredClone(s.siteServices);
  if(s.magic)world.magic=structuredClone(s.magic);
  if (s.news) world.news = structuredClone(s.news);
  if(s.calendar)world.calendar=structuredClone(s.calendar);
  if(s.lottery)world.lottery=structuredClone(s.lottery);
  if (s.fortune) world.fortune = structuredClone(s.fortune);
  // A snapshot made during self-teleport selection must resume at idle, not at a stale dialog.
  world.effects!.pending = null;
  s.g7.checkpoints[s.players[s.active].id] = { turn: s.turn, round: s.finance!.round, world };
}
export function timeAvailable(s: GameState) {
  const id = s.players[s.active].id, c = s.g7?.checkpoints[id];
  return !!c && (c.world.effects!.inventory[id]['tool:10'] ?? 0) > 0;
}
export function restoreCheckpoint(s: GameState, emit: Emit) {
  if (!timeAvailable(s)) return false;
  const id = s.players[s.active].id, c = s.g7!.checkpoints[id]!;
  if (!(s.effects!.inventory[id]['tool:10'] > 0)) return false;
  const effectSerial = s.effects!.serial;
  Object.assign(s, structuredClone(c.world));
  s.effects!.serial = Math.max(effectSerial, s.effects!.serial);
  s.effects!.pending = null; s.pending = null; s.phase = 'idle'; s.dice = 0; s.remaining = 0;
  s.g5!.landedTurn = 0;
  s.g7!.checkpoints = Object.fromEntries(s.players.map(p => [p.id, null]));
  consumeG3(s, id, 'tool:10', emit);
  note(emit, `时光机：恢复第${c.round}轮、行动${c.turn}出发前的全局资产和状态，扣除历史背包1台；随机序列继续，旧历史已清除。`);
  return true;
}
export function nuclearTargets(s: GameState, nodes: readonly MapNode[], definitions: readonly PropertyDefinition[], node: number) {
  const center = nodes.find(n => n.id === node)!;
  const position = (id: string) => nodes.find(n => n.id === s.players.find(p => p.id === id)!.node)!;
  return {
    properties: definitions.filter(d => inView(center, d)).map(d => d.id),
    players: s.players.filter(p => !s.finance!.eliminated.includes(p.id) && !detained(s.g2!.players[p.id]) && !s.g4!.hotel[p.id] && inView(center, position(p.id))).map(p => p.id),
    blocks: s.roadTools!.blocks.filter(n => inView(center, nodes.find(x => x.id === n)!)),
    hazards: s.g5!.hazards.filter(h => inView(center, h.carrier ? position(h.carrier) : nodes.find(n => n.id === h.node)!)).map(h => h.id),
    ...(s.g6!.objects?{objects:s.g6!.objects.filter(g=>inView(center,nodes.find(n=>n.id===g.node)!)).map(g=>g.id)}:{}),
    gods: s.g6!.gods.filter(g => inView(center, g.carrier ? position(g.carrier) : nodes.find(n => n.id === g.node)!)).map(g => g.id),
  };
}
export function g7Options(s: GameState, nodes: readonly MapNode[], defs: readonly PropertyDefinition[], item: string): G7Option[] {
  if (!s.g7 || !['idle', 'effect'].includes(s.phase)) return [];
  const p = s.players[s.active], center = nodes.find(n => n.id === p.node)!;
  if (actionLocked(s.g2!.players[p.id]) || s.g4!.hotel[p.id]) return [];
  if (item === 'tool:10') { const c = s.g7.checkpoints[p.id]; return timeAvailable(s) ? [{ target: { kind: 'player', id: p.id }, title: `恢复第${c!.round}轮 / 行动${c!.turn}出发前`, detail: '恢复全体玩家位置、现金/存款、地产、库存/供应、研究、车辆/状态、神仙、道路物件及股票持仓/行情。随机序列和操作日志不倒退；从历史背包扣1台，所有旧历史清除。取消不改变任何状态。' }] : []; }
  if (item === 'tool:13') return nodes.map(n => { const hit = nuclearTargets(s, nodes, defs, n.id); return { target: { kind: 'node', id: String(n.id) }, title: `${n.id}号路格为爆心`, detail: `440×440投影范围：${hit.properties.length}块地产清空产权与建筑/研究，${hit.players.length}位玩家住院3次并损毁当前车辆，移除${hit.blocks.length + hit.hazards.length + (hit.objects?.length??0)}个道路物件及${hit.gods.length}位神仙。包括自己，无反制窗口；范围不是全地图。` }; });
  if (item !== 'tool:11') return [];
  const roadDestinations = (old: number, empty = false) => nodes.filter(n => n.id !== old && (!empty || (!s.roadTools!.blocks.includes(n.id) && !s.g5!.hazards.some(h => !h.carrier && h.node === n.id) && !allRoadGods(s).some(g => !g.carrier && g.node === n.id)))).map(n => ({ target: { kind: 'node' as const, id: String(n.id) }, title: `${n.id}号路格` }));
  const result: G7Option[] = s.players.filter(q => !s.finance!.eliminated.includes(q.id) && !detained(s.g2!.players[q.id]) && !s.g4!.hotel[q.id] && inView(center, nodes.find(n => n.id === q.node)!)).map(q => ({ target: { kind: 'player', id: q.id }, title: `玩家 ${q.id.split('-')[1]}（${q.node}号）`, detail: q.id === p.id ? '传送自己后立即结算目的地，结束本次出发；不掷骰、不扣炸弹步数。会先保存时光机历史。' : '只移动对方并保留状态/车辆，携带神仙和炸弹跟随；不立即结算对方落点，不消耗移动步数。', destinations: roadDestinations(q.node) }));
  for (const d of defs.filter(d => inView(center, d))) {
    const q = s.economy!.properties.find(q => q.id === d.id)!;
    if (!q.ownerId && !q.level) continue;
    result.push({ target: { kind: 'property', id: d.id }, title: `${d.name} · 搬移地产 ${d.id.split(':').at(-1)}`, detail: '产权、楼级与建筑类型移到同类待售空地；原地变待售空地。研究取消，价格/查封状态留在各自地块（Web约定）。', destinations: defs.filter(e => e.id !== d.id && e.kind === d.kind && s.economy!.properties.some(x => x.id === e.id && !x.ownerId && !x.level)).map(e => ({ target: { kind: 'property', id: e.id }, title: `${e.name} · ${e.id.split(':').at(-1)}号空地` })) });
  }
  for (const node of s.roadTools!.blocks.filter(n => inView(center, nodes.find(x => x.id === n)!))) result.push({ target: { kind: 'object', id: `block:${node}` }, title: `${node}号路障`, detail: '搬移路障，不改变库存/供应；目的地不能已有道路物件。', destinations: roadDestinations(node, true) });
  for (const h of s.g5!.hazards.filter(h => !h.carrier && inView(center, nodes.find(n => n.id === h.node)!))) result.push({ target: { kind: 'object', id: `hazard:${h.id}` }, title: `${h.node}号${h.itemId === 'tool:03' ? '地雷' : '炸弹'}`, detail: '搬移未携带物件，不改变供应和计时；不当场攻击站在目的地的玩家。', destinations: roadDestinations(h.node, true) });
  for (const g of s.g6!.gods.filter(g => !g.carrier && inView(center, nodes.find(n => n.id === g.node)!))) result.push({ target: { kind: 'god', id: g.id }, title: `${GODS.find(d => d.type === g.type)!.name} · ${g.node}号`, detail: '搬移游离神仙，不当场附身；附身者应通过传送玩家移动。', destinations: roadDestinations(g.node, true) });
  return result.filter(o => o.destinations?.length);
}
export function applyG7(s: GameState, nodes: readonly MapNode[], defs: readonly PropertyDefinition[], item: string, option: G7Option, destination: Target | undefined, emit: Emit) {
  if (item === 'tool:10') return !destination && restoreCheckpoint(s, emit);
  if (item === 'tool:11' ? !option.destinations?.some(d => match(d.target, destination)) : destination !== undefined) return false;
  const id = s.players[s.active].id;
  if (item === 'tool:11' && option.target.kind === 'player' && option.target.id === id) saveCheckpoint(s);
  if (!consumeG3(s, id, item, emit)) return false;
  s.effects!.pending = null; s.pending = null; s.phase = 'idle';
  if (item === 'tool:13') {
    const hit = nuclearTargets(s, nodes, defs, Number(option.target.id));
    for (const key of hit.properties) {
      const q = s.economy!.properties.find(q => q.id === key)!;
      if (q.level) hostility(s, q.ownerId, id, emit);
      q.ownerId = null; q.level = 0; q.buildingType = 0; q.research = null;
      emit({ type: 'g4PropertyChanged', property: structuredClone(q), reason: '核子飞弹清空' });
    }
    for (const h of hit.hazards) removeHazard(s, h, emit, '核子飞弹');
    for (const n of hit.blocks) { s.roadTools!.blocks = s.roadTools!.blocks.filter(x => x !== n); s.roadTools!.supply['tool:02']++; emit({ type: 'roadblockRemoved', node: n, reason: 'missile', supply: s.roadTools!.supply['tool:02'] }); }
    for(const id of [...hit.gods,...(hit.objects??[])])removeGod(s,id,emit);
    for (const victim of hit.players) { hostility(s, victim, id, emit); hospital(s, nodes, victim, 3, emit); }
    note(emit, `核子飞弹命中${hit.properties.length}块地产、${hit.players.length}位玩家，移除${hit.gods.length}位神仙。`);
  } else {
    const t = option.target, dest = destination!;
    if (t.kind === 'property') {
      const from = s.economy!.properties.find(q => q.id === t.id)!, to = s.economy!.properties.find(q => q.id === dest.id)!;
      to.ownerId = from.ownerId; to.level = from.level; to.buildingType = from.buildingType; to.research = null;
      from.ownerId = null; from.level = 0; from.buildingType = 0; from.research = null;
      for (const q of [from, to]) emit({ type: 'g4PropertyChanged', property: structuredClone(q), reason: '传送机搬移' });
    } else {
      const node = Number(dest.id);
      if (t.kind === 'player') {
        const q = s.players.find(q => q.id === t.id)!, old = nodes.find(n => n.id === q.node)!, prev = nodes.find(n => n.id === q.previous);
        const facing = s.g1!.facing[q.id] ?? (prev ? directionFor(old.x - prev.x, old.y - prev.y) : 4), end = nodes.find(n => n.id === node)!;
        const exits = g1Adjacent(end), diff = (n: number) => { const k = nodes.find(k => k.id === n)!, delta = Math.abs(directionFor(k.x - end.x, k.y - end.y) - facing); return Math.min(delta, 8 - delta); };
        const chosen = [...exits].sort((a, b) => diff(a) - diff(b))[0];
        q.node = node; q.previous = exits.find(n => n !== chosen) ?? chosen ?? null;
        s.g1!.facing[q.id] = chosen === undefined ? facing : directionFor(nodes.find(n => n.id === chosen)!.x - end.x, nodes.find(n => n.id === chosen)!.y - end.y);
        for (const h of s.g5!.hazards) if (h.carrier === q.id) h.node = node;
        for (const g of s.g6!.gods) if (g.carrier === q.id) g.node = node;
      } else if (t.kind === 'god') s.g6!.gods.find(g => g.id === t.id)!.node = node;
      else if (t.id.startsWith('block:')) s.roadTools!.blocks = s.roadTools!.blocks.map(n => n === Number(t.id.slice(6)) ? node : n);
      else s.g5!.hazards.find(h => h.id === Number(t.id.slice(7)))!.node = node;
    }
    note(emit, `${option.title}已传送至${option.destinations!.find(d => match(d.target, dest))!.title}。`);
  }
  return true;
}
