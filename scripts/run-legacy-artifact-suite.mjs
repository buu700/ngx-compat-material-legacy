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
function reject(message) {
  console.error(`legacy-artifact-suite: ${message}`);
  process.exit(2);
}

let inventory;
try {
  inventory = JSON.parse(
    fs.readFileSync(path.join(root, 'testing/legacy-runner/historical-inventory.json'), 'utf8'),
  );
} catch (error) {
  reject(`cannot read historical inventory: ${error.message}`);
}
if (!Array.isArray(inventory?.rows) || inventory.rows.length === 0 ||
    inventory.rows.some(row => !row || typeof row.family !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.family))) {
  reject('historical inventory must contain named, nonempty family rows');
}
const known = [...new Set(inventory.rows.map(row => row.family))].sort();

const args = process.argv.slice(2);
let familiesArg = null;
const filtered = [];
const seenOptions = new Set();
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith('--')) {
    if (seenOptions.has(args[i])) reject(`duplicate option ${args[i]}`);
    seenOptions.add(args[i]);
  }
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

const {runPath, family, tarball, unknown} = parseLegacyArgs(filtered);
if (unknown.length || !runPath || tarball) {
  console.error(
    'usage: node scripts/run-legacy-artifact-suite.mjs --run <run.json> [--family name|--families a,b]',
  );
  process.exit(2);
}

if (family !== null && familiesArg !== null) {
  reject('--family and --families are mutually exclusive');
}
let families;
if (familiesArg !== null) {
  families = familiesArg.split(',').map(s => s.trim());
} else if (family) {
  families = [family];
} else {
  families = known;
}

if (families.length === 0 || families.some(name => !name)) {
  reject('family selection must be nonempty and contain no empty segments');
}
if (families.length !== new Set(families).size) {
  reject('duplicate family selections are not coverage');
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
