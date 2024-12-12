import { randomInt } from 'node:crypto';

/** Uniform random source in [0, 1). Injected so tests can run deterministic rounds. */
export interface RandomSource {
  next(): number;
}

/** Default: Node's CSPRNG. Suitable for a simulation; not a certified gaming RNG. */
export class CryptoRandomSource implements RandomSource {
  next(): number {
    return randomInt(0, 281_474_976_710_655) / 281_474_976_710_656;
  }
}

/** Deterministic mulberry32 generator for tests and reproducible demos. */
export class SeededRandomSource implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/** Replays a fixed list of values; useful to force specific outcomes in tests. */
export class ScriptedRandomSource implements RandomSource {
  private index = 0;

  constructor(private readonly values: number[]) {}

  next(): number {
    const value = this.values[this.index % this.values.length] ?? 0;
    this.index += 1;
    return value;
  }
}

export const RANDOM_SOURCE = Symbol('RANDOM_SOURCE');
