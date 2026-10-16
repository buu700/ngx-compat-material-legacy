/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual reader/writer/CLI with synthetic native results, never qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, mkdirSync, writeFileSync, renameSync, symlinkSync, unlinkSync} from 'node:fs';
import {resolve, join, relative, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';
import {PROGRESS_CSP_SHAS, PROGRESS_CSP_KIND, progressCspRequirements, requiresProgressCsp, validateProgressCsp} from '../../scripts/upstream-progress-csp-evidence.mjs';
import {inspectProgressCspJudgments} from '../../scripts/progress-csp-source-judgments.mjs';
import {qualifyRelease} from '../../scripts/browser-matrix-acceptance.mjs';
import * as rosterModule from '../../scripts/browser-matrix-roster.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), read = path => readFileSync(join(root, path));
const ts = createRequire(import.meta.url)('typescript');
const judgments = inspectProgressCspJudgments({root}), line = judgments.proof.line;
const definitionSource = ts.createSourceFile('browser.mjs', read('scripts/browser-matrix-acceptance.mjs').toString(), ts.ScriptTarget.Latest, true);
const writer = definitionSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'runAcceptance').getText(definitionSource).replace(/^export /, '');
let progress;
function find(value) {if (!value || typeof value !== 'object') return;
  if (value.modes && Object.hasOwn(value, 'negative_data_image_blocked')) progress ??= value;
  for (const child of Object.values(value)) find(child);}
find(JSON.parse(read('compatibility/rc/progress-color-native-checkpoints.json'))); assert.ok(progress);
const life = {lifecycle: ['FADING_IN', 'VISIBLE', 'FADING_OUT', 'HIDDEN'], connected: [true, true, true, false]};
const positive = {found: true, ripple_display: 'none', focus_display: 'block', submenu_fill: 'rgb(0, 0, 0)', canvas_color: 'rgb(0, 0, 0)', ...life,
  negative: {found: true, ripple_display: 'block', focus_display: 'none', submenu_fill: 'rgb(8, 9, 10)'},
  fallback: {initial_state: 'FADING_IN', initial_connected: true, final_state: 'HIDDEN', final_connected: false, wait_completed: true}};
const contrast = {normal: {found: true, media_active: false, class_active: false, ripple_display: 'block', focus_display: 'none', submenu_fill: 'rgb(1, 2, 3)', ...life},
  historical_class: {...structuredClone(positive), media_active: false, class_active: true},
  forced_colors: {...structuredClone(positive), media_active: true, class_active: false}};
