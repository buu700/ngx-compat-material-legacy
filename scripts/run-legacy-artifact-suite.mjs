#!/usr/bin/env node
/**
 * Run historical families against a packed entry artifact (--run).
 *
 * Intended for CI entry dirs (artifacts/main/entry-${GITHUB_SHA}) or a
 * downloaded Actions artifact containing run.json + the library tarball.
 *
 *   node scripts/run-legacy-artifact-suite.mjs --run <run.json>
 *   node scripts/run-legacy-artifact-suite.mjs --run <run.json> --family card
 *   node scripts/run-legacy-artifact-suite.mjs --run <run.json> --families card,button
 */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseLegacyArgs} from './resolve-run-library.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(
  fs.readFileSync(path.join(root, 'testing/legacy-runner/historical-inventory.json'), 'utf8'),
);
const known = [...new Set(inventory.rows.map(row => row.family))].sort();

const args = process.argv.slice(2);
let familiesArg = null;
const filtered = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--families') {
    const value = args[i + 1];
    if (!value || value.startsWith('-')) {
      console.error('--families requires a comma-separated list');
      process.exit(2);
    }
    familiesArg = value;
    i += 1;
    continue;
  }
  filtered.push(args[i]);
}

const {runPath, family, unknown} = parseLegacyArgs(filtered);
if (unknown.length || !runPath) {
  console.error(
    'usage: node scripts/run-legacy-artifact-suite.mjs --run <run.json> [--family name|--families a,b]',
  );
  process.exit(2);
}

let families;
if (familiesArg) {
  families = familiesArg.split(',').map(s => s.trim()).filter(Boolean);
} else if (family) {
  families = [family];
} else {
  families = known;
}

for (const name of families) {
  if (!known.includes(name)) {
    console.error(`Unknown historical family "${name}". Known: ${known.join(', ')}`);
    process.exit(1);
  }
}

console.log(`legacy-artifact-suite: ${families.length} families against ${runPath}`);
const failures = [];
for (const name of families) {
  console.log(`\n=== artifact family ${name} ===`);
  const child = spawnSync(
    process.execPath,
    ['scripts/rc-test-legacy-family.mjs', '--family', name, '--run', runPath],
    {cwd: root, stdio: 'inherit', env: process.env},
  );
  if ((child.status ?? 1) !== 0) {
    failures.push(name);
  }
}

if (failures.length) {
  console.error(`legacy-artifact-suite: failed families: ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`legacy-artifact-suite: ${families.length} families passed under artifact --run`);
process.exit(0);
