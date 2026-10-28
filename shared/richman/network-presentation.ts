import type { GameState } from './game/engine';
import { SERVER_MANIFEST } from './content';
import { PROPERTY_CATALOG } from './game/economy';
import { g1Options } from './game/g1';
import { G1_GOODS } from './game/g1';
import { g2Options, G2_GOODS, detained } from './game/g2';
import { g3Options, G3_GOODS } from './game/g3';
import { g4Options, G4_GOODS } from './game/g4';
import { g5Options, researchOptions } from './game/g5';
import { G5_GOODS } from './game/g5-catalog';
import { g6Options } from './game/g6';
import { G6_GOODS } from './game/g6-catalog';
import { g7Options } from './game/g7';
import { G7_GOODS } from './game/g7-catalog';
import { nearbyWorkerTargets } from './game/nearby-construction';
import { roadblockTargets, robotPath } from './game/road-tools';
import { equalCashTargets } from './game/cards';
import { saleOptions } from './game/site-services';
import { salesAvailable } from './game/estate-sales';
import { marketAvailable } from './game/g6-market';
import { loanCapacity } from './game/news-business';
import { canSurrender } from './game/surrender';
/** Explicit presentation data. Never add raw GameState, deck, continuation or RNG here. */
export function networkPresentation(s: GameState, self: string) {
  const ownTurn = s.players[s.active].id === self, nodes = SERVER_MANIFEST.map.nodes, properties = PROPERTY_CATALOG.properties;
  const inventory = s.effects?.inventory[self] ?? {};
  const options = <T>(goods: readonly { id: string; effect: string }[], get: (id: string) => T) =>
    Object.fromEntries(goods.filter(g => ownTurn && inventory[g.id] > 0).map(g => [g.id, get(g.id)]));
  const node = nodes.find(n => n.id === s.players[s.active].node)!;
  const record = <T>(value: Record<string, T>, empty: T) => Object.fromEntries(s.players.map(p => [p.id, p.id === self ? structuredClone(value[p.id]) : structuredClone(empty)]));
  return {
    // These are visible map/status values, not the hidden supply pools.
    mobility: s.g2 ? structuredClone(s.g2.players) : {}, lastDice: [...(s.g2?.lastDice ?? [])],
    facing: { ...s.g1?.facing }, allies: structuredClone(s.g3?.allies ?? {}), hotel: { ...s.g4?.hotel },
    hazards: s.g5?.hazards.map(h => ({ id: h.id, itemId: h.itemId, node: h.node, carrier: h.carrier, remaining: h.remaining })) ?? [],
    engineers: structuredClone(s.g5?.engineers ?? {}),
    gods: s.g6?.gods.map(g => ({ id: g.id, type: g.type, node: g.node, carrier: g.carrier, remaining: g.remaining, slot: g.slot })) ?? [],
    objects: s.g6?.objects?.map(g => ({ id: g.id, type: g.type, node: g.node, carrier: g.carrier, remaining: g.remaining, slot: g.slot })) ?? [],
    blocks: [...(s.roadTools?.blocks ?? [])],
    stocks: s.g6?.stocks.map(k => ({ id: k.id, base: k.base, price: k.price, pool: k.pool, quota: k.quota, trend: k.trend, remaining: k.remaining, history: [...k.history] })) ?? [],
    holdings: s.g6 ? record(s.g6.holdings, Object.fromEntries(s.g6.stocks.map(k => [k.id, { quantity: 0, cost: 0, average: 0 }]))) : {},
    slots: s.g3 ? record(s.g3.slots, []) : {}, points: { [self]: s.items?.points[self] ?? 0 },
    inventory: s.effects ? record(s.effects.inventory, {}) : {},
    effect: ownTurn && s.effects?.pending ? { id: s.effects.pending.id, definitionId: s.effects.pending.definitionId, playerId: s.effects.pending.playerId, timing: s.effects.pending.timing } : null,
    // Shelf availability is already visible to the visitor; supplies are not globally disclosed.
    supplies: s.pending?.kind === 'shop' && ownTurn ? {
      item: s.items?.supply, wealth: s.wealth?.supply, card: s.cards?.supply, road: { ...s.roadTools?.supply },
      g1: { ...s.g1?.supply }, g2: { ...s.g2?.supply }, g3: { ...s.g3?.supply }, g4: { ...s.g4?.supply }, g5: { ...s.g5?.supply }, g6: { ...s.g6?.supply },
    } : null,
    g1Choices: options(G1_GOODS, id => g1Options(s, nodes, properties, id)),
    g2Choices: options(G2_GOODS, id => g2Options(s, nodes, id)),
    // Theft target inventories become selectable only while actually using the corresponding card.
    g3Choices: Object.fromEntries(G3_GOODS.filter(g => ownTurn && s.effects?.pending?.definitionId === g.effect).map(g => [g.id, g3Options(s, nodes, g.id)])),
    g4Choices: options(G4_GOODS, id => g4Options(s, nodes, properties, id)),
    g5Choices: options(G5_GOODS, id => g5Options(s, nodes, properties, id)),
    g6Choices: options(G6_GOODS, id => g6Options(s, nodes, id)),
    g7Choices: options(G7_GOODS, id => g7Options(s, nodes, properties, id)),
    timeAnchor: ownTurn && s.g7?.checkpoints[self] ? { turn: s.g7.checkpoints[self]!.turn, round: s.g7.checkpoints[self]!.round } : null,
    workerTargets: ownTurn && s.economy ? nearbyWorkerTargets(node, properties, s.economy.properties) : [],
    roadTargets: ownTurn ? roadblockTargets(node, nodes, (s.roadTools?.blocks ?? []).concat(s.g5?.hazards.filter(h => !h.carrier).map(h => h.node) ?? [])) : [],
    robotRoute: ownTurn ? robotPath(nodes, node.id, s.players[s.active].previous) : [],
    cardTargets: ownTurn ? equalCashTargets(s.players, s.active, [...(s.finance?.eliminated ?? []), ...s.players.filter(p => detained(s.g2?.players[p.id]) || !!s.g4?.hotel[p.id]).map(p => p.id)], nodes).map(id => ({ id, characterId: s.players.find(p => p.id === id)!.characterId })) : [],
    canTrade: ownTurn && marketAvailable(s), canSurrender: ownTurn && canSurrender(s), salesAvailable: ownTurn && salesAvailable(s),
    researchChoices: ownTurn ? researchOptions(s, properties) : [], shopSales: ownTurn ? saleOptions(s) : [],
    loans: { ...s.news?.business?.loans }, noLoans: { ...s.news?.business?.noLoans }, halted: { ...s.news?.business?.halted },
    marketClosed: s.news?.business?.marketClosed ?? 0, bankRejected: { ...s.news?.business?.bankRejected },
    publicFund: s.news?.publicFund ?? 0, loanLimit: ownTurn ? loanCapacity(s, self, properties) : 0,
    companies: s.news?.business?.companies.map(c => ({ id: c.id, stockId: c.stockId, name: c.name, funds: c.funds, cumulative: c.cumulative, ownerId: c.ownerId, subscription: c.subscription, capital: c.capital, ranking: [] })) ?? [],
    insurance: s.news?.business?.insurance ? { terms: { ...s.news.business.insurance.terms }, policy: s.news.business.insurance.policy, claims: s.news.business.insurance.claims } : null,
    calendar: s.calendar ? { date: s.calendar.date, elapsedDays: s.calendar.elapsedDays, due: s.calendar.due,
      lastInterest: s.calendar.lastInterest, notices: s.calendar.notices,
      business: s.calendar.business ? { initialFunds: s.calendar.business.initialFunds, priceIndex: s.calendar.business.priceIndex, price: null, festival: null } : undefined } : undefined,
    round: s.finance?.round ?? 1,
    sales: s.finance?.sales ? { serial: 0, records: structuredClone(s.finance.sales.records), last: s.finance.sales.last } : undefined,
    lottery: s.lottery ? { tickets: [...s.lottery.tickets], lastDraw: s.lottery.lastDraw } : undefined,
  };
}
