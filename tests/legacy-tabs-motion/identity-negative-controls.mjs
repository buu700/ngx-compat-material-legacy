/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {readInstalledBundle, verifyArtifactBinding} from './identity.mjs';

const root = new URL('.', import.meta.url).pathname;
const args = process.argv.slice(2);
const get = name => {
  const i = args.indexOf(name);
  return i < 0 ? null : args[i + 1];
};
const runPath = get('--run');
const packageIdentityPath = get('--package-identity');
const buildIdentityPath = get('--build-identity');
const outValue = get('--out');
if (!runPath || !packageIdentityPath || !buildIdentityPath || !outValue) {
  throw Error('usage: node identity-negative-controls.mjs --run <run.json> --package-identity <file> --build-identity <file> --out <fresh-dir>');
}
const out = resolve(outValue);
mkdirSync(out, {recursive: false});
const baseline = readInstalledBundle({
  runPath, packageIdentityPath, buildIdentityPath,
  packageLink: join(root, 'node_modules/@ngx-compat/material-legacy'),
  distRoot: join(root, 'dist'),
});
verifyArtifactBinding(baseline);
const controls = [
  ['swapped-run-path', input => { input.expectedRunPath += '.other'; }],
  ['changed-run-bytes', input => {
    const run = JSON.parse(input.runBytes.toString('utf8'));
    run.run_id += '-other';
    input.runBytes = Buffer.from(JSON.stringify(run));
  }],
  ['different-package-tree', input => { input.actualPackageTreeSha256 = '0'.repeat(64); }],
  ['different-fesm', input => { input.actualFesmSha256 = '0'.repeat(64); }],
  ['stale-app-bundle', input => { input.actualAppSha256 = '0'.repeat(64); }],
  ['stale-theme-css', input => { input.actualThemeSha256 = '0'.repeat(64); }],
  ['stale-html', input => { input.actualHtmlSha256 = '0'.repeat(64); }],
  ['stale-build-record', input => {
    const build = JSON.parse(input.buildIdentityBytes.toString('utf8'));
    build.package_tree_sha256 = '0'.repeat(64);
    input.buildIdentityBytes = Buffer.from(JSON.stringify(build));
  }],
];
const results = [];
for (const [name, mutate] of controls) {
  const candidate = {...baseline,
    runBytes: Buffer.from(baseline.runBytes),
    packageIdentityBytes: Buffer.from(baseline.packageIdentityBytes),
    buildIdentityBytes: Buffer.from(baseline.buildIdentityBytes),
  };
  mutate(candidate);
  let rejected = false;
  let message = '';
  try { verifyArtifactBinding(candidate); }
  catch (error) { rejected = true; message = String(error.message || error); }
  results.push({name, rejected, message});
}
const report = {
  schema: 'legacy-tabs-motion-identity-controls-v1',
  baselineAccepted: true,
  controls: results,
  allRejected: results.every(result => result.rejected),
};
writeFileSync(join(out, 'identity-negative-controls.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.allRejected) process.exitCode = 1;
