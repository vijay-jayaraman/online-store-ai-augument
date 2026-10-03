// Runs an npm script in every workspace that defines it.
// Skips cleanly when no workspace has the script, so root scripts work before the apps exist.
//
// Usage: node scripts/run-workspaces.js <script> [--parallel]
//   --parallel  run all matching workspaces at once (for long-running dev servers)

import { spawnSync } from 'node:child_process';
import { existsSync, globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { concurrently } from 'concurrently';

const [script, ...flags] = process.argv.slice(2);
const parallel = flags.includes('--parallel');

if (!script) {
  console.error('Usage: node scripts/run-workspaces.js <script> [--parallel]');
  process.exit(1);
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

const { workspaces } = readJson('package.json');
const dirs = workspaces
  .flatMap((pattern) => globSync(pattern))
  .filter((dir) => existsSync(path.join(dir, 'package.json')))
  .filter((dir) => readJson(path.join(dir, 'package.json')).scripts?.[script])
  .map((dir) => dir.split(path.sep).join('/'));

if (dirs.length === 0) {
  console.log(`No workspace defines "${script}" yet. Nothing to run.`);
  process.exit(0);
}

if (parallel) {
  const { result } = concurrently(
    dirs.map((dir) => ({ command: `npm run ${script} -w ${dir}`, name: path.basename(dir) })),
    { prefixColors: 'auto', killOthersOn: ['failure'] },
  );
  result.then(
    () => process.exit(0),
    () => process.exit(1),
  );
} else {
  const workspaceArgs = dirs.map((dir) => `-w ${dir}`).join(' ');
  const { status } = spawnSync(`npm run ${script} ${workspaceArgs}`, {
    stdio: 'inherit',
    shell: true,
  });
  process.exit(status ?? 1);
}
