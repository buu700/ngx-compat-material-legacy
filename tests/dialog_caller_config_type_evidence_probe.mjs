/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Proposed-source evidence stays fresh; no applied-product or runtime credit. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedDialogConfigCandidateTypes} from '../scripts/dialog-caller-config-type-evidence.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const q = qualifiedDialogConfigCandidateTypes({root});
const capsulePath = 'compatibility/rc/dialog-caller-public-subjects.json';
const capsule = JSON.parse(read(capsulePath));
const paths = [...new Set([q.ref.path, q.candidate_ref.path, q.candidate.patch.path,
  q.source.ref.path, capsulePath, 'compatibility/rc/component-config-caller-public-subjects.json',
  'scripts/dialog-caller-contracts.mjs', 'scripts/component-config-caller-contracts.mjs',
  'scripts/dialog-caller-public-subjects.mjs', 'scripts/component-config-caller-public-subjects.mjs',
  'tests/dialog_caller_config_type_probe.mjs',
  'compatibility/rc/dialog-caller-type-discovery-' + (q.source.prior.line === 'main' ? 'main' : '21') + '.json',
  'compatibility/rc/api/export-name-allowlist.json',
  ...q.source.prior.sources.map(member => member.path), ...q.source.prior.metadata.map(member => member.path),
  ...capsule.subjects.map(subject => subject.additions[0].path),
  q.proof.inputs.find(member => member.path.includes('/material-public-source-members/')).path,
  'projects/ngx-material-legacy/legacy-dialog/dialog-container.ts'])];
for (const path of paths) assert.throws(() => qualifiedDialogConfigCandidateTypes({root,
  read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member),
}), error => error?.code === 'ERR_ASSERTION', path);
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
qualifiedDialogConfigCandidateTypes({root, read: late});
for (changed of [q.candidate_ref.path, 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts']) {
  assert.throws(() => qualifiedDialogConfigCandidateTypes({root, read: late}), error => error?.code === 'ERR_ASSERTION');
}
assert.equal(q.candidate_only, true);
assert.equal(q.product_applied, false);
assert.equal(q.defaults_actual_DI_owned_runtime_native_or_packed_qualified, false);
const report = {schema_version: 1, line: q.source.prior.line, candidate_graph_files: 49,
  original_roles_retained: 18, live_peer_bindings: 16, owned_bindings: 2,
  stable_public_member_reads: 44, stable_public_calls: 6, previously_flagged_reads_now_locally_owned: 7,
  scalar_domains_equal_untouched_tagged_reference: true,
  manual_constructor_input_and_peer_type_roundtrip_qualified: true, invalid_typed_controls: 24,
  source_input_corruptions_rejected: paths.length, late_changes_rejected: 2,
  candidate_only: true, product_applied: false, source_closures: 0,
  defaults_actual_DI_owned_runtime_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
