/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Proposed-source type qualification only; product/default/DI/runtime admission stays separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {dialogCallerSource} from './dialog-caller-contracts.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {
  main: {path: 'compatibility/rc/dialog-caller-config-types-main.json', sha256: '844f9cb0d91dc427fc78786281503b9dd0077c916b172e9d19153e23c40c1ef9'},
  '21.x': {path: 'compatibility/rc/dialog-caller-config-types-21.json', sha256: '3bd05f0d687db75ebecd4e8927a2bddbe00439c666c00a18a734af808cfea33a'},
};
const candidatePath = 'compatibility/rc/dialog-caller-config-candidate.json';
const candidatePins = {main: 'f41b9a5ff0a050a32ef1b29928439c9b4aab9b352d935b9fa1076a9f708df5a9',
  '21.x': '60da5e774a1be52328693c4bc0b56c462ee111457fa64879da6b3f8f8b710aea'};
const domains = {autoFocus: ['boolean', 'string', 'undefined'],
  enterAnimationDuration: ['number', 'string', 'undefined'],
  exitAnimationDuration: ['number', 'string', 'undefined']};
const unstable = new Set(['docs-private', 'deprecated', 'breaking-change', 'experimental', 'developerPreview']);
const id = row => row.file + ':' + row.module + ':' + (row.name ?? row.symbol);

