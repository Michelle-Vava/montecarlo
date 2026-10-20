export interface Summary {
  mean: number;
  stdDev: number;
  min: number;
  p10: number;
  p50: number;
  p90: number;
  max: number;
}

/** The outcome of a simulation: every sampled value of every variable, plus statistics over them. */
export class Results<Name extends string = string> {
  readonly iterations: number;
  /** The seed used. Pass it to `run` again to get exactly the same results. */
  readonly seed: number;
  readonly #samples: Map<Name, Float64Array>;
  readonly #sorted = new Map<Name, Float64Array>();

  constructor(samples: Map<Name, Float64Array>, iterations: number, seed: number) {
    this.#samples = samples;
    this.iterations = iterations;
    this.seed = seed;
  }

  get names(): Name[] {
    return [...this.#samples.keys()];
  }

  /** Every sampled value of a variable, in iteration order. */
  values(name: Name): readonly number[] {
    return Array.from(this.#get(name));
  }

  mean(name: Name): number {
    const values = this.#get(name);
    let sum = 0;
    for (const v of values) sum += v;
    return sum / values.length;
  }

  /** Sample standard deviation: how spread out the results are. */
  stdDev(name: Name): number {
    const values = this.#get(name);
    if (values.length < 2) return 0;
    const mean = this.mean(name);
    let squares = 0;
    for (const v of values) squares += (v - mean) ** 2;
    return Math.sqrt(squares / (values.length - 1));
  }

  min(name: Name): number {
    return this.#sortedValues(name)[0]!;
  }

  max(name: Name): number {
    const sorted = this.#sortedValues(name);
    return sorted[sorted.length - 1]!;
  }

  /** The value below which `p` percent of results fall, e.g. percentile('cost', 90). */
  percentile(name: Name, p: number): number {
    if (!(p >= 0 && p <= 100)) throw new RangeError(`percentile must be between 0 and 100, got ${p}`);
    const sorted = this.#sortedValues(name);
    const rank = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (rank - lower);
  }

  /** Share of results (0 to 1) where `test` is true, e.g. probability('cost', (c) => c < 5000). */
  probability(name: Name, test: (value: number) => boolean): number {
    const values = this.#get(name);
    let hits = 0;
    for (const v of values) if (test(v)) hits++;
    return hits / values.length;
  }

  summary(name: Name): Summary {
    return {
      mean: this.mean(name),
      stdDev: this.stdDev(name),
      min: this.min(name),
      p10: this.percentile(name, 10),
      p50: this.percentile(name, 50),
      p90: this.percentile(name, 90),
      max: this.max(name),
    };
  }

  #get(name: Name): Float64Array {
    const values = this.#samples.get(name);
    if (!values) throw new Error(`Unknown variable "${name}". Known: ${this.names.join(', ')}`);
    return values;
  }

  #sortedValues(name: Name): Float64Array {
    let sorted = this.#sorted.get(name);
    if (!sorted) {
      sorted = Float64Array.from(this.#get(name)).sort();
      this.#sorted.set(name, sorted);
    }
    return sorted;
  }
}
