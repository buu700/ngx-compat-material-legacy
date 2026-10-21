/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public runtime receipts cannot hide upstream differences or changed current inputs. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedComponentConfigPublicRuntime} from '../scripts/component-config-caller-public-runtime-evidence.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const q = qualifiedComponentConfigPublicRuntime({root});
const paths = [q.ref.path, q.types.ref.path, 'compatibility/rc/component-config-caller-prior.json.gz',
  'compatibility/rc/component-config-caller-public-subjects.json',
  'scripts/component-config-caller-contracts.mjs', 'scripts/component-config-caller-public-subjects.mjs',
  'scripts/component-config-caller-type-evidence.mjs', 'tests/component_config_caller_public_runtime_probe.mjs',
  'tests/component_config_caller_public_runtime_subject.mjs', 'tests/a11y_caller_node_protocol.mjs',
  'scripts/api-public-node-context.mjs', 'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-config.ts',
  'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-module.ts',
  'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',
  'projects/ngx-material-legacy/legacy-paginator/internal/paginator-base.ts',
  q.proof.inputs.find(member => member.path.includes('/component-config-caller-public-sources/')).path];
for (const path of paths) assert.throws(() => qualifiedComponentConfigPublicRuntime({root,
  read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member),
}), error => error?.code === 'ERR_ASSERTION', path);
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
qualifiedComponentConfigPublicRuntime({root, read: late});
for (changed of [q.ref.path, 'tests/component_config_caller_public_runtime_subject.mjs']) {
  assert.throws(() => qualifiedComponentConfigPublicRuntime({root, read: late}), error => error?.code === 'ERR_ASSERTION');
}
const report = {line: q.source.prior.line, contexts: 6, cases: 210,
  public_default_difference_records_retained: q.differences.length,
  source_input_corruptions_rejected: paths.length, late_changes_rejected: 2, source_closures: 0,
  actual_owned_callers_executed: false, actual_native_packed_AOT_or_full_floor_qualified: false,
  g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
