#!/usr/bin/env node
/**
 * Fail if a packed library tarball omits a required export.
 * Reads the tarball. Does not pack or rebuild.
 *
 *   node scripts/check-packed-exports.mjs --tarball <path>
 */
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const requiredPath = join(root, 'compatibility/rc/matrices/library-exports.json');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = null;
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--tarball') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) fail(2, '--tarball requires a path');
    tarball = resolve(root, value);
    i += 1;
    continue;
  }
  fail(2, `Unknown argument: ${arg}`);
}
if (!tarball) fail(2, '--tarball is required');
if (!existsSync(tarball)) fail(2, `Missing tarball: ${tarball}`);

const required = JSON.parse(readFileSync(requiredPath, 'utf8'));
const expected = new Set(required.exports ?? []);
if (expected.size === 0) fail(2, 'Export matrix is empty');

const listed = spawnSync('tar', ['-xOf', tarball, 'package/package.json'], {encoding: 'utf8'});
if (listed.status !== 0 || !listed.stdout) {
  fail(1, 'Tarball has no package/package.json');
}
const exportsMap = JSON.parse(listed.stdout).exports ?? {};
const missing = [...expected].filter(key => !Object.prototype.hasOwnProperty.call(exportsMap, key));
if (missing.length) {
  console.error(`Omitted exports: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`Packed exports include all ${expected.size} required keys`);
