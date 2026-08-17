/**
 * Deterministic randomness for generated fixtures. `Math.random` in a mock makes
 * a failing test unreproducible and a visual snapshot unstable; a seeded
 * generator gives varied-looking data that is identical on every run and on every
 * machine.
 */

export type SeededRng = {
  /** The next value in `[0, 1)`. */
  next: () => number;
  /** An integer in `[min, max]`, both inclusive. */
  int: (min: number, max: number) => number;
  /** One element. Throws on an empty list. */
  pick: <T>(items: readonly T[]) => T;
  /** A shuffled copy; the input is left alone. */
  shuffle: <T>(items: readonly T[]) => T[];
  /** Rewinds to the seed. Pass this to `setupMocks({ onReset })`. */
  reset: () => void;
};

/**
 * A mulberry32 generator — 32 bits of state, a handful of integer ops, no
 * dependency. Its statistical quality is irrelevant here; reproducibility and
 * being cheap enough to call inside a request handler are the requirements.
 */
export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  return {
    next,
    int,
    pick: (items) => {
      if (items.length === 0) {
        throw new Error('http-client-msw: cannot pick from an empty list');
      }

      return items[int(0, items.length - 1)];
    },
    shuffle: (items) => {
      const shuffled = [...items];

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = int(0, i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return shuffled;
    },
    reset: () => {
      state = seed >>> 0;
    },
  };
}
