import { G7_GOODS } from './g7-catalog';
import type { MapNode } from '../types';
import type { GameState, EventPayload } from './engine';
import type { PropertyDefinition } from './economy';
import type { Target } from './effects';
import type { Vehicle } from './g2';
import { createEffectRegistry } from './effects';
import { G4_EFFECTS, G4_FINGERPRINT, G4_GOODS, maximumLevel } from './g4';
import { G3_GOODS, consumeG3, hostility } from './g3';
import { G2_GOODS, actionLocked, detained, enterDetention } from './g2';
import { G1_GOODS } from './g1';
import { EQUAL_CASH_EFFECT } from './cards';
import { WEALTH_EFFECT } from './wealth';
import { REMOTE_EFFECT } from './items';
import { NEARBY_WORKER_EFFECT, projectWorkerAnchor } from './nearby-construction';
import { ROADBLOCK_EFFECT, ROBOT_EFFECT, roadblockTargets } from './road-tools';
import { G5_GOODS, RESEARCH_PRODUCTS } from './g5-catalog';
import { hashSeed } from './random';
export const G5_RULES = Object.freeze({ id: 'japan-tools-candidate-v11', version: 1,
  construction: 'angel-same-name-land-or-single-facility-plus-one;devil-street-clear;monster-single-clear;keep-owner',
  hazards: 'one-road-object-per-node;mine-landing-hospital3;bomb-landing-pickup38;each-entered-node-decrement-before-transfer;zero-damage-current-building-one-hospital5',
  missile: 'road-anchor-selected-in440;projected200-square-unique-anchors;building-minus-one;players-hospital3-destroy-vehicle;remove-road-objects-and-carried-bombs',
  engineer: 'research-only-level4;seven-own-turns-including-use;one-die;demolish-nonself-built-property-after-landing-settlement;no-road-immunity;dream-suspend-clock;expiry-restore-bag-vehicle',
  research: 'worker-level1-engineer-level4;free-five-owner-turns;standing-owner-idle-or-turnEnd-start;no-overwrite;auto-receive-cap9-overflow-discard;invalidate-on-type-level-owner-seal',
  reactions: 'no-absolve-redirect-revenge-free-for-G5;positive-hostility-break-alliance;existing-G3-windows-preserved',
  scope: 'no-special-actors-gods-insurance-pixel-hitmaps;candidate-boundaries-explicit;v10-unchanged',
});
export const G5_EFFECTS = createEffectRegistry([
  ...[REMOTE_EFFECT, NEARBY_WORKER_EFFECT, ROADBLOCK_EFFECT, ROBOT_EFFECT, EQUAL_CASH_EFFECT, WEALTH_EFFECT,
    ...G1_GOODS.map(g => g.effect), ...G2_GOODS.map(g => g.effect), ...G3_GOODS.map(g => g.effect), ...G4_GOODS.map(g => g.effect)].map(id => G4_EFFECTS.get(id)!),
  ...G5_GOODS.map(g => ({ id: g.effect, itemId: g.id, operation: g.effect, target: g.target, consume: 1, timings: ['beforeRoll'] as const, status: null })),
]);
export const G5_FINGERPRINT = hashSeed(JSON.stringify({ base: G4_FINGERPRINT, rules: G5_RULES, goods: G5_GOODS, research: RESEARCH_PRODUCTS, effects: G5_EFFECTS.fingerprint })).toString(16);
export type Hazard = { id: number; itemId: 'tool:03' | 'tool:04'; node: number; carrier: string | null; remaining: number };
export type G5State = { supply: Record<string, number>; hazards: Hazard[]; serial: number; landedTurn: number;
  engineers: Record<string, { remaining: number; vehicle: Vehicle; dice: number; suspended: boolean } | null> };
