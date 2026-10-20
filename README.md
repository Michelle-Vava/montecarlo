# montecarlo

[![test](https://github.com/Michelle-Vava/montecarlo/actions/workflows/test.yml/badge.svg)](https://github.com/Michelle-Vava/montecarlo/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Monte Carlo simulation for TypeScript: **describe what you're unsure about, get the odds.**

Instead of a single guess ("it'll cost $4,500"), montecarlo runs thousands of possible scenarios and tells you how likely each outcome is ("70% chance it's under $5,000, and 9 in 10 cost at most $5,590").

```ts
import { model, triangular, uniform, chance } from 'montecarlo';

const renovation = model({
  workDays: triangular(5, 7, 12),       // best case 5, most likely 7, worst case 12
  dayRate: 400,
  materials: uniform(1200, 1800),
  supplierDelay: chance(0.2),           // 20% chance the supplier is late
  delayDays: ({ supplierDelay }) => supplierDelay * 3,
  totalDays: ({ workDays, delayDays }) => workDays + delayDays,
  cost: ({ workDays, dayRate, materials }) => workDays * dayRate + materials,
});

const results = renovation.run({ iterations: 10_000, seed: 42 });

results.mean('cost');                              // 4707
results.percentile('cost', 90);                    // 5590
results.probability('cost', (c) => c < 5000);      // 0.70
results.probability('totalDays', (d) => d > 10);   // 0.24
```

`npm run demo` runs exactly this and prints:

```
Renovation estimate: 10,000 simulated projects (seed 42)

              average     10%         50%         90%
  Total days  8.6 days    6.3 days    8.4 days    11.2 days
  Cost        $4,707      $3,943      $4,645      $5,590

  Chance it costs under $5,000:      70%
  Chance it takes more than 10 days: 24%
  9 in 10 projects cost at most:     $5,590

  Cost distribution
   $3,327 –  $3,645  █████ 234
   $3,645 –  $3,963  █████████████████ 841
   $3,963 –  $4,282  ████████████████████████████████ 1626
   $4,282 –  $4,600  ████████████████████████████████████████ 2020
   $4,600 –  $4,918  ████████████████████████████████████ 1810
   $4,918 –  $5,236  ███████████████████████████ 1374
   $5,236 –  $5,555  ████████████████████ 1008
   $5,555 –  $5,873  ██████████████ 707
   $5,873 –  $6,191  ██████ 303
   $6,191 –  $6,510  ██ 77
```

## Background

My work is replacing complex spreadsheets with software people can trust. Many of those spreadsheets are estimates: costs, timelines, budgets, each built on a single "best guess" number in every cell. The honest answer is usually a range, and the way to handle ranges is a Monte Carlo simulation.

In spreadsheets that usually means paid add-ins (such as @RISK or Crystal Ball). I wanted a small TypeScript library where the model is plain code: inputs and formulas side by side, runs that can be repeated exactly from a seed, and statistics I can trust because they're tested against theory.

**Why the history starts here:** montecarlo is a new project, started in October 2026, so this repository holds its full history from the first commit.

## Who it's for

- **Developers building estimating or planning tools:** quotes, project timelines, budgets, capacity planning.
- **Anyone replacing a "best guess" spreadsheet** with something that shows the range of outcomes.
- **Teams that want reproducible numbers:** the same seed always gives the same results, so they can be tested and reviewed.

## How it works

1. **Describe the model.** Each variable is a fixed number, an uncertain input (a *distribution*), or a formula using other variables.
2. **Run scenarios.** For each scenario, montecarlo picks a random value for every uncertain input, then calculates the formulas. Formulas are worked out on demand, so they can be listed in any order.
3. **Repeat** thousands of times with a **seeded** random generator, so a run can be repeated exactly.
4. **Summarise:** averages, percentiles, spread, and the probability of anything you can write as a test (`cost < 5000`).

It also catches mistakes: formulas that depend on themselves (`a → b → c → a`), unknown variable names, and formulas that produce `NaN` or `Infinity` are reported with the variable and scenario.

## API

### Uncertain inputs

| Function | Means | Example |
|---|---|---|
| `uniform(min, max)` | Anything in the range is equally likely | `uniform(1200, 1800)` |
| `triangular(min, mostLikely, max)` | Best case / most likely / worst case | `triangular(5, 7, 12)` |
| `normal(mean, stdDev)` | Bell curve around an average | `normal(100, 15)` |
| `chance(p)` | 1 with probability `p`, else 0 | `chance(0.2)` |
| `oneOf(values, weights?)` | Pick one of a list | `oneOf([1, 2, 3], [0.5, 0.3, 0.2])` |

### Results

| Method | Returns |
|---|---|
| `mean(name)`, `stdDev(name)`, `min(name)`, `max(name)` | Basic statistics |
| `percentile(name, p)` | The value `p`% of scenarios fall below |
| `probability(name, test)` | Share of scenarios where `test` is true (0 to 1) |
| `summary(name)` | `{ mean, stdDev, min, p10, p50, p90, max }` |
| `values(name)` | Every sampled value, in order |
| `seed`, `iterations` | What the run used, to reproduce it |

## Try it

Needs Node.js 22.18 or newer to run from source (the built package runs on Node 18+).

```bash
git clone https://github.com/Michelle-Vava/montecarlo.git
cd montecarlo
npm install
npm run demo
```

To use it in your own project before it's on npm:

```bash
npm install github:Michelle-Vava/montecarlo
```

## What it uses

Only the numbers and formulas you write in your model. There's no input from users, no files, no storage and no network calls; everything runs in memory.

## How it's tested

- `npm test` runs 18 tests with Node's built-in test runner.
- **Every distribution is checked against its theory:** for example, 200,000 samples of `normal(100, 15)` must have a mean within 0.15 of 100 and about 68.3% of values within one standard deviation.
- Model tests cover formula order, reproducible seeds, circular formulas, unknown variables, `NaN`/`Infinity`, and input validation.
- GitHub Actions runs the type check, tests and demo on **Windows, macOS and Linux** with Node 22 and 24 on every push.

## How it compares

Monte Carlo tools already exist; montecarlo is aiming at a specific spot among them:

- **Spreadsheet add-ins** (@RISK, Crystal Ball) and **web apps** (Guesstimate) are great for working by hand, but they aren't libraries you can build into your own app.
- **Squiggle** is its own language for estimation, not plain TypeScript.
- **Statistics libraries** (jStat, stdlib) provide distributions and random numbers but not a model of variables and formulas.
- **Other npm packages** take different approaches: `monte-carlo-simulator` is a CLI driven by YAML templates, `@hugov/correl-range` focuses on correlated ranges, and `@tangent.to/mc` does Markov Chain Monte Carlo for Bayesian inference.

montecarlo's focus is a **code-first model API**: variables, distributions and formulas in one TypeScript object, seeded and reproducible runs, clear errors (circular formulas, unknown names, `NaN`), and distributions tested against their theory.

## Roadmap

| Version | Focus |
|---|---|
| ✅ v0.1 | 5 distributions, models with formulas, seeded runs, statistics, error checking |
| v0.2 | More distributions (PERT, lognormal, from data), correlated inputs |
| v0.3 | Convergence: run until the answer is stable, with confidence intervals |
| v0.4 | Sensitivity: which input moves the result most (tornado data) |
| v0.5 | Typed models (catch unknown variable names at compile time), histogram and export helpers |
| v1.0 | npm package, Web Worker support for big runs, docs with worked examples |

See [ROADMAP.md](ROADMAP.md) for details.

## License

[MIT](LICENSE)
