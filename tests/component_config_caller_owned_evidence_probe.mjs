/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independent owned-input guards; no canonical, generated or native qualification. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedComponentConfigOwned} from '../scripts/component-config-caller-owned-evidence.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path)), q = qualifiedComponentConfigOwned({root});
const paths = [...new Set([q.ref.path, q.publicBoundary.ref.path, q.publicBoundary.types.ref.path,
  'compatibility/rc/component-config-caller-prior.json.gz', 'compatibility/rc/component-config-caller-public-subjects.json',
  'scripts/component-config-caller-contracts.mjs', 'scripts/component-config-caller-public-subjects.mjs',
  'scripts/component-config-caller-type-evidence.mjs', 'scripts/component-config-caller-public-runtime-evidence.mjs',
  'tests/component_config_caller_owned_subjects.mjs', 'tests/component_config_caller_owned_runtime_subject.mjs',
  'tests/component_config_caller_owned_runtime_probe.mjs', 'tests/component_config_caller_constructor_cases.mjs',
  'tests/component_config_caller_tagged_runtime_subject.mjs',
  ...q.proof.source_faults.map(fault => fault.path),
  'projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts',
  'projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.ts'])];
for (const path of paths) assert.throws(() => qualifiedComponentConfigOwned({root,
  read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member),
}), error => error?.code === 'ERR_ASSERTION', path);
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
qualifiedComponentConfigOwned({root, read: late});
for (changed of [q.ref.path, 'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-config.ts']) {
  assert.throws(() => qualifiedComponentConfigOwned({root, read: late}), error => error?.code === 'ERR_ASSERTION');
}
const report = {line: q.source.prior.line, actual_current_source_files: 200, contexts: 4, cases: 46,
  actual_source_faults_rejected: 10, source_input_corruptions_rejected: paths.length,
  late_changes_rejected: 2, source_closures: 0,
  generated_Angular_factory_template_or_query_execution: false,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
