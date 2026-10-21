/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Forty-eight individual public-import decisions; canonical integration has one existing owner. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {overlayContractSource, OVERLAY_CONTRACT_INPUTS, OVERLAY_CONTRACT_SDK} from './overlay-caller-contracts.mjs';
import {qualifiedTooltipScrollClipping} from './tooltip-scroll-clipping-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const decisionsPath = 'compatibility/rc/overlay-caller-contract-decisions.json';
const decisionsPin = '6be5b182bde00a94c343cb455e61c9c83f1abcf17341b09894c4e7fa5c8b6dd8';
const pins = {main: {path: 'compatibility/rc/overlay-caller-contract-public-main.json', sha256: '7b670de2e9746edc50cf43abef22ad0107de38570721f2a95bb6f2abfa0219b5'},
  '21.x': {path: 'compatibility/rc/overlay-caller-contract-public-21.json', sha256: 'c96f57fc4e95530e7b407a6636196fa8c98f23a7b935c304418c739f6bee0b92'}};
export const OVERLAY_CONTRACT_REVIEW = 'compatibility/f10/authored-use-reviews/overlay-callers.json';

export function qualifiedOverlayContracts({root = process.cwd(), read = raw(root)} = {}) {
  const source = overlayContractSource({root, read}), ref = pins[source.capture.line];
  const bytes = read(ref.path); assert.equal(hash(bytes), ref.sha256, 'changed complete overlay contract proof');
  const proof = JSON.parse(bytes); assert.equal(proof.line, source.capture.line);
  for (const member of proof.inputs) assert.equal(hash(read(member.path)), member.sha256, 'changed overlay contract proof input ' + member.path);
  assert.ok(proof.inputs.every(m => !m.path.includes('snack-dom-source-context')), 'mutable source-owner dependency in contract proof');
  assert.equal(proof.whole_caller_subjects.length, 1);
  const whole = proof.whole_caller_subjects[0];
  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
  assert.equal(whole.line, source.capture.line); assert.deepEqual([whole.Core, whole.CDK], versions[whole.line]);
  assert.equal(whole.source_files, 145); assert.equal(whole.diagnostics, 0); assert.ok(whole.strict);
  assert.equal(whole.strictPropertyInitialization, false); assert.equal(whole.skipLibCheck, false); assert.ok(whole.noImplicitOverride);
  assert.equal(whole.source_or_SDK_rewrites, false); assert.equal(whole.emit_or_AOT, false);
  assert.equal(whole.actual_resolved_overlay_calls.length, 104); assert.equal(whole.actual_overlay_members.length, 142);
  assert.ok([...whole.actual_resolved_overlay_calls, ...whole.actual_overlay_members].every(m => m.tags.every(t => !['deprecated', 'docs-private', 'experimental', 'developerPreview', 'breaking-change'].includes(t))));
  assert.equal(whole.strategy_provenance.casts.length, 5);
  assert.equal(whole.strategy_provenance.tooltip_non_null_reference_writes, 1);
  assert.equal(whole.strategy_provenance.tooltip_update_calls_from_owned_reference, 3);
  assert.equal(whole.strategy_provenance.menu_non_null_reference_writes, 1);
  assert.ok(whole.strategy_provenance.dialog_strategy_overrides_all_user_spreads);
  assert.equal(proof.source_fault_controls.length, 3); assert.ok(proof.source_fault_controls.every(c => c.rejected));
  assert.equal(proof.type_subjects.length, 3);
  for (const subject of proof.type_subjects) {
    assert.deepEqual([subject.Core, subject.CDK], versions[subject.line]);
    assert.ok(subject.strict); assert.equal(subject.skipLibCheck, false); assert.equal(subject.diagnostics, 0);
    assert.equal(subject.factory_declarations_compiled, 10); assert.equal(subject.negative_type_controls.length, 3);
    assert.equal(subject.symbols.length, 18); assert.equal(subject.members.length, 104); assert.deepEqual(subject.gaps, []);
    assert.ok(subject.fixture_uses_configuration_sizing && subject.deprecated_fixture_sizing_mutant_rejected);
  }
  const contexts = new Set(); assert.equal(proof.runtime_subjects.length, 10);
  for (const subject of proof.runtime_subjects) {
    assert.deepEqual([subject.Core, subject.CDK], versions[subject.line]);
    contexts.add([subject.line, subject.zoneMode, subject.mode].join(':'));
    assert.equal(subject.cases.length, 16); assert.ok(subject.synthetic_server_renderer_and_location_protocol);
    assert.equal(subject.actual_native_packed_AOT_or_full_floor_qualified, false);
    assert.deepEqual(subject.observations, proof.runtime_subjects[0].observations);
  }
  assert.equal(contexts.size, 10);
  for (const line of Object.keys(versions)) for (const zone of line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) {
    for (const mode of ['development', 'production']) assert.ok(contexts.has([line, zone, mode].join(':')));
  }
  assert.equal(proof.runtime_fault_controls.length, 6); assert.ok(proof.runtime_fault_controls.every(c => c.rejected));
  assert.equal(proof.canonical_source_closures_integrated, 0); assert.equal(proof.whole_current_caller_source_compiled, true);
  assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified, false); assert.equal(proof.g11_claim, 'not-passed');
  const clipping = qualifiedTooltipScrollClipping({root, read, allowApplied: true});
  assert.equal(hash(clipping.candidate.candidate), source.capture.tooltip_current_sha256);
  return {source, proof, ref, clipping};
}

