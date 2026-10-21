/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Authenticate the historical preparation epoch after fully qualifying the current owner. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {currentOverlayCallerFacts} from '../scripts/snack-dom-source-context-review.mjs';
import {snackDomSourceContext} from '../scripts/snack-dom-source-context.mjs';

const root = process.cwd(), raw = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const pins = {main: 'c2153a44a1514c7ab1969b93247e8d79fbc9b0bfe4a753324262e5e2e899ece5', '21.x': '8c7dd372a283b22a57df52ba404980c3fc390ee20cf85dfa428099acfe097eed'};
const line = JSON.parse(raw('compatibility/rc/overlay-caller-roles-worksheet.json')).line;
const path = 'compatibility/rc/overlay-caller-roles-public-' + (line === 'main' ? 'main' : '21') + '-v2.json';
const ownerEpoch = {main: '1b8bddffeb5e4b0524b185ce4b6e2031e4accf88', '21.x': 'ce9f09ddcad7168b6e45e97776b5668f9c21a01a'};
const ownerInputs = new Set(['scripts/snack-dom-source-context-review.mjs', 'scripts/snack-dom-source-context.mjs', 'compatibility/rc/snack-dom-source-context-inputs.json', 'compatibility/rc/snack-dom-source-context-product-inputs.json']);
const epochInputs = new Map();
const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
function inspect(read = raw) {
  const bytes = read(path); assert.equal(hash(bytes), pins[line], 'overlay preparation evidence changed');
  const proof = JSON.parse(bytes); assert.equal(proof.line, line);
  // This packet recorded the preliminary owner's exact historical bytes.
  // It never substitutes them for current product/native/source admission.
  const current = snackDomSourceContext({root, read}); assert.equal(current.members, 15);
  for (const member of proof.inputs) {
    if (!ownerInputs.has(member.path)) assert.equal(hash(read(member.path)), member.sha256, 'changed overlay evidence input ' + member.path);
    else {
      if (member.path === 'scripts/snack-dom-source-context.mjs') assert.equal(hash(read(member.path)), hash(raw(member.path)), 'changed current reader input');
      if (!epochInputs.has(member.path)) epochInputs.set(member.path, execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show', ownerEpoch[line] + ':' + member.path], {cwd: root, maxBuffer: 4 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}}));
      assert.equal(hash(epochInputs.get(member.path)), member.sha256, 'unauthenticated historical owner input');
    }
  }
  const {prior, facts} = currentOverlayCallerFacts({root, read});
  assert.deepEqual(facts.map(f => ({file: f.file, symbol: f.symbol, source_sha256: f.candidate_source_sha256,
    unused: f.unused_import, tooltip_current_source: !!f.tooltip_product_qualification})), proof.facts);
  assert.equal(facts.length, 48); assert.equal(facts.filter(f => f.tooltip_product_qualification).length, 8);
  assert.equal(facts.filter(f => f.unused_import).length, 1);
  assert.equal(proof.factory_sources.length, 5); assert.ok(proof.factory_sources.every(f => f.bodies_identical));
  assert.equal(proof.type_subjects.length, 3);
  for (const subject of proof.type_subjects) {
    assert.deepEqual([subject.Core, subject.CDK], versions[subject.line]);
    assert.ok(subject.strict); assert.equal(subject.skipLibCheck, false); assert.equal(subject.diagnostics, 0);
    assert.equal(subject.factory_declarations_compiled, 10); assert.equal(subject.negative_type_controls.length, 3);
    assert.ok(subject.members.length >= 89); assert.deepEqual(subject.gaps, []);
    assert.ok([...subject.symbols, ...subject.members].every(m => m.tags.every(t => !['deprecated', 'docs-private', 'experimental', 'developerPreview', 'breaking-change'].includes(t))));
    assert.equal(subject.fixture_uses_configuration_sizing, true);
    assert.equal(subject.deprecated_fixture_sizing_mutant_rejected, true);
    assert.equal(subject.argument_dependent_overloads_qualified, false);
    assert.equal(subject.whole_current_caller_source_compiled, false);
  }
  assert.equal(proof.runtime_subjects.length, 10);
  const contexts = new Set();
  for (const subject of proof.runtime_subjects) {
    assert.deepEqual([subject.Core, subject.CDK], versions[subject.line]);
    contexts.add([subject.line, subject.zoneMode, subject.mode].join(':'));
    assert.equal(subject.cases.length, 16); assert.ok(subject.synthetic_server_renderer_and_location_protocol);
    assert.equal(subject.actual_native_packed_AOT_or_full_floor_qualified, false);
    assert.deepEqual(subject.observations, proof.runtime_subjects[0].observations);
    assert.equal(subject.server_block_scroll_is_not_native_browser_equivalence, true);
    assert.equal(subject.server_block_scroll_observations.length, 2);
    assert.ok(subject.server_block_scroll_observations.every(r => r.enabled && r.family === 'dialog'));
  }
  assert.equal(contexts.size, 10);
  for (const sdkLine of ['original', 'main', '21.x']) for (const zoneMode of sdkLine === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) {
    for (const mode of ['development', 'production']) assert.ok(contexts.has([sdkLine, zoneMode, mode].join(':')));
  }
  assert.equal(proof.runtime_fault_controls.length, 6); assert.ok(proof.runtime_fault_controls.every(c => c.rejected));
  assert.equal(proof.canonical_source_closures_integrated, 0);
  assert.equal(proof.whole_current_caller_source_compiled, false);
  assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified, false); assert.equal(proof.g11_claim, 'not-passed');
  return {prior, proof};
}
const {prior, proof} = inspect();
const controls = [path, 'scripts/overlay-caller-public-evidence.mjs', 'scripts/snack-dom-source-context-review.mjs',
  'scripts/overlay-caller-roles.mjs', 'scripts/snack-dom-source-context.mjs', 'tests/overlay_caller_roles_subject.mjs',
  'compatibility/rc/overlay-caller-factory-reference.json', 'compatibility/rc/overlay-caller-public-subjects.json',
  'compatibility/rc/snack-dom-source-context-inputs.json',
  'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  ...proof.inputs.filter(m => m.path.startsWith('compatibility/rc/overlay-caller-factory-reference/')).map(m => m.path),
  proof.inputs.find(m => m.path.startsWith('compatibility/rc/overlay-caller-public-sources/')).path];
