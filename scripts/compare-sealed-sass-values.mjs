#!/usr/bin/env node
/**
 * Compile the sealed Sass value fixtures against the owned facade.
 * Does not rewrite the Material 16.2.14 report.
 *
 *   node scripts/compare-sealed-sass-values.mjs
 */
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sealedPath = join(root, 'reference/material-16.2.14/sass-values/sass-value-report.json');
const reportPath = join(root, 'compatibility/rc/reports/sass-value-comparison.json');
const env = mkdtempSync(join(tmpdir(), 'ngx-compat-sass-values-'));
const out = join(env, 'out');
mkdirSync(join(env, 'node_modules/@ngx-compat'), {recursive: true});
symlinkSync(join(root, 'node_modules/sass'), join(env, 'node_modules/sass'));
symlinkSync(join(root, 'projects/ngx-material-legacy'), join(env, 'node_modules/@ngx-compat/material-legacy'));
writeFileSync(join(env, 'package.json'), '{"name":"sass-value-env","private":true}\n');

const run = spawnSync(process.execPath, [
  join(root, 'scripts/run-sass-value-fixtures.mjs'),
  '--environment', env,
  '--module', '@ngx-compat/material-legacy',
  '--output', out,
], {cwd: root, encoding: 'utf8'});
const captured = JSON.parse(readFileSync(join(out, 'sass-value-report.json'), 'utf8'));
const sealed = JSON.parse(readFileSync(sealedPath, 'utf8'));
const comparisons = captured.fixtures.map(item => {
  const oracle = sealed.fixtures.find(entry => entry.id === item.id);
  return {
    id: item.id,
    owned_status: item.status,
    sealed_status: oracle?.status ?? 'missing',
    debug_matches_sealed: item.status === 'compiled' && oracle?.status === 'compiled'
      && JSON.stringify(item.debug) === JSON.stringify(oracle.debug),
    error: item.error ?? null,
  };
});
const report = {
  schema_version: 1,
  role: 'owned Sass values against the sealed Material 16.2.14 capture',
  sealed_report: 'reference/material-16.2.14/sass-values/sass-value-report.json',
  runner_exit: run.status,
  comparisons,
  import_chain: [
    'projects/ngx-material-legacy/_index.scss',
    'styles/core/density/private/_all-density.scss',
    'styles/expansion/_expansion-theme.scss',
    'styles/bridges/_companion-overrides.scss imports @angular/material',
  ],
  limitations: [
    'The owned root facade did not compile, so sealed debug strings were not compared.',
    'The sealed report was not rewritten.',
    'This is not G06.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
const failed = comparisons.filter(item => !item.debug_matches_sealed);
console.log(JSON.stringify({ok: failed.length === 0, failed: failed.map(item => item.id)}, null, 2));
process.exit(failed.length ? 1 : 0);
