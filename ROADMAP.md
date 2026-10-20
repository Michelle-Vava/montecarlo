# Roadmap

montecarlo is a TypeScript library for Monte Carlo simulation: describe the uncertain parts of a situation, run thousands of scenarios, and get the odds. It works only on the numbers and formulas in a model: no user input, files, storage or network.

**Where it's going:** a small, dependable engine that developers can put inside estimating and planning tools, with answers that are reproducible, tested against theory, and explained in plain terms.

## Principles

1. **Correct first.** Every distribution and statistic is tested against known theory.
2. **Reproducible.** A seed always gives the same results, on every platform.
3. **Readable models.** A model should read like the estimate it describes.
4. **Clear errors.** Say which variable and which scenario went wrong.
5. **No dependencies** unless one saves a lot of work and is well maintained.

---

## ✅ v0.1: Core engine (done)

- [x] Seeded random generator (mulberry32)
- [x] Distributions: `uniform`, `triangular`, `normal`, `chance`, `oneOf`, with parameter validation
- [x] Models with fixed numbers, distributions and formulas, in any order
- [x] Errors for circular formulas, unknown variables, `NaN` / `Infinity`
- [x] Results: mean, standard deviation, min, max, percentiles, probability, summary
- [x] Statistical tests against theory; demo; CI on Windows, macOS and Linux

---

## v0.2: Better inputs

**Goal:** model real estimates more faithfully.
**Why:** people often think in "best / likely / worst", and real inputs often move together.

- [ ] `pert(min, mostLikely, max)`: smoother than triangular, standard in project estimating
- [ ] `lognormal`, `beta`, `poisson`, `discrete` from a table
- [ ] `fromData(values)`: resample from past numbers
- [ ] `clamp` / truncation (e.g. a normal that can't go below 0)
- [ ] Correlated inputs (if materials cost goes up, so does shipping)

**Done when:** each distribution's mean, spread and shape are tested against theory.

---

## v0.3: Know when you've run enough

**Goal:** answer "is 10,000 scenarios enough?"
**Why:** too few runs give unstable answers; too many waste time.

- [ ] Confidence intervals for the mean and for probabilities ("70% ± 0.9%")
- [ ] `runUntilStable({ name, tolerance })`: keep running until the result stops moving
- [ ] Report how many scenarios were needed

---

## v0.4: What drives the result?

**Goal:** show which uncertain input matters most.
**Why:** that's usually the real decision: what to pin down first.

- [ ] Sensitivity analysis: correlation of each input with an output
- [ ] Tornado-chart data (output range when each input moves from low to high)
- [ ] "What if" runs: fix one input and compare results

---

## v0.5: Developer experience

- [ ] Typed models: unknown variable names in formulas become compile-time errors
- [ ] Histogram helper (bins and counts) for charts
- [ ] Export results as CSV / JSON
- [ ] Explicit dependencies listed per variable (for display and debugging)

---

## v1.0: Ready for everyone

- [ ] Publish to npm
- [ ] Run large simulations in a Web Worker / worker thread without blocking
- [ ] Performance benchmarks and a target (e.g. 1 million scenarios of a 10-variable model)
- [ ] Docs with worked examples: project estimate, budget, inventory, queue wait times
- [ ] Semantic versioning and a CHANGELOG

## Ideas for later

- Time-step models (a value that changes month by month)
- A tiny browser playground to try models live
- Import a model from a simple spreadsheet-style table

## Out of scope

- A full statistics library (stdlib and jStat already cover that)
- A visual app (Guesstimate does that); montecarlo is the engine
- Collecting, storing or sending any data