export function qualifiedDialogConfigCandidateTypes({root = process.cwd(), read = raw(root)} = {}) {
  const source = dialogCallerSource({root, read}), line = source.prior.line, ref = pins[line];
  assert.equal(hash(read(candidatePath)), candidatePins[line], 'changed dialog configuration candidate');
  const candidate = JSON.parse(read(candidatePath));
  assert.deepEqual(candidate.source_capture, source.ref);
  assert.equal(candidate.product_applied, false);
  assert.equal(candidate.members.length, 3);
  assert.equal(hash(read(candidate.patch.path)), candidate.patch.sha256);
  for (const member of candidate.members) {
    assert.equal(hash(read(member.path)), member.before.sha256, 'type candidate unexpectedly applied');
    assert.equal(hash(member.after.text), member.after.sha256);
    assert.equal(Buffer.byteLength(member.after.text), member.after.bytes);
  }
  const bytes = read(ref.path);
  assert.equal(hash(bytes), ref.sha256, 'changed candidate dialog type proof');
  const proof = JSON.parse(bytes);
  assert.equal(proof.line, line);
  assert.equal(proof.source_parent, source.prior.source_parent);
  assert.equal(proof.discovering, false);
  assert.equal(proof.candidate_only, true);
  assert.equal(proof.product_applied, false);
  assert.deepEqual(proof.candidate, {path: candidatePath, sha256: candidatePins[line]});
  assert.equal(proof.source_files, 49);
  assert.equal(proof.source_closures, 0);
  assert.equal(proof.actual_runtime_native_packed_AOT_or_full_floor_qualified, false);
  assert.equal(proof.g11_claim, 'not-passed');
  assert.deepEqual(proof.metadata, source.prior.metadata);
  const inputs = new Map();
  for (const member of proof.inputs) {
    assert.equal(inputs.has(member.path), false);
    inputs.set(member.path, member.sha256);
    assert.equal(hash(read(member.path)), member.sha256, 'changed candidate type input ' + member.path);
    assert.ok(!member.path.includes('snack-dom-source-context'), 'mutable owner in candidate type proof');
  }
  for (const [path, text] of source.sources) assert.equal(inputs.get(path), hash(text), 'missing raw before graph input');
  const after = new Map(candidate.members.map(member => [member.path, member.after]));
  assert.deepEqual(proof.candidate_source_members, [...source.sources].map(([path, text]) => ({path,
    sha256: after.get(path)?.sha256 ?? hash(text), bytes: after.get(path)?.bytes ?? Buffer.byteLength(text)})));
  const baselinePath = 'compatibility/rc/dialog-caller-type-discovery-' + (line === 'main' ? 'main' : '21') + '.json';
  assert.equal(inputs.get(baselinePath), hash(read(baselinePath)));
  const baseline = JSON.parse(read(baselinePath)).subjects.find(subject => subject.line === line);
  assert.equal(baseline.unstable_current_uses.length, 7);
  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
  const seen = new Set();
  let current;
  assert.equal(proof.subjects.length, 3);
  for (const subject of proof.subjects) {
    assert.equal(seen.has(subject.line), false);
    seen.add(subject.line);
    assert.deepEqual([subject.Core, subject.Material], versions[subject.line]);
    assert.equal(subject.strict, true);
    assert.equal(subject.strictPropertyInitialization, false);
    assert.equal(subject.noImplicitOverride, true);
    assert.equal(subject.skipLibCheck, false);
    assert.deepEqual(subject.diagnostics, []);
    assert.equal(subject.invalid_type_controls, 7);
    assert.equal(subject.SDK_rewrites, false);
    assert.equal(subject.symbols.length, 10);
    assert.equal(subject.symbols.filter(symbol => symbol.actually_consumed_current_peer).length, 9);
    assert.deepEqual(subject.genuine_tagged_reference_field_domains, domains);
    for (const symbol of subject.symbols) {
      if (symbol.missing) assert.ok(subject.line === 'original' && symbol.module === '@angular/cdk/dialog' &&
        symbol.name === 'DialogContainer', 'unexpected missing SDK symbol');
      else {
        assert.ok(symbol.declarations.length > 0);
        if (subject.line !== 'original' && symbol.actually_consumed_current_peer) {
          assert.ok(symbol.tags.every(tag => !unstable.has(tag)), 'unstable current dialog symbol');
        }
      }
    }
    assert.deepEqual(subject.unstable_current_uses, []);
    assert.deepEqual(subject.selected_any_unknown_casts, []);
    if (subject.line === line) {
      current = subject;
      assert.equal(subject.current_source_files, 49);
      assert.equal(subject.actual_bindings.length, 18);
      assert.equal(subject.actual_bindings.filter(binding => binding.current_peer_use).length, 16);
      assert.deepEqual(subject.actual_bindings.filter(binding => !binding.current_peer_use).map(id).sort(), [
        'legacy-dialog/internal/dialog-container-base.ts:@angular/cdk/dialog:CdkDialogContainer',
        'legacy-dialog/internal/dialog-initial-focus.ts:@angular/material/dialog:MatDialogConfig',
      ].sort());
      assert.deepEqual(subject.actual_bindings.map(id).sort(), source.facts.map(id).sort());
      assert.equal(subject.actual_consumed_members.length, 44);
      assert.equal(subject.actual_resolved_calls.length, 6);
      for (const member of subject.actual_consumed_members) {
        assert.equal(member.hidden, false);
        assert.ok(member.tags.every(tag => !unstable.has(tag)));
      }
      for (const call of subject.actual_resolved_calls) assert.ok(call.tags.every(tag => !unstable.has(tag)));
      assert.deepEqual(subject.owned_runtime_field_domains, domains);
      assert.equal(subject.owned_runtime_member_reads.length, 7);
      assert.deepEqual(subject.owned_runtime_member_reads.map(member => member.file + ':' + member.expression).sort(),
        baseline.unstable_current_uses.map(member => member.file + ':' + member.expression).sort(), 'flagged reads disappeared instead of acquiring an owned contract');
      for (const member of subject.owned_runtime_member_reads) {
        assert.ok(Object.hasOwn(domains, member.member));
        assert.equal(member.declaration.file, 'projects/ngx-material-legacy/legacy-dialog/dialog-config.ts');
      }
      assert.equal(subject.manual_constructor_and_peer_structural_roundtrip_qualified, true);
      assert.equal(subject.invalid_candidate_controls, 3);
    } else {
      assert.equal(subject.current_source_files, 0);
      assert.deepEqual(subject.actual_bindings, []);
      assert.deepEqual(subject.actual_consumed_members, []);
      assert.deepEqual(subject.actual_resolved_calls, []);
      assert.deepEqual(subject.owned_runtime_member_reads, []);
      assert.equal(subject.owned_runtime_field_domains, null);
      assert.equal(subject.manual_constructor_and_peer_structural_roundtrip_qualified, false);
      assert.equal(subject.invalid_candidate_controls, 0);
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(versions).sort());
  assert.ok(current);
  return {source, candidate, proof, current, ref, candidate_ref: {path: candidatePath, sha256: candidatePins[line]},
    candidate_only: true, product_applied: false, source_closures: 0,
    defaults_actual_DI_owned_runtime_native_or_packed_qualified: false};
}
