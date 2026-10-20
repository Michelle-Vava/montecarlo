import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chance, model, triangular, uniform } from '../src/index.ts';

test('formulas are calculated from the same scenario values', () => {
  const m = model({
    a: uniform(0, 10),
    b: uniform(0, 10),
    total: ({ a, b }) => a! + b!,
  });
  const r = m.run({ iterations: 1000, seed: 7 });
  const a = r.values('a');
  const b = r.values('b');
  r.values('total').forEach((t, i) => assert.equal(t, a[i]! + b[i]!));
});

test('formulas can be declared in any order', () => {
  const m = model({
    cost: ({ days, rate }) => days! * rate!,
    rate: 100,
    days: uniform(1, 2),
  });
  const r = m.run({ iterations: 100, seed: 1 });
  r.values('cost').forEach((c, i) => assert.equal(c, r.values('days')[i]! * 100));
});

test('same seed gives identical results, different seeds differ', () => {
  const m = model({ x: triangular(0, 1, 5), y: ({ x }) => x! * 2 });
  assert.deepEqual(m.run({ iterations: 500, seed: 99 }).values('y'), m.run({ iterations: 500, seed: 99 }).values('y'));
  assert.notDeepEqual(m.run({ iterations: 500, seed: 1 }).values('x'), m.run({ iterations: 500, seed: 2 }).values('x'));
});

test('the seed is reported so a random run can be repeated', () => {
  const m = model({ x: uniform(0, 1) });
  const first = m.run({ iterations: 50 });
  assert.deepEqual(m.run({ iterations: 50, seed: first.seed }).values('x'), first.values('x'));
});

test('statistics: mean, percentiles, min, max and probability', () => {
  const r = model({ x: uniform(0, 100) }).run({ iterations: 100_000, seed: 3 });
  assert.ok(Math.abs(r.mean('x') - 50) < 0.5);
  assert.ok(Math.abs(r.percentile('x', 90) - 90) < 0.5);
  assert.ok(Math.abs(r.probability('x', (v) => v < 25) - 0.25) < 0.005);
  assert.ok(r.min('x') >= 0 && r.max('x') < 100);
  const s = r.summary('x');
  assert.ok(s.p10 < s.p50 && s.p50 < s.p90);
});

test('percentile interpolates between values', () => {
  const r = model({ x: 0, y: ({ x }) => x! }).run({ iterations: 1, seed: 1 });
  assert.equal(r.percentile('y', 50), 0);
  const steps = model({ i: chance(0.5) }).run({ iterations: 4, seed: 1 });
  const sorted = [...steps.values('i')].sort();
  assert.equal(steps.percentile('i', 0), sorted[0]);
  assert.equal(steps.percentile('i', 100), sorted[3]);
  assert.throws(() => steps.percentile('i', 101), /between 0 and 100/);
});

test('circular formulas are reported with the loop', () => {
  const m = model({ a: ({ b }) => b! + 1, b: ({ c }) => c! + 1, c: ({ a }) => a! + 1 });
  assert.throws(() => m.run({ iterations: 1 }), /Circular formula: a → b → c → a/);
});

test('unknown variables are reported with where they were used', () => {
  const m = model({ total: ({ price }) => price! * 2 });
  assert.throws(() => m.run({ iterations: 1 }), /Unknown variable "price" \(used by "total"\)/);
});

test('formulas that produce NaN or Infinity are reported', () => {
  const m = model({ x: 0, y: ({ x }) => 1 / x! });
  assert.throws(() => m.run({ iterations: 1 }), /"y" produced Infinity in scenario 1/);
});

test('invalid definitions and options are rejected', () => {
  assert.throws(() => model({ x: 'five' as unknown as number }), /"x" must be a finite number, a distribution or a formula/);
  assert.throws(() => model({ x: 1 }).run({ iterations: 0 }), /positive whole number/);
  assert.throws(() => model({ x: 1 }).run({ iterations: 1 }).mean('y' as 'x'), /Unknown variable "y"/);
});
