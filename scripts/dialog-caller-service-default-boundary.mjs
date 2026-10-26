/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite generic-default repair; immutable comparison inputs never admit raw before source. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {inspectDialogConfigBoundary} from './dialog-caller-config-boundary.mjs';
import {qualifiedDialogPublicRuntime} from './dialog-caller-public-runtime-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const proposalPath = 'compatibility/rc/dialog-caller-service-default-candidate.json';
const pins = {
  main: {proposal: '8b42ea107bbcb758010e273fd12950db975f0625abe170b8865a58c87eab53c6',
    runtime: {path: 'compatibility/rc/dialog-caller-service-default-runtime-main.json',
      sha256: '7398217ff0c8ce57b505baa263e5f5cfd55c4f8c99e4df0ca6aed00511c2c0a2'}},
  '21.x': {proposal: '8d80f4ec1f96c9cf453064dff87eb3dd8b185d3211582b78db6ffa464c73b81e',
    runtime: {path: 'compatibility/rc/dialog-caller-service-default-runtime-21.json',
      sha256: '0e462373a3adc184feeeeef4a51afc79c20a1bf9cd3b4971e68391d6e88696fc'}},
};
const beforeBlock = '    config = {...(this._defaultOptions || new this.dialogConfigClass()), ...config};';
const afterBlock = `    const defaults = this._defaultOptions || new this.dialogConfigClass();
    if (!this._defaultOptions && this.dialogConfigClass === MatDialogConfig) {
      // Keep the historical defaults when using the current peer configuration class.
      defaults.ariaModal = true;
      defaults.maxWidth = '80vw';
    }
    config = {...defaults, ...config};`;

