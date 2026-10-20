import { isDistribution, type Distribution } from './distributions.ts';
import { createRandom, randomSeed, type Random } from './random.ts';
import { Results } from './results.ts';

/** The values of every variable in one simulated run. */
export type Values = Readonly<Record<string, number>>;

/** A variable calculated from others, e.g. ({ days, rate }) => days * rate. */
export type Formula = (values: Values) => number;

/** A model variable: a fixed number, an uncertain input, or a formula. */
export type Definition = number | Distribution | Formula;

export interface RunOptions {
  /** How many scenarios to simulate. Default 10,000. */
  iterations?: number;
  /** Fix the random sequence so results are reproducible. Default: a random seed (see `results.seed`). */
  seed?: number;
}

export class Model<Name extends string> {
  readonly #definitions: Readonly<Record<Name, Definition>>;

  constructor(definitions: Record<Name, Definition>) {
    for (const [name, definition] of Object.entries<Definition>(definitions)) {
      const ok =
        (typeof definition === 'number' && Number.isFinite(definition)) ||
        typeof definition === 'function' ||
        isDistribution(definition);
      if (!ok) throw new TypeError(`"${name}" must be a finite number, a distribution or a formula`);
    }
    this.#definitions = { ...definitions };
  }

  get names(): Name[] {
    return Object.keys(this.#definitions) as Name[];
  }

  run(options: RunOptions = {}): Results<Name> {
    const iterations = options.iterations ?? 10_000;
    if (!Number.isInteger(iterations) || iterations < 1) {
      throw new RangeError(`iterations must be a positive whole number, got ${iterations}`);
    }
    const seed = options.seed ?? randomSeed();
    const random = createRandom(seed);
    const names = this.names;
    const samples = new Map(names.map((name) => [name, new Float64Array(iterations)] as const));

    for (let i = 0; i < iterations; i++) {
      const values = this.#evaluate(random, i);
      for (const name of names) samples.get(name)![i] = values(name);
    }
    return new Results(samples, iterations, seed);
  }

  /**
   * Evaluate one scenario. Variables are computed on first use, so formulas can refer to each other
   * in any order. A formula that depends on itself (directly or through others) is an error.
   */
  #evaluate(random: Random, iteration: number): (name: string) => number {
    const definitions = this.#definitions as Readonly<Record<string, Definition>>;
    const cache = new Map<string, number>();
    const inProgress: string[] = [];

    const get = (name: string): number => {
      const cached = cache.get(name);
      if (cached !== undefined) return cached;
      if (!Object.hasOwn(definitions, name)) {
        const where = inProgress.length ? ` (used by "${inProgress[inProgress.length - 1]}")` : '';
        throw new Error(`Unknown variable "${name}"${where}`);
      }
      const loopStart = inProgress.indexOf(name);
      if (loopStart !== -1) {
        throw new Error(`Circular formula: ${[...inProgress.slice(loopStart), name].join(' → ')}`);
      }
      inProgress.push(name);
      const definition = definitions[name]!;
      const value =
        typeof definition === 'number' ? definition
        : typeof definition === 'function' ? definition(values)
        : definition.sample(random);
      inProgress.pop();
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`"${name}" produced ${String(value)} in scenario ${iteration + 1}`);
      }
      cache.set(name, value);
      return value;
    };

    const values: Values = new Proxy({} as Values, {
      get: (_target, key) => (typeof key === 'string' ? get(key) : undefined),
    });
    return get;
  }
}

/** Describe an uncertain situation as named variables. */
export function model<Name extends string>(definitions: Record<Name, Definition>): Model<Name> {
  return new Model(definitions);
}
