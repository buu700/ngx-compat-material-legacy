/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Immutable additional semantic coverage; actual raw product admission belongs to its owner. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pins = {
  main: {path: 'compatibility/rc/dialog-caller-config-overlay-types-main.json', sha256: '34c4747f230cf176be1c140b50eb31ec43e8358e2ddc8915507c3c1264a07a41'},
  '21.x': {path: 'compatibility/rc/dialog-caller-config-overlay-types-21.json', sha256: '867d1b296044b19494d608990598b0f825618ad3445cad9a1a012c4cc6e80934'},
};
const extras = ['projects/ngx-material-legacy/legacy-dialog/testing/dialog-opener-base.ts',
  'projects/ngx-material-legacy/legacy-dialog/testing/dialog-opener.ts'];
export function qualifiedDialogConfigOverlayTypes({line, read, boundary}) {
  const ref = pins[line]; assert.ok(ref);
  const bytes = read(ref.path); assert.equal(hash(bytes), ref.sha256, 'changed complete dialog overlay type proof');
  const proof = JSON.parse(bytes);
  assert.equal(proof.line, line);
  assert.deepEqual(proof.type_boundary, boundary.types.ref);
  assert.deepEqual(proof.runtime_boundary, boundary.qualification);
  assert.deepEqual(proof.candidate, boundary.types.proof.candidate);
  assert.equal(proof.typescript, line === 'main' ? '6.0.3' : '5.9.2');
  assert.deepEqual([proof.Core, proof.Material], line === 'main' ? ['22.1.7', '22.1.7'] : ['21.2.23', '21.2.14']);
  assert.equal(proof.subjects.length, 2);
  assert.deepEqual(proof.subjects.map(subject => subject.side), ['before', 'candidate']);
  for (const subject of proof.subjects) {
    assert.equal(subject.strict, true); assert.equal(subject.strictPropertyInitialization, false);
    assert.equal(subject.noImplicitOverride, true); assert.equal(subject.skipLibCheck, false);
    assert.equal(subject.source_files, 51); assert.equal(subject.emitted_source_files, 51);
    assert.equal(subject.diagnostics, 0); assert.equal(subject.invalid_type_controls, 2);
  }
  assert.equal(proof.candidate_source_members.length, 51);
  assert.equal(new Set(proof.candidate_source_members.map(member => member.path)).size, 51);
  assert.deepEqual(proof.additional_sources, extras);
  assert.deepEqual(proof.additional_emitted_JS_identical_before_candidate, extras.map(path => path.replace(/\.ts$/, '.js')));
  for (const member of boundary.types.proof.candidate_source_members)
    assert.deepEqual(proof.candidate_source_members.find(other => other.path === member.path), member);
  assert.deepEqual(proof.candidate_source_members.filter(member => !boundary.proposed_sources.has(member.path)).map(member => member.path).sort(), extras);
  for (const member of proof.inputs) assert.equal(hash(read(member.path)), member.sha256, 'changed additional dialog type input ' + member.path);
  assert.equal(proof.SDK_source_rewrites, false);
  assert.equal(proof.current_source_on_other_SDK, false);
  assert.equal(proof.source_closures, 0);
  assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified, false);
  assert.equal(proof.g11_claim, 'not-passed');
  return {ref, proof};
}
