/** v12 general range sampler. Keep v7's 1–4 direction guard untouched. */
export function g6Draw(state: number, count: number): { state: number; index: number } {
  if (!Number.isSafeInteger(count) || count < 1 || count > 0x100000000) throw new Error('Invalid v12 random range');
  const ceiling = Math.floor(0x100000000 / count) * count;
  let value: number;
  do {
    state = (state + 0x6d2b79f5) >>> 0;
    let bits = Math.imul(state ^ (state >>> 15), state | 1);
    bits ^= bits + Math.imul(bits ^ (bits >>> 7), bits | 61);
    value = (bits ^ (bits >>> 14)) >>> 0;
  } while (value >= ceiling);
  return { state, index: value % count };
}
