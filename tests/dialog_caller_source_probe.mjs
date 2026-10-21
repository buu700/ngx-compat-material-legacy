/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Capture integrity and source binding checks only; no public API/native closure. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {dialogCallerSource, DIALOG_CALLER_PRIOR} from '../scripts/dialog-caller-contracts.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const result = dialogCallerSource({root}), {prior, facts} = result;
assert.equal(facts.length, 18);
assert.equal(result.sources.size, 49);
assert.equal(facts.filter(fact => fact.current_peer_use).length, 17);
assert.equal(facts.filter(fact => fact.public_reexport).length, 3);
assert.equal(result.local_binding_program_only, true);
assert.equal(result.semantic_public_types_or_runtime_qualified, false);
for (const fact of facts) {
  assert.equal(fact.candidate_source_sha256, hash(read('projects/ngx-material-legacy/' + fact.file)));
  assert.equal(fact.complete_context_members.length, 1);
  assert.equal(fact.complete_context_members[0].text, result.sources.get('projects/ngx-material-legacy/' + fact.file));
}
const removed = facts.filter(fact => fact.owned_original_container_replacement);
assert.equal(removed.length, 1);
assert.equal(removed[0].symbol, 'CdkDialogContainer');
assert.equal(removed[0].binding.local_name, '_MatDialogContainerBase');
assert.deepEqual(removed[0].occurrences, []);
const controls = [...new Set([DIALOG_CALLER_PRIOR, ...prior.graph.map(member => member.path),
  ...prior.metadata.map(member => member.path), prior.alias_allowlist.path, prior.graph_owner.path])];
for (const path of controls) assert.throws(() => dialogCallerSource({root,
  read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member),
}), error => error?.code === 'ERR_ASSERTION', path);
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
dialogCallerSource({root, read: late});
for (changed of [DIALOG_CALLER_PRIOR, prior.sources[0].path]) {
  assert.throws(() => dialogCallerSource({root, read: late}), error => error?.code === 'ERR_ASSERTION');
}
const frozen = JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json'));
const added = JSON.parse(read('compatibility/f10/authored-dependency-current-dispositions.json'));
assert.equal(frozen.symbol_uses.length, 1736);
assert.equal(added.symbol_uses.length, 315);
assert.equal(added.live_symbol_use_count, 314);
assert.equal(added.retained_removed_additional_uses.length, 1);
assert.equal(JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')).entries.length, 1697);
assert.equal(frozen.symbol_uses.filter(row => row.disposition === 'open' &&
  row.module === '@angular/forms' && row.symbol === 'NG_VALUE_ACCESSOR').length, 6);
for (const item of prior.selected) {
  const ledger = JSON.parse(read(item.ledger));
  const current = ledger.symbol_uses.find(row => row.file === item.original_row.file &&
    row.module === item.original_row.module && row.symbol === item.original_row.symbol);
  assert.deepEqual(current, item.original_row, 'capture preparation changed an original obligation');
}
const open = [...frozen.symbol_uses, ...added.symbol_uses].filter(row => row.disposition === 'open').length;
assert.equal(open, 31);
const report = {schema_version: 1, line: prior.line, selected: 18, frozen: 12, additional: 6,
  selected_sources: 8, complete_source_graph: 49, current_peer_bindings: 17,
  owned_original_container_replacement: 1, public_reexports: 3,
  source_input_corruptions_rejected: controls.length, late_changes_rejected: 2,
  source_closures_prepared: 0, source_closures_integrated: 0, official_open_routes: open,
  public_API_types_runtime_native_packed_AOT_or_full_floor_qualified: false,
  all1697_1736_315_obligations_and_six_packed_CVA_roles_retained: true, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
