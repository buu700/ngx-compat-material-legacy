/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual reader/writer and cached actual bodies with explicit synthetic data. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';
import {writeSyntheticNativeMotionRun} from './native-motion-run-fixture.mjs';
import {tabCompletionMotionSample} from '../tab_completion_sample.mjs';
import {samplePass, deriveMainRoster, assertCase, SOURCE_LINE} from '../../scripts/native-motion-roster.mjs';
import {engineIdentityProblems} from '../../scripts/browser-matrix-roster.mjs';
import {readEvidenceMember, validatePackedConsumerRun} from '../../scripts/upstream-packed-run-evidence.mjs';
import {validateNativeMotionRun} from '../../scripts/upstream-native-motion-run-evidence.mjs';
import {TAB_COMPLETION_SHA, TAB_COMPLETION_KIND, tabCompletionRequirements, requiresTabCompletion,
  tabCompletionMotionOkay, tabCompletionObservedOkay, validateTabCompletion} from '../../scripts/upstream-tab-completion-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), read = path => readFileSync(join(root, path));
const line = SOURCE_LINE, ts = createRequire(import.meta.url)('typescript'), definition = tabCompletionRequirements(TAB_COMPLETION_SHA, line);
assert.equal(requiresTabCompletion({sha: TAB_COMPLETION_SHA}, {}), true); assert.equal(requiresTabCompletion({}, {proof_kind: TAB_COMPLETION_KIND}), true);
assert.equal(requiresTabCompletion({}, {tab_completion_behavior: null}), true); assert.equal(requiresTabCompletion({}, {}), false);
for (const foreign of ['unknown', '__proto__', 'constructor', 'toString']) assert.equal(tabCompletionRequirements(TAB_COMPLETION_SHA, foreign), null);
assert.equal(tabCompletionRequirements('unknown', line), null); assert.equal(definition.case_ids.length, 54);
const escaped = tabCompletionRequirements(TAB_COMPLETION_SHA, line); escaped.members.length = 0; escaped.case_ids.length = 0;
assert.ok(tabCompletionRequirements(TAB_COMPLETION_SHA, line).members.length > 0); assert.equal(tabCompletionRequirements(TAB_COMPLETION_SHA, line).case_ids.length, 54);
const note = 'Synthetic validator fixture; no original-hunk/source judgment, packed/native component, compiler/floor execution, policy exception or G11 qualification.';
const entry = {sha: TAB_COMPLETION_SHA, bucket: 'behavior-semantic', subject: 'Synthetic historical tab completion fixture', final_disposition: 'do-not-adopt',
  evidence_report: 'compatibility/f10/disposition-ledger/evidence/fixture-tab-completion.json',
  individual_proof: {proof_kind: TAB_COMPLETION_KIND, diff_sha256: definition.patch, review_depth: 'individual-compatibility', affected_branches: [line], decision: note,
    peer_reference: definition.peer_reference, tab_completion_behavior: {kind: definition.kind, engines: definition.engines, runtimes: definition.runtimes,
      modes: definition.modes, case_ids: definition.case_ids, source_members: definition.members.map(path => ({path, sha256: hash(read(path))}))}}};
const review = {schema_version: 1, sha: entry.sha, line, status: 'reviewed', final_disposition: 'do-not-adopt', diff_sha256: definition.patch,
  patch_file: 'compatibility/rc/resource-style-upstream-patches/0064b4218b375b30b65bf1c13530d8620f20d980.patch',
  decision: note, semantic_pass: false, fixture_only: true, g11_claim: 'not-passed'};
