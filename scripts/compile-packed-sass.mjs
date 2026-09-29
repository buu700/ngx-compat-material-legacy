#!/usr/bin/env node
/**
 * Compile the packed Sass entry with no external Material package on the load path.
 *
 *   node scripts/compile-packed-sass.mjs [--tarball <path>]
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'compatibility/rc/reports/packed-sass-isolation.json');
const sass = createRequire(join(root, 'package.json'))('sass');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = join(root, 'artifacts/main/rc0405/ngx-compat-material-legacy-22.0.0-rc.0.tgz');
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--tarball') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) fail(2, '--tarball requires a path');
    tarball = resolve(value);
    i += 1;
    continue;
  }
  fail(2, `Unknown argument: ${arg}`);
}

const work = mkdtempSync(join(tmpdir(), 'ngx-compat-packed-sass-'));
const extracted = spawnSync('tar', ['-xzf', tarball, '-C', work], {encoding: 'utf8'});
if (extracted.status !== 0) fail(1, extracted.stderr || 'tar extract failed');
const entry = join(work, 'package/_index.scss');
const external = [];
function walk(dir) {
  for (const name of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, name.name);
    if (name.isDirectory()) walk(full);
    else if (name.name.endsWith('.scss')) {
      const text = readFileSync(full, 'utf8');
      for (const match of text.matchAll(/@use\s+['"](@(?:angular\/material|material)[^'"]*)['"]/g)) {
        external.push({file: full.slice(work.length + 1), specifier: match[1]});
      }
    }
  }
}
walk(join(work, 'package'));
const requested = [];
let compiled = false;
let error = null;
try {
  sass.compile(entry, {
    loadPaths: [],
    style: 'expanded',
    sourceMap: false,
    importers: [{
      findFileUrl(url) {
        requested.push(String(url));
        return null;
      },
    }],
  });
  compiled = true;
} catch (err) {
  error = String(err);
}
const report = {
  schema_version: 1,
  role: 'packed Sass compile without external Material',
  tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  entry: 'package/_index.scss',
  load_paths: [],
  compiled,
  external_uses: external,
  importer_requests: requested,
  error,
  limitations: [
    'The importer refuses every non-relative load, including @angular/material.',
    'This is not RC-05-A04.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({compiled, external_uses: external.length, requested: requested.length}, null, 2));
if (!compiled) process.exit(1);
