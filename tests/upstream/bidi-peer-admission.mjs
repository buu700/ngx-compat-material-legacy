/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual reader/CLI/source controls with explicitly synthetic packed input. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';
import {BIDI_BEHAVIOR_KIND, BIDI_BEHAVIOR_SHAS, bidiBehaviorRequirements, requiresBidiBehavior, validateBidiBehavior} from '../../scripts/upstream-bidi-evidence.mjs';
import {BIDI_SCOPE_CASE_ID, packedLegacyBidiScopeCase} from '../../scripts/bidi-isolated-packed-contract.mjs';
import {validatePackedConsumerRun, readEvidenceMember} from '../../scripts/upstream-packed-run-evidence.mjs';
import {inspectBidiPeerJudgments} from '../../scripts/bidi-peer-source-judgments.mjs';
import {reverseBidiPeerSource, readBidiPeerReviewSubject} from '../../scripts/bidi-peer-source-context.mjs';
import {isolatedBidiPackedSample} from '../bidi_isolated_packed_sample.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), read = path => readFileSync(join(root, path));
const ts = createRequire(import.meta.url)('typescript'), judgments = inspectBidiPeerJudgments({root}), line = judgments.proof.line;
assert.equal(judgments.entries.length, 10); assert.equal(judgments.proof.original_hunk_and_role_decisions_retained, true);
assert.equal(judgments.proof.unchanged_product_members, 1141); assert.equal(judgments.proof.earlier_context_receipts_requalified.length, 10);
for (const sha of BIDI_BEHAVIOR_SHAS) assert.equal(requiresBidiBehavior({sha}, {}), true);
assert.equal(requiresBidiBehavior({}, {proof_kind: BIDI_BEHAVIOR_KIND}), true);
assert.equal(requiresBidiBehavior({}, {bidi_behavior: null}), true); assert.equal(requiresBidiBehavior({}, {}), false);
assert.equal(bidiBehaviorRequirements('unknown', line), null); assert.equal(bidiBehaviorRequirements(BIDI_BEHAVIOR_SHAS[0], 'unknown'), null);
for (const foreign of ['__proto__', 'constructor', 'toString']) assert.equal(bidiBehaviorRequirements(BIDI_BEHAVIOR_SHAS[0], foreign), null);
const unrelated = Buffer.from('unrelated source member');
assert.equal(readBidiPeerReviewSubject('unrelated', path => {assert.equal(path, 'unrelated'); return unrelated;}), unrelated);
const escaped = bidiBehaviorRequirements(BIDI_BEHAVIOR_SHAS[0], line); escaped.members.length = 0;
assert.ok(bidiBehaviorRequirements(BIDI_BEHAVIOR_SHAS[0], line).members.length > 0);
const sample = isolatedBidiPackedSample(); assert.equal(packedLegacyBidiScopeCase(sample).result, 'pass');
const guard = ts.createSourceFile('guard.mjs', read('scripts/upstream-bidi-evidence.mjs').toString(), ts.ScriptTarget.Latest, true);
const executable = guard.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(guard).replace(/^export /, '')).join('\n');
let helperCases = 0, semanticCases = 0, cliCases = 0, sourceCases = 0;
for (const sha of BIDI_BEHAVIOR_SHAS) {
  const entry = structuredClone(judgments.entries.find(row => row.sha === sha)), review = JSON.parse(judgments.writes.get(entry.evidence_report));
  entry.individual_proof.artifact_behavior = {source_members: entry.individual_proof.bidi_behavior.source_members};
  const f = createFixture(root, {entry, review}); delete f.entry.individual_proof.artifact_behavior;
  const selected = () => f.observation.cases.find(row => row.case_id === BIDI_SCOPE_CASE_ID);
  function assign(value) {
    Object.assign(selected(), packedLegacyBidiScopeCase(value), {legacy_harness_passed: true});
    f.observation.extra.harness.legacyBidiScope = true; f.observation.extra.harness.isolatedLegacyBidi = structuredClone(value);
  }
  assign(sample); f.save();
  const targets = [f.entry, f.request, f.run, f.report, f.observation], originals = targets.map(value => structuredClone(value));
  function reset(write = true) {for (const [i, target] of targets.entries()) {for (const key of Object.keys(target)) delete target[key]; Object.assign(target, structuredClone(originals[i]));} if (write) f.save();}
  const check = () => validateBidiBehavior({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request});
  function negative(name, mutate, pattern = /./, noSave = false) {
    reset(); mutate(); if (!noSave) f.save(); const result = check(); assert.equal(result.ok, false, name); assert.match(result.detail, pattern, name); helperCases++;
  }
  try {
    assert.equal(check().ok, true, JSON.stringify(check())); helperCases++;
    const prerequisite = validatePackedConsumerRun({root: f.root, request: f.request}); assert.equal(prerequisite.ok, true);
    const members = new Map(bidiBehaviorRequirements(sha, line).members.map(path => [path, readEvidenceMember(f.root, path)]));
    const cached = new Function('createHash', 'gunzipSync', 'isDeepStrictEqual', 'readEvidenceMember', 'validatePackedConsumerRun',
      'BIDI_SCOPE_CASE_ID', 'packedLegacyBidiScopeCase', executable + '\nreturn validateBidiBehavior;')(
      createHash, gunzipSync, isDeepStrictEqual, (_root, path) => {assert.ok(members.has(path)); return members.get(path);},
      () => ({...prerequisite, observation: f.observation}), BIDI_SCOPE_CASE_ID, packedLegacyBidiScopeCase);
    const semantic = () => cached({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request});
    assert.equal(semantic().ok, true);
    const mutations = [value => {value.execution = 'marker';}, value => {value.error = 'failure';}, value => {value.public_dir_instance = false;},
      value => {value.node_instances_distinct_from_root = false;}, value => {value.states.pop();}, value => {value.states.reverse();},
      value => {value.cleanup.view_destroyed = false;}, value => {value.cleanup.output_completions = 0;}, value => {value.cleanup.subscription_closed = false;}];
    for (let index = 0; index < sample.states.length; index++) {
      for (const field of ['stage', 'bound_value', 'normalized', 'host_attribute']) mutations.push(value => {value.states[index][field] = 'wrong';});
      for (const field of ['same_dir_instance', 'field_provider_is_dir', 'input_provider_is_dir', 'legacy_field_structure', 'legacy_input_structure']) mutations.push(value => {value.states[index][field] = false;});
      mutations.push(value => {value.states[index].events.push('extra');});
    }
    for (const mutate of mutations) {reset(false); const bad = structuredClone(sample); mutate(bad); assign(bad); selected().result = 'pass';
      assert.equal(semantic().ok, false); semanticCases++;}
    for (const absent of [undefined, null, true, [], {}, 'pass']) {reset(false); assign(absent); selected().result = 'pass'; assert.equal(semantic().ok, false); semanticCases++;}
    negative('foreign-sha', () => {f.entry.sha = '0'.repeat(40);}, /unregistered/);
    negative('renamed-kind', () => {f.entry.individual_proof.proof_kind = 'ordinary-review';}, /unregistered/);
    negative('wrong-patch', () => {f.entry.individual_proof.diff_sha256 = '0'.repeat(64);}, /unregistered/);
    negative('wrong-scope', () => {f.entry.individual_proof.bidi_behavior.kind = 'other';}, /wrong .* scope/);
    negative('foreign-case', () => {f.entry.individual_proof.bidi_behavior.case_ids = ['foreign'];}, /wrong .* scope/);
    negative('wrong-peer-version', () => {f.entry.individual_proof.installed_member.version = '16.2.14';}, /installed member/);
    negative('wrong-peer-bytes', () => {f.entry.individual_proof.installed_member.sha256 = '0'.repeat(64);}, /installed member/);
    negative('wrong-delegation', () => {f.entry.individual_proof.reachable_behavior.id = 'foreign';}, /delegation/);
    negative('wrong-line', () => {f.request.line = line === 'main' ? '21.x' : 'main';}, /installed member/);
    negative('missing-source', () => {f.entry.individual_proof.bidi_behavior.source_members.pop();}, /source scope/);
    negative('duplicate-source', () => {f.entry.individual_proof.bidi_behavior.source_members[0] = f.entry.individual_proof.bidi_behavior.source_members[1];}, /source scope/);
    negative('stale-source', () => {f.entry.individual_proof.bidi_behavior.source_members[0].sha256 = '0'.repeat(64);}, /stale/);
    negative('missing-child', () => {delete f.request.packedConsumerExecution;}, /packed invocation/);
    negative('failed-child', () => {f.request.packedConsumerExecution.exit_code = 7;}, /packed invocation/);
    negative('passing-slice', () => {f.report.coverage = 'slice';}, /packed result/);
    negative('foreign-library', () => {f.report.artifacts.library.sha256 = '0'.repeat(64);}, /packed result/);
    negative('omitted-case', () => {f.observation.cases = f.observation.cases.filter(row => row.case_id !== BIDI_SCOPE_CASE_ID);}, /observed cases/);
    negative('marker-case', () => {selected().observation = null;}, /isolated/);
    negative('raw-selected-mismatch', () => {f.observation.extra.harness.isolatedLegacyBidi.states.reverse();}, /isolated/);
    negative('old-mixed-failed', () => {f.observation.extra.harness.legacyBidiScope = false;}, /isolated/);
    negative('old-collector-failed', () => {selected().legacy_harness_passed = false;}, /isolated/);
    negative('tampered-output', () => {f.runPut(f.relative, '{}');}, /bytes\/hash/, true);
    reset();
    const peerPath = f.entry.individual_proof.installed_member.path, peerBytes = readFileSync(join(f.root, peerPath));
    try {
      const changed = Buffer.concat([peerBytes, Buffer.from(' ')]); f.repoPut(peerPath, changed);
      f.entry.individual_proof.bidi_behavior.source_members.find(row => row.path === peerPath).sha256 = hash(changed);
      f.save(); assert.equal(check().ok, false); assert.match(check().detail, /wrong public bidi peer bytes/); helperCases++;
    } finally {f.repoPut(peerPath, peerBytes);}
    const out = join(f.runDir, 'evidence/upstream-audit-disposition/synthetic-bidi'); mkdirSync(out, {recursive: true});
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('RC_')));
    function cli(name, mutate, expected) {
      reset(); mutate?.(); f.save(); f.runPut('seed.json', {commits: [{sha}], fixture_only: true}); f.runPut('ledger.json', {entries: [f.entry], fixture_only: true, g11_claim: 'not-passed'});
      const reportPath = join(f.runDir, name + '.json'), env = {...environment, RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: f.request.runId,
        RC_INVOCATION_ID: 'synthetic-bidi', RC_EVIDENCE_BINDING: JSON.stringify(f.request.binding), RC_ASSERTION_OUTPUT_DIR: out,
        RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(f.request.packedConsumerExecution ?? null)};
      const child = spawnSync(process.execPath, [join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
        '--seed', join(f.runDir, 'seed.json'), '--ledger', join(f.runDir, 'ledger.json'), '--symbols', join(f.root, 'symbols.json'),
        '--current-symbols', join(f.root, 'current.json'), '--report', reportPath], {cwd: f.root, env, encoding: 'utf8', timeout: 30000});
      assert.ok([0, 1].includes(child.status), child.stderr); const observed = JSON.parse(readFileSync(reportPath));
      assert.equal(child.status === 0, expected, name + ': ' + child.stderr + JSON.stringify(observed.artifact_behavior_evidence));
      assert.equal(observed.g11_claim, 'not-passed'); assert.equal(observed.authored_use_review_evidence.insufficient, 0);
      if (expected) {const owned = JSON.parse(readFileSync(join(out, 'disposition-observations.json'))); assert.deepEqual(owned.artifact_behavior_evidence, observed.artifact_behavior_evidence);}
      cliCases++;
    }
    cli('complete', null, true); cli('missing-child', () => {delete f.request.packedConsumerExecution;}, false);
    cli('failed-child', () => {f.request.packedConsumerExecution.exit_code = 7;}, false);
    cli('forged-rich-state', () => {assign({...structuredClone(sample), public_dir_instance: false}); selected().result = 'pass';}, false);
    cli('marker', () => {selected().observation = true;}, false);
    cli('relabeled-irrelevant', () => {f.entry.final_disposition = 'irrelevant'; f.entry.individual_proof.proof_kind = 'ordinary-source';}, false);
    cli('removed-proof', () => {f.entry.final_disposition = 'irrelevant'; delete f.entry.individual_proof;}, false);
    cli('wrong-installed-peer', () => {f.entry.individual_proof.installed_member.version = '16.2.14';}, false);
  } finally {f.dispose();}
}
const inputPath = 'compatibility/rc/bidi-peer-admission-inputs.json', inputs = JSON.parse(read(inputPath));
for (const path of [inputPath, inputs.prior.path, inputs.source_evidence[0].path, inputs.originals[0].path,
  'scripts/check-upstream-audit-disposition.mjs', 'tests/upstream/identity-source-context.mjs', 'tests/bidi_isolated_requalification_probe.mjs',
  'projects/ngx-material-legacy/legacy-form-field/internal/common-module.ts']) {
  const corrupt = Buffer.concat([read(path), Buffer.from('\n')]);
  assert.throws(() => inspectBidiPeerJudgments({root, readMember: name => name === path ? corrupt : read(name)})); sourceCases++;
}
for (const change of inputs.source_changes) {
  assert.equal(hash(reverseBidiPeerSource(change.path, read(change.path).toString())), change.before_sha256);
  assert.throws(() => reverseBidiPeerSource(change.path, read(change.path).toString() + '\n')); sourceCases++;
}
const report = {schema_version: 1, line, finite_subjects: 2, full_packed_roster: 106, actual_helper_controls: helperCases,
  cached_actual_body_semantic_controls: semanticCases, actual_CLI_controls: cliCases, source_corruptions_rejected: sourceCases,
  unchanged_product_members: 1141, existing_roles_requalified: 167, earlier_context_receipts_requalified: judgments.proof.earlier_context_receipts_requalified.length,
  actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed',
  helper_sha256: hash(read('scripts/upstream-bidi-evidence.mjs')), producer_sha256: hash(read('tests/upstream/bidi-peer-admission.mjs'))};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
