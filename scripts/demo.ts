// A made-up renovation estimate: how long will it take and what will it cost?
import { chance, model, triangular, uniform } from '../src/index.ts';

const renovation = model({
  workDays: triangular(5, 7, 12),         // best case 5, most likely 7, worst case 12
  dayRate: 400,
  materials: uniform(1200, 1800),
  supplierDelay: chance(0.2),             // 20% chance the supplier is late...
  delayDays: ({ supplierDelay }) => supplierDelay * 3,  // ...which adds 3 days
  totalDays: ({ workDays, delayDays }) => workDays + delayDays,
  // Waiting for the supplier pushes the finish date but isn't paid labour.
  cost: ({ workDays, dayRate, materials }) => workDays * dayRate + materials,
});

const results = renovation.run({ iterations: 10_000, seed: 42 });

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const days = (n: number) => `${n.toFixed(1)} days`;
const percent = (p: number) => `${Math.round(p * 100)}%`;

console.log(`Renovation estimate: ${results.iterations.toLocaleString('en-US')} simulated projects (seed ${results.seed})\n`);
console.log('              average     10%         50%         90%');
for (const [label, name, show] of [['Total days', 'totalDays', days], ['Cost', 'cost', money]] as const) {
  const s = results.summary(name);
  console.log(`  ${label.padEnd(12)}${[s.mean, s.p10, s.p50, s.p90].map((v) => show(v).padEnd(12)).join('')}`);
}

console.log(`\n  Chance it costs under $5,000:      ${percent(results.probability('cost', (c) => c < 5000))}`);
console.log(`  Chance it takes more than 10 days: ${percent(results.probability('totalDays', (d) => d > 10))}`);
console.log(`  9 in 10 projects cost at most:     ${money(results.percentile('cost', 90))}`);

// Text histogram of the cost.
const bins = 10;
const low = results.min('cost');
const width = (results.max('cost') - low) / bins;
const counts = new Array<number>(bins).fill(0);
for (const c of results.values('cost')) counts[Math.min(bins - 1, Math.floor((c - low) / width))]!++;
const most = Math.max(...counts);
console.log('\n  Cost distribution');
counts.forEach((count, i) => {
  const from = money(low + i * width).padStart(7);
  const to = money(low + (i + 1) * width).padStart(7);
  console.log(`  ${from} – ${to}  ${'█'.repeat(Math.round((count / most) * 40))} ${count}`);
});
