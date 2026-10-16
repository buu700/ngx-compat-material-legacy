/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual reader/writer controls; root dispatch/source judgment not integrated. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';
import {writeSyntheticBrowserRun} from './browser-run-fixture.mjs';
import {formFieldHoverSample} from '../form_field_hover_sample.mjs';
import {formFieldStateTokensOkay} from '../../scripts/form-field-state-style-observation.mjs';
import {validateBrowserMatrixRun} from '../../scripts/upstream-browser-run-evidence.mjs';
import {readEvidenceMember} from '../../scripts/upstream-packed-run-evidence.mjs';
import {FORM_FIELD_HOVER_SHA, FORM_FIELD_HOVER_KIND, formFieldHoverRequirements, requiresFormFieldHover,
  formFieldHoverObservedOkay, validateFormFieldHover} from '../../scripts/upstream-form-field-hover-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), read = path => readFileSync(join(root, path));
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const ts = createRequire(import.meta.url)('typescript'), definition = formFieldHoverRequirements(FORM_FIELD_HOVER_SHA, line), sample = formFieldHoverSample();
assert.equal(requiresFormFieldHover({sha: FORM_FIELD_HOVER_SHA}, {}), true);
assert.equal(requiresFormFieldHover({}, {proof_kind: FORM_FIELD_HOVER_KIND}), true); assert.equal(requiresFormFieldHover({}, {form_field_hover_behavior: null}), true);
assert.equal(requiresFormFieldHover({}, {}), false); assert.equal(formFieldHoverRequirements('unknown', line), null);
for (const foreign of ['unknown', '__proto__', 'constructor', 'toString']) assert.equal(formFieldHoverRequirements(FORM_FIELD_HOVER_SHA, foreign), null);
const escaped = formFieldHoverRequirements(FORM_FIELD_HOVER_SHA, line); escaped.members.length = 0; escaped.themes.reverse();
assert.ok(formFieldHoverRequirements(FORM_FIELD_HOVER_SHA, line).members.length > 0);
assert.deepEqual(formFieldHoverRequirements(FORM_FIELD_HOVER_SHA, line).themes, ['peer-form-hover', 'peer-form-hover-dark']);
assert.equal(formFieldHoverObservedOkay(sample, 'c'.repeat(64)), true);
const note = 'Synthetic validator fixture; no whole-patch source judgment, actual native CSS, artifact, compiler, floor or G11 qualification.';
const entry = {sha: FORM_FIELD_HOVER_SHA, bucket: 'behavior-semantic', subject: 'Synthetic historical field hover fixture', final_disposition: 'do-not-adopt',
  evidence_report: 'compatibility/f10/disposition-ledger/evidence/fixture-form-hover.json',
  individual_proof: {proof_kind: FORM_FIELD_HOVER_KIND, diff_sha256: definition.patch, review_depth: 'individual-compatibility', affected_branches: [line], decision: note,
    installed_member: definition.installed_member, form_field_hover_behavior: {kind: definition.kind, runtimes: definition.runtimes, themes: definition.themes,
      source_members: definition.members.map(path => ({path, sha256: hash(read(path))}))}}};
const review = {schema_version: 1, sha: entry.sha, line, status: 'reviewed', final_disposition: 'do-not-adopt', diff_sha256: definition.patch,
  patch_file: 'compatibility/f10/disposition-ledger/evidence/patches/cf456a2d43837497367662e7de22f1b2bcbf4f00-whole-form-hover.patch',
  decision: note, semantic_pass: false, fixture_only: true, g11_claim: 'not-passed'};
