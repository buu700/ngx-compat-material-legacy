#!/usr/bin/env node
/**
 * Run the committed migrate CLI tarball where TypeScript and Angular cannot resolve.
 *
 *   node scripts/migration-cli-isolation.mjs
 */
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tarball = join(root, 'migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz');
const reportPath = join(root, 'compatibility/rc/reports/migration-cli-ownership.json');
const library = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-cli-'));
const extracted = spawnSync('tar', ['-xzf', tarball, '-C', work], {encoding: 'utf8'});
if (extracted.status !== 0) fail(extracted.stderr || 'tar extract failed');

const pkgDir = join(work, 'package');
const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
if (manifest.dependencies || manifest.peerDependencies || manifest.optionalDependencies) {
  fail('CLI package declares a dependency');
}
const bin = readFileSync(join(pkgDir, 'bin/migrate-legacy.js'), 'utf8');
const lib = readFileSync(join(pkgDir, 'lib/ts-rewrite.js'), 'utf8') + readFileSync(join(pkgDir, 'lib/sass-rewrite.js'), 'utf8');
if (/require\(\s*['"]typescript['"]\s*\)/.test(bin + lib) || /require\(\s*['"]@angular\//.test(bin + lib)) {
  fail('Packaged CLI requires typescript or @angular');
}

writeFileSync(join(work, 'guard.cjs'), `'use strict';
const Module = require('module');
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'typescript' || request === 'sass' || request.startsWith('@angular/')) {
    const error = new Error('resolved ' + request);
    error.code = 'CONSUMER_RESOLUTION';
    throw error;
  }
  return orig.call(this, request, parent, isMain, options);
};
`);
const fixtureDir = join(work, 'fixture');
mkdirSync(fixtureDir);
const source = "import {MatLegacyButtonModule} from '@angular/material/legacy-button';\n";
writeFileSync(join(fixtureDir, 'sample.ts'), source);
const run = spawnSync(process.execPath, [
  '--require', join(work, 'guard.cjs'),
  join(pkgDir, 'bin/migrate-legacy.js'),
  fixtureDir,
  '--apply',
  '--json',
], {
  cwd: fixtureDir,
  encoding: 'utf8',
  env: {...process.env, NODE_PATH: '', NODE_OPTIONS: ''},
});
if (run.status !== 0) {
  fail(`CLI exited ${run.status}\n${run.stderr || ''}\n${run.stdout || ''}`);
}
const summary = JSON.parse(run.stdout);
const rewritten = readFileSync(join(fixtureDir, 'sample.ts'), 'utf8');
if (!rewritten.includes("from '@ngx-compat/material-legacy/legacy-button'")) {
  fail(`CLI did not rewrite the legacy import:\n${rewritten}`);
}
if (summary.safe_edits !== 1 || summary.blocking !== 0) {
  fail(`Unexpected summary: ${run.stdout}`);
}

const report = {
  schema_version: 1,
  role: 'migration CLI ownership and isolation',
  captured_at: new Date().toISOString(),
  cli: {
    package: manifest.name,
    version: manifest.version,
    license: manifest.license,
    engines: manifest.engines,
    dependencies: null,
    files: ['bin/migrate-legacy.js', 'lib/sass-rewrite.js', 'lib/ts-rewrite.js', 'LICENSE'],
  },
  library_engines: library.engines,
  parsers: {
    typescript: 'projects/ngx-material-legacy/schematics/migrate-legacy/ts-rewrite.js string mask, copied to lib/ts-rewrite.js. Not the typescript package.',
    sass: 'projects/ngx-material-legacy/schematics/migrate-legacy/sass-rewrite.js string mask, copied to lib/sass-rewrite.js. Not the sass package.',
    schematic: 'projects/ngx-material-legacy/schematics/migrate-legacy/index.js. The Angular CLI host supplies the devkit tree. The packaged CLI does not include this file.',
  },
  isolation: {
    consumer_resolution_guard: ['typescript', 'sass', '@angular/*'],
    exit_code: run.status,
    safe_edits: summary.safe_edits,
    rewritten_specifier: "@ngx-compat/material-legacy/legacy-button",
  },
  limitations: [
    'Uses the committed CLI tarball. It does not rebuild that tarball in a fresh central run.',
    'Does not execute the Angular schematic factory.',
    'This is not RC-04-A03.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ok: true, engines: manifest.engines, safe_edits: summary.safe_edits}, null, 2));
