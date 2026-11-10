/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
/** Execute original dialog probe against its own Git-authenticated historical frame. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const cases = {
  config: ['9f3475760a', '2680df639f65f19dfca9b26b17665363aa02a719873b4877cee631e3c0a9e703', 'dialog_caller_config_boundary_probe.mjs'],
  owned: ['4cb2733bf1', 'ac56c0e7716d603194dcb24fd04419d6ae1c9d9d834065d3f201eb17f7e57a23', 'dialog_caller_owned_contract_boundary_probe.mjs'],
  'rebind-owned': ['4cb2733bf1', 'ac56c0e7716d603194dcb24fd04419d6ae1c9d9d834065d3f201eb17f7e57a23', 'dialog_caller_owned_contract_source_rebinding_probe.mjs'],
  review: ['4cb2733bf1', 'ac56c0e7716d603194dcb24fd04419d6ae1c9d9d834065d3f201eb17f7e57a23', 'dialog_caller_review_probe.mjs'],
  default: ['27ec279bee', 'e8ac27a397576065b93579a4a04ce947dbb7dbec5e70a152f49ea0d59448fb0d', 'dialog_caller_service_default_boundary_probe.mjs'],
  'rebind-default': ['d05b6e77cd', 'cc33156c4396c2d0b83c87ad6e0604dadec20d979c1cfe349bb0a48ed6ea3fd8', 'dialog_caller_service_default_source_rebinding_probe.mjs'],
};
const root = process.cwd(), key = process.argv[2], spec = cases[key];
assert.ok(spec && process.argv.length === 3, 'unknown historical dialog assertion set');
const [short, expectedHash, probe] = spec;
const data = readFileSync(join(root, `compatibility/rc/dialog-caller-current-epoch/historic-${short}-inputs.json`));
assert.equal(createHash('sha256').update(data).digest('hex'), expectedHash);
const manifest = JSON.parse(data);
assert.ok(manifest.revision.startsWith(short) && /^[a-f0-9]{40}$/.test(manifest.revision));
assert.ok(manifest.probes.includes(key));
assert.equal(new Set(manifest.paths).size, manifest.paths.length);
for (const path of manifest.paths) assert.ok(/^[a-zA-Z0-9_./@+~-]+$/.test(path) && !path.startsWith('/') && !path.split('/').includes('..'));
const env = {...process.env, GIT_NO_LAZY_FETCH: '1'};
execFileSync('git', ['--no-replace-objects', 'merge-base', '--is-ancestor', manifest.revision, 'HEAD'], {cwd: root, env});
const gitDir = resolve(root, execFileSync('git', ['rev-parse', '--absolute-git-dir'], {cwd: root, env, encoding: 'utf8'}).trim());
const frame = mkdtempSync(join(tmpdir(), 'dialog-historical-'));
try {
  // Git produces the exact old files; no old product bytes enter the current frame.
  for (let offset = 0; offset < manifest.paths.length; offset += 200) {
    const archive = execFileSync('git', ['--no-replace-objects', 'archive', manifest.revision, ...manifest.paths.slice(offset, offset + 200)],
      {cwd: root, env, maxBuffer: 100 * 1024 * 1024});
    const unpack = spawnSync('tar', ['-x', '-C', frame], {input: archive, maxBuffer: 4 * 1024 * 1024});
    assert.equal(unpack.status, 0, String(unpack.stderr));
  }
  symlinkSync(gitDir, join(frame, '.git'), 'dir');
  symlinkSync(realpathSync(join(root, 'node_modules')), join(frame, 'node_modules'), 'dir');
  const child = spawnSync(process.execPath, [join(frame, 'tests', probe)], {cwd: frame, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  assert.equal(child.status, 0, child.stderr || child.error?.message);
  JSON.parse(child.stdout);
  process.stdout.write(child.stdout);
} finally {
  rmSync(frame, {recursive: true, force: true});
}
