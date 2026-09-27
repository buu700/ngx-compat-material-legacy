#!/usr/bin/env node
/**
 * Install a fresh library tarball into a consumer outside this repository and
 * prove legacy-core identity, owned helpers, and engine-free overlay behavior.
 *
 * The consumer package.json does not depend on @angular/animations. Overlay
 * tests use the public MATERIAL_ANIMATIONS token.
 *
 * Usage:
 *   node scripts/engine-free-consumer-proof.mjs --tarball <file.tgz>
 */
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const tarballIdx = args.indexOf('--tarball');
const tarball = tarballIdx >= 0 ? resolve(args[tarballIdx + 1]) : '';
if (!tarball) {
  console.error('Usage: node scripts/engine-free-consumer-proof.mjs --tarball <file.tgz>');
  process.exit(2);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readPackedManifest(path) {
  const result = spawnSync('tar', ['-xOzf', path, 'package/package.json'], {encoding: 'utf8'});
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Unable to read packed package.json');
  }
  return JSON.parse(result.stdout);
}

const manifest = readPackedManifest(tarball);
const corePeer = manifest.peerDependencies?.['@angular/core'] || '';
const line = corePeer.includes('21') ? 21 : 22;
const angular = line === 21 ? '21.2.23' : '22.1.7';
const material = line === 21 ? '21.2.14' : '22.1.7';
const typescript = line === 21 ? '5.9.2' : '6.0.3';
const zone = line === 21 ? '0.15.1' : '0.16.3';
const digest = sha256(tarball);

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-engine-free-'));
const report = {
  ok: false,
  tarball,
  tarball_sha256: digest,
  line,
  consumer,
  checks: [],
};
const keep = process.env.ENGINE_FREE_CONSUMER_KEEP === '1';

function check(name, ok, detail) {
  report.checks.push({name, ok, ...(detail ? {detail} : {})});
  if (!ok) {
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

try {
  const peers = {
    '@angular/cdk': material,
    '@angular/common': angular,
    '@angular/compiler': angular,
    '@angular/core': angular,
    '@angular/forms': angular,
    '@angular/material': material,
    '@angular/platform-browser': angular,
    '@angular/platform-browser-dynamic': angular,
    '@ngx-compat/material-legacy': `file:${tarball}`,
    jsdom: '26.1.0',
    rxjs: '7.8.2',
    tslib: '2.8.1',
    typescript,
    'zone.js': zone,
  };
  if ('@angular/animations' in peers) {
    throw new Error('Consumer must not depend on @angular/animations');
  }
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({name: 'engine-free-consumer', private: true, type: 'module', dependencies: peers}, null, 2),
  );
  writeFileSync(
    join(consumer, 'pnpm-workspace.yaml'),
    'minimumReleaseAge: 10080\nminimumReleaseAgeStrict: true\nminimumReleaseAgeIgnoreMissingTime: false\n',
  );
  const install = spawnSync(
    'pnpm',
    ['install', '--ignore-scripts', '--config.confirmModulesPurge=false'],
    {cwd: consumer, encoding: 'utf8'},
  );
  if (install.status !== 0) {
    throw new Error(`pnpm install failed\n${install.stdout}\n${install.stderr}`);
  }
  writeFileSync(
    join(consumer, 'proof.ts'),
    readFileSync(join(root, 'scripts/engine-free-consumer/proof.ts')),
  );
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'nodenext',
          moduleResolution: 'nodenext',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          useDefineForClassFields: false,
          skipLibCheck: true,
          noCheck: true,
          strict: false,
          types: [],
        },
        files: ['proof.ts'],
      },
      null,
      2,
    ),
  );
  const compile = spawnSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json'], {
    cwd: consumer,
    encoding: 'utf8',
  });
  if (compile.status !== 0) {
    throw new Error(`tsc failed\n${compile.stdout}\n${compile.stderr}`);
  }
  const run = spawnSync(process.execPath, ['proof.js'], {
    cwd: consumer,
    encoding: 'utf8',
    env: {...process.env, NODE_PATH: ''},
  });
  const stdout = run.stdout || '';
  const marker = stdout.split('\n').filter((line) => line.startsWith('PROOF ')).pop();
  if (!marker) {
    throw new Error(`Consumer proof produced no result\n${stdout}\n${run.stderr}`);
  }
  const payload = JSON.parse(marker.slice('PROOF '.length));
  report.checks.push(...payload.checks);
  report.ok = run.status === 0 && payload.ok === true;
  if (run.status !== 0 && report.ok) report.ok = false;
  if (!report.ok) {
    console.error(run.stderr || '');
  }
} catch (error) {
  report.ok = false;
  report.error = String(error && error.stack ? error.stack : error);
  console.error(report.error);
} finally {
  if (!keep) rmSync(consumer, {recursive: true, force: true});
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
