/** Ordered 15-slot cards. Reference: rich4_card_utils.asm receive/consume/cheapest.
 * Pure proposals; the versioned host must atomically update inventory and pools.
 */
export function consumeCardSlot(slots: readonly string[], itemId: string): string[] | null {
  const index = slots.indexOf(itemId);
  return index < 0 ? null : [...slots.slice(0, index), ...slots.slice(index + 1)];
}

export function receiveCardSlot(slots: readonly string[], itemId: string, prices: Readonly<Record<string, number>>): { slots: string[]; discarded: string | null } | null {
  if (slots.length > 15 || ![...slots, itemId].every(id => id.startsWith('card:') && Number.isSafeInteger(prices[id]) && prices[id] >= 0)) return null;
  let next = [...slots];
  let discarded: string | null = null;
  if (next.length === 15) {
    // Strictly lower price replaces the candidate: equal prices keep the first slot.
    discarded = next.reduce((cheapest, id) => prices[id] < prices[cheapest] ? id : cheapest);
    next = consumeCardSlot(next, discarded)!;
  }
  return { slots: [...next, itemId], discarded };
}
