#!/usr/bin/env node
/**
 * Prove a consumer of the packed library cannot resolve the animation engine.
 *
 * The consumer installs the tarball and the library's declared peers. It does
 * not install @angular/animations or @angular/platform-browser/animations.
 *
 *   node scripts/engine-free-consumer.mjs --tarball <path>
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'compatibility/rc/reports/engine-free-consumer.json');
const forbidden = ['@angular/animations', '@angular/platform-browser/animations'];
const specifier = /(?:import|export)\s*(?:type\s+)?(?:[\s\S]*?\sfrom\s*)?['"](@angular\/animations|@angular\/platform-browser\/animations)['"]|require\(\s*['"](@angular\/animations|@angular\/platform-browser\/animations)['"]\s*\)|import\(\s*['"](@angular\/animations|@angular\/platform-browser\/animations)['"]\s*\)/g;

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = '';
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
if (!tarball) fail(2, '--tarball is required');
if (!existsSync(tarball)) fail(2, `Missing tarball: ${tarball}`);

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*?$/gm, '$1');
}

function tarText(path) {
  const listing = spawnSync('tar', ['-tzf', tarball], {encoding: 'utf8'});
  if (listing.status !== 0) fail(1, listing.stderr || 'tar listing failed');
  const names = listing.stdout.split('\n').filter(name => name === path || name.endsWith(path));
  const exact = listing.stdout.split('\n').includes(path) ? path : names[0];
  if (!exact) return null;
  const extracted = spawnSync('tar', ['-xOf', tarball, exact], {encoding: 'utf8'});
  if (extracted.status !== 0) fail(1, extracted.stderr || `unable to read ${exact}`);
  return extracted.stdout;
}

function scanMembers() {
  const listing = spawnSync('tar', ['-tzf', tarball], {encoding: 'utf8'});
  if (listing.status !== 0) fail(1, listing.stderr || 'tar listing failed');
  const hits = [];
  for (const name of listing.stdout.split('\n')) {
    if (!/\.(mjs|cjs|js|d\.ts)$/.test(name)) continue;
    const extracted = spawnSync('tar', ['-xOf', tarball, name], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
    if (extracted.status !== 0) fail(1, `unable to read ${name}`);
    specifier.lastIndex = 0;
    const text = stripComments(extracted.stdout);
    if (specifier.test(text)) hits.push(name);
  }
  return hits;
}

const packageJson = tarText('package/package.json');
if (!packageJson) fail(1, 'Tarball has no package/package.json');
const manifest = JSON.parse(packageJson);
for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies']) {
  for (const name of Object.keys(manifest[field] ?? {})) {
    if (forbidden.includes(name)) {
      fail(1, `${field} declares ${name}`);
    }
  }
}
const importHits = scanMembers();
if (importHits.length) fail(1, `Packed files import the animation engine: ${importHits.join(', ')}`);

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-engine-free-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
const peers = {
  '@angular/core': '22.1.7',
  '@angular/common': '22.1.7',
  '@angular/forms': '22.1.7',
  '@angular/platform-browser': '22.1.7',
  '@angular/cdk': '22.1.7',
  '@angular/material': '22.1.7',
  rxjs: '7.8.2',
  tslib: '2.8.1',
  '@ngx-compat/material-legacy': `file:${installTarball}`,
};
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-engine-free-consumer',
  private: true,
  dependencies: peers,
}, null, 2));
writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
  cwd: consumer,
  encoding: 'utf8',
  timeout: 180000,
  env: {...process.env, NODE_PATH: '', NODE_OPTIONS: ''},
});
if (install.status !== 0) {
  fail(1, `npm install failed\n${(install.stderr || install.stdout || '').slice(-2000)}`);
}

const unresolved = [];
for (const spec of forbidden) {
  const probe = spawnSync(process.execPath, ['-e', 'require(process.env.SPEC)'], {
    cwd: consumer,
    encoding: 'utf8',
    env: {...process.env, NODE_PATH: '', NODE_OPTIONS: '', SPEC: spec},
  });
  if (probe.status === 0) {
    fail(1, `${spec} resolved inside the required consumer`);
  }
  const message = `${probe.stderr || ''}${probe.stdout || ''}`;
  if (!message.includes('Cannot find module') && !message.includes('ERR_MODULE_NOT_FOUND')) {
    fail(1, `${spec} failed without a missing-module error: ${message.slice(-500)}`);
  }
  unresolved.push(spec);
}

const entry = spawnSync(process.execPath, ['-e', "process.stdout.write(require.resolve('@ngx-compat/material-legacy/legacy-button'))"], {
  cwd: consumer,
  encoding: 'utf8',
  env: {...process.env, NODE_PATH: '', NODE_OPTIONS: ''},
});
if (entry.status !== 0) {
  fail(1, `legacy-button did not resolve: ${(entry.stderr || entry.stdout || '').slice(-500)}`);
}
if (existsSync(join(consumer, 'node_modules/@angular/animations')) || existsSync(join(consumer, 'node_modules/@angular/platform-browser/animations'))) {
  fail(1, 'The required consumer installed an animation-engine package');
}

const report = {
  schema_version: 1,
  role: 'required consumer engine resolution',
  captured_at: new Date().toISOString(),
  tarball_sha256: sha256(tarball),
  package_dependency_fields_checked: ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'],
  packed_import_hits: importHits,
  consumer_dependencies: Object.keys(peers),
  unresolved,
  legacy_button_resolved: true,
  limitations: [
    'Historical specs still import NoopAnimationsModule, so the workspace devDependency remains.',
    'This consumer does not compile templates and is not a sealed pack-draft check.',
    'This is not G04.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ok: true, unresolved, tarball_sha256: report.tarball_sha256}, null, 2));
