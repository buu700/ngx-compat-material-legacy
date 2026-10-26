/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {materialRemainingCallerSource, MATERIAL_REMAINING_PRIOR} from '../scripts/material-remaining-caller-contracts.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const ledgers = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json', 'compatibility/f10/disposition-ledger/ledger.json'];
const before = ledgers.map(path => hash(read(path))), q = materialRemainingCallerSource({root});
assert.equal(q.facts.length, 7); assert.equal(q.sources.size, 91); assert.equal(q.metadata.length, 5);
assert.equal(q.facts.filter(fact => fact.public_reexport).length, 1);
assert.equal(q.source_closures, 0); assert.equal(q.semantic_public_types_or_runtime_qualified, false);
const direct = new Set(q.prior.sources.map(member => member.path));
const transitive = q.prior.graph.find(member => !direct.has(member.path)); assert.ok(transitive);
const controls = [...direct, transitive.path, q.metadata[0].path,
  q.prior.alias_allowlist.path, q.prior.graph_owner.path, MATERIAL_REMAINING_PRIOR];
assert.equal(new Set(controls).size, 10);
for (const changed of controls) assert.throws(() => materialRemainingCallerSource({root, read: path =>
  path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path)}), error => error?.code === 'ERR_ASSERTION');
let changed;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
materialRemainingCallerSource({root, read: late});
for (changed of [q.prior.sources[0].path, transitive.path])
  assert.throws(() => materialRemainingCallerSource({root, read: late}), error => error?.code === 'ERR_ASSERTION');
assert.deepEqual(ledgers.map(path => hash(read(path))), before);
assert.equal(execFileSync('git', ['diff', '--name-only', q.prior.source_parent, '--', 'projects/ngx-material-legacy'],
  {cwd: root, encoding: 'utf8'}).trim(), '');
const report = {schema_version: 1, line: q.prior.line, selected: 7, frozen: 6, additional: 1,
  direct_sources: 5, complete_owned_source_graph: 91, self_package_routes: 5, public_reexports: 1,
  input_corruptions_rejected: controls.length, late_changes_rejected: 2,
  canonical_ledgers_unchanged: true, product_changes: 0, source_closures_prepared: 0, source_closures_integrated: 0,
  public_API_types_runtime_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
