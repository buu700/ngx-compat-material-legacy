/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One historical metadata lane; raw product and applied-dialog checks stay live. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectDialogOwnedContracts} from '../scripts/dialog-caller-owned-contract-boundary.mjs';
import {inspectSnackCurrentDialogContracts, packedRepairTypeEvidenceRead, snackDomRawCurrentRead} from '../scripts/snack-dom-source-context.mjs';
import {qualifiedMenuContentTypeBoundary} from '../scripts/menu-panel-content-boundary.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), read = path => readFileSync(join(root, path));
const allowance = 'compatibility/rc/api/export-name-allowlist.json';
const product = JSON.parse(read('compatibility/rc/snack-dom-source-context-product-inputs.json'));
const subject = product.packed_repairs, line = product.line, cases = [], rejected = [];
const beforeAllowance = subject.tooling.find(m => m.path === allowance).before_sha256;
assert.notEqual(hash(read(allowance)), beforeAllowance);
assert.throws(() => inspectDialogOwnedContracts({root, read, requireApplied: true}), error => error.message.includes(allowance));
cases.push('actual-prior-validator-reproduces-metadata-mismatch');
const current = inspectSnackCurrentDialogContracts({root, read}), historical = packedRepairTypeEvidenceRead({root, read});
assert.equal(current.line, line); assert.equal(current.raw_product_applied, true);
assert.equal(current.proposed_sources.size, 49);
for (const [path, text] of current.proposed_sources) assert.equal(hash(text), hash(read(path)), 'projected product in current dialog graph');
cases.push('actual-current-dialog-49-source-graph-remains-raw');
const fromHistorical = inspectSnackCurrentDialogContracts({root, read: historical});
assert.equal(fromHistorical.raw_product_applied, true);
assert.deepEqual([...fromHistorical.proposed_sources], [...current.proposed_sources]);
cases.push('historical-reader-is-unwrapped-before-raw-dialog-qualification');
const menuType = qualifiedMenuContentTypeBoundary({line, readMember: historical});
assert.equal(hash(read(menuType.delta.path)), menuType.delta.sha256);
assert.equal(menuType.body.current_source_files.length, 53);
assert.equal(menuType.body.full_runtime_native_packed_AOT_or_floor_qualified, false);
const menuConstructor = subject.targets.find(m => m.path.endsWith('/menu-base.ts'));
assert.equal(hash(read(menuConstructor.path)), menuConstructor.sha256);
assert.equal(hash(historical(menuConstructor.path)), menuConstructor.before_sha256);
cases.push('frozen-53-source-menu-type-proof-is-separate-from-current-constructor-source');

// Exercise the shipped function body with a collecting validator. The normal
// validator above already ran; this observes exactly which bytes are forwarded.
const sourcePath = 'scripts/snack-dom-source-context.mjs', text = read(sourcePath).toString();
const source = ts.createSourceFile(sourcePath, text, ts.ScriptTarget.Latest, true);
const named = source.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'inspectSnackCurrentDialogContracts');
assert.equal(named.length, 1);
const body = named[0].getText(source).replace(/^export /, '');
const probes = [...subject.targets.map(m => m.path), ...subject.tooling.map(m => m.path),
  'scripts/authored-additional-use-baseline.mjs', ...current.targets.map(m => m.path)];
let forwarded = 0;
function collect({read: evidence, requireApplied, root: actualRoot}) {
  assert.equal(actualRoot, root); assert.equal(requireApplied, true);
  for (const path of probes) {
    assert.equal(hash(evidence(path)), path === allowance ? beforeAllowance : hash(read(path)), 'wrong projection ' + path);
    forwarded++;
  }
  return {observed: true};
}
function load(code, validator = collect) {
  return new Function('currentRaw', 'packedRepairTypeEvidenceRead', 'inspectDialogOwnedContracts', code + '; return inspectSnackCurrentDialogContracts;')(
    (root, reader) => snackDomRawCurrentRead({root, read: reader}), packedRepairTypeEvidenceRead, validator);
}
assert.equal(load(body)({root, read}).observed, true);
assert.equal(load(body)({root, read: historical}).observed, true);
const positiveForwarded = forwarded;
cases.push('only-one-metadata-path-projected-all-product-and-other-tooling-forwarded-current');
const mutations = [
  ['project-product-preimages', body.replace('path===allowance', "(path===allowance||path.startsWith('projects/'))")],
  ['project-other-tooling-preimages', body.replace('path===allowance', "(path===allowance||path.startsWith('scripts/'))")],
  ['omit-type-metadata-replay', body.replace('path===allowance', 'false')],
  ['accept-applied-false', body.replace('requireApplied:true', 'requireApplied:false')],
  ['retain-historical-product-reader', body.replace('read=currentRaw(root,read);', 'read=read;')],
];
for (const [id, mutation] of mutations) {
  assert.notEqual(mutation, body); assert.throws(() => load(mutation)({root, read: historical}), undefined, id); rejected.push(id);
}
const corruptions = [
  ['unrelated-style', path => path === 'projects/ngx-material-legacy/styles/button/_button-theme.scss' ? Buffer.concat([read(path), Buffer.from('\n// unrelated change\n')]) : read(path)],
  ['unqualified-api-allowance', path => path === allowance ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path)],
  ['unqualified-dialog-source', path => path === current.targets[0].path ? Buffer.concat([read(path), Buffer.from('\n// unrelated change\n')]) : read(path)],
  ['changed-original-proof', path => path === product.owned_contracts.qualification.path ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path)],
];
for (const [id, corrupt] of corruptions) {assert.throws(() => inspectSnackCurrentDialogContracts({root, read: corrupt}), undefined, id); rejected.push(id);}
const proposalPath = 'compatibility/rc/dialog-caller-owned-contract-candidate.json';
let late = false;
const lateAllowance = path => {
  if (path === proposalPath) late = true;
  return late && path === allowance ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path);
};
assert.throws(() => inspectSnackCurrentDialogContracts({root, read: lateAllowance}), error => error.message.includes('late current packed repair mutation') && error.message.includes(allowance));
assert.equal(late, true); rejected.push('late-api-change-after-packed-qualification');
const proposal = JSON.parse(read(proposalPath)), preimages = new Map(proposal.members.map(m => [m.path, Buffer.from(m.before.text)]));
late = false;
const lateBefore = path => {
  if (path === proposalPath) late = true;
  return late && preimages.has(path) ? preimages.get(path) : read(path);
};
assert.throws(() => inspectSnackCurrentDialogContracts({root, read: lateBefore}), /dialog contract repair not applied/);
assert.equal(late, true); rejected.push('late-complete-dialog-before-frame');
assert.throws(() => inspectSnackCurrentDialogContracts({root: root + '/wrong-context', read: historical}));
rejected.push('historical-reader-root-mismatch');
console.log(JSON.stringify({line, result: 'pass', cases, forwarded_path_observations: forwarded,
  positive_forwarded_path_observations: positiveForwarded,
  rejected, current_applied_dialog_sources: 49, historical_metadata_paths: [allowance],
  source_owner_sha256: hash(read(sourcePath)), producer_sha256: hash(read('tests/packed_dialog_type_metadata_probe.mjs')),
  no_product_resource_or_original_receipt_bytes_written: true, current_native_or_floor_or_g11_credit: false}));
