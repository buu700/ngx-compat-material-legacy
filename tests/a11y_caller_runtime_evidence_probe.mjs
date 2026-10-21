/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Runtime receipts fail closed after any selected raw-input or late change. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedA11yCallerRuntime} from '../scripts/a11y-caller-runtime-evidence.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const qualified = qualifiedA11yCallerRuntime({root});
const paths = [...new Set([
  qualified.ref.path, qualified.types.ref.path,
  'compatibility/rc/a11y-caller-prior.json.gz',
  'compatibility/rc/a11y-caller-public-subjects.json',
  'scripts/a11y-caller-contracts.mjs', 'scripts/a11y-caller-public-subjects.mjs',
  'scripts/tabs-caller-public-subjects.mjs', 'scripts/api-public-node-context.mjs',
  'tests/a11y_caller_node_protocol.mjs', 'tests/a11y_caller_runtime_subject.mjs',
  'tests/a11y_caller_runtime_probe.mjs',
  ...qualified.source.prior.sources.map(member => member.path),
  qualified.proof.inputs.find(member => member.path.endsWith('.gz') &&
    member.path.includes('/material-public-source-members/')).path,
])];
for (const path of paths) {
  assert.throws(() => qualifiedA11yCallerRuntime({root,
    read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member),
  }), error => error?.code === 'ERR_ASSERTION', path);
}
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
qualifiedA11yCallerRuntime({root, read: late});
for (changed of [qualified.ref.path, 'tests/a11y_caller_runtime_subject.mjs']) {
  assert.throws(() => qualifiedA11yCallerRuntime({root, read: late}),
    error => error?.code === 'ERR_ASSERTION', 'late runtime change ' + changed);
}
const report = {line: qualified.source.prior.line, contexts: 6, cases: qualified.cases,
  owned_source_faults: 6, source_input_corruptions_rejected: paths.length,
  late_changes_rejected: 2, source_closures: 0,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
