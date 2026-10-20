import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chance, createRandom, normal, oneOf, triangular, uniform, type Distribution } from '../src/index.ts';

const N = 200_000;

function samples(distribution: Distribution, seed = 1): number[] {
  const random = createRandom(seed);
  return Array.from({ length: N }, () => distribution.sample(random));
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const stdDev = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};
const close = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected} ± ${tolerance}, got ${actual}`);

test('random generator: same seed gives the same sequence, values are in [0, 1)', () => {
  const a = createRandom(42);
  const b = createRandom(42);
  const xs = Array.from({ length: 1000 }, () => a());
  assert.deepEqual(xs, Array.from({ length: 1000 }, () => b()));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  assert.notDeepEqual(xs.slice(0, 10), Array.from({ length: 10 }, createRandom(43)));
});

test('uniform: stays in range, mean and spread match theory', () => {
  const xs = samples(uniform(2, 10));
  assert.ok(xs.every((x) => x >= 2 && x < 10));
  close(mean(xs), 6, 0.03, 'mean');
  close(stdDev(xs), 8 / Math.sqrt(12), 0.02, 'stdDev');
});

test('normal: mean and standard deviation match, ~68% within one stdDev', () => {
  const xs = samples(normal(100, 15));
  close(mean(xs), 100, 0.15, 'mean');
  close(stdDev(xs), 15, 0.15, 'stdDev');
  close(xs.filter((x) => Math.abs(x - 100) <= 15).length / N, 0.6827, 0.005, 'within 1 sd');
});

test('triangular: stays in range, mean is (min + mode + max) / 3, peak near the mode', () => {
  const d = triangular(0, 2, 10);
  const xs = samples(d);
  assert.ok(xs.every((x) => x >= 0 && x <= 10));
  close(mean(xs), d.mean!, 0.03, 'mean');
  // P(x < mode) = (mode - min) / (max - min) = 0.2
  close(xs.filter((x) => x < 2).length / N, 0.2, 0.005, 'share below mode');
});

test('triangular with min = max always returns that value', () => {
  assert.ok(samples(triangular(5, 5, 5)).every((x) => x === 5));
});

test('chance: returns 0 or 1 with the given probability', () => {
  const xs = samples(chance(0.3));
  assert.ok(xs.every((x) => x === 0 || x === 1));
  close(mean(xs), 0.3, 0.005, 'share of 1s');
});

test('oneOf: respects weights', () => {
  const xs = samples(oneOf([1, 2, 3], [0.5, 0.3, 0.2]));
  close(xs.filter((x) => x === 1).length / N, 0.5, 0.005, 'P(1)');
  close(xs.filter((x) => x === 3).length / N, 0.2, 0.005, 'P(3)');
  close(mean(xs), 1.7, 0.01, 'mean');
});

test('invalid parameters are rejected with clear messages', () => {
  assert.throws(() => uniform(5, 1), /min \(5\) must not be greater than max \(1\)/);
  assert.throws(() => normal(0, -1), /stdDev must not be negative/);
  assert.throws(() => triangular(0, 11, 10), /expected min <= mode <= max/);
  assert.throws(() => chance(1.5), /p must be between 0 and 1/);
  assert.throws(() => uniform(Number.NaN, 1), /min must be a finite number/);
  assert.throws(() => oneOf([]), /at least one value/);
  assert.throws(() => oneOf([1, 2], [1]), /same length/);
  assert.throws(() => oneOf([1, 2], [0, 0]), /more than 0/);
});
