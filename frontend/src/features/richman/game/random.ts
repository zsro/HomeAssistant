// Versioned deterministic generator for local replays; not used for authentication.
export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function drawDice(state: number): { state: number; value: number } {
  let value: number;
  do {
    state = (state + 0x6d2b79f5) >>> 0;
    let bits = Math.imul(state ^ (state >>> 15), state | 1);
    bits ^= bits + Math.imul(bits ^ (bits >>> 7), bits | 61);
    value = (bits ^ (bits >>> 14)) >>> 0;
  } while (value >= 4294967292); // Largest multiple of six below 2^32.
  return { state, value: value % 6 + 1 };
}
