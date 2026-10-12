/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {inspectHistoricalMenuViewportRequalification, VIEWPORT_INPUTS}
  from '../scripts/historical-menu-viewport-requalification.mjs';
import {reviewLegacyViewportUses} from '../scripts/legacy-viewport-use-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const product = JSON.parse(read('projects/ngx-material-legacy/package.json'));
const line = product.version.startsWith('21.') ? '21.x' : 'main';
const subjects = {
  main: {menu: '9a8e1869bf5e41e61422f1bad7537371282e5937',
    isolation: '7778531059fecb559f1e75dd2fec2c874b58e878',
    pack: '0a320f86e82c6ab972834764b1cc68dba8497223eac59bd611dcdbc77302ff1f'},
  '21.x': {menu: 'cfa3b5cc2', isolation: 'cb03e92842cb3fc1a30955396cbe9d2d3af07a16',
    pack: 'c130c548ebc53a9f3b2a3d6b8e2dcd7a547fa756a18ca70a9b63435c83a2d274'},
};
const subject = subjects[line];
function git(args) {
  const result = spawnSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args],
    {cwd: root, maxBuffer: 4 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr.toString());
  return result.stdout;
}
subject.menu = git(['rev-parse', subject.menu]).toString().trim();
const inputs = JSON.parse(read(VIEWPORT_INPUTS));
const branch = inputs.lines[line], producerPath = inputs.producer_path;
const archive = read(branch.archive.path);
assert.equal(hash(archive), branch.archive.sha256);
const original = gunzipSync(archive);
assert.equal(hash(original), branch.prior_raw_sha256);
function replaceOnce(text, before, after) {
  assert.equal(text.split(before).length, 2, 'missing or ambiguous finite delta');
  return text.replace(before, after);
}
const historical = Buffer.from(replaceOnce(original.toString(), branch.before_block, branch.after_block));
assert.deepEqual(historical, git(['show', subject.menu + ':' + producerPath]),
  'historical menu subject must be a real committed source, not a candidate-derived oracle');

