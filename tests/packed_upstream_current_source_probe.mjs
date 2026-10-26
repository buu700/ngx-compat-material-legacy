/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current overlay/focus admission must never inherit an old product reader. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  inspectPackedProductSourceRepairs, inspectSnackCurrentOverlayContracts,
  packedRepairTypeEvidenceRead, readSnackCurrentFocusInputs, snackDomRawCurrentRead, snackDomSourceContext,
} from '../scripts/snack-dom-source-context.mjs';
import {inspectChipFocusRepair, readChipFocusRepairPrior} from '../scripts/chip-focus-contract.mjs';
import {preparePackedUpstreamFocusMetadata, packedUpstreamFocusMetadataEpoch}
  from '../scripts/packed-upstream-source-requalification.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const append = path => Buffer.concat([read(path), Buffer.from('\n// unreviewed change\n')]);
const cases = [], rejected = [];
const registry = JSON.parse(read('compatibility/rc/snack-dom-source-context-product-inputs.json'));
const packed = inspectPackedProductSourceRepairs({root, read});
assert.equal(packed.product_changes, 4); assert.equal(packed.tooling_changes, 12);
assert.deepEqual(packed.targets, registry.packed_repairs.targets);
assert.equal(packed.current_coordinator_native_or_floor_qualified, false);
const overlay = inspectSnackCurrentOverlayContracts({root, read});
const bridge = overlay.prior_overlay_bridge;
assert.equal(overlay.current_raw_overlay_source_files, 145);
assert.equal(overlay.actual_applied_dialog_source_files, 49);
assert.equal(bridge.current_raw_source_members.length, 145);
for (const member of bridge.current_raw_source_members) assert.equal(member.sha256, hash(read(member.path)));
assert.equal(bridge.qualified_current_source_deltas.length, 9);
assert.equal(bridge.independently_qualified_type_preserving_repairs.length, 2);
assert.equal(bridge.affected_current_sources.length, 9);
assert.equal(overlay.affected_current_sources.length, 12);
assert.equal(bridge.all_affected_sources_in_one_fresh_semantic_program, false);
assert.equal(overlay.historical_type_evidence.historical_only, true);
assert.equal(overlay.historical_type_evidence.menu_source_files, 53);
assert.equal(overlay.historical_type_evidence.dialog_overlay_source_files, 51);
assert.equal(overlay.current_product_read_uses_historical_projection, false);
assert.equal(overlay.actual_native_packed_or_floor_qualified, false);
cases.push('145-current-overlay-sources-49-applied-dialog-sources-nine-qualified-deltas');

const historical = packedRepairTypeEvidenceRead({root, read});
for (const member of packed.targets) {
  assert.equal(hash(historical(member.path)), member.before_sha256);
  assert.equal(hash(snackDomRawCurrentRead({root, read: historical})(member.path)), member.sha256);
}
const fromHistorical = inspectSnackCurrentOverlayContracts({root, read: historical});
assert.deepEqual(fromHistorical.prior_overlay_bridge.current_raw_source_members, bridge.current_raw_source_members);
cases.push('historical-input-reader-unwrapped-before-current-overlay-qualification');

const chip = inspectChipFocusRepair({root, readMember: read});
assert.equal(chip.line, packed.line);
assert.equal(chip.source_sha256, hash(read(chip.source)));
assert.equal(chip.all_other_product_reference_fixture_members_preserved, 1607);
assert.equal(chip.required_consumer_HTML_CSS_SCSS_changes, 0);
assert.equal(chip.actual_native_packed_or_floor_qualified, false);
assert.equal(chip.g11_claim, 'not-passed');
cases.push('real-chip-focus-guard-preserves-product-reference-fixture-population');

const focus = readSnackCurrentFocusInputs({root, read});
const previousFocus = JSON.parse(read(registry.focus_inputs.path));
assert.equal(hash(read(registry.focus_inputs.path)), registry.focus_inputs.sha256);
const expected = structuredClone(previousFocus);
expected.current_raw_contract_source.sha256 = hash(read(expected.current_raw_contract_source.path));
assert.notEqual(expected.current_raw_contract_source.sha256, previousFocus.current_raw_contract_source.sha256);
assert.deepEqual(focus.data, expected);
assert.equal(focus.ref.path, 'compatibility/rc/packed-upstream-source-focus-inputs.json');
assert.equal(focus.ref.sha256, hash(read(focus.ref.path)));
assert.equal(focus.bytes.toString(), JSON.stringify(expected, null, 2) + '\n');
assert.equal(focus.data.source_before_reader_used_by_runtime_or_native_admission, false);
cases.push('real-focus-document-successor-changes-only-reviewed-inspector-reference');

