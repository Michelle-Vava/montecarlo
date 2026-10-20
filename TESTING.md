# Testing

How montecarlo is tested, how to run the tests yourself, and what isn't covered yet.

## Run it yourself

Needs Node.js 22.18 or newer (the tests run the TypeScript source directly).

```bash
npm install
npm run typecheck   # TypeScript type check, no output means it passed
npm test            # all 19 tests
npm run demo        # simulate 10,000 software releases and print the results
```

`npm test` ends with a summary like this:

```
ℹ tests 19
ℹ pass 19
ℹ fail 0
```

For a list of every test by name:

```bash
node --test --test-reporter=spec "test/*.test.ts"
```

## How the tests work

Random results can't be checked against one exact answer, so the tests use two approaches:

- **Check against theory.** Each distribution is sampled **200,000 times** and the results are compared with what the maths says they should be, within a small tolerance. For example, `normal(100, 15)` must average within 0.15 of 100, and about 68.3% of values must fall within one standard deviation.
- **Check exact behaviour with a fixed seed.** The same seed always produces the same numbers, so model tests can check exact values, for example that `total` equals `a + b` in every single scenario.

All tests use made-up numbers. Tests use Node's built-in test runner (`node:test`), with no test dependencies.

## What each test checks

### Distributions ([test/distributions.test.ts](test/distributions.test.ts))

| Test | What it proves |
|---|---|
| random generator: same seed gives the same sequence, values are in [0, 1) | The seeded random generator is repeatable, stays in range, and different seeds differ |
| uniform: stays in range, mean and spread match theory | Mean is `(min + max) / 2` and spread is `(max − min) / √12` |
| normal: mean and standard deviation match, ~68% within one stdDev | The bell curve has the right centre, width and shape |
| triangular: stays in range, mean is (min + mode + max) / 3, peak near the mode | Best / likely / worst estimates behave as expected |
| triangular with min = max always returns that value | Edge case: no uncertainty at all |
| chance: returns 0 or 1 with the given probability | `chance(0.3)` is 1 about 30% of the time |
| oneOf: respects weights | Weighted picks come up as often as their weights say |
| invalid parameters are rejected with clear messages | e.g. `uniform(5, 1)`, a negative standard deviation, `chance(1.5)`, `NaN` |

### Models and results ([test/model.test.ts](test/model.test.ts))

| Test | What it proves |
|---|---|
| custom distributions plug in like built-in ones and stay reproducible | A developer-written `Distribution` works in a model and respects the seed |
| formulas are calculated from the same scenario values | In every scenario, a formula sees the same values that were recorded for its inputs |
| formulas can be declared in any order | A formula can use variables listed after it |
| same seed gives identical results, different seeds differ | Runs are reproducible |
| the seed is reported so a random run can be repeated | A run without a seed can still be repeated exactly using `results.seed` |
| statistics: mean, percentiles, min, max and probability | Results match theory on 100,000 scenarios |
| percentile interpolates between values | Percentiles at the edges and in between are correct, invalid ones are rejected |
| circular formulas are reported with the loop | `a → b → c → a` is reported, not an infinite loop |
| unknown variables are reported with where they were used | A typo in a formula names the variable and the formula |
| formulas that produce NaN or Infinity are reported | e.g. dividing by zero names the variable and the scenario |
| invalid definitions and options are rejected | Wrong variable types, zero iterations, unknown result names |

## What runs on every push

GitHub Actions ([`.github/workflows/test.yml`](.github/workflows/test.yml)) runs on **Windows, macOS and Linux** with **Node 22 and 24** (6 combinations):

1. `npm ci`: clean install (this also builds the package)
2. `npm run typecheck`
3. `npm test`
4. `npm run demo`

Results are on the [Actions tab](https://github.com/Michelle-Vava/montecarlo/actions); the badge at the top of the README shows the latest run.

## Not tested yet

These are on the [roadmap](ROADMAP.md), so they aren't supported or tested in v0.1:

- More distributions (PERT, lognormal, beta, poisson) and correlated inputs
- Convergence checks and confidence intervals
- Sensitivity analysis
- Performance on very large runs (e.g. a million scenarios)
