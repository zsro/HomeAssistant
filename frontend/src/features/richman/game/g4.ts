import {priceIndex} from './price-index';
import type { NewsDecision } from './news';
import { emitOperatingAuction } from './operating-news';
import { propertyBase } from './economy';
import type { MapNode } from '../types';
import type { EventPayload, GameState } from './engine';
import type { PropertyDefinition, PropertyState, RentLine } from './economy';
import type { Target } from './effects';
import { createEffectRegistry } from './effects';
import { G3_EFFECTS, G3_FINGERPRINT, G3_GOODS, consumeG3, hostility, openReaction } from './g3';
import { G2_GOODS, actionLocked, detained } from './g2';
import { G1_GOODS } from './g1';
import { EQUAL_CASH_EFFECT, equalCashTargets } from './cards';
import { WEALTH_EFFECT } from './wealth';
import { REMOTE_EFFECT } from './items';
import { NEARBY_WORKER_EFFECT, projectWorkerAnchor } from './nearby-construction';
import { ROADBLOCK_EFFECT, ROBOT_EFFECT } from './road-tools';
import { G4_GOODS, FACILITY_TYPES } from './g4-catalog';
import { hashSeed } from './random';
export { G4_GOODS, FACILITY_TYPES } from './g4-catalog';
export const G4_RULES = Object.freeze({ id: 'japan-tools-candidate-v10', version: 1,
  remodel: 'current-built-any-owner;house-chain-toggle-chain-cap1;facility-types0..4-cap1,5,5,1,5',
  price: 'same-name-all-lands-or-single-facility;raw80/81-replace;global-round-minus16-clear-at-zero',
  auction: 'current-any-owner;floor(base*(1+level/2));source-excluded;cash>reserve;ascending-hotseat;increments100,500,1000,5000,10000;proceeds-to-source-bank;no-bid-unown',
  tax: 'floor(cash/5);hostility>=100;optional-free-any-amount;optional-redirect-original-tax>2000;recompute-new-payer;source-self-waiver;receipt-source-bank',
  facilities: 'cash-buy-build;first-build-base-price;later-upgrade-cost;hotel1..4-shop1..6-seeded-candidate;gas500/1000*movement;research-production-deferred',
  hotel: 'count-minus-one-or128;incoming-turn-raw-clock;freeze-mobility;exclude-nearby-targets',
  existingCards: 'house-swap-kind-and-level;chain-demolition-resets-kind;worker-chain-cap1;G1-facility-targets-deferred',
  compatibility: 'new-fields-v10-only;old-rules-unchanged',
});
export const G4_EFFECTS = createEffectRegistry([
  ...[REMOTE_EFFECT, NEARBY_WORKER_EFFECT, ROADBLOCK_EFFECT, ROBOT_EFFECT, EQUAL_CASH_EFFECT, WEALTH_EFFECT,
    ...G1_GOODS.map(g => g.effect), ...G2_GOODS.map(g => g.effect), ...G3_GOODS.map(g => g.effect)].map(id => G3_EFFECTS.get(id)!),
  ...G4_GOODS.map(g => ({ id: g.effect, itemId: g.id, operation: g.effect, target: g.target, consume: 1, timings: ['beforeRoll'] as const, status: null })),
]);
export const G4_FINGERPRINT = hashSeed(JSON.stringify({ base: G3_FINGERPRINT, rules: G4_RULES, goods: G4_GOODS, effects: G4_EFFECTS.fingerprint })).toString(16);
export type G4State = { supply: Record<string, number>; hotel: Record<string, number> };
export type G4Option = { target: Target; title: string; detail: string; buildingTypes?: number[] };
export type Tax = { kind: 'tax'; sourceId: string; originalId: string; originalAmount: number };
export type AuctionDecision = { kind: 'auction'; id: string; propertyId: string; sourceId: string; originalOwner: string | null;
  magicBatchId?:string;disposalId?:string; publicNews?:NewsDecision; reserve: number; bid: number; leader: string | null; responderId: string; remaining: string[] };
