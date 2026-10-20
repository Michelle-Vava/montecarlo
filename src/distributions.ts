import type { Random } from './random.ts';

/**
 * Something that can be sampled: an uncertain input such as "between 5 and 10".
 * Implement this to add your own distribution; models accept any object with `sample`.
 */
export interface Distribution {
  /** A short name, e.g. "uniform". */
  readonly kind: string;
  /** The true average of the distribution, if known. Useful for checking samples in tests. */
  readonly mean?: number;
  /** Return one value. Use only `random` for randomness so seeded runs stay reproducible. */
  sample(random: Random): number;
}

export function isDistribution(value: unknown): value is Distribution {
  return typeof value === 'object' && value !== null && typeof (value as Distribution).sample === 'function';
}

function assertFinite(name: string, values: Record<string, number>): void {
  for (const [key, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) throw new RangeError(`${name}: ${key} must be a finite number, got ${value}`);
  }
}

/** Any value between `min` and `max` is equally likely. */
export function uniform(min: number, max: number): Distribution {
  assertFinite('uniform', { min, max });
  if (min > max) throw new RangeError(`uniform: min (${min}) must not be greater than max (${max})`);
  return { kind: 'uniform', mean: (min + max) / 2, sample: (random) => min + random() * (max - min) };
}

/** Bell curve around `mean`; about 68% of values fall within one `stdDev`. */
export function normal(mean: number, stdDev: number): Distribution {
  assertFinite('normal', { mean, stdDev });
  if (stdDev < 0) throw new RangeError(`normal: stdDev must not be negative, got ${stdDev}`);
  return {
    kind: 'normal',
    mean,
    sample(random) {
      // Box–Muller transform. 1 - random() is in (0, 1], so the log is always defined.
      const u = 1 - random();
      const v = random();
      return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}

/** "Best case, most likely, worst case": the usual way people estimate. */
export function triangular(min: number, mode: number, max: number): Distribution {
  assertFinite('triangular', { min, mode, max });
  if (!(min <= mode && mode <= max)) {
    throw new RangeError(`triangular: expected min <= mode <= max, got ${min}, ${mode}, ${max}`);
  }
  const range = max - min;
  const split = range === 0 ? 0 : (mode - min) / range;
  return {
    kind: 'triangular',
    mean: (min + mode + max) / 3,
    sample(random) {
      const u = random();
      return u < split
        ? min + Math.sqrt(u * range * (mode - min))
        : max - Math.sqrt((1 - u) * range * (max - mode));
    },
  };
}

/** 1 with probability `p`, otherwise 0. Use for "20% chance of a delay". */
export function chance(p: number): Distribution {
  assertFinite('chance', { p });
  if (p < 0 || p > 1) throw new RangeError(`chance: p must be between 0 and 1, got ${p}`);
  return { kind: 'chance', mean: p, sample: (random) => (random() < p ? 1 : 0) };
}

/** Pick one of `values`, optionally weighted: oneOf([1, 2, 3], [0.5, 0.3, 0.2]). */
export function oneOf(values: readonly number[], weights?: readonly number[]): Distribution {
  if (values.length === 0) throw new RangeError('oneOf: needs at least one value');
  values.forEach((value, i) => assertFinite('oneOf', { [`values[${i}]`]: value }));
  const w = weights ?? values.map(() => 1);
  if (w.length !== values.length) throw new RangeError('oneOf: weights must have the same length as values');
  w.forEach((weight, i) => {
    assertFinite('oneOf', { [`weights[${i}]`]: weight });
    if (weight < 0) throw new RangeError(`oneOf: weights[${i}] must not be negative`);
  });
  const total = w.reduce((sum, x) => sum + x, 0);
  if (total <= 0) throw new RangeError('oneOf: weights must add up to more than 0');
  const cumulative: number[] = [];
  let running = 0;
  for (const weight of w) cumulative.push((running += weight / total));
  return {
    kind: 'oneOf',
    mean: values.reduce((sum, value, i) => sum + value * w[i]! / total, 0),
    sample(random) {
      const u = random();
      const index = cumulative.findIndex((edge) => u < edge);
      return values[index === -1 ? values.length - 1 : index]!;
    },
  };
}