entry.individual_proof.artifact_behavior = {source_members: entry.individual_proof.form_field_hover_behavior.source_members};
const f = createFixture(root, {entry, review}); delete f.entry.individual_proof.artifact_behavior;
let readerCases = 0, semanticCases = 0;
try {
  const browser = await writeSyntheticBrowserRun(root, f, () => ({peer_form_hover: structuredClone(sample), progress_csp: {compiled_css_sha256: 'c'.repeat(64)}}));
  const targets = [f.entry, f.request, f.run, f.report, f.observation, browser.report, browser.observation], originals = targets.map(value => structuredClone(value));
  function reset(write = true) {for (const [index, target] of targets.entries()) {for (const key of Object.keys(target)) delete target[key]; Object.assign(target, structuredClone(originals[index]));} if (write) browser.save();}
  const check = () => validateFormFieldHover({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request});
  const native = runtime => browser.observation.closeout_diagnostics[runtime].observation;
  function negative(name, mutate, pattern = /./, noSave = false) {reset(); mutate(); if (!noSave) browser.save(); const result = check();
    assert.equal(result.ok, false, name); assert.match(result.detail, pattern, name); readerCases++;}
  assert.equal(check().ok, true, JSON.stringify(check())); readerCases++;
  const prerequisite = validateBrowserMatrixRun({root: f.root, request: f.request}); assert.equal(prerequisite.ok, true, prerequisite.detail);
  const file = ts.createSourceFile('guard.mjs', read('scripts/upstream-form-field-hover-evidence.mjs').toString(), ts.ScriptTarget.Latest, true);
  const executable = file.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(file).replace(/^export /, '')).join('\n');
  const bytes = new Map(definition.members.map(path => [path, readEvidenceMember(f.root, path)]));
  const cached = new Function('createHash', 'isDeepStrictEqual', 'gunzipSync', 'readEvidenceMember', 'validateBrowserMatrixRun', 'formFieldStateTokensOkay',
    executable + ';return validateFormFieldHover;')(createHash, isDeepStrictEqual, gunzipSync,
    (_root, path) => {assert.ok(bytes.has(path)); return bytes.get(path);}, () => ({...prerequisite, observation: browser.observation}), formFieldStateTokensOkay);
  const mutations = [value => {value.hover_media = false;}, value => {value.state_tokens_okay = false;},
    value => {value.compiled_theme_css_sha256 = 'd'.repeat(64);}, value => {value.state_token_scenarios.reverse();},
    value => {value.state_token_scenarios.pop();}, value => {value.state_token_scenarios.push(value.state_token_scenarios[0]);}];
  for (const top of ['baseline', 'wrapper', 'hint']) for (const field of ['present', 'overlay_present', 'host_hovered', 'wrapper_hovered', 'focused',
    'opacity', 'background_color', 'state_layer_color', 'hover_token', 'focus_token']) mutations.push(value => {value[top][field] = 'wrong';});
  for (let index = 0; index < sample.state_token_scenarios.length; index++) {
    mutations.push(value => {value.state_token_scenarios[index].id = 'wrong';});
    for (const stage of ['baseline', 'wrapper', 'hint', 'focus', 'negative', 'restored'])
      for (const field of ['present', 'overlay_present', 'host_hovered', 'wrapper_hovered', 'focused', 'opacity', 'background_color', 'state_layer_color', 'hover_token', 'focus_token'])
        mutations.push(value => {value.state_token_scenarios[index][stage][field] = 'wrong';});
  }
  for (const context of [-1, 0, 1]) {
    const target = value => context === -1 ? value : value.state_token_scenarios[context];
    for (const stage of ['wrapper', 'hint']) for (const [field, wrong] of [['x', null], ['y', null], ['width', 0], ['height', 0]])
      mutations.push(value => {target(value)[stage].point[field] = wrong;});
    mutations.push(value => {target(value).hint.point = structuredClone(target(value).wrapper.point);});
  }
  for (const runtime of definition.runtimes) {
    for (const mutate of mutations) {
      reset(false); const value = structuredClone(sample); mutate(value); native(runtime).peer_form_hover = value;
      assert.equal(formFieldHoverObservedOkay(value, 'c'.repeat(64)), false);
      assert.equal(cached({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request}).ok, false); semanticCases++;
    }
    for (const absent of [null, undefined, true, [], {}, 'pass']) {reset(false); native(runtime).peer_form_hover = absent;
      assert.equal(cached({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request}).ok, false); semanticCases++;}
    for (const [field, value] of [['schema_version', 2], ['tarball_sha256', '0'.repeat(64)], ['error', 'failed'], ['browser', 'Firefox/130'],
      ['zoneless', runtime !== 'zoneless'], ['bundle_has_zone', runtime === 'zoneless'], ['zone_global', 'object'], ['angular_zone_entered', runtime === 'zoneless']])
      negative(runtime + '-raw-' + field, () => {native(runtime)[field] = value;}, /native identity/);
    for (const [field, value] of [['status', 'not-run'], ['exit_code', 1], ['artifact_bound', false], ['runtime_passed', false], ['acceptance_credit', true],
      ['progress_csp_passed', false], ['core_high_contrast_passed', false], ['report', 'reports/foreign.json']])
      negative(runtime + '-summary-' + field, () => {browser.observation.closeout_diagnostics[runtime][field] = value;}, /native diagnostic/);
    negative(runtime + '-missing', () => {delete browser.observation.closeout_diagnostics[runtime];}, /both native runtimes/);
    negative(runtime + '-semantic-rehashed', () => {native(runtime).peer_form_hover.state_token_scenarios[0].hint.opacity = '0';}, /hover observations/);
    negative(runtime + '-cross-compiled-CSS', () => {native(runtime).progress_csp.compiled_css_sha256 = 'd'.repeat(64);}, /hover observations/);
  }
  negative('foreign-sha', () => {f.entry.sha = '0'.repeat(40);}, /unregistered/);
  negative('renamed-kind', () => {f.entry.individual_proof.proof_kind = 'ordinary-source';}, /unregistered/);
  negative('wrong-patch', () => {f.entry.individual_proof.diff_sha256 = '0'.repeat(64);}, /unregistered/);
  negative('wrong-peer', () => {f.entry.individual_proof.installed_member.version = '16.2.14';}, /installed member/);
  negative('wrong-line', () => {f.request.line = line === 'main' ? '21.x' : 'main';}, /installed member/);
  for (const field of ['kind', 'runtimes', 'themes']) negative('wrong-scope-' + field, () => {f.entry.individual_proof.form_field_hover_behavior[field] = 'wrong';}, /hover scope/);
  negative('missing-source', () => {f.entry.individual_proof.form_field_hover_behavior.source_members.pop();}, /source scope/);
  negative('duplicate-source', () => {f.entry.individual_proof.form_field_hover_behavior.source_members[0] = f.entry.individual_proof.form_field_hover_behavior.source_members[1];}, /source scope/);
  negative('stale-source', () => {f.entry.individual_proof.form_field_hover_behavior.source_members[0].sha256 = '0'.repeat(64);}, /stale/);
  negative('missing-packed', () => {delete f.request.packedConsumerExecution;}, /packed invocation/);
  negative('failed-packed', () => {f.request.packedConsumerExecution.exit_code = 1;}, /packed invocation/);
  negative('missing-browser', () => {delete f.request.browserExecution;}, /browser invocation/);
  negative('failed-browser', () => {f.request.browserExecution.exit_code = 1;}, /browser invocation/);
  negative('foreign-browser', () => {f.request.browserExecution.invocation_id = 'foreign';}, /ENOENT|subject/);
  for (const [field, value] of [['result', 'fail'], ['coverage', 'slice'], ['exit_code', 1], ['subject_kind', 'source'], ['subject_ids', ['other']]])
    negative('browser-report-' + field, () => {browser.report[field] = value;}, /browser result/);
  for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids'])
    negative('browser-roster-' + field, () => {browser.report[field].pop();}, /incomplete browser/);
  for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions'])
    negative('browser-unresolved-' + field, () => {browser.report[field].push('unresolved');}, /unresolved browser/);
  negative('browser-counts', () => {browser.report.passed--;}, /counts/);
  negative('foreign-browser-library', () => {browser.report.artifacts.library.sha256 = '0'.repeat(64);}, /browser result/);
  for (const [field, value] of [['kind', 'marker'], ['check_id', 'foreign'], ['run_id', 'foreign'], ['invocation_id', 'foreign'],
    ['library_sha256', '0'.repeat(64)], ['source_clean', false], ['source_commit', '0'.repeat(40)], ['source_tree', '0'.repeat(40)]])
    negative('browser-raw-' + field, () => {browser.observation[field] = value;}, /assertion subject/);
  negative('missing-browser-assertion', () => {browser.report.case_results.pop();}, /report assertions/);
  negative('wrong-browser-assertion-path', () => {browser.report.case_results[0].output_paths = ['foreign'];}, /report assertions/);
  negative('failed-browser-observed-case', () => {browser.observation.cases[0].result = 'fail';}, /observed cases/);
  negative('empty-browser-evidence', () => {browser.observation.cases[0].evidence = '';}, /observed cases/);
  negative('missing-browser-observed-case', () => {browser.observation.cases.pop();}, /observed cases/);
  negative('wrong-webkit', () => {browser.observation.webkit_backend = 'safari';}, /native prerequisites/);
  negative('Safari-claim', () => {browser.observation.safari_certification = true;}, /native prerequisites/);
  negative('missing-hydration', () => {browser.observation.hydration_replay = null;}, /native prerequisites/);
  for (const engine of ['chromium', 'firefox', 'webkit']) negative('missing-engine-' + engine, () => {delete browser.observation.engines[engine];}, /native prerequisites/);
  negative('duplicate-native-runtime', () => {browser.observation.closeout_diagnostics.other = browser.observation.closeout_diagnostics.zoneful;}, /both native runtimes/);
  negative('tampered-native-output', () => {f.runPut(browser.relative, '{}');}, /bytes\/hash/, true);
  reset(); const path = definition.installed_member.path, peerBytes = readEvidenceMember(f.root, path);
  try {
    const changed = Buffer.concat([peerBytes, Buffer.from(' ')]); f.repoPut(path, changed);
    f.entry.individual_proof.form_field_hover_behavior.source_members.find(row => row.path === path).sha256 = hash(changed); browser.save();
    assert.match(check().detail, /wrong form-field hover peer bytes/); readerCases++;
  } finally {f.repoPut(path, peerBytes);}
} finally {f.dispose();}
const report = {schema_version: 1, line, finite_subjects: 1, full_packed_roster: 106, full_browser_roster: 912,
  actual_reader_and_writer_controls: readerCases, cached_actual_guard_semantic_controls: semanticCases, synthetic_input_and_review: true,
  actual_source_judgment_completed_by_this_test: false, root_dispatch_integrated: false, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed',
  helper_sha256: hash(read('scripts/upstream-form-field-hover-evidence.mjs')), browser_helper_sha256: hash(read('scripts/upstream-browser-run-evidence.mjs')),
  producer_sha256: hash(read('tests/upstream/form-field-hover-admission.mjs'))};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
