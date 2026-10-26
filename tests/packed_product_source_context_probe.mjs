/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current packed repairs must never become a historical-byte runtime waiver. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import * as contextApi from '../scripts/snack-dom-source-context.mjs';
import {
  PACKED_REPAIR_PRODUCT_PATHS,
  PACKED_REPAIR_TOOL_PATHS,
  qualifyPackedProductSourceRepairs,
} from '../scripts/packed-product-source-recovery.mjs';

const started = performance.now();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const disk = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const registry = JSON.parse(disk(contextApi.SNACK_PRODUCT_INPUTS));
const inputs = JSON.parse(disk(contextApi.SNACK_SOURCE_CONTEXT_INPUTS));
const history = JSON.parse(gunzipSync(disk(inputs.history_product.path)));
const data = registry.packed_repairs;
const overrides = new Map();
const read = path => overrides.has(path) ? Buffer.from(overrides.get(path)) : disk(path);
const options = {root, read, line: registry.line, data, history, registry};
const qualified = qualifyPackedProductSourceRepairs(options);
const paths = [...PACKED_REPAIR_PRODUCT_PATHS, ...PACKED_REPAIR_TOOL_PATHS];
assert.equal(new Set(paths).size, 16);
const inspection = contextApi.inspectPackedProductSourceRepairs({root, read});
assert.equal(inspection.product_changes, 4);
assert.equal(inspection.tooling_changes, 12);
assert.equal(inspection.source_scope_only, true);
assert.equal(inspection.current_coordinator_native_or_floor_qualified, false);

const controls = [];
function rejects(label, action) {
  assert.throws(action, error => error?.code === 'ERR_ASSERTION', label);
  controls.push(label);
}
function withBytes(path, bytes, action) {
  assert.equal(overrides.has(path), false);
  overrides.set(path, bytes);
  try { return action(); } finally { overrides.delete(path); }
}
function altered(path) {
  const bytes = disk(path);
  if (path.endsWith('.gz')) {
    const changed = Buffer.from(bytes);
    changed[changed.length - 1] ^= 1;
    return changed;
  }
  return Buffer.concat([bytes, Buffer.from('\n')]);
}

for (const path of paths) {
  const before = qualified.preimages.get(path);
  assert.notEqual(hash(before), hash(disk(path)), path);
  assert.equal(hash(qualified.read(path)), hash(before), path);
  // Returning a copied old buffer must not expose mutable shared preimages.
  const copy = qualified.read(path);
  copy.fill(0);
  assert.equal(hash(qualified.read(path)), hash(before), path);
  withBytes(path, altered(path), () => rejects('changed current: ' + path,
    () => contextApi.inspectPackedProductSourceRepairs({root, read})));
  withBytes(path, before, () => rejects('old bytes substituted as current: ' + path,
    () => contextApi.inspectPackedProductSourceRepairs({root, read})));
  withBytes(path, altered(path), () => rejects('late projected read: ' + path,
    () => qualified.read(path)));
}

const proof = JSON.parse(disk(data.qualification.path));
const subject = proof.subjects.find(item => item.line === registry.line);
const evidencePaths = [...new Set([
  data.qualification.path,
  ...Object.values(subject.reports).map(ref => ref.path),
  ...proof.lifecycle_regression_evidence.map(ref => ref.path),
  contextApi.SNACK_PRODUCT_INPUTS,
  contextApi.SNACK_SOURCE_CONTEXT_INPUTS,
  inputs.history_product.path,
  data.members[0].path,
])];
for (const path of evidencePaths) {
  withBytes(path, altered(path), () => rejects('changed evidence/input: ' + path,
    () => contextApi.inspectPackedProductSourceRepairs({root, read})));
}

rejects('wrong line', () => qualifyPackedProductSourceRepairs({...options,
  line: registry.line === 'main' ? '21.x' : 'main'}));
for (const [label, change] of [
  ['missing product', value => value.targets.pop()],
  ['added product', value => value.targets.push({...value.targets[0], path: 'other.ts'})],
  ['changed tooling order', value => value.tooling.reverse()],
  ['changed preimage', value => value.targets[0].before_sha256 = '0'.repeat(64)],
]) {
  const changed = structuredClone(data);
  change(changed);
  rejects(label, () => qualifyPackedProductSourceRepairs({...options, data: changed}));
}
// Updating a candidate hash cannot authenticate rewritten committed evidence.
const changedProof = Buffer.concat([disk(data.qualification.path), Buffer.from('\n')]);
const changedData = structuredClone(data);
changedData.qualification.sha256 = hash(changedProof);
withBytes(data.qualification.path, changedProof, () => rejects('rewritten proof with matching hash',
  () => qualifyPackedProductSourceRepairs({...options, data: changedData})));

for (const path of [
  'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.scss',
  'projects/ngx-material-legacy/legacy-tabs/tab-body.ts',
]) {
  assert.equal(paths.includes(path), false);
  withBytes(path, altered(path), () => rejects('unrelated raw product: ' + path,
    () => contextApi.snackDomSourceContext({root, read})));
}