for (const target of controls) {
  assert.throws(() => inspect(member => member === target ? Buffer.concat([raw(member), Buffer.from('\nchanged')]) : raw(member)), /AssertionError/);
}
let target = null;
const lateRead = member => member === target ? Buffer.concat([raw(member), Buffer.from('\nlate')]) : raw(member);
inspect(lateRead);
for (target of ['projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts', controls.at(-1)]) assert.throws(() => inspect(lateRead), /AssertionError/);
for (const ledger of prior.ledgers) {
  const committed = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show', 'HEAD:' + ledger.path],
    {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
  assert.equal(hash(raw(ledger.path)), hash(committed), 'preparation changed canonical ledger ' + ledger.path);
}
const summary = {line, routes: 48, tooltip_current_routes: 8, public_type_models: 3,
  traced_members_per_model: proof.type_subjects.map(s => s.members.length), negative_type_controls: 9, deprecated_fixture_sizing_mutants_rejected: 3,
  complete_factories: 5, genuine_runtime_contexts: 10, bounded_runtime_cases: 160,
  runtime_source_mutants_rejected: 6, evidence_corruptions_rejected: controls.length, late_changes_rejected: 2,
  canonical_ledgers_preserved: true, canonical_source_closures_integrated: 0, historical_preparation_epoch_authenticated: true, current_source_owner_fully_qualified: true,
  actual_native_packed_AOT_or_full_floor_qualified: false};
const output = JSON.stringify(summary);
if (process.argv[2]) writeFileSync(process.argv[2], output + '\n', {flag: 'wx'});
console.log(output);
