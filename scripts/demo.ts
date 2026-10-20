// A made-up software release: how many working days until it ships?
import { chance, model, oneOf, triangular, uniform } from '../src/index.ts';

const release = model({
  design: triangular(2, 3, 6),             // best case 2 days, most likely 3, worst case 6
  build: triangular(5, 8, 15),
  testing: uniform(2, 4),
  bugRounds: oneOf([0, 1, 2], [0.5, 0.3, 0.2]),  // extra fix-and-retest rounds
  bugDays: ({ bugRounds }) => bugRounds * 2,
  reviewWait: chance(0.25),                // 25% chance the final review is delayed...
  reviewDays: ({ reviewWait }) => 1 + reviewWait * 3,  // ...by 3 more days
  total: ({ design, build, testing, bugDays, reviewDays }) => design + build + testing + bugDays + reviewDays,
});

const results = release.run({ iterations: 10_000, seed: 42 });

const days = (n: number) => `${n.toFixed(1)} days`;
const percent = (p: number) => `${Math.round(p * 100)}%`;

console.log(`Release estimate: ${results.iterations.toLocaleString('en-US')} simulated releases (seed ${results.seed})\n`);
console.log('              average     10%         50%         90%');
for (const [label, name] of [['Build', 'build'], ['Total', 'total']] as const) {
  const s = results.summary(name);
  console.log(`  ${label.padEnd(12)}${[s.mean, s.p10, s.p50, s.p90].map((v) => days(v).padEnd(12)).join('')}`);
}

console.log(`\n  Chance it ships within 20 days:  ${percent(results.probability('total', (d) => d <= 20))}`);
console.log(`  Chance it takes over 25 days:    ${percent(results.probability('total', (d) => d > 25))}`);
console.log(`  9 in 10 releases ship within:    ${days(results.percentile('total', 90))}`);

// Text histogram of the total.
const bins = 10;
const low = results.min('total');
const width = (results.max('total') - low) / bins;
const counts = new Array<number>(bins).fill(0);
for (const d of results.values('total')) counts[Math.min(bins - 1, Math.floor((d - low) / width))]!++;
const most = Math.max(...counts);
console.log('\n  Total days');
counts.forEach((count, i) => {
  const from = (low + i * width).toFixed(1).padStart(5);
  const to = (low + (i + 1) * width).toFixed(1).padStart(5);
  console.log(`  ${from} – ${to}  ${'█'.repeat(Math.round((count / most) * 40))} ${count}`);
});