function assertRawBoundary(api, context) {
  const current = api.snackDomRawCurrentRead({root, read: context.read});
  assert.equal(current, read, 'branded historical reader must unwrap to actual current reader');
  assert.equal(context.raw, read, 'public raw reader must be actual current reader');
  for (const path of paths) {
    assert.equal(hash(context.raw(path)), hash(disk(path)), path);
    assert.equal(hash(current(path)), hash(disk(path)), path);
    assert.notEqual(hash(context.read(path)), hash(disk(path)), 'historical epoch: ' + path);
  }
}
const context = contextApi.snackDomSourceContext({root, read});
assert.equal(context.line, registry.line);
assert.equal(context.members, 20);
assert.equal(context.packed_repair_epoch_members, 16);
assertRawBoundary(contextApi, context);
for (const path of paths) {
  withBytes(path, altered(path), () => rejects('late full context: ' + path,
    () => context.read(path)));
}
for (const path of [
  'compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json',
  'compatibility/f10/authored-use-reviews/packed-cva-current-source-boundaries.json',
  'compatibility/rc/packed-cva-current-public-roles.json',
  'compatibility/rc/packed-cva-current-source-requalification-proof.json',
  'scripts/authored-additional-use-baseline.mjs',
]) {
  withBytes(path, altered(path), () => rejects('late integrated role metadata: ' + path,
    () => context.read(path)));
}

async function verifierMutant(path, before, after) {
  const source = disk(path).toString();
  assert.equal(source.split(before).length, 2, 'one exact verifier mutation');
  const changed = source.replace(before, after).replace(
    /^(\s*import[^\n]*?\bfrom\s+)(['"])(\.\.?\/[^'"]+)\2/gm,
    (_, prefix, quote, specifier) => prefix + quote + pathToFileURL(resolve(root, dirname(path), specifier)).href + quote,
  );
  const labelled = changed + '\n//# sourceURL=packed-verifier-mutant-' + path.split('/').at(-1) + '\n';
  return import('data:text/javascript;base64,' + Buffer.from(labelled).toString('base64'));
}
const withoutLateCheck = await verifierMutant('scripts/packed-product-source-recovery.mjs',
  'const priorRead=path=>{assertCurrent(path);', 'const priorRead=path=>{');
const lateMutant = withoutLateCheck.qualifyPackedProductSourceRepairs(options);
withBytes(paths[0], altered(paths[0]), () => assert.throws(
  () => assert.throws(() => lateMutant.read(paths[0])),
  /Missing expected exception/, 'late-read test must kill a verifier that omits the current-file check',
));

const withHistoricalRaw = await verifierMutant('scripts/snack-dom-source-context.mjs',
  'branded.set(reader,{root,raw:rawCurrent});return {read:reader,raw:rawCurrent',
  'branded.set(reader,{root,raw:read});return {read:reader,raw:read');
const rawMutant = withHistoricalRaw.snackDomSourceContext({root, read});
assert.throws(() => assertRawBoundary(withHistoricalRaw, rawMutant),
  error => error?.code === 'ERR_ASSERTION', 'raw-boundary test must kill historical-byte substitution');

const report = {
  schema_version: 1,
  line: registry.line,
  passed: true,
  product_changes: 4,
  tooling_changes: 12,
  full_context_local_members: context.members,
  packed_repair_epoch_members: context.packed_repair_epoch_members,
  controls,
  negative_controls: controls.length,
  verifier_mutants_rejected: ['omit late current-file check', 'brand historical reader as current'],
  immutable_product_members: history.product_members.length,
  true_raw_reader_preserved: true,
  source_scope_only: true,
  canonical_source_use_closures: 0,
  current_coordinator_native_or_floor_qualified: false,
  g11_claim: 'not-passed',
  tested_packed_source: qualified.source,
  tested_packed_artifact: qualified.artifact,
  source_members: [
    'scripts/packed-product-source-recovery.mjs',
    'scripts/snack-dom-source-context.mjs',
    contextApi.SNACK_PRODUCT_INPUTS,
    contextApi.SNACK_SOURCE_CONTEXT_INPUTS,
    'tests/packed_product_source_context_probe.mjs',
    'tests/test_packed_product_source_context.py',
    'scripts/packed-cva-source-requalification.mjs',
    'compatibility/rc/packed-cva-source-review-inputs.json',
    'scripts/authored-additional-use-baseline.mjs',
    'compatibility/rc/packed-cva-current-public-roles.json',
    'compatibility/rc/packed-cva-current-source-requalification-proof.json',
    'compatibility/f10/authored-use-reviews/packed-cva-current-source-boundaries.json',
    'compatibility/f10/authored-dependency-dispositions.json',
    'compatibility/f10/authored-dependency-current-dispositions.json',
  ].map(path => ({path, sha256: hash(disk(path)), bytes: disk(path).length})),
  seconds: (performance.now() - started) / 1000,
};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, controls: undefined, source_members: undefined}));
