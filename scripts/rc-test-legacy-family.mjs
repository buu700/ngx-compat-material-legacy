#!/usr/bin/env node
/**
 * Run one historical family. Unknown or empty selection fails.
 * The report is family-scoped and does not replace the full-suite receipt.
 */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const inventory = JSON.parse(
  fs.readFileSync(path.join(root, 'testing/legacy-runner/historical-inventory.json'), 'utf8'),
);
const known = [...new Set(inventory.rows.map(row => row.family))].sort();

if (args.length !== 2 || args[0] !== '--family' || !args[1] || args[1].startsWith('-')) {
  console.error('usage: node scripts/rc-test-legacy-family.mjs --family <name>');
  console.error(`known families: ${known.join(', ')}`);
  process.exit(2);
}

const family = args[1];
if (!known.includes(family)) {
  console.error(`Unknown historical family "${family}". Known: ${known.join(', ')}`);
  process.exit(1);
}

const relativeReport = path.join('compatibility/rc/reports', `legacy-${family}.json`);
fs.mkdirSync(path.dirname(path.join(root, relativeReport)), {recursive: true});
const child = spawnSync(process.execPath, ['scripts/run-legacy-tests.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    LEGACY_SPEC_FAMILY: family,
    LEGACY_RESULTS_PATH: relativeReport,
  },
});
process.exit(child.status ?? 1);