// The original guard keeps its original subject. Current bytes receive a separate,
// stronger complete-source check below; no prior runtime receipt is reattributed.
const historicalRead = path => path === producerPath ? historical : read(path);
const previous = inspectHistoricalMenuViewportRequalification({root, readMember: historicalRead});
assert.equal(previous.viewport_uses, 8);
assert.equal(previous.unchanged_call_sites, 6);
const controls = [];
for (const [id, path, bytes] of [
  ['changed-input-identities', VIEWPORT_INPUTS, Buffer.from('different inputs')],
  ['changed-authenticated-prior-producer', branch.archive.path, Buffer.from('different archive')],
  ['changed-viewport-helper', 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts', Buffer.from('different helper')],
  ['changed-historical-viewport-assertion', producerPath, Buffer.from(historical.toString().replace('parsed.viewportShared === true', 'true'))],
  ['changed-original-runtime-receipt', 'compatibility/rc/legacy-viewport-public-source-diagnostic.json', Buffer.from('different receipt')],
]) {
  assert.notDeepEqual(bytes, historicalRead(path));
  assert.throws(() => inspectHistoricalMenuViewportRequalification({root,
    readMember: member => member === path ? bytes : historicalRead(member)}));
  controls.push({id, rejected: true});
}

const noDataDeltas = [
  ['<ng-template #manualNoDataTemplate matNoDataRow><div>Empty grid probe</div></ng-template>',
    '<ng-template #manualNoDataTemplate matNoDataRow><div><span class="cdk-cell">Empty grid probe</span></div></ng-template>'],
  ["    historical_member:manualNoDataRow._contentClassName==='mat-no-data-row'",
    "    historical_cell_classes:manualNoDataRow._cellClassNames.length===0\n      &&nodeNoDataRow._cellClassNames.length===0,\n    historical_member:manualNoDataRow._contentClassName==='mat-no-data-row'"],
  ['    rendered_legacy_row:false};', '    rendered_legacy_row:false,\n    rendered_legacy_cell:false};'],
  ["  const noDataRowOriginalConstructor=Object.values(noDataRowObservation).every(value=>value===true);",
    "  noDataRowObservation.rendered_legacy_cell=fixture.nativeElement.querySelector('#constructor-grid .mat-no-data-row .cdk-cell')?.className==='cdk-cell';\n  const noDataRowOriginalConstructor=Object.values(noDataRowObservation).every(value=>value===true);"],
];
let beforeProfile = historical.toString();
for (const [before, after] of noDataDeltas) beforeProfile = replaceOnce(beforeProfile, before, after);
assert.equal(beforeProfile, git(['show', subject.isolation + '^:' + producerPath]).toString(),
  'only exact table assertion additions follow the reviewed menu subject');
const npmImport = "import {npmToolingOptions} from './npm-tooling-options.mjs';\n";
const producerHeader = ' *   compatibility/pack-proof/aot-harness-smoke.json\n */\n';
let expectedProducer = replaceOnce(beforeProfile, producerHeader, producerHeader + npmImport);
const installBefore = "  const install = run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {\n    cwd: consumer,\n    timeout: 180000,\n    env: isolatedEnv(),\n  });";
const installAfter = "  const install = run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], npmToolingOptions({\n    cwd: consumer,\n    timeout: 180000,\n    env: isolatedEnv(),\n  }, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock']));";
expectedProducer = replaceOnce(expectedProducer, installBefore, installAfter);
const packPath = 'scripts/pack-library.mjs';
const priorPack = git(['show', subject.isolation + '^:' + packPath]);
assert.equal(hash(priorPack), subject.pack);
let expectedPack = replaceOnce(priorPack.toString(), "import {spawnSync} from 'node:child_process';",
  npmImport + "import {spawnSync} from 'node:child_process';");
expectedPack = replaceOnce(expectedPack, "    {cwd: root, encoding: 'utf8'},",
  "    npmToolingOptions({cwd: root, encoding: 'utf8'}, ['pack', packageDir, '--json', '--pack-destination', destination]),");
const oldRuntime = JSON.parse(read('compatibility/rc/legacy-viewport-public-source-diagnostic.json'));
const snapshot = JSON.parse(read('compatibility/rc/tool-advisory-triage/private-profile-source-manifests.json'));
const profile = snapshot.lines[line].source_files.find(row => row.path === 'scripts/npm-tooling-options.mjs');
assert.ok(profile);
const observer = JSON.parse(read('compatibility/rc/viewport-cva-producer-source-refresh.json')).unchanged_viewport_observation;
function inspectCurrent(readMember = read) {
  assert.equal(readMember(producerPath).toString(), expectedProducer, 'unreviewed packed producer delta');
  assert.equal(readMember(packPath).toString(), expectedPack, 'unreviewed library packer delta');
  assert.equal(hash(readMember(profile.path)), profile.sha256, 'private npm profile changed');
  const current = reviewLegacyViewportUses({root, readSource: path => readMember(path).toString()});
  assert.deepEqual(current, oldRuntime.source_review, 'viewport helper/callers changed');
  for (const text of [observer.source, observer.public_import, ...observer.collector_mappings]) {
    assert.equal(historical.toString().split(text).length, 2);
    assert.equal(expectedProducer.split(text).length, 2);
  }
  return current;
}
const current = inspectCurrent();
for (const [id, path, bytes] of [
  ['changed-current-viewport-assertion', producerPath, Buffer.from(expectedProducer.replace('parsed.viewportShared === true', 'true'))],
  ['omitted-no-data-cell-assertion', producerPath, Buffer.from(expectedProducer.replace("?.className==='cdk-cell'", '!==null'))],
  ['unrelated-runner-edit', producerPath, Buffer.from(expectedProducer + '\nthrow new Error("unreviewed");\n')],
  ['changed-pack-command', packPath, Buffer.from(expectedPack.replace("['pack', packageDir", "['publish', packageDir"))],
  ['changed-private-profile', profile.path, Buffer.from('different profile')],
  ['changed-current-viewport-helper', current.helper.path, Buffer.from('different helper')],
]) {
  assert.notDeepEqual(bytes, read(path));
  assert.throws(() => inspectCurrent(member => member === path ? bytes : read(member)));
  controls.push({id, rejected: true});
}
const report = {schema_version: 1, line, role: 'Current build/viewport source proof after exact table assertions and private npm isolation',
  node: process.version, historical_menu_commit: subject.menu, isolation_commit: subject.isolation,
  historical_menu_guard: previous, source_review: current,
  archive_sha256: hash(archive), original_producer_sha256: hash(original),
  historical_producer_sha256: hash(historical), pre_isolation_producer_sha256: hash(beforeProfile),
  current_producer_sha256: hash(read(producerPath)), prior_pack_sha256: hash(priorPack),
  current_pack_sha256: hash(read(packPath)), profile_sha256: profile.sha256,
  finite_no_data_assertion_changes: noDataDeltas.length, negative_controls: controls,
  previous_runtime_rerun: false, native_or_packed_qualified: false, g11_claim: 'not-passed',
  limits: 'Complete source identity and finite reviewed tooling/assertion deltas only. Existing tagged/public provider runtime receipts retain their original subjects. No install, build, canonical toolchain, actual packed/AOT/native product, full floors or upstream/security clearance.'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, uses: current.cases.length, unchanged_calls: current.calls.length,
  negative_controls: controls.length, previous_runtime_rerun: false, native_or_packed_qualified: false}));