export type G5Option = { target: Target; title: string; detail: string; buildingTypes?: number[] };
type Emit = (e: EventPayload) => void;
const note = (emit: Emit, message: string) => emit({ type: 'g5Notice', message });
const present = (s: GameState, id: string) => !s.finance!.eliminated.includes(id) && !detained(s.g2!.players[id]) && !s.g4!.hotel[id];
const inView = (center: { x: number; y: number }, point: { x: number; y: number }, radius = 220) => {
  const p = projectWorkerAnchor(center, point); return !!p && p.x >= 220 - radius && p.x < 220 + radius && p.y >= 220 - radius && p.y < 220 + radius;
};
function street(s: GameState, definitions: readonly PropertyDefinition[], target: PropertyDefinition, single: boolean) {
  return s.economy!.properties.filter(p => p.id === target.id || (!single && target.kind === 'land' && definitions.some(d => d.id === p.id && d.kind === 'land' && d.name === target.name)));
}
export function blastTargets(s: GameState, nodes: readonly MapNode[], definitions: readonly PropertyDefinition[], node: number) {
  const center = nodes.find(n => n.id === node)!;
  return {
    properties: definitions.filter(d => inView(center, d, 100)).map(d => d.id),
    players: s.players.filter(p => present(s, p.id) && inView(center, nodes.find(n => n.id === p.node)!, 100)).map(p => p.id),
    hazards: s.g5!.hazards.filter(h => inView(center, nodes.find(n => n.id === (h.carrier ? s.players.find(p => p.id === h.carrier)!.node : h.node))!, 100)).map(h => h.id),
    blocks: s.roadTools!.blocks.filter(id => inView(center, nodes.find(n => n.id === id)!, 100)),
  };
}
export function g5Options(s: GameState, nodes: readonly MapNode[], definitions: readonly PropertyDefinition[], item: string): G5Option[] {
  if (!s.g5) return [];
  const p = s.players[s.active], center = nodes.find(n => n.id === p.node)!;
  if (actionLocked(s.g2!.players[p.id]) || s.g4!.hotel[p.id]) return [];
  if (item === 'tool:12') return s.g5.engineers[p.id] ? [] : [{ target: { kind: 'player', id: p.id }, title: '驾驶工程车', detail: '含本次共7次自身行动，固定1骰；落点结算后拆空非己方建筑（含待售），保留产权，经过不拆。原车辆入包，到期有库存才恢复；地雷和爆炸仍会伤害你。' }];
  if (['tool:03', 'tool:04', 'tool:07'].includes(item)) {
    const occupied = [...s.roadTools!.blocks, ...s.g5.hazards.filter(h => !h.carrier).map(h => h.node)];
    return roadblockTargets(center, nodes, item === 'tool:07' ? [] : occupied).map(n => {
      const hit = item === 'tool:07' ? blastTargets(s, nodes, definitions, n) : null;
      return { target: { kind: 'node', id: String(n) }, title: `${n}号路格`, detail: hit
        ? `投影200×200范围：地产 ${hit.properties.map(id => definitions.find(d => d.id === id)!.name).join('、') || '无'}各降1级；玩家 ${hit.players.map(id => id.split('-')[1]).join('、') || '无'}住院3次并损毁车辆；移除${hit.hazards.length + hit.blocks.length}个物件。不触发免罪/嫁祸/复仇。`
        : item === 'tool:03' ? '在此放置地雷，停在这里的玩家住院3次，车辆损毁。路过不触发；机器娃娃和飞弹可清除。' : '在此放置炸弹；停下后携带，从之后每走一格倒数38格，相遇可转给首位未携带者；归零时脚下建筑降1级，携带者住院5次。' };
    });
  }
  return definitions.filter(d => inView(center, d) && (item !== 'card:11' || s.economy!.properties.some(q => q.id === d.id && q.level > 0 && q.ownerId !== p.id))).map(d => {
    const affected = street(s, definitions, d, item === 'card:11');
    const p = affected.find(p => p.id === d.id)!;
    return { target: { kind: 'property', id: d.id }, title: `${d.name} · ${d.nodeIds.join('/')}号`,
      detail: `${d.kind === 'land' && item !== 'card:11' ? '整条同名街区' : '此地块'}：${affected.map(q => `${q.id.split(':').at(-1)}号建筑 ${q.level} → ${item === 'card:09' ? Math.min(q.level + 1, maximumLevel(q, definitions.find(d => d.id === q.id)!)) : 0}`).join('；')}。产权和资金不变。${item === 'card:09' ? '达到上限不再升级，仍消耗卡片。' : '建筑类型重置；不触发防御卡。'}`,
      ...(item === 'card:09' && d.kind === 'facility' && !p.level ? { buildingTypes: [1, 2, 3, 4] } : {}) };
  });
}
function damage(s: GameState, d: PropertyDefinition, all: boolean, emit: Emit, reason: string, hostile = true) {
  const p = s.economy!.properties.find(p => p.id === d.id)!;
  if (hostile && p.level) hostility(s, p.ownerId, s.players[s.active].id, emit);
  p.level = all || (d.kind === 'land' && p.buildingType === 1) ? 0 : Math.max(0, p.level - 1);
  if (!p.level) { p.buildingType = 0; p.research = null; }
  emit({ type: 'g4PropertyChanged', property: structuredClone(p), reason });
}
export function removeHazard(s: GameState, id: number, emit: Emit, reason: string) {
  const h = s.g5!.hazards.find(h => h.id === id); if (!h) return;
  s.g5!.hazards = s.g5!.hazards.filter(h => h.id !== id); s.g5!.supply[h.itemId]++;
  emit({ type: 'hazardChanged', hazard: { ...h }, removed: true, reason });
}
export function clearHazards(s: GameState, path: readonly number[], emit: Emit) {
  if (!s.g5) return;
  for (const h of [...s.g5.hazards]) if (!h.carrier && path.includes(h.node)) removeHazard(s, h.id, emit, '机器娃娃清除');
}
export function hospital(s: GameState, nodes: readonly MapNode[], id: string, turns: number, emit: Emit) {
  const m = s.g2!.players[id];
  if (m.vehicle !== 'foot') s.g2!.supply[m.vehicle]++;
  m.vehicle = 'foot'; m.diceCount = 1;
  // Dream-suspended vehicles stay in inventory; detention freezes their existing status clock.
  if (!s.g5!.engineers[id]?.suspended) s.g5!.engineers[id] = null;
  enterDetention(s, nodes, id, 'hospital', turns,emit);
  emit({ type: 'mobilityChanged', targetId: id, mobility: structuredClone(m), reason: `爆炸住院${turns}次，车辆损毁` });
  if (id === s.players[s.active].id) { s.phase = 'turnEnd'; s.pending = null; s.remaining = 0; }
}
export function applyG5(s: GameState, nodes: readonly MapNode[], definitions: readonly PropertyDefinition[], item: string, option: G5Option, buildingType: number | undefined, emit: Emit) {
  if (option.buildingTypes ? !option.buildingTypes.includes(buildingType!) : buildingType !== undefined) return false;
  const id = s.players[s.active].id;
  if (!consumeG3(s, id, item, emit)) return false;
  s.effects!.pending = null; s.pending = null; s.phase = 'idle';
  if (item === 'tool:03' || item === 'tool:04') {
    s.g5!.supply[item]--; // World objects reserve their finite pool until removed.
    const hazard: Hazard = { id: ++s.g5!.serial, itemId: item, node: Number(option.target.id), carrier: null, remaining: 0 };
    s.g5!.hazards.push(hazard); emit({ type: 'hazardChanged', hazard: { ...hazard }, removed: false, reason: '放置' });
  } else if (item === 'tool:12') {
    const m = s.g2!.players[id]; s.g5!.engineers[id] = { remaining: 7, vehicle: m.vehicle, dice: m.diceCount, suspended: false };
    if (m.vehicle !== 'foot') s.effects!.inventory[id][m.vehicle]++;
    m.vehicle = 'foot'; m.diceCount = 1;
    note(emit, '工程车已启用：含本次7次行动，1骰；原车辆入包。');
  } else if (item === 'tool:07') {
    const hit = blastTargets(s, nodes, definitions, Number(option.target.id));
    for (const pid of hit.properties) damage(s, definitions.find(d => d.id === pid)!, false, emit, '飞弹');
    for (const hid of hit.hazards) removeHazard(s, hid, emit, '飞弹清除');
    for (const node of hit.blocks) { s.roadTools!.blocks = s.roadTools!.blocks.filter(n => n !== node); s.roadTools!.supply['tool:02']++; emit({ type: 'roadblockRemoved', node, reason: 'missile', supply: s.roadTools!.supply['tool:02'] }); }
    for (const pid of hit.players) { hostility(s, pid, id, emit); hospital(s, nodes, pid, 3, emit); }
  } else {
    const d = definitions.find(d => d.id === option.target.id)!;
    for (const p of street(s, definitions, d, item === 'card:11')) {
      const def = definitions.find(d => d.id === p.id)!;
      if (item !== 'card:09') damage(s, def, true, emit, item === 'card:10' ? '恶魔' : '怪兽');
      else {
        if (def.kind === 'facility' && !p.level) p.buildingType = buildingType!;
        p.level = Math.min(p.level + 1, maximumLevel(p, def));
        emit({ type: 'g4PropertyChanged', property: structuredClone(p), reason: '天使' });
      }
    }
  }
  return true;
}
/** One domain tick per completed road segment, never per render frame. */
export function g5Entered(s: GameState, nodes: readonly MapNode[], definitions: readonly PropertyDefinition[], emit: Emit): boolean {
  if (!s.g5) return false;
  const p = s.players[s.active];
  const bomb = s.g5.hazards.find(h => h.carrier === p.id);
  if (bomb) {
    bomb.node = p.node; bomb.remaining--;
    if (!bomb.remaining) {
      removeHazard(s, bomb.id, emit, '倒数归零');
      for (const d of definitions.filter(d => d.nodeIds.includes(p.node))) damage(s, d, false, emit, '定时炸弹', false);
      hospital(s, nodes, p.id, 5, emit); return true;
    }
    const recipient = s.players.find(q => q.id !== p.id && q.node === p.node && present(s, q.id) && !s.g5!.hazards.some(h => h.carrier === q.id));
    if (recipient) bomb.carrier = recipient.id;
    emit({ type: 'hazardChanged', hazard: { ...bomb }, removed: false, reason: recipient ? '相遇转交，不重置倒数' : '移动倒数' });
  }
  return false;
}
export function g5Landed(s: GameState, nodes: readonly MapNode[], emit: Emit): boolean {
  if (!s.g5) return false;
  const p = s.players[s.active], h = s.g5.hazards.find(h => !h.carrier && h.node === p.node);
  if (!h) return false;
  if (h.itemId === 'tool:03') { removeHazard(s, h.id, emit, '踩中地雷'); hospital(s, nodes, p.id, 3, emit); return true; }
  if (!s.g5.hazards.some(h => h.carrier === p.id)) { h.carrier = p.id; h.remaining = 38; emit({ type: 'hazardChanged', hazard: { ...h }, removed: false, reason: '携带炸弹' }); }
  return false;
}
const researchProducts = (s: GameState) => s.g7 ? [...RESEARCH_PRODUCTS, ...G7_GOODS] : [...RESEARCH_PRODUCTS];
export function researchOptions(s: GameState, definitions: readonly PropertyDefinition[]) {
  if (!s.g5 || !['idle', 'turnEnd'].includes(s.phase)) return [];
  const p = s.players[s.active];
  if (actionLocked(s.g2!.players[p.id]) || s.g4!.hotel[p.id]) return [];
  return definitions.filter(d => d.kind === 'facility' && d.nodeIds.includes(p.node)).flatMap(d => {
    const q = s.economy!.properties.find(q => q.id === d.id)!;
    return q.ownerId === p.id && q.buildingType === 4 && q.level && !(q.priceStatus! & 15) && !q.research
      ? researchProducts(s).filter(g => g.level <= q.level).map(g => ({ propertyId: q.id, itemId: g.id, title: `${d.name}：研究${g.name}（免费，5次自身行动后自动入包）` })) : [];
  });
}
export function reconcileResearch(s: GameState, definitions: readonly PropertyDefinition[], emit: Emit) {
  if (!s.g5) return;
  for (const p of s.economy!.properties) if (p.research) {
    const g = researchProducts(s).find(g => g.id === p.research!.itemId);
    if (!g || !p.ownerId || p.research.ownerId !== p.ownerId || p.buildingType !== 4 || p.level < g.level || (p.priceStatus! & 15) || !definitions.some(d => d.id === p.id && d.kind === 'facility')) {
      p.research = null; note(emit, '研究任务因产权、建筑或查封变化取消。');
    }
  }
}
export function tickG5(s: GameState, emit: Emit) {
  const id = s.players[s.active].id;
  for (const p of s.economy!.properties) if (p.ownerId === id && p.research) {
    p.research.remaining--;
    if (!p.research.remaining) {
      const inventory = s.effects!.inventory[id], item = p.research.itemId;
      const received = (inventory[item] ?? 0) < 9;
      if (received) inventory[item] = (inventory[item] ?? 0) + 1;
      note(emit, `研究完成：${researchProducts(s).find(g => g.id === item)!.name}${received ? '已入包' : '库存已满，本件未接收'}。`); p.research = null;
    } else note(emit, `研究生产剩余${p.research.remaining}次自身行动。`);
  }
}
export function tickEngineer(s: GameState, emit: Emit) {
  const id = s.players[s.active].id, e = s.g5!.engineers[id];
  if (!e || e.suspended || --e.remaining > 0) return;
  const m = s.g2!.players[id], bag = s.effects!.inventory[id];
  if (!m.dream && e.vehicle !== 'foot' && bag[e.vehicle] > 0) { bag[e.vehicle]--; m.vehicle = e.vehicle; m.diceCount = e.dice; }
  s.g5!.engineers[id] = null; note(emit, '工程车到期，尝试恢复原车辆。');
}