const badProgress = [
  p => {p.modes.buffer.background_image = 'none';}, p => {p.modes.buffer.background_image = 'url("data:image/svg+xml,defect")';},
  p => {p.modes.buffer.background_image = p.modes.buffer.background_image.replace('2px', '8px');},
  p => {p.modes.buffer.background_color = 'transparent';}, p => {p.modes.buffer.mask_image = 'url("data:image/svg+xml,defect")';},
  p => {p.positive_violations.push({directive: 'img-src', blocked: 'data'});}, p => {p.positive_violations = null;},
  p => {p.ie11_media_matches = true;}, p => {p.negative_data_image_blocked = false;}, p => {p.legacy_buffer_inline_svg = false;},
  p => {p.historical_data_uri_retained = false;}, p => {p.compiled_css_sha256 = '';}, p => {p.error = 'fixture';}, p => {p.modes.extra = p.modes.buffer;},
];
for (const mode of ['determinate', 'buffer', 'query', 'indeterminate']) {
  badProgress.push(p => {delete p.modes[mode];}, p => {p.modes[mode].present = false;});
  if (mode !== 'buffer') badProgress.push(p => {p.modes[mode].dots_present = true;});
}
let helperCases = 0, cliCases = 0, sourceCases = 0, semanticCases = 0;
for (const sha of PROGRESS_CSP_SHAS) assert.ok(requiresProgressCsp({sha}, {}));
assert.ok(requiresProgressCsp({}, {proof_kind: PROGRESS_CSP_KIND})); assert.ok(requiresProgressCsp({}, {progress_csp_behavior: null}));
assert.equal(requiresProgressCsp({}, {}), false); assert.equal(progressCspRequirements('unknown'), null);
const escaped = progressCspRequirements(PROGRESS_CSP_SHAS[0]); escaped.members.length = 0; escaped.runtimes.length = 0;
assert.ok(progressCspRequirements(PROGRESS_CSP_SHAS[0]).members.length > 0); assert.equal(progressCspRequirements(PROGRESS_CSP_SHAS[0]).runtimes.length, 2);
for (const [index, sha] of PROGRESS_CSP_SHAS.entries()) {
  const entry = structuredClone(judgments.entries.find(row => row.sha === sha)), review = JSON.parse(judgments.writes.get(entry.evidence_report));
  // Existing fixture accepts an explicit member list before its fake use census.
  entry.individual_proof.artifact_behavior = {source_members: entry.individual_proof.progress_csp_behavior.source_members};
  const f = createFixture(root, {entry, review}); delete f.entry.individual_proof.artifact_behavior;
  const {binding} = f.request, browserExecution = {run_id: f.run.run_id, invocation_id: 'synthetic-browser', exit_code: 0};
  f.request.browserExecution = browserExecution;
  const ids = rosterModule.deriveReleaseIds(rosterModule.familiesFromInventory(JSON.parse(read('testing/legacy-runner/historical-inventory.json'))), line);
  const outputDir = join(f.runDir, 'evidence/browser-matrix', browserExecution.invocation_id); mkdirSync(outputDir, {recursive: true});
  const browserRequest = {binding, line, runDir: f.runDir, outputDir, runId: f.run.run_id, invocation: browserExecution.invocation_id};
  const context = {root: f.root, readFileSync, writeFileSync, mkdirSync, join, relative, createHash, Buffer,
    console: {log() {}, error() {}}, ...rosterModule, qualifyRelease,
    coordinatorRequest: () => browserRequest, resolveLibraryFromRun: () => ({tarball: join(f.runDir, 'library.tgz'), digest: f.library.sha256, bytes: f.library.bytes}),
    preflight: () => ({missing: [], notes: [], chrome: 'fixture-only'}),
    fixtureQualificationDefects: () => [], fixtureQualificationDefectsFromTarball: () => [], writeDetail() {},
    runRippleHydrationReplay: async () => ({ok: true, fixture_only: true}),
    runCloseoutDiagnostic: (_request, _library, _launch, zoneless) => ({status: 'executed', exit_code: 0, artifact_bound: true, runtime_passed: true,
      acceptance_credit: false, progress_csp_passed: true, core_high_contrast_passed: true,
      report: `reports/closeout-browser-diagnostics${zoneless ? '-zoneless' : ''}.json`,
      observation: {schema_version: 1, tarball_sha256: f.library.sha256, browser: 'HeadlessChrome/128.0.0.0', error: null,
        zoneless, bundle_has_zone: !zoneless, zone_global: zoneless ? 'undefined' : 'function', angular_zone_entered: !zoneless,
        progress_csp: structuredClone(progress), core_high_contrast: structuredClone(contrast), fixture_only: true}}),
    executeIds: async () => ({outcomes: ids.map(id => ({id, ok: true, evidence: 'Synthetic native assertion fixture; no product execution'})),
      engines: {chromium: {launched: true, product: 'Chrome/128'}, firefox: {launched: true, browserName: 'firefox', version: '130'},
        webkit: {launched: true, backend: 'webkitgtk', api: 'WebKit2-4.1', safari_certification: false}}}),
    gitValue: args => args[0] === 'status' ? '' : args[1] === 'HEAD' ? binding.source_commit : binding.source_tree};
  assert.equal(await runInNewContext('(' + writer + ')', context)({runPath: 'synthetic-only.json'}), 0);
  const report = JSON.parse(readFileSync(join(f.runDir, 'reports/browser-matrix.json'))), relativeOutput = report.outputs[0].path;
  const observation = JSON.parse(readFileSync(join(f.runDir, relativeOutput)));
  const targets = [f.entry, f.request, f.run, f.report, f.observation, report, observation], originals = targets.map(value => structuredClone(value));
  function save() {f.save(); f.runPut(relativeOutput, observation); const b = readFileSync(join(f.runDir, relativeOutput));
    report.outputs = [{path: relativeOutput, sha256: hash(b), bytes: b.length}]; f.runPut('reports/browser-matrix.json', report);}
  function reset() {for (const [i, target] of targets.entries()) {for (const key of Object.keys(target)) delete target[key]; Object.assign(target, structuredClone(originals[i]));} save();}
  const check = () => validateProgressCsp({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request});
  function negative(name, mutate, pattern = /./, noSave = false) {reset(); mutate(); if (!noSave) save(); const result = check();
    assert.equal(result.ok, false, name); assert.match(result.detail, pattern, name); helperCases++;}
  const raw = runtime => observation.closeout_diagnostics[runtime].observation;
  try {
    assert.equal(check().ok, true, JSON.stringify(check())); helperCases++;
    for (const runtime of ['zoneful', 'zoneless']) {
      for (const mutate of badProgress) {negative('raw-progress-' + runtime, () => mutate(raw(runtime).progress_csp), /insufficient .* observations/); semanticCases++;}
      for (const [field, value] of [['schema_version', 2], ['tarball_sha256', '0'.repeat(64)], ['error', 'fixture'], ['browser', 'Firefox/130'],
        ['zoneless', runtime !== 'zoneless'], ['bundle_has_zone', runtime === 'zoneless'], ['zone_global', 'object'], ['angular_zone_entered', runtime === 'zoneless']])
        negative(runtime + '-raw-' + field, () => {raw(runtime)[field] = value;}, /native progress identity/);
      negative(runtime + '-missing-raw', () => {delete observation.closeout_diagnostics[runtime].observation;}, /native progress identity/);
      negative(runtime + '-core', () => {raw(runtime).core_high_contrast.forced_colors.fallback.final_connected = true;}, /insufficient .* observations/);
      for (const [field, value] of [['status', 'not-run'], ['exit_code', 1], ['artifact_bound', false], ['runtime_passed', false],
        ['acceptance_credit', true], ['progress_csp_passed', false], ['core_high_contrast_passed', false], ['report', 'reports/foreign.json']])
        negative(runtime + '-summary-' + field, () => {observation.closeout_diagnostics[runtime][field] = value;}, /native progress diagnostic/);
      negative(runtime + '-missing', () => {delete observation.closeout_diagnostics[runtime];}, /both native progress runtimes/);
    }
    for (const field of ['run_id', 'invocation_id', 'exit_code']) negative('captured-browser-' + field,
      () => {f.request.browserExecution[field] = field === 'exit_code' ? 3 : 'foreign';}, /coordinator-observed|report subject/);
    negative('missing-browser-capture', () => {delete f.request.browserExecution;}, /coordinator-observed/);
    negative('failed-packed', () => {f.request.packedConsumerExecution.exit_code = 1;}, /packed invocation/);
    negative('missing-packed-case', () => {f.observation.cases.pop();}, /observed cases/);
    negative('renamed-proof', () => {f.entry.individual_proof.proof_kind = 'ordinary-review';}, /unregistered/);
    negative('foreign-sha', () => {f.entry.sha = 'a'.repeat(40);}, /unregistered/);
    negative('wrong-patch', () => {f.entry.individual_proof.diff_sha256 = 'a'.repeat(64);}, /unregistered/);
    negative('wrong-scope', () => {f.entry.individual_proof.progress_csp_behavior.runtimes.pop();}, /wrong .* scope/);
    negative('missing-source', () => {f.entry.individual_proof.progress_csp_behavior.source_members.pop();}, /source scope/);
    negative('stale-source', () => {f.entry.individual_proof.progress_csp_behavior.source_members[0].sha256 = '0'.repeat(64);}, /stale .* member/);
    for (const field of ['line', 'run_id', 'invocation_id', 'check_id']) negative('report-' + field, () => {report[field] = 'foreign';}, /report subject/);
    for (const [field, value] of [['result', 'fail'], ['coverage', 'slice'], ['exit_code', 2], ['subject_kind', 'source']])
      negative('report-' + field, () => {report[field] = value;}, /browser result/);
    negative('foreign-library', () => {report.artifacts.library.sha256 = '0'.repeat(64);}, /browser result/);
    for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids'])
      negative(field, () => {report[field].pop();}, /incomplete browser/);
    for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions'])
      negative(field, () => {report[field].push('fixture');}, /unresolved browser/);
    negative('wrong-count', () => {report.passed--;}, /counts/);
    negative('marker-case', () => {report.case_results[0].kind = 'marker';}, /report assertions/);
    negative('missing-case', () => {report.case_results.pop();}, /report assertions/);
    negative('foreign-case-output', () => {report.case_results[0].output_paths = ['foreign'];}, /report assertions/);
    for (const field of ['kind', 'check_id', 'run_id', 'invocation_id', 'library_sha256', 'source_commit', 'source_tree'])
      negative('observed-' + field, () => {observation[field] = 'foreign';}, /assertion subject/);
    negative('dirty-observation', () => {observation.source_clean = false;}, /assertion subject/);
    negative('failed-observed-case', () => {observation.cases[0].result = 'fail';}, /observed cases/);
    negative('empty-evidence', () => {observation.cases[0].evidence = '';}, /observed cases/);
    negative('missing-observed-case', () => {observation.cases.pop();}, /observed cases/);
    negative('missing-engine', () => {delete observation.engines.firefox;}, /native prerequisites/);
    negative('missing-hydration', () => {delete observation.hydration_replay;}, /native prerequisites/);
    negative('Safari-label', () => {observation.safari_certification = true;}, /native prerequisites/);
    negative('altered-output', () => {f.runPut(relativeOutput, '{}');}, /bytes\/hash/, true);
    negative('foreign-output', () => {report.outputs[0].path = 'evidence/foreign.json'; f.runPut('reports/browser-matrix.json', report);}, /ownership/, true);
    reset(); const output = join(f.runDir, relativeOutput); renameSync(output, output + '.saved'); symlinkSync(output + '.saved', output);
    assert.match(check().detail, /symlink/); helperCases++; unlinkSync(output); renameSync(output + '.saved', output);
    const upstreamOut = join(f.runDir, 'evidence/upstream-audit-disposition/synthetic-upstream'); mkdirSync(upstreamOut, {recursive: true});
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('RC_')));
    function cli(name, mutate, expected, rawBrowser) {
      reset(); mutate?.(); save(); f.runPut('seed.json', {commits: [{sha}], fixture_only: true}); f.runPut('ledger.json', {entries: [f.entry], g11_claim: 'not-passed', fixture_only: true});
      const output = join(f.runDir, 'cli-' + name + '.json'), env = {...environment, RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: f.request.runId,
        RC_INVOCATION_ID: 'synthetic-upstream', RC_EVIDENCE_BINDING: JSON.stringify(f.request.binding), RC_ASSERTION_OUTPUT_DIR: upstreamOut,
        RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(f.request.packedConsumerExecution),
        RC_UPSTREAM_BROWSER_MATRIX: rawBrowser ?? JSON.stringify(f.request.browserExecution ?? null)};
      const child = spawnSync(process.execPath, [join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
        '--seed', join(f.runDir, 'seed.json'), '--ledger', join(f.runDir, 'ledger.json'), '--symbols', join(f.root, 'symbols.json'),
        '--current-symbols', join(f.root, 'current.json'), '--report', output], {cwd: f.root, env, encoding: 'utf8', timeout: 30000});
      if (expected === 2) {assert.equal(child.status, 2); assert.match(child.stderr, /RC_UPSTREAM_BROWSER_MATRIX is not JSON/);}
      else {assert.ok([0, 1].includes(child.status), child.stderr); const detail = JSON.parse(readFileSync(output));
        assert.equal(child.status === 0, expected, name + ': ' + child.stderr + JSON.stringify(detail.artifact_behavior_evidence));
        assert.equal(detail.g11_claim, 'not-passed'); assert.equal(detail.authored_use_review_evidence.insufficient, 0);
        if (expected) {assert.equal(detail.artifact_behavior_evidence[0].invocation_id, 'synthetic-browser');
          const owned = JSON.parse(readFileSync(join(upstreamOut, 'disposition-observations.json')));
          assert.deepEqual(owned.artifact_behavior_evidence, detail.artifact_behavior_evidence);}}
      cliCases++;
    }
    cli('complete', null, true); cli('failed-browser', () => {f.request.browserExecution.exit_code = 8;}, false);
    cli('missing-browser', () => {delete f.request.browserExecution;}, false);
    cli('renamed-kind', () => {f.entry.individual_proof.proof_kind = 'ordinary-review';}, false);
    cli('relabeled-irrelevant-cannot-bypass', () => {f.entry.final_disposition = 'irrelevant'; f.entry.bucket = 'docs-only';
      f.entry.subject = 'Synthetic documentation fixture'; f.entry.reason = 'Documentation fixture';
      f.entry.individual_proof.proof_kind = 'ordinary-review'; delete f.entry.individual_proof.progress_csp_behavior;}, false);
    cli('bad-zoneful-progress', () => {raw('zoneful').progress_csp.modes.buffer.background_image = 'none';}, false);
    cli('bad-zoneless-progress', () => {raw('zoneless').progress_csp.negative_data_image_blocked = false;}, false);
    cli('slice', () => {report.coverage = 'slice';}, false); cli('malformed-capture', null, 2, '{');
    if (index === 0) {
      const matrixPath = 'compatibility/rc/matrices/full-verify.json', original = readFileSync(join(f.root, matrixPath));
      reset(); const matrix = JSON.parse(original); matrix.checks.find(row => row.check_id === 'browser-matrix').acceptance.cases_by_line[line] = {'release-engine-runtime-state-matrix': ids.slice(0, 1)};
      f.repoPut(matrixPath, matrix); f.request.binding.matrix_sha256 = hash(readFileSync(join(f.root, matrixPath)));
      f.entry.individual_proof.progress_csp_behavior.source_members.find(row => row.path === matrixPath).sha256 = f.request.binding.matrix_sha256;
      const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: f.root, encoding: 'utf8'}).trim();
      git(['add', matrixPath]); git(['-c', 'user.name=Validator fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Synthetic smaller browser roster']);
      const commit = git(['rev-parse', 'HEAD']), tree = git(['rev-parse', 'HEAD^{tree}']);
      Object.assign(f.request.binding, {source_commit: commit, source_tree: tree});
      Object.assign(f.run.source, {commit, git_tree_sha: tree}); Object.assign(f.run.execution_inputs, {commit, tree});
      f.report.binding = structuredClone(f.request.binding); report.binding = structuredClone(f.request.binding);
      observation.source_commit = commit; observation.source_tree = tree;
      for (const key of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids']) report[key] = ids.slice(0, 1);
      report.passed = 1; report.case_results = report.case_results.slice(0, 1); observation.cases = observation.cases.slice(0, 1); save();
      // Even a consistently rehashed clean source/run/report cannot turn a
      // single passing cell into the independently derived complete roster.
      assert.match(check().detail, /incomplete full browser matrix roster/); helperCases++;
    }
  } finally {f.dispose();}
}
for (const [path, mutate] of [
  ['compatibility/rc/progress-csp-admission-inputs.json', bytes => Buffer.concat([bytes, Buffer.from('\n')])],
  ['compatibility/rc/progress-csp-admission-prior.json.gz', bytes => Buffer.concat([bytes, Buffer.from('defect')])],
  ['compatibility/rc/progress-csp-admission-peer-fesm2022--progress-bar.mjs.gz', bytes => Buffer.concat([bytes, Buffer.from('defect')])],
  ['compatibility/rc/progress-csp-admission-cf3506adf1af1556d705dbb651e7e96a7141b81d.diff', bytes => Buffer.concat([bytes, Buffer.from('\n')])],
  ['projects/ngx-material-legacy/legacy-progress-bar/progress-bar.html', bytes => Buffer.concat([bytes, Buffer.from('<!-- defect -->')])],
  ['scripts/check-upstream-audit-disposition.mjs', bytes => Buffer.from(bytes.toString().replace('if (requiresHistoricalBehavior(entry, proof))', 'if (false)'))],
  ['scripts/rc-verify.py', bytes => Buffer.from(bytes.toString().replace("ACTIVE_RUN.exit_codes.get('historical-legacy-artifact')", '0'))],
  ['tests/upstream/historical-behavior-admission.mjs', bytes => Buffer.from(bytes.toString().replace('assert.equal(namedCases, 7)', 'assert.equal(namedCases, 0)'))],
  ['scripts/upstream-artifact-behavior-evidence.mjs', bytes => Buffer.concat([bytes, Buffer.from('\n')])],
  ['compatibility/rc/chip-menu-tooltip-admission-guard-change.json', bytes => Buffer.concat([bytes, Buffer.from('\n')])],
]) {
  const original = read(path), changed = mutate(original); assert.notDeepEqual(changed, original);
  assert.throws(() => inspectProgressCspJudgments({root, readMember: target => target === path ? changed : read(target)}), undefined, path); sourceCases++;
}
const output = {schema_version: 1, line, subjects: 2, full_packed_roster: 106, full_browser_roster: 912,
  helper_controls: helperCases, semantic_progress_controls: semanticCases, actual_CLI_controls: cliCases, source_corruptions_rejected: sourceCases,
  complete_actual_browser_writer_used: true, runtime_results_synthetic: true, actual_native_packed_or_floor_executed: false,
  new_runtime_or_authored_use_closures: 0, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(output));
