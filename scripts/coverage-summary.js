// Prints a Markdown coverage table from each workspace's coverage/coverage-summary.json.
// CI appends it to the job summary; run `npm run test:coverage` first to see it locally.
//
// Usage: node scripts/coverage-summary.js

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Keep these in sync with `coverage.thresholds.lines` in each workspace's vitest.config.js.
const WORKSPACES = [
  { dir: 'packages/shared', lines: 80 },
  { dir: 'apps/api', lines: 80 },
  { dir: 'apps/store', lines: 70 },
  { dir: 'apps/admin', lines: 70 },
];

const pct = (metric) => `${metric.pct}%`;

const rows = WORKSPACES.map(({ dir, lines }) => {
  const file = path.join(dir, 'coverage', 'coverage-summary.json');
  if (!existsSync(file)) return `| \`${dir}\` | no report | | | | ${lines}% | ❌ |`;

  const { total } = JSON.parse(readFileSync(file, 'utf8'));
  const status = total.lines.pct >= lines ? '✅' : '❌';
  return `| \`${dir}\` | ${pct(total.lines)} | ${pct(total.statements)} | ${pct(total.branches)} | ${pct(total.functions)} | ${lines}% | ${status} |`;
});

console.log(
  [
    '## Test coverage',
    '',
    '| Workspace | Lines | Statements | Branches | Functions | Lines threshold | |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    'Full HTML reports are in the `coverage` artifact of this run.',
  ].join('\n'),
);