const role = preparePackedUpstreamFocusMetadata({root, read});
assert.equal(role.writes.size, 2); assert.equal(role.source_judgments_changed, 0);
assert.equal(role.independent_code_bindings_refreshed, 1);
for (const [path, bytes] of role.writes) assert.equal(read(path).equals(bytes), true);
const roleEpoch = packedUpstreamFocusMetadataEpoch({root, read});
const frozenPath = 'compatibility/f10/authored-dependency-dispositions.json';
assert.equal(roleEpoch.read(frozenPath).equals(role.before), true);
assert.equal(hash(roleEpoch.read(role.inspector.ref.path)), role.inspector.profile.before_sha256);
for (const member of packed.targets) assert.equal(hash(roleEpoch.read(member.path)), member.sha256);
assert.equal(roleEpoch.raw, read);
cases.push('one-source-judgment-successor-is-applied-old-role-metadata-lane-keeps-product-raw');
const oldContext = snackDomSourceContext({root, read});
assert.equal(oldContext.line, packed.line); assert.equal(oldContext.members, 20);
assert.equal(oldContext.packed_repair_epoch_members, 16); assert.equal(oldContext.current_successors, 25);
for (const member of packed.targets) assert.equal(hash(oldContext.raw(member.path)), member.sha256);
cases.push('complete-existing-source-context-replays-after-current-qualification');

function rejects(id, reader, inspect = inspectSnackCurrentOverlayContracts) {
  assert.throws(() => inspect({root, read: reader}), undefined, id); rejected.push(id);
}
for (const member of packed.targets) {
  rejects('mixed-before-product/' + member.path, path => path === member.path ? historical(path) : read(path));
}
const packedPaths = new Set(packed.targets.map(m => m.path));
rejects('all-four-packed-product-before-images', path => packedPaths.has(path) ? historical(path) : read(path));
const style = 'projects/ngx-material-legacy/styles/button/_button-theme.scss';
rejects('unrelated-product-style', path => path === style ? append(path) : read(path));
const roleCode = 'scripts/authored-additional-use-baseline.mjs';
rejects('unreviewed-retired-role-tooling', path => path === roleCode ? append(path) : read(path));
const profilePath = 'compatibility/rc/packed-upstream-source-inspector-inputs.json';
const profile = JSON.parse(read(profilePath));
assert.equal(profile.edits.length, 6);
assert.equal(profile.path, expected.current_raw_contract_source.path);
assert.equal(profile.sha256, expected.current_raw_contract_source.sha256);
const forge = structuredClone(profile);
forge.edits[0].after += '\n// unrelated accepted edit\n';
rejects('forged-inspector-edit-profile', path => path === profilePath ? Buffer.from(JSON.stringify(forge, null, 2) + '\n') : read(path), readFocus);
const wrongLine = {...profile, line: packed.line === 'main' ? '21.x' : 'main'};
rejects('wrong-line-inspector-profile', path => path === profilePath ? Buffer.from(JSON.stringify(wrongLine, null, 2) + '\n') : read(path), readFocus);
rejects('unreviewed-current-inspector', path => path === profile.path ? append(path) : read(path), readFocus);
const alteredFocus = structuredClone(focus.data);
alteredFocus.actual_native_packed_or_floor_qualified = true;
rejects('focus-successor-claims-native-qualification', path => path === focus.ref.path ? Buffer.from(JSON.stringify(alteredFocus, null, 2) + '\n') : read(path), readFocus);
const alteredMembers = structuredClone(focus.data);
alteredMembers.current_members.pop();
rejects('focus-successor-omits-source-member', path => path === focus.ref.path ? Buffer.from(JSON.stringify(alteredMembers, null, 2) + '\n') : read(path), readFocus);
rejects('changed-original-focus-input', path => path === registry.focus_inputs.path ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path), readFocus);
const prior = readChipFocusRepairPrior({root, readMember: read});
for (const prefix of ['reference/', 'fixtures/']) {
  const member = prior.product_members.find(m => m.path.startsWith(prefix)); assert.ok(member);
  assert.throws(() => inspectChipFocusRepair({root, readMember: path => path === member.path ? append(path) : read(path)}));
  rejected.push('unrelated-' + prefix.slice(0, -1) + '-member');
}
const focusSpec = prior.product_members.find(m => m.path.endsWith('/chip.spec.ts')); assert.ok(focusSpec);
assert.throws(() => inspectChipFocusRepair({root, readMember: path => path === focusSpec.path ? append(path) : read(path)}));
rejected.push('unrelated-chip-spec');
assert.throws(() => inspectSnackCurrentOverlayContracts({root: root + '/wrong-context', read: historical}));
rejected.push('historical-reader-root-mismatch');

