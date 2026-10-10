import type { Holding } from './g6-market';

/** Native holding +4 is a float32 per-share average, in yuan. */
export function buyHolding(h: Holding, quantity: number, paid: number) {
  if (h.average !== undefined) {
    const basis = Math.trunc(h.quantity * h.average);
    h.quantity += quantity;
    h.average = Math.fround((basis + paid) / h.quantity);
    h.cost = Math.trunc(h.quantity * h.average);
  } else {
    h.quantity += quantity;
    h.cost += paid;
  }
}

export function sellHolding(h: Holding, quantity: number) {
  const before = h.quantity;
  h.quantity -= quantity;
  if (h.average !== undefined) {
    if (!h.quantity) h.average = 0;
    h.cost = Math.trunc(h.quantity * h.average);
  } else h.cost = h.quantity ? Math.floor(h.cost * h.quantity / before) : 0;
}

/** Displayed unrealized gain; not realized proceeds or spendable money. */
export function holdingSummary(h: Holding, price: number) {
  const average = h.average ?? (h.quantity ? h.cost / h.quantity : 0);
  const cost = h.average === undefined ? h.cost : Math.trunc(h.quantity * average);
  const value = Math.trunc(h.quantity * price / 100);
  return { average, cost, value, unrealized: value - cost };
}