/** Reference fcn_00448a7e is called after landing settlement, including payment/decisions. */
export function finishEngineerLanding(s: GameState, definitions: readonly PropertyDefinition[], emit: Emit) {
  const p = s.players[s.active];
  if (!s.g5 || s.g5.landedTurn !== s.turn || !s.g5.engineers[p.id] || actionLocked(s.g2!.players[p.id]) || s.g4!.hotel[p.id]) return;
  for (const d of definitions.filter(d => d.nodeIds.includes(p.node))) {
    const q = s.economy!.properties.find(q => q.id === d.id)!;
    if (q.ownerId !== p.id && q.level) damage(s, d, true, emit, '工程车落点拆除');
  }
}
export function reconcileEngineers(s: GameState, before: GameState, emit: Emit) {
  if (!s.g5) return;
  for (const p of s.players) {
    const e = s.g5.engineers[p.id]; if (!e) continue;
    const m = s.g2!.players[p.id];
    if (m.dream && !e.suspended) { e.suspended = true; note(emit, `玩家${p.id.split('-')[1]}梦游，暂停工程车及其计时。`); }
    else if (e.suspended && !m.dream) {
      if (before.g2!.players[p.id].dream === 128) { e.suspended = false; note(emit, '梦游正常结束，恢复工程车。'); }
      else { s.g5.engineers[p.id] = null; note(emit, '梦游被清除，工程车不自动恢复。'); }
    }
  }
}