export function inspectDialogServiceDefaults({root = process.cwd(), read = path => readFileSync(join(root, path)),
  requireApplied = false} = {}) {
  const bytes = read(proposalPath), line = Object.keys(pins).find(key => hash(bytes) === pins[key].proposal);
  assert.ok(line, 'changed generic dialog default proposal');
  const proposal = JSON.parse(bytes); assert.equal(proposal.line, line); assert.equal(proposal.members.length, 1);
  const member = proposal.members[0];
  assert.equal(member.path, 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts');
  for (const side of ['before', 'after']) {
    assert.equal(hash(member[side].text), member[side].sha256);
    assert.equal(Buffer.byteLength(member[side].text), member[side].bytes);
  }
  assert.equal(member.before.text.split(beforeBlock).length, 2);
  assert.equal(member.after.text, member.before.text.replace(beforeBlock, afterBlock));
  const digest = hash(read(member.path));
  assert.ok([member.before.sha256, member.after.sha256].includes(digest), 'unqualified raw generic dialog source');
  const applied = digest === member.after.sha256;
  if (requireApplied) assert.equal(applied, true, 'generic dialog default repair not applied');
  // A single authenticated preimage is local to old evidence. It cannot qualify a raw frame.
  const evidenceRead = path => path === member.path ? Buffer.from(member.before.text) : read(path);
  const configuration = inspectDialogConfigBoundary({root, read: evidenceRead, requireApplied: true});
  assert.equal(configuration.line, line);
  const publicRuntime = qualifiedDialogPublicRuntime({root, read});
  const ref = pins[line].runtime, proofBytes = read(ref.path); assert.equal(hash(proofBytes), ref.sha256);
  const proof = JSON.parse(proofBytes);
  assert.equal(proof.line, line); assert.equal(proof.candidate_only, true); assert.equal(proof.product_applied, false);
  assert.deepEqual(proof.candidate, {path: proposalPath, sha256: hash(bytes)});
  assert.deepEqual(proof.public_runtime, publicRuntime.ref);
  assert.equal(proof.source_closures, 0); assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified, false);
  assert.equal(proof.g11_claim, 'not-passed'); assert.equal(proof.inputs.length, 556);
  const inputs = new Map();
  for (const input of proof.inputs) {
    assert.equal(inputs.has(input.path), false); inputs.set(input.path, input.sha256);
    assert.equal(hash(evidenceRead(input.path)), input.sha256, 'changed generic dialog evidence input ' + input.path);
  }
  const sources = new Map(configuration.proposed_sources); sources.set(member.path, member.after.text);
  const snapshot = map => [...map].map(([path, text]) => ({path, sha256: hash(text)}));
  assert.deepEqual(proof.before_source_members, snapshot(configuration.proposed_sources));
  assert.deepEqual(proof.candidate_source_members, snapshot(sources));
  assert.equal(sources.size, 49);
  if (applied) for (const input of proof.candidate_source_members) {
    assert.equal(hash(read(input.path)), input.sha256, 'changed raw applied generic dialog graph');
  }
  assert.deepEqual(proof.semantic_programs, [
    {side: 'before', source_files: 49, diagnostics: 0, public_field_writes: []},
    {side: 'candidate', source_files: 49, diagnostics: 0, public_field_writes: [
      {name: 'ariaModal', type: 'boolean | undefined', tags: []},
      {name: 'maxWidth', type: 'string | number | undefined', tags: []},
    ]},
  ]);
  assert.equal(proof.contexts.length, 6);
  const contexts = new Map(), differences = [];
  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
  for (const context of proof.contexts) {
    const tagged = context.side === 'tagged', key = context.side + ':' + context.mode;
    assert.equal(contexts.has(key), false); contexts.set(key, context);
    assert.equal(context.line, tagged ? 'original' : line);
    assert.deepEqual([context.Core, context.Material], versions[context.line]);
    assert.equal(context.cases.length, tagged ? 11 : 12); assert.equal(new Set(context.cases).size, context.cases.length);
    assert.equal(context.observations.length, 6); assert.equal(context.genuine_public_Dialog_open, true);
    assert.equal(context.actual_owned_source_files, tagged ? 0 : 49);
    assert.equal(context.generated_test_subclass_factories_and_queries_executed, true);
    assert.equal(context.legacy_leaf_factories_templates_or_styles_executed, false);
    assert.equal(context.DOM_renderer_and_test_animation_events_are_protocols, true);
    assert.equal(context.actual_native_packed_AOT_or_full_floor_qualified, false);
    for (const [name, version] of [['rxjs', '7.8.2'], ['tslib', '2.8.1'], ['zone.js', '0.16.3']]) {
      assert.equal(context.borrowed[name].version, version);
    }
  }
  for (const mode of ['development', 'production']) {
    const tagged = contexts.get('tagged:' + mode), before = contexts.get('before:' + mode), current = contexts.get('candidate:' + mode);
    assert.ok(tagged && before && current);
    const original = tagged.observations[0], expected = structuredClone(before.observations), generic = expected[0];
    assert.equal(original.kind, 'generic-defaults'); assert.equal(original.ariaModal, true); assert.equal(original.maxWidth, '80vw');
    assert.equal(generic.ariaModal, false); assert.deepEqual(generic.maxWidth, {kind: 'undefined'});
    generic.ariaModal = original.ariaModal; generic.maxWidth = original.maxWidth;
    for (const key of ['ariaModal', 'maxWidth']) generic.completeEffectiveConfig.properties[key].value = original[key];
    assert.deepEqual(current.observations, expected, 'changed non-generic dialog default behavior');
    assert.deepEqual(tagged.observations.at(-1), {kind: 'custom-class', providerConstructionError: 'NullInjectorError',
      missingProvider: 'MatDialogConfig', ownershipOrLifecycleQualified: false});
    for (let index = 0; index < tagged.observations.length; index++) if (
      JSON.stringify(tagged.observations[index]) !== JSON.stringify(current.observations[index])) {
      differences.push({mode, tagged: tagged.observations[index], current: current.observations[index]});
    }
  }
  for (const side of ['tagged', 'before', 'candidate']) {
    assert.deepEqual(contexts.get(side + ':development').observations, contexts.get(side + ':production').observations);
  }
  assert.equal(differences.length, 12); assert.deepEqual(proof.tagged_differences_retained, differences);
  assert.deepEqual(proof.source_faults.map(fault => fault.id), ['wrong-aria-default', 'wrong-width-default']);
  for (const fault of proof.source_faults) {
    assert.equal(fault.path, member.path); assert.equal(fault.before_sha256, member.after.sha256);
    assert.notEqual(fault.mutant_sha256, member.after.sha256); assert.equal(fault.semantic_source_files, 49);
    assert.equal(fault.diagnostics, 0); assert.equal(fault.rejected, true); assert.equal(fault.exit_status, 1);
  }
  return {line, raw_product_applied: applied, targets: [{path: member.path, before_sha256: member.before.sha256,
    sha256: member.after.sha256, bytes: member.after.bytes}], preimages: new Map([[member.path, Buffer.from(member.before.text)]]),
    proposed_sources: sources, routes: configuration.routes, edges: configuration.edges, configuration, proof, ref,
    source_closures: 0, actual_native_packed_AOT_or_full_floor_qualified: false};
}