entry.individual_proof.artifact_behavior = {source_members: entry.individual_proof.tab_completion_behavior.source_members};
const f = createFixture(root, {entry, review}); delete f.entry.individual_proof.artifact_behavior;
let readerCases = 0, genericRawCases = 0, tabCases = 0;
try {
  const native = await writeSyntheticNativeMotionRun(root, f, id => {
    const parts = id.split('/');
    return parts[5] === 'tabs' && parts[4] !== 'interruption-destruction' ? tabCompletionMotionSample(parts.at(-1)) : samplePass(id);
  });
  const targets = [f.entry, f.request, f.run, f.report, f.observation, native.report, native.observation], originals = targets.map(value => structuredClone(value));
  function reset(write = true) {for (const [index, target] of targets.entries()) {for (const key of Object.keys(target)) delete target[key]; Object.assign(target, structuredClone(originals[index]));} if (write) native.save();}
  const check = () => validateTabCompletion({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request});
  function negative(name, mutate, pattern = /./, noSave = false) {reset(); mutate(); if (!noSave) native.save(); const result = check();
    assert.equal(result.ok, false, name); assert.match(result.detail, pattern, name); readerCases++;}
  assert.equal(check().ok, true, JSON.stringify(check())); readerCases++;
  assert.equal(validateNativeMotionRun({root: f.root, request: f.request}).ok, true);
  const packed = validatePackedConsumerRun({root: f.root, request: f.request}); assert.equal(packed.ok, true);
  const sourceMembers = new Map(definition.members.map(path => [path, readEvidenceMember(f.root, path)]));
  const memoryRead = (_root, path) => {
    if (_root === f.root) {assert.ok(sourceMembers.has(path), path); return sourceMembers.get(path);}
    assert.equal(_root, f.runDir);
    const bytes = Buffer.from(JSON.stringify(native.observation));
    if (path === native.relative) return bytes;
    assert.equal(path, 'reports/native-motion.json'); return Buffer.from(JSON.stringify({...native.report,
      outputs: [{path: native.relative, sha256: hash(bytes), bytes: bytes.length}]}));
  };
  const executable = path => {const file = ts.createSourceFile(path, read(path).toString(), ts.ScriptTarget.Latest, true);
    assert.equal(file.parseDiagnostics.length, 0); return file.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(file).replace(/^export /, '')).join('\n');};
  const cachedNative = new Function('createHash', 'isDeepStrictEqual', 'readEvidenceMember', 'validatePackedConsumerRun', 'deriveMainRoster', 'assertCase', 'SOURCE_LINE', 'engineIdentityProblems',
    executable('scripts/upstream-native-motion-run-evidence.mjs') + ';return validateNativeMotionRun;')(
    createHash, isDeepStrictEqual, memoryRead, () => packed, deriveMainRoster, assertCase, SOURCE_LINE, engineIdentityProblems);
  const cachedTab = new Function('createHash', 'isDeepStrictEqual', 'gunzipSync', 'readEvidenceMember', 'validateNativeMotionRun',
    executable('scripts/upstream-tab-completion-evidence.mjs') + ';return validateTabCompletion;')(
    createHash, isDeepStrictEqual, gunzipSync, memoryRead, args => cachedNative(args));
  const cached = () => cachedTab({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request}); assert.equal(cached().ok, true);
  for (let index = 0; index < native.observation.cases.length; index++) {
    reset(false); native.observation.cases[index].observation.detectChangesCalls = 1;
    assert.equal(cached().ok, false); genericRawCases++;
  }
  const motionIds = definition.case_ids.filter(id => id.includes('/enabled-disabled-reduced/'));
  const mutatePair = (id, mutate) => {
    const other = id.replace('/enabled-disabled-reduced/tabs/', '/exactly-once-notification/tabs/animationDone/');
    for (const target of [id, other]) mutate(native.observation.cases.find(row => row.case_id === target).observation);
  };
  for (const id of motionIds) {
    const mode = id.split('/').at(-1);
    const mutations = [value => {value.selector = 'wrapper';}, value => {value.selectorMatches = false;}, value => {value.finalState = 'hidden';},
      value => {value.notifications = 2;}, value => {value.detectChangesCalls = 1;}, value => {value.duplicateEndEventsDispatched = false;},
      value => {value.durationMs = mode === 'enabled' ? 0 : 500;}, value => {value.native_transition = null;},
      value => {value.native_transition.same_target_after = false;}, value => {value.native_transition.completion_at_ms = -1;},
      value => {value.native_transition.cleanup.subscription_closed = false;}, value => {value.native_transition.cleanup.listeners_removed = false;},
      value => {value.native_transition.duplicate_end_controls.pop();}];
    for (let index = 0; index < 2; index++) for (const [field, wrong] of [['type', 'transitioncancel'], ['trusted', true], ['property', 'opacity'],
      ['same_target', false], ['connected', false], ['at_ms', -1], ['elapsed_ms', 1]])
      mutations.push(value => {value.native_transition.duplicate_end_controls[index][field] = wrong;});
    if (mode === 'enabled') {
      mutations.push(value => {value.native_transition.trusted_events = [];}, value => {value.native_transition.completion_at_ms = 5;},
        value => {value.native_transition.trusted_events.reverse();}, value => {value.native_transition.completion_at_ms = 400;});
      for (let index = 0; index < 2; index++) for (const [field, wrong] of [['type', 'transitioncancel'], ['trusted', false], ['property', 'opacity'],
        ['same_target', false], ['connected', false], ['at_ms', -1]]) mutations.push(value => {value.native_transition.trusted_events[index][field] = wrong;});
      mutations.push(value => {value.native_transition.trusted_events[0].elapsed_ms = 1;}, value => {value.native_transition.trusted_events[1].elapsed_ms = 1;},
        value => {value.native_transition.trusted_events[1].elapsed_ms = 490;}, value => {value.native_transition.trusted_events[1].at_ms = 1;});
    } else mutations.push(value => {value.native_transition.trusted_events = structuredClone(tabCompletionMotionSample('enabled').native_transition.trusted_events);});
    for (const mutate of mutations) {
      reset(false); mutatePair(id, mutate);
      assert.equal(tabCompletionObservedOkay(native.observation.cases, line), false); assert.equal(cached().ok, false); tabCases++;
    }
    reset(false); const target = native.observation.cases.find(row => row.case_id === id).observation;
    target.native_transition.completion_at_ms += 0.5; // Both values still independently valid; only the physical observation pair differs.
    assert.equal(tabCompletionMotionOkay(target, mode), true); assert.equal(cached().ok, false); tabCases++;
  }
  for (const id of definition.case_ids.filter(id => id.includes('/interruption-destruction/'))) {
    for (const [field, wrong] of [['detectChangesCalls', 1], ['durationMs', 0], ['finalState', 'hidden'], ['animating', true]]) {
      reset(false); native.observation.cases.find(row => row.case_id === id).observation[field] = wrong; assert.equal(cached().ok, false); tabCases++;
    }
  }
  negative('foreign-sha', () => {f.entry.sha = '0'.repeat(40);}, /unregistered/);
  negative('wrong-kind', () => {f.entry.individual_proof.proof_kind = 'ordinary-source';}, /unregistered/);
  negative('wrong-patch', () => {f.entry.individual_proof.diff_sha256 = '0'.repeat(64);}, /unregistered/);
  negative('wrong-peer', () => {f.entry.individual_proof.peer_reference.version = '16.2.14';}, /peer reference/);
  negative('foreign-line', () => {f.request.line = line === 'main' ? '21.x' : 'main';}, /completion scope/);
  for (const field of ['kind', 'engines', 'runtimes', 'modes', 'case_ids'])
    negative('scope-' + field, () => {f.entry.individual_proof.tab_completion_behavior[field] = null;}, /completion scope/);
  negative('missing-source', () => {f.entry.individual_proof.tab_completion_behavior.source_members.pop();}, /source scope/);
  negative('duplicate-source', () => {f.entry.individual_proof.tab_completion_behavior.source_members[0] = f.entry.individual_proof.tab_completion_behavior.source_members[1];}, /source scope/);
  negative('stale-source', () => {f.entry.individual_proof.tab_completion_behavior.source_members[0].sha256 = '0'.repeat(64);}, /stale/);
  negative('failed-packed', () => {f.request.packedConsumerExecution.exit_code = 1;}, /packed invocation/);
  negative('missing-packed', () => {delete f.request.packedConsumerExecution;}, /packed invocation/);
  negative('missing-native', () => {delete f.request.nativeMotionExecution;}, /native-motion invocation/);
  negative('failed-native', () => {f.request.nativeMotionExecution.exit_code = 1;}, /native-motion invocation/);
  negative('foreign-native', () => {f.request.nativeMotionExecution.invocation_id = 'foreign';}, /report subject/);
  negative('foreign-native-run', () => {f.request.nativeMotionExecution.run_id = 'foreign';}, /native-motion invocation/);
  negative('invalid-native-invocation', () => {f.request.nativeMotionExecution.invocation_id = '../foreign';}, /native-motion invocation/);
  for (const [field, value] of [['schema_version', 2], ['template', true], ['check_id', 'other'], ['line', 'other'], ['run_id', 'other'], ['invocation_id', 'other']])
    negative('native-report-identity-' + field, () => {native.report[field] = value;}, /report subject/);
  negative('native-report-binding', () => {native.report.binding.source_tree = '0'.repeat(40);}, /report subject/);
  for (const [field, value] of [['result', 'fail'], ['coverage', 'slice'], ['exit_code', 1], ['subject_kind', 'source'], ['subject_ids', ['other']]])
    negative('native-report-' + field, () => {native.report[field] = value;}, /native-motion result/);
  for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids'])
    negative('native-roster-' + field, () => {native.report[field].pop();}, /incomplete native-motion/);
  for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions'])
    negative('native-unresolved-' + field, () => {native.report[field].push('unresolved');}, /unresolved native-motion/);
  negative('native-counts', () => {native.report.passed--;}, /counts/);
  negative('wrong-native-library', () => {native.report.artifacts.library.sha256 = '0'.repeat(64);}, /native-motion result/);
  for (const [field, value] of [['kind', 'marker'], ['check_id', 'other'], ['run_id', 'other'], ['invocation_id', 'other'],
    ['library_sha256', '0'.repeat(64)], ['source_clean', false], ['source_commit', '0'.repeat(40)], ['source_tree', '0'.repeat(40)]])
    negative('native-raw-' + field, () => {native.observation[field] = value;}, /assertion subject/);
  negative('missing-report-assertion', () => {native.report.case_results.pop();}, /report assertions/);
  negative('foreign-report-output', () => {native.report.case_results[0].output_paths = ['foreign'];}, /report assertions/);
  negative('missing-raw-case', () => {native.observation.cases.pop();}, /raw native-motion/);
  negative('duplicate-raw-case', () => {native.observation.cases[0] = native.observation.cases[1];}, /raw native-motion/);
  negative('rehashed-marker', () => {native.observation.cases[0].observation = true;}, /raw native-motion/);
  negative('rehashed-early-completion', () => {mutatePair(motionIds[0], value => {value.native_transition.completion_at_ms = 1;});}, /tab completion native/);
  negative('cross-event-pair', () => {native.observation.cases.find(row => row.case_id === motionIds[0]).observation.native_transition.completion_at_ms += 0.5;}, /tab completion native/);
  for (const engine of ['chromium', 'firefox', 'webkit']) negative('missing-engine-' + engine, () => {delete native.observation.engines[engine];}, /engine\/coverage/);
  negative('Safari-claim', () => {native.observation.safari_certification = true;}, /engine\/coverage/);
  negative('foreign-engine', () => {native.observation.engines.safari = native.observation.engines.webkit;}, /engine\/coverage/);
  negative('changed-NA', () => {native.observation.not_applicable.push({component: 'tabs', reason: 'skip completion'});}, /engine\/coverage/);
  negative('changed-per-group', () => {native.observation.per_group['exactly-once-notification']--;}, /engine\/coverage/);
  negative('changed-per-engine', () => {native.observation.per_engine.chromium--;}, /engine\/coverage/);
  negative('tampered-native-output', () => {f.runPut(native.relative, '{}');}, /bytes\/hash/, true);
  reset(); const path = definition.peer_reference.path, peerBytes = readEvidenceMember(f.root, path);
  try {const changed = Buffer.concat([peerBytes, Buffer.from(' ')]); f.repoPut(path, changed);
    f.entry.individual_proof.tab_completion_behavior.source_members.find(row => row.path === path).sha256 = hash(changed); native.save();
    assert.match(check().detail, /wrong tab completion peer bytes/); readerCases++;
  } finally {f.repoPut(path, peerBytes);}
} finally {f.dispose();}
const report = {schema_version: 1, line, full_packed_roster: 106, full_native_roster: 306, required_tab_cases: 54,
  actual_reader_writer_controls: readerCases, cached_actual_full_native_raw_controls: genericRawCases, cached_actual_tab_semantic_controls: tabCases,
  synthetic_input_and_review: true, actual_source_judgment_completed_by_this_test: false, root_dispatch_integrated: false,
  coordinator_capture_integrated: false, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed',
  helper_sha256: hash(read('scripts/upstream-tab-completion-evidence.mjs')), native_helper_sha256: hash(read('scripts/upstream-native-motion-run-evidence.mjs')),
  producer_sha256: hash(read('tests/upstream/tab-completion-admission.mjs'))};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
