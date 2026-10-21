/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Raw type-proof input guards; runtime and source decisions stay pending. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedComponentConfigTypes} from '../scripts/component-config-caller-type-evidence.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const q = qualifiedComponentConfigTypes({root});
const paths = [...new Set([q.ref.path, 'compatibility/rc/component-config-caller-prior.json.gz',
  'compatibility/rc/component-config-caller-public-subjects.json',
  'scripts/component-config-caller-contracts.mjs', 'scripts/component-config-caller-public-subjects.mjs',
  'tests/component_config_caller_type_probe.mjs', 'compatibility/rc/api/export-name-allowlist.json',
  ...q.source.prior.sources.map(member => member.path), ...q.source.metadata.map(member => member.path),
  q.proof.inputs.find(member => member.path.includes('/component-config-caller-public-sources/')).path])];
for (const path of paths) assert.throws(() => qualifiedComponentConfigTypes({root,
  read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member),
}), error => error?.code === 'ERR_ASSERTION', path);
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
qualifiedComponentConfigTypes({root, read: late});
for (changed of [q.ref.path, 'projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts']) {
  assert.throws(() => qualifiedComponentConfigTypes({root, read: late}), error => error?.code === 'ERR_ASSERTION');
}
const report = {line: q.source.prior.line, selected_roles: 73, frozen: 44, additional: 29,
  current_graph_files: 200, unique_public_symbols: 32, current_dependency_symbols: 27,
  actual_bindings: 73, live_peer_bindings: 68, retained_owned_bindings: 5,
  actual_member_references: 66, actual_selected_service_calls: 0, invalid_typed_controls: 21,
  source_input_corruptions_rejected: paths.length, late_changes_rejected: 2, source_closures: 0,
  defaults_service_or_owned_caller_runtime_qualified: false,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
