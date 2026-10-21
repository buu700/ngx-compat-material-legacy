/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded actual constructor/JIT/focus evidence; not rendered views, AOT or release admission. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {qualifiedDialogConfigCandidateTypes} from './dialog-caller-config-type-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {
  main: {path: 'compatibility/rc/dialog-caller-config-runtime-main.json', sha256: 'b40d95220e7b41ddb39b561cf9d940a46dde8936989a8cc9f990aa01db532839'},
  '21.x': {path: 'compatibility/rc/dialog-caller-config-runtime-21.json', sha256: 'c8cdd38b148bb4a6a3f7750698dbf8d79cbfa1c15403c1958e08d3031b6a7ade'},
};
const historical = ['autoFocus', 'ariaModal', 'maxWidth', 'enterAnimationDuration', 'exitAnimationDuration'];

export function qualifiedDialogConfigCandidateRuntime({root = process.cwd(), read = raw(root)} = {}) {
  const types = qualifiedDialogConfigCandidateTypes({root, read}), source = types.source;
  const ref = pins[source.prior.line], bytes = read(ref.path);
  assert.equal(hash(bytes), ref.sha256, 'changed dialog candidate runtime proof');
  const proof = JSON.parse(bytes);
  assert.equal(proof.line, source.prior.line);
  assert.equal(proof.prototype_only, false);
  assert.deepEqual(proof.type_boundary, types.ref);
  assert.deepEqual(proof.candidate, types.candidate_ref);
  assert.equal(proof.candidate_only, true);
  assert.equal(proof.product_applied, false);
  assert.equal(proof.source_closures, 0);
  assert.equal(proof.SDK_source_rewrites, false);
  assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified, false);
  assert.equal(proof.g11_claim, 'not-passed');
  const inputs = new Map();
  for (const member of proof.inputs) {
    assert.equal(inputs.has(member.path), false);
    inputs.set(member.path, member.sha256);
    assert.equal(hash(read(member.path)), member.sha256, 'changed dialog runtime input ' + member.path);
    assert.ok(!member.path.includes('snack-dom-source-context'), 'mutable source owner in runtime proof');
  }
  assert.equal(inputs.get(types.ref.path), types.ref.sha256);
  for (const member of types.proof.inputs) assert.equal(inputs.get(member.path), member.sha256);
  const seen = new Set(), contexts = new Map();
  assert.equal(proof.runtime_subjects.length, 4);
  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
  for (const subject of proof.runtime_subjects) {
    const key = subject.line + ':' + subject.mode;
    assert.equal(seen.has(key), false); seen.add(key); contexts.set(key, subject);
    assert.ok(['development', 'production'].includes(subject.mode));
    assert.ok(['original', source.prior.line].includes(subject.line));
    assert.deepEqual([subject.Core, subject.Material], versions[subject.line]);
    assert.equal(subject.actual_native_packed_AOT_or_full_floor_qualified, false);
    assert.equal(subject.borrowed.rxjs.version, '7.8.2');
    assert.equal(subject.borrowed.tslib.version, '2.8.1');
    assert.equal(subject.borrowed['zone.js'].version, '0.16.3');
    if (subject.line === 'original') {
      assert.equal(subject.cases.length, 1);
      assert.equal(subject.current_owned_source_loaded, false);
      assert.equal(subject.complete_semantic_source_files_per_side, 0);
      assert.equal(subject.observations.peerSubtype, true);
    } else {
      assert.equal(subject.cases.length, 26);
      assert.equal(subject.complete_semantic_source_files_per_side, 49);
      assert.equal(subject.isolated_current_source_workers, 2);
      assert.equal(subject.initial_focus_emitted_module_byte_equal_before_candidate, true);
      assert.equal(subject.current_owned_source_on_other_SDK, false);
      assert.equal(subject.public_application_and_injectors, true);
      assert.equal(subject.actual_public_injector_JIT_constructor_factory, true);
      assert.equal(subject.generated_leaf_Component_factory_template_or_query_execution, false);
      assert.equal(subject.standard_Reflect_metadata_Document_DOM_Renderer_and_overlay_monitor_payloads_are_protocols, true);
      const {before, candidate} = subject.observations.sides;
      assert.deepEqual(candidate, before, 'candidate runtime behavior differs from actual before implementation');
      assert.equal(candidate.peerSubtype, true);
      assert.equal(candidate.focus.length, 6);
      assert.equal(candidate.lifecycle.length, 2);
      assert.equal(candidate.constructors.length, 4);
      for (const item of candidate.lifecycle) {
        assert.equal(item.injectorConfigIdentity, true);
        assert.equal(item.actualPublicInjector, true);
        assert.equal(item.actualJITConstructorFactory, true);
        assert.equal(item.generatedTemplateOrQueryExecuted, false);
        assert.equal(item.cleanup, true);
        assert.equal(item.idempotent, true);
        assert.deepEqual(item.events, item.delayed ? ['focus', 'opened', 'complete'] : ['focus', 'focus', 'complete']);
      }
      assert.deepEqual(candidate.constructors.map(item => [item.effectiveEnter, item.effectiveExit]),
        [[150, 75], [250, 50], [0, 0], [150, 75]]);
    }
  }
  assert.equal(proof.runtime_subjects.reduce((n, subject) => n + subject.cases.length, 0), 54);
  const differences = [];
  for (const mode of ['development', 'production']) {
    const tagged = contexts.get('original:' + mode), current = contexts.get(source.prior.line + ':' + mode);
    assert.ok(tagged && current);
    const reference = tagged.observations.defaults, actual = current.observations.sides.candidate.defaults;
    for (const name of historical) assert.deepEqual(actual.properties[name], reference.properties[name], 'tagged historical default changed');
    for (const key of new Set([...Object.keys(reference.properties), ...Object.keys(actual.properties)])) {
      if (JSON.stringify(reference.properties[key]) !== JSON.stringify(actual.properties[key])) differences.push({mode, key,
        tagged: reference.properties[key] ?? {missing: true}, current: actual.properties[key] ?? {missing: true}});
    }
    if (JSON.stringify(reference.keys) !== JSON.stringify(actual.keys)) differences.push({mode, key: '$enumeration-order',
      tagged: reference.keys, current: actual.keys});
  }
  assert.deepEqual(proof.tagged_differences_retained, differences, 'tagged/current differences hidden or normalized');
  assert.equal(differences.length, source.prior.line === 'main' ? 24 : 22);
  const faults = [
    ['wrong-autofocus-default', 'legacy-dialog/dialog-config.ts', 'candidate-full-config-shape-beforeafter'],
    ['wrong-config-DI-token', 'legacy-dialog/internal/dialog-container-base.ts', 'candidate-public-injector-config-identity'],
    ['false-focus-policy-ignored', 'legacy-dialog/internal/dialog-initial-focus.ts', 'focus-policy-false'],
  ];
  assert.deepEqual(proof.source_faults.map(fault => fault.id), faults.map(([id]) => id));
  for (const [id, path, marker] of faults) {
    const fault = proof.source_faults.find(fault => fault.id === id), fullPath = 'projects/ngx-material-legacy/' + path;
    assert.equal(fault.path, fullPath);
    assert.equal(fault.before_sha256, types.candidate.members.find(member => member.path === fullPath).after.sha256);
    assert.notEqual(fault.mutant_sha256, fault.before_sha256);
    assert.equal(fault.complete_current_semantic_graph_files, 49);
    assert.equal(fault.diagnostics, 0);
    assert.equal(fault.rejected, true);
    assert.equal(fault.marker, marker);
    assert.equal(fault.exit_status, 1);
    assert.equal(fault.signal, null);
  }
  return {source, types, candidate: types.candidate, proof, ref,
    candidate_only: true, product_applied: false, source_closures: 0,
    actual_native_packed_AOT_or_full_floor_qualified: false};
}
