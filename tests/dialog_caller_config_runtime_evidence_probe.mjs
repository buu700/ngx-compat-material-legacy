/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Fresh immutable runtime inputs; no applied-product, rendered-view or release pass. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedDialogConfigCandidateRuntime} from '../scripts/dialog-caller-config-runtime-evidence.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const q = qualifiedDialogConfigCandidateRuntime({root});
const sdk = JSON.parse(read('compatibility/rc/dialog-caller-public-subjects.json'));
const paths = [...new Set([q.ref.path, q.types.ref.path, q.types.candidate_ref.path, q.candidate.patch.path,
  q.source.ref.path, 'compatibility/rc/dialog-caller-public-subjects.json',
  'scripts/dialog-caller-config-type-evidence.mjs',
  ...['sources', 'subject', 'probe'].map(name => 'tests/dialog_caller_config_runtime_' + name + '.mjs'),
  'tests/dialog_caller_config_tagged_subject.mjs', 'tests/a11y_caller_node_protocol.mjs',
  'scripts/api-public-node-context.mjs', 'tests/dialog_caller_config_type_probe.mjs',
  'scripts/dialog-caller-contracts.mjs', 'scripts/dialog-caller-public-subjects.mjs',
  ...q.source.prior.sources.map(member => member.path),
  'projects/ngx-material-legacy/legacy-dialog/dialog-container.ts',
  ...q.source.prior.metadata.map(member => member.path),
  ...sdk.subjects.map(subject => subject.additions[0].path)])];
for (const path of paths) assert.throws(() => qualifiedDialogConfigCandidateRuntime({root,
  read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member),
}), error => error?.code === 'ERR_ASSERTION', path);
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
qualifiedDialogConfigCandidateRuntime({root, read: late});
for (changed of [q.ref.path, q.types.candidate_ref.path]) {
  assert.throws(() => qualifiedDialogConfigCandidateRuntime({root, read: late}), error => error?.code === 'ERR_ASSERTION');
}
assert.equal(q.product_applied, false);
assert.equal(q.candidate_only, true);
const report = {schema_version: 1, line: q.source.prior.line, contexts: 4, cases: 54,
  semantically_emitted_owned_sources_per_side: 49, source_faults_rejected: 3,
  public_injector_JIT_constructor_identity_qualified: true,
  historical_tagged_focus_aria_width_and_duration_defaults_matched: true,
  before_candidate_full_config_descriptors_focus_lifecycle_and_duration_results_equal: true,
  tagged_differences_retained: q.proof.tagged_differences_retained.length,
  read_only_input_corruptions_rejected: paths.length, late_changes_rejected: 2,
  candidate_only: true, product_applied: false, source_closures: 0,
  actual_native_leaf_Component_factory_template_query_packed_AOT_or_full_floor_qualified: false,
  g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