type Emit = (e: EventPayload) => void;
export function buildingName(p: PropertyState, d: PropertyDefinition) {
  return p.level === 0 ? '空地' : d.kind === 'facility' ? FACILITY_TYPES[p.buildingType ?? 0] : p.buildingType === 1 ? '连锁店' : '住宅';
}
export function maximumLevel(p: PropertyState, d: PropertyDefinition) {
  return d.kind === 'land' ? p.buildingType === 1 ? 1 : 5 : [1, 5, 5, 1, 5][p.buildingType ?? 0];
}
export const priceText = (p: PropertyState) => p.priceStatus ? `${p.priceStatus & 15 ? '查封' : '涨价'} · ${p.priceStatus >>> 4}轮` : '';
export const auctionReserve = (p: PropertyState, d: PropertyDefinition, s?:GameState) => Math.floor(propertyBase(p, d) * (1 + p.level / 2)) * ((s?.rulesId === 'japan-events-candidate-v32' || (s?.rulesId === 'japan-events-candidate-v33' || (s?.rulesId === 'japan-events-candidate-v34' || (s?.rulesId === 'japan-events-candidate-v35' || (s?.rulesId === 'japan-events-candidate-v36' || (s?.rulesId === 'japan-events-candidate-v37' || (s?.rulesId === 'japan-events-candidate-v38' || (s?.rulesId === 'japan-events-candidate-v39' || (s?.rulesId === 'japan-events-candidate-v40' || (s?.rulesId === 'japan-events-candidate-v41' || (s?.rulesId === 'japan-events-candidate-v42' || (s?.rulesId==='japan-events-candidate-v43' || (s?.rulesId==='japan-events-candidate-v44'||(s?.rulesId==='japan-events-candidate-v45' || (s?.rulesId === 'japan-events-candidate-v46' || s?.rulesId === 'japan-events-candidate-v47')))))))))))))))?priceIndex(s):1);
export function g4Options(s: GameState, nodes: readonly MapNode[], definitions: readonly PropertyDefinition[], item: string): G4Option[] {
  if (!s.g4 || !s.economy) return [];
  const player = s.players[s.active], center = nodes.find(n => n.id === player.node)!;
  if (actionLocked(s.g2?.players[player.id]) || s.g4.hotel[player.id]) return [];
  if (item === 'card:26') return equalCashTargets(s.players, s.active,
    [...s.finance!.eliminated, ...s.players.filter(p => detained(s.g2!.players[p.id]) || s.g4!.hotel[p.id]).map(p => p.id)], nodes).map(id => ({
      target: { kind: 'player', id }, title: `玩家 ${id.split('-')[1]}`,
      detail: `按其现金 ${s.economy!.balances[id].cash.toLocaleString()} 的20%收取 ${Math.floor(s.economy!.balances[id].cash / 5).toLocaleString()} 元，存入你的银行。可用免费卡；原税额超过2000时可嫁祸，届时重算新付款者税额。`,
    }));
  if (!G4_GOODS.some(g => g.id === item)) return [];
  return definitions.flatMap(d => {
    const p = s.economy!.properties.find(p => p.id === d.id)!;
    if (item === 'card:07' || item === 'card:08') {
      if (!d.nodeIds.includes(player.node) || (item === 'card:07' && p.level === 0)) return [];
      return [{ target: { kind: 'property' as const, id: p.id }, title: `${d.name} · 脚下${d.kind === 'land' ? '地产' : '大型用地'}`,
        detail: item === 'card:08' ? `标价 ${auctionReserve(p, d, s).toLocaleString()} 元；其他有资格玩家用现金加价。成交款进入你的银行，建筑保留；流拍恢复待售。确认后不可取消拍卖。`
          : d.kind === 'land' ? `${buildingName(p, d)}改为${p.buildingType === 1 ? '住宅' : '连锁店'}，${p.level} → ${p.buildingType === 1 ? p.level : 1}级。产权与资金不变。`
          : `改建脚下建筑，产权与资金不变；公园、加油站最多保留1级，其他类型最多5级。${s.g5 ? '改离研究所会取消当前生产。' : '研究所生产将在后续道具组接入。'}`,
        ...(item === 'card:07' && d.kind === 'facility' ? { buildingTypes: [0, 1, 2, 3, 4] } : {}) }];
    }
    const point = projectWorkerAnchor(center, d);
    if (!point || point.x < 0 || point.y < 0 || point.x >= 440 || point.y >= 440) return [];
    return [{ target: { kind: 'property' as const, id: p.id }, title: `${d.name} · ${d.nodeIds.join('/')}号`,
      detail: `${d.kind === 'land' ? '整条同名街区（包含其他业主与待售地产）' : '这块大型用地'}设为${item === 'card:27' ? '涨价，适用收费翻倍' : '查封，停止适用收费'}，期限5轮；覆盖现有涨价/查封，产权和建筑不变。` }];
  });
}
export function g4RentLines(s: GameState, target: PropertyDefinition, definitions: readonly PropertyDefinition[]): RentLine[] {
  const p = s.economy!.properties.find(p => p.id === target.id)!;
  if (!p.ownerId || (p.priceStatus! & 15)) return [];
  const multiplier = p.priceStatus ? 2 : 1;
  return definitions.filter(d => d.kind === 'land').flatMap(d => {
    const q = s.economy!.properties.find(p => p.id === d.id)!;
    if (q.ownerId !== p.ownerId || (p.buildingType === 1 ? q.buildingType !== 1 : q.buildingType === 1 || d.name !== target.name)) return [];
    return [{ propertyId: q.id, level: q.level, amount: (p.buildingType === 1 ? 2000 : d.rents[q.level]) * multiplier }];
  });
}
export function tickProperties(s: GameState, emit: Emit) {
  for (const p of s.economy!.properties) if (p.priceStatus) {
    p.priceStatus -= 16; if (!(p.priceStatus & 240)) p.priceStatus = 0;
    emit({ type: 'g4PropertyChanged', property: { ...p }, reason: '价格状态轮次计时' });
  }
}
function finish(s: GameState) { s.pending = null; s.effects!.pending = null; s.phase = 'idle'; }
export function settleAuction(s: GameState, a: AuctionDecision, emit: Emit) {
  const p = s.economy!.properties.find(p => p.id === a.propertyId)!;
  if(!a.magicBatchId||a.leader)p.ownerId = a.leader;
  if (a.leader) { s.economy!.balances[a.leader].cash -= a.bid; if(a.publicNews||a.disposalId)s.news!.publicFund+=a.bid;else s.economy!.balances[a.sourceId].bank += a.bid; }
  emit({ type: 'auctionSettled', propertyId: p.id, winnerId: a.leader, sourceId: a.sourceId, amount: a.leader ? a.bid : 0 });
  if(a.magicBatchId){s.pending=null;s.phase='turnEnd';return;}
  if(a.disposalId){const r=s.finance!.disposal!.current!;r.auctions.push({propertyId:p.id,winnerId:a.leader,amount:a.leader?a.bid:0,reserve:a.reserve});s.pending=null;s.phase='turnEnd';return;}
  if(a.publicNews){
    const {auction,...decision}=a.publicNews;
    decision.lines=[...decision.lines.map(line=>line.replace('待售地产将公开竞价','本次拍卖标的')),a.leader?`玩家${a.leader.split('-')[1]}以现金 ${a.bid.toLocaleString()} 元购得；公共资金增加同额，建筑保持${p.level}级。`:'无人出价，流拍；地产保持待售，未收取资金。'];
    s.phase='news';s.pending=decision;
    emitOperatingAuction(s,{newsId:7,title:decision.title,node:decision.node},{candidates:auction!.candidates,auction:{propertyId:p.id,winnerId:a.leader,amount:a.leader?a.bid:0,reserve:a.reserve}},auction!.skipped,emit);
  }else finish(s);
}
export function startPublicAuction(s:GameState,definitions:readonly PropertyDefinition[],news:NewsDecision,token:()=>string,emit:Emit){
 const p=s.economy!.properties.find(p=>p.id===news.auction!.propertyId)!,d=definitions.find(d=>d.id===p.id)!,reserve=auctionReserve(p,d,s);
 const remaining=s.players.filter(p=>!s.finance!.eliminated.includes(p.id)&&!actionLocked(s.g2!.players[p.id])&&!((s.rulesId !== 'japan-events-candidate-v32' && (s.rulesId !== 'japan-events-candidate-v33' && (s.rulesId !== 'japan-events-candidate-v34' && (s.rulesId !== 'japan-events-candidate-v35' && (s.rulesId !== 'japan-events-candidate-v36' && (s.rulesId !== 'japan-events-candidate-v37' && (s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))))))))))))))&&s.g2!.players[p.id].stop)&&!s.g4!.hotel[p.id]&&s.economy!.balances[p.id].cash>reserve).map(p=>p.id);
 const a:AuctionDecision={kind:'auction',id:token(),propertyId:p.id,sourceId:'public',originalOwner:p.ownerId,reserve,bid:reserve,leader:null,responderId:remaining[0]??s.players[s.active].id,remaining,publicNews:{...news,id:token()}};
 if(!remaining.length)settleAuction(s,a,emit);else{s.phase='auction';s.pending=a;emit({type:'auctionOffered',decision:structuredClone(a)});}
}
export const BID_INCREMENTS = [100, 500, 1000, 5000, 10000] as const;
export function bidG4(s: GameState, increment: number | null, token: () => string, emit: Emit) {
  const a = s.pending as AuctionDecision;
  if (increment !== null && (!BID_INCREMENTS.some(n => n === increment) || s.economy!.balances[a.responderId].cash < a.bid + increment)) return false;
  const id = a.responderId;
  if (increment === null) a.remaining = a.remaining.filter(p => p !== id);
  else { a.bid += increment; a.leader = id; }
  emit({ type: 'auctionBid', playerId: id, amount: increment === null ? null : a.bid });
  // Each participant exits permanently on pass; the current leader is never asked to outbid themself.
  const contenders = a.remaining.filter(p => p !== a.leader);
  if (!contenders.length) { settleAuction(s, a, emit); return true; }
  const index = s.players.findIndex(p => p.id === id);
  a.responderId = [...s.players.slice(index + 1), ...s.players.slice(0, index + 1)].find(p => contenders.includes(p.id))!.id;
  a.id = token(); emit({ type: 'auctionOffered', decision: structuredClone(a) }); return true;
}
function settleTax(s: GameState, tax: Tax, payer: string, emit: Emit, waived = false) {
  const amount = waived || payer === tax.sourceId ? 0 : Math.floor(s.economy!.balances[payer].cash / 5);
  s.economy!.balances[payer].cash -= amount; s.economy!.balances[tax.sourceId].bank += amount;
  emit({ type: 'taxSettled', sourceId: tax.sourceId, payerId: payer, amount, waived: waived || payer === tax.sourceId }); finish(s);
}
export function reactTax(s: GameState, choice: 'use' | 'decline', targetId: string | undefined, token: () => string, emit: Emit) {
  if (s.pending?.kind !== 'reaction' || s.pending.continuation.kind !== 'tax') return false;
  const { continuation: tax, responderId: id, stage, targets } = s.pending;
  if (!['use', 'decline'].includes(choice) || (choice === 'use' && stage === 'redirect' && !targets.includes(targetId!)) || (targetId !== undefined && (choice === 'decline' || stage === 'free'))) return false;
  if (choice === 'use' && !consumeG3(s, id, stage === 'free' ? 'card:20' : 'card:19', emit)) return false;
  emit({ type: 'reactionAnswered', responderId: id, stage, choice, ...(targetId ? { targetId } : {}) });
  if (choice === 'use') settleTax(s, tax, stage === 'free' ? id : targetId!, emit, stage === 'free');
  else if (stage === 'free' && tax.originalAmount > 2000 && s.effects!.inventory[id]['card:19'] > 0) openReaction(s, tax, id, 'redirect', token, emit);
  else settleTax(s, tax, id, emit);
  return true;
}
export function applyG4(s: GameState, definitions: readonly PropertyDefinition[], item: string, option: G4Option, buildingType: number | undefined, token: () => string, emit: Emit) {
  const sourceId = s.players[s.active].id;
  if (option.buildingTypes ? !option.buildingTypes.includes(buildingType!) : buildingType !== undefined) return false;
  if (!consumeG3(s, sourceId, item, emit)) return false;
  finish(s);
  if (item === 'card:26') {
    const id = option.target.id, amount = Math.floor(s.economy!.balances[id].cash / 5);
    const tax: Tax = { kind: 'tax', sourceId, originalId: id, originalAmount: amount };
    if (amount >= 100) hostility(s, id, sourceId, emit);
    if (s.effects!.inventory[id]['card:20'] > 0) openReaction(s, tax, id, 'free', token, emit);
    else if (amount > 2000 && s.effects!.inventory[id]['card:19'] > 0) openReaction(s, tax, id, 'redirect', token, emit);
    else settleTax(s, tax, id, emit);
    return true;
  }
  const p = s.economy!.properties.find(p => p.id === option.target.id)!, d = definitions.find(d => d.id === p.id)!;
  if (item === 'card:07') {
    p.buildingType = d.kind === 'land' ? p.buildingType === 1 ? 0 : 1 : buildingType!;
    p.level = Math.min(p.level, maximumLevel(p, d));
    emit({ type: 'g4PropertyChanged', property: { ...p }, reason: '改建' });
  } else if (item === 'card:08') {
    hostility(s, p.ownerId, sourceId, emit);
    const reserve = auctionReserve(p, d, s);
    const remaining = s.players.filter(q => q.id !== sourceId && !s.finance!.eliminated.includes(q.id) && !actionLocked(s.g2!.players[q.id]) && !s.g4!.hotel[q.id] && s.economy!.balances[q.id].cash > reserve).map(q => q.id);
    const auction: AuctionDecision = { kind: 'auction', id: token(), propertyId: p.id, sourceId, originalOwner: p.ownerId, reserve, bid: reserve, leader: null, responderId: remaining[0] ?? sourceId, remaining };
    if (!remaining.length) settleAuction(s, auction, emit);
    else { s.pending = auction; s.phase = 'auction'; emit({ type: 'auctionOffered', decision: structuredClone(auction) }); }
  } else {
    for (const q of s.economy!.properties) {
      const def = definitions.find(d => d.id === q.id)!;
      if (d.kind === 'land' ? def.kind !== 'land' || def.name !== d.name : q.id !== p.id) continue;
      q.priceStatus = item === 'card:27' ? 80 : 81;
      if (item === 'card:28' && def.kind === 'facility' && q.buildingType === 4) q.research = null;
      emit({ type: 'g4PropertyChanged', property: { ...q }, reason: item === 'card:27' ? '涨价' : '查封' });
    }
  }
  return true;
}
