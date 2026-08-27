export type RandomSource = {
  next: () => number;
  int: (minimum: number, maximum: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
};

function seedHash(seed: string) {
  let hash = 2_166_136_261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function createRandom(seed: string): RandomSource {
  let state = seedHash(seed);
  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  return {
    next,
    int(minimum, maximum) {
      return Math.floor(next() * (maximum - minimum + 1)) + minimum;
    },
    pick<T>(items: readonly T[]) {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('Cannot pick from an empty collection');
      return item;
    },
    shuffle<T>(items: readonly T[]) {
      const result = [...items];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(next() * (index + 1));
        const current = result[index];
        const replacement = result[swapIndex];
        if (current === undefined || replacement === undefined) continue;
        result[index] = replacement;
        result[swapIndex] = current;
      }
      return result;
    },
  };
}

const seedAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createBatchSeed() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => seedAlphabet[byte % seedAlphabet.length]).join('');
}
