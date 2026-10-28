import catalog from './japan-properties.json';
import type { MapNode } from '../types';

export const ECONOMY_RULES = Object.freeze({
  id: 'japan-property-candidate-v1', version: 1, evidence: 'R04/R05-cross-version-candidate',
  priceIndex: 1, maximumLevel: 5, initialFunds: 100000,
  rentPayment: 'cash-then-bank', rentReceipt: 'bank',
  capabilities: { economy: true, calendar: false, bankActions: false, debt: false, victory: false },
});
export type PropertyDefinition = {
  id: string; kind: string; name: string; nodeIds: number[]; x: number; y: number;
  direction: number; basePrice: number; upgradeCost: number; rents: number[];
};
export type PropertyState = { id: string; ownerId: string | null; level: number; basePrice?: number; buildingType?: number; priceStatus?: number; research?: { itemId: string; remaining: number; ownerId?: string } | null };
export type Balance = { cash: number; bank: number };
export type RentLine = { propertyId: string; level: number; amount: number };
export type PropertyDecision = {
  kind: 'property'; buildingChoices?: number[]; hotelTurns?: number; payerId?: string; id: string; propertyId: string; operation: 'buy' | 'upgrade' | 'rent';
  amount: number; recipientId: string | null; lines: RentLine[];
};
export const PROPERTY_CATALOG = catalog;
export const INITIAL_FUNDS: readonly number[] = catalog.initialFunds;

export function validateProperties(nodes: readonly MapNode[], definitions: readonly PropertyDefinition[]) {
  const ids = new Set<string>(), refs = new Set<number>();
  for (const p of definitions) {
    if (!p.id || ids.has(p.id) || !['land', 'facility'].includes(p.kind) || !p.name ||
      !Number.isInteger(p.direction) || p.direction < 0 || p.direction > 7 || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !p.nodeIds.length ||
      ![p.basePrice, p.upgradeCost, ...p.rents].every((n) => Number.isSafeInteger(n) && n > 0) ||
      p.rents.length !== (p.kind === 'land' ? 6 : 5)) throw new Error('地产定义无效');
    ids.add(p.id);
    for (const id of p.nodeIds) {
      if (refs.has(id) || !nodes.some((n) => n.id === id)) throw new Error('地产道路关联无效');
      refs.add(id);
    }
  }
}

/** Names group rent only; ownership is always keyed by the unique property ID. */
export function rentLines(target: PropertyDefinition, owned: readonly PropertyState[], definitions: readonly PropertyDefinition[]): RentLine[] {
  const owner = owned.find((p) => p.id === target.id)?.ownerId;
  if (!owner || target.kind !== 'land') return [];
  return definitions.filter((p) => p.kind === 'land' && p.name === target.name).flatMap((p) => {
    const state = owned.find((s) => s.id === p.id)!;
    return state.ownerId === owner ? [{ propertyId: p.id, level: state.level, amount: p.rents[state.level] }] : [];
  });
}

export function paymentSplit(balance: Balance, amount: number, allowBank: boolean): Balance | null {
  if (!Number.isSafeInteger(amount) || amount < 0 || balance.cash + (allowBank ? balance.bank : 0) < amount) return null;
  const cash = Math.min(balance.cash, amount);
  return { cash, bank: amount - cash };
}

/** A dynamic price exists only in v17+ state; earlier profiles retain catalog values. */
export const propertyBase = (p: PropertyState, d: PropertyDefinition) => p.basePrice ?? d.basePrice;
