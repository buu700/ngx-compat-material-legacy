/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine SDK observations only; owned callers and release admission remain separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ref = {path: 'compatibility/rc/dialog-caller-public-runtime.json',
  sha256: 'e3acc3809d0e15595193b5a2a25afb453d69d277cb1d9c04b932b45ecd473dae'};

export function qualifiedDialogPublicRuntime({root = process.cwd(), read = path => readFileSync(join(root, path))} = {}) {
  const bytes = read(ref.path);
  assert.equal(hash(bytes), ref.sha256, 'changed genuine public dialog evidence');
  const proof = JSON.parse(bytes);
  for (const name of ['prototype_only', 'SDK_source_rewrites', 'actual_native_packed_AOT_or_full_floor_qualified']) {
    assert.equal(proof[name], false);
  }
  assert.equal(proof.source_closures, 0);
  assert.equal(proof.g11_claim, 'not-passed');
  assert.equal(proof.inputs.length, 487);
  const inputs = new Map();
  for (const member of proof.inputs) {
    assert.equal(inputs.has(member.path), false, 'duplicate public dialog input');
    assert.equal(hash(read(member.path)), member.sha256, 'changed public dialog input ' + member.path);
    inputs.set(member.path, member.sha256);
  }
  assert.equal(inputs.get(proof.sdk_capsule.path), proof.sdk_capsule.sha256);
  for (const path of ['tests/dialog_caller_public_runtime_probe.mjs', 'tests/dialog_caller_public_runtime_subject.mjs',
    'tests/dialog_caller_public_type_contracts.mjs', 'scripts/api-public-node-context.mjs',
    'tests/a11y_caller_node_protocol.mjs', 'scripts/dialog-caller-public-subjects.mjs']) {
    assert.equal(inputs.get(path), hash(read(path)));
  }
  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
  const reference = proof.runtime_subjects.find(subject => subject.line === 'original' && subject.mode === 'development');
  assert.ok(reference);
  assert.deepEqual(reference.observations.states, {runtimeEnumExported: false, values: {OPEN: 0, CLOSING: 1, CLOSED: 2}});
  assert.deepEqual(reference.observations.defaults, {autoFocus: 'first-tabbable', disableClose: false,
    hasBackdrop: true, restoreFocus: true, ariaModal: true, maxWidth: '80vw'});
  assert.equal(proof.runtime_subjects.length, 6);
  const contexts = new Set(), differences = [];
  let cases = 0;
  for (const subject of proof.runtime_subjects) {
    const key = subject.line + ':' + subject.mode;
    assert.equal(contexts.has(key), false); contexts.add(key);
    assert.deepEqual([subject.Core, subject.Material], versions[subject.line]);
    assert.ok(['development', 'production'].includes(subject.mode));
    for (const name of ['genuine_public_Dialog_open_and_DialogRef', 'generated_test_component_factories_executed']) {
      assert.equal(subject[name], true);
    }
    for (const name of ['generated_legacy_component_factories_executed',
      'native_DOM_positions_scroll_or_current_owned_callers_qualified', 'SDK_source_rewrites',
      'actual_native_packed_AOT_or_full_floor_qualified']) assert.equal(subject[name], false);
    assert.equal(subject.g11_claim, 'not-passed');
    assert.equal(subject.cases.length, subject.line === 'original' ? 16 : 17);
    assert.equal(new Set(subject.cases).size, subject.cases.length); cases += subject.cases.length;
    const expected = structuredClone(reference.observations);
    if (subject.line !== 'original') {
      expected.states.runtimeEnumExported = true;
      expected.defaults.ariaModal = false; expected.defaults.maxWidth = {kind: 'undefined'};
      expected.template.componentRef = null; expected.template.componentInstance = null;
      expected.inputs.find(input => input.kind === 'backdrop' && input.disabled).recaptured = 1;
    }
    assert.deepEqual(subject.observations, expected, 'unreviewed genuine public dialog behavior difference');
    for (const boundary of Object.keys(reference.observations)) if (
      !isDeepStrictEqual(reference.observations[boundary], subject.observations[boundary])) {
      differences.push({line: subject.line, mode: subject.mode, boundary,
        tagged: reference.observations[boundary], current: subject.observations[boundary]});
    }
    for (const [name, version] of [['rxjs', '7.8.2'], ['tslib', '2.8.1'], ['zone.js', '0.16.3']]) {
      assert.equal(subject.borrowed[name].version, version);
      assert.ok(subject.borrowed[name].root.startsWith('/'));
    }
  }
  for (const line of Object.keys(versions)) for (const mode of ['development', 'production']) {
    assert.ok(contexts.has(line + ':' + mode));
  }
  assert.equal(cases, 100); assert.equal(differences.length, 16);
  assert.deepEqual(proof.tagged_differences_retained, differences, 'public dialog differences hidden');
  assert.equal(proof.type_contracts.length, 3);
  assert.deepEqual(proof.type_contracts.map(subject => subject.line), Object.keys(versions));
  let invalidTypeControls = 0;
  for (const subject of proof.type_contracts) {
    const original = subject.line === 'original';
    assert.equal(subject.strict, true); assert.equal(subject.skipLibCheck, false);
    assert.equal(subject.diagnostics, 0); assert.equal(subject.enum_constants_typed_as_0_1_2, true);
    assert.equal(subject.original_const_enum_erasure, original); assert.equal(subject.runtime_enum_import_emitted, !original);
    assert.equal(subject.type_only_focus_and_position_imports_erased, true);
    assert.equal(subject.current_owned_sources_compiled, 0); assert.equal(subject.SDK_source_rewrites, false);
    assert.equal(subject.full_compiler_or_peer_floor_qualified, false);
    assert.deepEqual(subject.public_symbols.map(symbol => symbol.name), ['AutoFocusTarget', 'DialogPosition', 'MatDialogState',
      ...(original ? [] : ['DialogContainer'])]);
    assert.deepEqual(subject.optional_container_hooks.map(hook => hook.name), original ? [] :
      ['_focusTrapped', '_closeInteractionType', '_recaptureFocus']);
    for (const symbol of [...subject.public_symbols, ...subject.optional_container_hooks]) {
      assert.deepEqual(symbol.tags, []); assert.ok(symbol.declarations.length);
      for (const declaration of symbol.declarations) assert.match(declaration.sha256, /^[a-f0-9]{64}$/);
    }
    for (const hook of subject.optional_container_hooks) assert.equal(hook.optional, true);
    assert.equal(subject.invalid_type_controls, original ? 3 : 6); invalidTypeControls += subject.invalid_type_controls;
  }
  assert.equal(invalidTypeControls, 15);
  return {proof, ref, cases, differences, invalid_type_controls: invalidTypeControls,
    current_owned_callers_qualified: false, source_closures: 0,
    actual_native_packed_AOT_or_full_floor_qualified: false};
}
