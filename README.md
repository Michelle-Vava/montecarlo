# montecarlo

[![test](https://github.com/Michelle-Vava/montecarlo/actions/workflows/test.yml/badge.svg)](https://github.com/Michelle-Vava/montecarlo/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Monte Carlo simulation for TypeScript: **describe what you're unsure about, get the odds.**

Instead of a single guess ("it'll ship in 3 weeks"), montecarlo runs thousands of possible scenarios and tells you how likely each outcome is ("62% chance it ships within 20 days, and 9 in 10 ship within 23").

```ts
import { model, triangular, uniform, chance, oneOf } from 'montecarlo';

const release = model({
  design: triangular(2, 3, 6),             // best case 2 days, most likely 3, worst case 6
  build: triangular(5, 8, 15),
  testing: uniform(2, 4),
  bugRounds: oneOf([0, 1, 2], [0.5, 0.3, 0.2]),
  bugDays: ({ bugRounds }) => bugRounds * 2,
  reviewWait: chance(0.25),                // 25% chance the final review is delayed
  reviewDays: ({ reviewWait }) => 1 + reviewWait * 3,
  total: ({ design, build, testing, bugDays, reviewDays }) => design + build + testing + bugDays + reviewDays,
});

const results = release.run({ iterations: 10_000, seed: 42 });

results.mean('total');                            // 19.2
results.percentile('total', 90);                  // 23.3
results.probability('total', (d) => d <= 20);     // 0.62
```

`npm run demo` runs exactly this and prints:

```
Release estimate: 10,000 simulated releases (seed 42)

              average     10%         50%         90%
  Build       9.3 days    6.7 days    9.0 days    12.3 days
  Total       19.2 days   15.3 days   19.0 days   23.3 days

  Chance it ships within 20 days:  62%
  Chance it takes over 25 days:    4%
  9 in 10 releases ship within:    23.3 days

  Total days
   11.2 –  13.1  ██ 94
   13.1 –  15.0  ████████████ 701
   15.0 –  16.9  ██████████████████████████████ 1725
   16.9 –  18.8  ████████████████████████████████████████ 2285
   18.8 –  20.8  ███████████████████████████████████████ 2216
   20.8 –  22.7  █████████████████████████████ 1641
   22.7 –  24.6  ███████████████ 870
   24.6 –  26.5  ██████ 347
   26.5 –  28.4  ██ 94
   28.4 –  30.3   27
```

## Background

My work is replacing complex spreadsheets with software people can trust. Many of those spreadsheets are estimates, each built on a single "best guess" number in every cell. The honest answer is usually a range, and the way to handle ranges is a Monte Carlo simulation.

In spreadsheets that usually means paid add-ins (such as @RISK or Crystal Ball). I wanted a small TypeScript library where the model is plain code: inputs and formulas side by side, runs that can be repeated exactly from a seed, and statistics I can trust because they're tested against theory.

**Why the history starts here:** montecarlo is a new project, started in October 2026, so this repository holds its full history from the first commit.

## Who it's for

- **Developers building planning or forecasting features:** project timelines, delivery dates, capacity planning, queue and wait-time estimates.
- **Anyone replacing a "best guess" spreadsheet** with something that shows the range of outcomes.
- **Teams that want reproducible numbers:** the same seed always gives the same results, so they can be tested and reviewed.

## How it works

1. **Describe the model.** Each variable is a fixed number, an uncertain input (a *distribution*), or a formula using other variables.
2. **Run scenarios.** For each scenario, montecarlo picks a random value for every uncertain input, then calculates the formulas. Formulas are worked out on demand, so they can be listed in any order.
3. **Repeat** thousands of times with a **seeded** random generator, so a run can be repeated exactly.
4. **Summarise:** averages, percentiles, spread, and the probability of anything you can write as a test (`total <= 20`).

It also catches mistakes: formulas that depend on themselves (`a → b → c → a`), unknown variable names, and formulas that produce `NaN` or `Infinity` are reported with the variable and scenario.

## API

### Uncertain inputs

| Function | Means | Example |
|---|---|---|
| `uniform(min, max)` | Anything in the range is equally likely | `uniform(2, 4)` |
| `triangular(min, mostLikely, max)` | Best case / most likely / worst case | `triangular(5, 8, 15)` |
| `normal(mean, stdDev)` | Bell curve around an average | `normal(100, 15)` |
| `chance(p)` | 1 with probability `p`, else 0 | `chance(0.25)` |
| `oneOf(values, weights?)` | Pick one of a list | `oneOf([0, 1, 2], [0.5, 0.3, 0.2])` |

### Custom distributions

Any object that implements the exported `Distribution` interface can be used in a model, exactly like the built-in ones. The built-in distributions are written against the same interface.

```ts
import { model, type Distribution } from 'montecarlo';

// Resample from a developer-supplied array of values.
const fromSamples = (values: number[]): Distribution => ({
  kind: 'fromSamples',
  sample: (random) => values[Math.floor(random() * values.length)]!,
});

const queue = model({
  serviceMinutes: fromSamples([3, 4, 4, 5, 7, 12]),   // past service times
  jobsAhead: 4,
  waitMinutes: ({ serviceMinutes, jobsAhead }) => serviceMinutes * jobsAhead,
});
```

`sample` receives the run's seeded `random()` function. Using it (and not `Math.random`) keeps custom distributions reproducible.

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

Only the numbers and formulas written in the model. There's no input from users, no files, no storage and no network calls; everything runs in memory.

## How it's tested

- `npm test` runs 19 tests with Node's built-in test runner.
- **Every distribution is checked against its theory:** for example, 200,000 samples of `normal(100, 15)` must have a mean within 0.15 of 100 and about 68.3% of values within one standard deviation.
- Model tests cover formula order, reproducible seeds, custom distributions, circular formulas, unknown variables, `NaN`/`Infinity`, and input validation.
- GitHub Actions runs the type check, tests and demo on **Windows, macOS and Linux** with Node 22 and 24 on every push.

## How it compares

Monte Carlo tools already exist; montecarlo is aiming at a specific spot among them:

- **Spreadsheet add-ins** (@RISK, Crystal Ball) and **web apps** (Guesstimate) are great for working by hand, but they aren't libraries you can build into your own app.
- **Squiggle** is its own language for estimation, not plain TypeScript.
- **Statistics libraries** (jStat, stdlib) provide distributions and random numbers but not a model of variables and formulas.
- **Other npm packages** take different approaches: `monte-carlo-simulator` is a CLI driven by YAML templates, `@hugov/correl-range` focuses on correlated ranges, and `@tangent.to/mc` does Markov Chain Monte Carlo for Bayesian inference.

montecarlo's focus is a **code-first model API**: variables, distributions and formulas in one TypeScript object, distributions you can add yourself, seeded and reproducible runs, clear errors, and distributions tested against their theory.

## Roadmap

| Version | Focus |
|---|---|
| ✅ v0.1 | 5 distributions, custom distributions, models with formulas, seeded runs, statistics, error checking |
| v0.2 | More distributions (PERT, lognormal, resampling), correlated inputs |
| v0.3 | Convergence: run until the answer is stable, with confidence intervals |
| v0.4 | Sensitivity: which input moves the result most |
| v0.5 | Pluggable statistics and stopping rules, typed models, histogram and export helpers |
| v1.0 | npm package, worker threads for big runs, docs with worked examples |

See [ROADMAP.md](ROADMAP.md) for details.

## License

[MIT](LICENSE)
