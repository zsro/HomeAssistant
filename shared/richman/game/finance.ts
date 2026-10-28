import type {BatchState} from './payment-batches';
import type {PaymentState} from './payments';
import type {DisposalState} from './disposal';
import type {SaleState} from './estate-sales';
import { propertyBase } from './economy';
import type { MapNode } from '../types';
import type { Balance, PropertyDecision, PropertyDefinition, PropertyState } from './economy';

/** Cross-version evidence and deliberate limits are recorded in docs/richman/s1-04-finance.md. */
export const FINANCE_RULES = Object.freeze({
  id: 'japan-finance-candidate-v1', version: 1,
  bankNode: { id: 1, kind: 6006, eventCode: 14, name: '富士銀行' },
  victory: 'last-solvent-player', interestRate: null,
  debt: 'pay-liquid-funds-then-bankrupt', abandonedBuildings: 'retain-level',
  capabilities: { bankActions: true, debt: true, victory: true, interest: false, loans: false, auctions: false },
});
export type BankDecision = { kind: 'bank'; id: string; node: number; arrival: 'passing' | 'landing' };
export type DebtDecision = Omit<PropertyDecision, 'kind' | 'operation' | 'recipientId'> & {
  kind: 'debt'; recipientId: string; available: number; shortfall: number;
};
export type FinanceState = { batches?:BatchState; payments?:PaymentState;disposal?: DisposalState; sales?: SaleState; eliminated: string[]; winnerId: string | null; round: number };
export function isBankNode(node: MapNode) {
  return node.id === FINANCE_RULES.bankNode.id && node.kind === FINANCE_RULES.bankNode.kind;
}
export function bankTransfer(balance: Balance, operation: 'deposit' | 'withdraw', amount: number): Balance | null {
  if (!Number.isSafeInteger(amount) || amount <= 0 || !['deposit', 'withdraw'].includes(operation)) return null;
  if (operation === 'deposit') return balance.cash >= amount ? { cash: balance.cash - amount, bank: balance.bank + amount } : null;
  return balance.bank >= amount ? { cash: balance.cash + amount, bank: balance.bank - amount } : null;
}
export function nextSolventIndex(playerIds: readonly string[], eliminated: readonly string[], active: number) {
  for (let step = 1; step <= playerIds.length; step++) {
    const index = (active + step) % playerIds.length;
    if (!eliminated.includes(playerIds[index])) return index;
  }
  return -1;
}
/** An informative cost-based estimate, not a sale quote or an alternative victory condition. */
export function propertyValue(playerId: string, properties: readonly PropertyState[], definitions: readonly PropertyDefinition[]) {
  return properties.filter((p) => p.ownerId === playerId).reduce((sum, p) => {
    const definition = definitions.find((d) => d.id === p.id)!;
    return sum + propertyBase(p, definition) + p.level * definition.upgradeCost;
  }, 0);
}
