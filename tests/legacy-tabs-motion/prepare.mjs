/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hashPackageTree, sha256} from './identity.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
function option(name) {
  const i = args.indexOf(name);
  return i < 0 ? null : args[i + 1];
}
const runPath = resolve(option('--run') || '');
const outValue = option('--out');
const out = resolve(outValue || '.');
const mutant = option('--mutant');
if (!option('--run') || !outValue || (mutant && !['capture', 'stale-end'].includes(mutant))) {
  throw Error('usage: node prepare.mjs --run <run.json> --out <fresh-dir> [--mutant capture|stale-end]');
}
if (existsSync(out)) throw Error('output directory must be fresh: ' + out);
mkdirSync(out, {recursive: true});
const runBytes = readFileSync(runPath);
const run = JSON.parse(runBytes.toString('utf8'));
const library = run.artifacts?.find(item => item.id === 'library');
if (!library?.path || !/^[0-9a-f]{64}$/.test(library.sha256)) throw Error('run.json has no library identity');
const tarball = resolve(dirname(runPath), library.path);
const tarballBytes = readFileSync(tarball);
const tarballSha256 = sha256(tarballBytes);
if (tarballBytes.length !== library.bytes || tarballSha256 !== library.sha256) throw Error('library tarball does not match run.json');
const extracted = spawnSync('tar', ['-xzf', tarball, '-C', out], {encoding: 'utf8'});
if (extracted.status !== 0) throw Error(extracted.stderr || 'tar extraction failed');
const packageRoot = join(out, 'package');
const fesm = join(packageRoot, 'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs');
const baselinePackageTreeSha256 = hashPackageTree(packageRoot);
const originalSource = readFileSync(fesm, 'utf8');
let mutation = null;
if (mutant) {
  const pair = mutant === 'capture'
    ? ['pendingRenderedTransforms.set(body, view.getComputedStyle(content).transform);',
       'pendingRenderedTransforms.delete(body);']
    : ['if (this._reverseEndNotBefore && this._transitionClock() < this._reverseEndNotBefore) {',
       'if (false) {'];
  if (originalSource.split(pair[0]).length !== 2) throw Error('expected exactly one FESM mutation target for ' + mutant);
  const changed = originalSource.replace(pair[0], pair[1]);
  writeFileSync(fesm, changed);
  mutation = {name: mutant, original_fesm_sha256: sha256(Buffer.from(originalSource)),
    mutated_fesm_sha256: sha256(Buffer.from(changed)), exact_replacement: pair};
}
const fesmSha256 = sha256(readFileSync(fesm));
const packageTreeSha256 = hashPackageTree(packageRoot);
const peerModulesLink = join(packageRoot, 'node_modules');
symlinkSync(resolve(root, '../../node_modules'), peerModulesLink, 'dir');
const linkParent = join(root, 'node_modules/@ngx-compat');
mkdirSync(linkParent, {recursive: true});
const packageLink = join(linkParent, 'material-legacy');
if (existsSync(packageLink)) unlinkSync(packageLink);
symlinkSync(packageRoot, packageLink, 'dir');
const identityPath = join(out, 'package-identity.json');
const identity = {
  package_identity_path: identityPath,
  schema: 'legacy-tabs-motion-package-v2',
  run_json: runPath,
  run_json_sha256: sha256(runBytes),
  run_id: run.run_id,
  tarball_path: tarball,
  tarball_sha256: tarballSha256,
  artifact_sha256: library.sha256,
  artifact_bytes: library.bytes,
  extracted_package: packageRoot,
  package_link: packageLink,
  baseline_package_tree_sha256: baselinePackageTreeSha256,
  package_tree_sha256: packageTreeSha256,
  fesm_sha256: fesmSha256,
  mutation,
};
const identityBytes = Buffer.from(JSON.stringify(identity, null, 2) + '\n');
writeFileSync(identityPath, identityBytes);
console.log(JSON.stringify({...identity, package_identity_path: identityPath,
  package_identity_sha256: createHash('sha256').update(identityBytes).digest('hex')}, null, 2));
