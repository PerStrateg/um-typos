import type { DeterministicRandom } from "./types.js";

const MAX_SAFE_HASH = 9007199254740992;

export function createDeterministicRandom(seed: string): DeterministicRandom {
   return new HashRandom(seed);
}

class HashRandom implements DeterministicRandom {
   constructor(readonly seed: string) {}

   float(key: string): number {
      return hashToUnit(`${this.seed}:${key}`);
   }

   int(key: string, minInclusive: number, maxExclusive: number): number {
      if (maxExclusive <= minInclusive) return minInclusive;
      let span = maxExclusive - minInclusive;
      return minInclusive + Math.floor(this.float(key) * span);
   }

   pick<T>(key: string, values: readonly T[]): T | undefined {
      if (values.length === 0) return undefined;
      return values[this.int(key, 0, values.length)];
   }

   weightedPick<T extends { weight?: number }>(key: string, values: readonly T[]): T | undefined {
      if (values.length === 0) return undefined;

      let total = values.reduce((sum, item) => sum + normalizeWeight(item.weight), 0);
      if (total <= 0) return values[0];

      let roll = this.float(key) * total;
      for (let value of values) {
         roll -= normalizeWeight(value.weight);
         if (roll <= 0) return value;
      }

      return values[values.length - 1];
   }

   fork(label: string): DeterministicRandom {
      return new HashRandom(`${this.seed}:${label}`);
   }
}

function normalizeWeight(weight: number | undefined): number {
   return Number.isFinite(weight) && (weight ?? 0) > 0 ? weight ?? 1 : 1;
}

function hashToUnit(input: string): number {
   return cyrb53(input) / MAX_SAFE_HASH;
}

function cyrb53(input: string): number {
   let h1 = 0xdeadbeef ^ input.length;
   let h2 = 0x41c6ce57 ^ input.length;

   for (let index = 0; index < input.length; index += 1) {
      let code = input.charCodeAt(index);
      h1 = Math.imul(h1 ^ code, 2654435761);
      h2 = Math.imul(h2 ^ code, 1597334677);
   }

   h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
   h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

   return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