export function prepareOverlayContractReview({root = process.cwd(), read = raw(root)} = {}) {
  const qualified = qualifiedOverlayContracts({root, read}), {source} = qualified;
  const bytes = read(decisionsPath); assert.equal(hash(bytes), decisionsPin, 'changed individual overlay decisions');
  const decisions = JSON.parse(bytes).decisions; assert.equal(Object.keys(decisions).length, 48);
  const ref = path => ({path, sha256: hash(read(path))});
  const evidence = [ref(OVERLAY_CONTRACT_INPUTS), source.capture.original_prior, qualified.ref, qualified.clipping.ref,
    ref(OVERLAY_CONTRACT_SDK), ref(decisionsPath), ref('scripts/overlay-caller-contracts.mjs'), ref('scripts/overlay-caller-contract-reviews.mjs')];
  return {schema_version: 1, line: source.capture.line, status: 'reviewed',
    criteria: 'Forty-eight individually reviewed public CDK overlay imports across21 complete current sources and the145-file closure. Genuine exact-minimum declaration and overload checks,owned strategy provenance,and untouched-tagged/minimum public service/factory/module runtime observations. Canonical integration,native/packed/AOT/floors and independent audits remain separate.',
    reviews: source.facts.map(f => {
      const decision = decisions[f.file + ':' + f.symbol]; assert.ok(decision);
      return {...f, conclusion: 'stable-public-peer', decision,
        reviewer: 'Codex primary implementer; individual complete current overlay caller review',
        independent_evidence: evidence,
        scope_limit: 'Named public import/type/token/module/consumed-member and selected-overload boundary. Complete current TypeScript sources compile against the advertised minimum. Owned tooltip/menu/dialog construction establishes five strategy casts;external fabricated refs,subclass overrides and private mutation are excluded. Public SDK runtime uses disclosed renderer,server viewport,Location and throttle protocols. Full legacy component/module/template/native CSS/SCSS geometry,scrolling,motion,CSP,packed/AOT provider metadata,compiler/Node/RxJS/consumer/peer floors and G01-G13 retain separate gates.'};
    }), source_closures_prepared: 48, frozen_prepared: 46, additional_prepared: 2,
    source_closures_integrated: 0, new_SHA_or_native_semantic_closures: 0,
    actual_native_packed_or_full_floor_qualified: false, g11_claim: 'not-passed'};
}

export function inspectOverlayContractReview({root = process.cwd(), read = raw(root)} = {}) {
  const body = prepareOverlayContractReview({root, read});
  assert.equal(hash(read(OVERLAY_CONTRACT_REVIEW)), hash(JSON.stringify(body, null, 2) + '\n'), 'changed prepared individual overlay review');
  return body;
}