// Change a qualified product only when the historical overlay capture is read;
// the subsequent current graph must still observe and reject the late bytes.
const lateMember = packed.targets.find(m => m.path.endsWith('/menu-base.ts'));
let late = false;
rejects('late-menu-source-after-initial-qualification', path => {
  if (path === bridge.prior_capture.path) late = true;
  return late && path === lateMember.path ? append(path) : read(path);
});
assert.equal(late, true);

assert.throws(() => packedUpstreamFocusMetadataEpoch({root,
  read: path => path === frozenPath ? role.before : read(path)}));
rejected.push('old-frozen-ledger-before-successor-applied');
const roleReview = [...role.writes.keys()].find(path => path !== frozenPath);
assert.throws(() => packedUpstreamFocusMetadataEpoch({root,
  read: path => path === roleReview ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path)}));
rejected.push('changed-current-one-use-review');
const unrelatedLedger = JSON.parse(read(frozenPath));
unrelatedLedger.symbol_uses.find(row => row.file !== 'legacy-chips/chip.ts').status = 'unreviewed';
assert.throws(() => packedUpstreamFocusMetadataEpoch({root,
  read: path => path === frozenPath ? Buffer.from(JSON.stringify(unrelatedLedger, null, 2) + '\n') : read(path)}));
rejected.push('unrelated-frozen-row-change');
const alteredJudgment = JSON.parse(read(roleReview)); alteredJudgment.reviews[0].decision += ' Changed judgment.';
assert.throws(() => packedUpstreamFocusMetadataEpoch({root,
  read: path => path === roleReview ? Buffer.from(JSON.stringify(alteredJudgment, null, 2) + '\n') : read(path)}));
rejected.push('changed-source-judgment');
let metadataLate = false;
const lateRole = packedUpstreamFocusMetadataEpoch({root,
  read: path => metadataLate && path === frozenPath ? role.before : read(path)});
metadataLate = true; assert.throws(() => lateRole.read(frozenPath));
rejected.push('late-frozen-ledger-reversion');
metadataLate = false;
const lateCode = packedUpstreamFocusMetadataEpoch({root,
  read: path => metadataLate && path === role.inspector.ref.path ? role.inspector.before : read(path)});
metadataLate = true; assert.throws(() => lateCode.read(role.inspector.ref.path));
rejected.push('late-inspector-reversion');
let inputsLate = false;
const lateInputs = packedUpstreamFocusMetadataEpoch({root,
  read: path => inputsLate && path === profilePath ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path)});
inputsLate = true; assert.throws(() => lateInputs.read(frozenPath));
rejected.push('late-metadata-input-change');
let codeLate = false;
const changedCode = append(profile.path);
const publicReference = packedUpstreamFocusMetadataEpoch({root,
  read: path => codeLate && path === profile.path ? changedCode : read(path)});
publicReference.inspector.sha256 = hash(changedCode);
codeLate = true; assert.throws(() => publicReference.read(profile.path));
rejected.push('public-reference-cannot-change-private-code-expectation');

function readFocus({root, read}) { return readSnackCurrentFocusInputs({root, read}); }
console.log(JSON.stringify({line: packed.line, result: 'pass', cases, rejected,
  current_overlay_sources: 145, applied_dialog_sources: 49, qualified_product_repairs: 4,
  current_overlay_deltas: 9, historical_menu_type_sources: 53, historical_dialog_type_sources: 51,
  source_owner_sha256: hash(read('scripts/snack-dom-source-context.mjs')),
  inspector_sha256: hash(read(profile.path)), producer_sha256: hash(read('tests/packed_upstream_current_source_probe.mjs')),
  no_product_resource_or_original_receipt_bytes_written: true,
  current_native_or_floor_or_g11_credit: false}));
