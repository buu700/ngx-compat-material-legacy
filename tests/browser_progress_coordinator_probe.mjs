/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual child/report/coordinator functions, with synthetic native outputs.
 * No package install, native browser, or artifact qualification occurs here. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {qualifyCloseoutDiagnostic, qualifyRelease} from '../scripts/browser-matrix-acceptance.mjs';
import * as rosterModule from '../scripts/browser-matrix-roster.mjs';
const ts = createRequire(import.meta.url)('typescript');
const root = fileURLToPath(new URL('..', import.meta.url));
const source = ts.createSourceFile('browser-matrix-acceptance.mjs',
  readFileSync(join(root, 'scripts/browser-matrix-acceptance.mjs'), 'utf8'), ts.ScriptTarget.Latest, true);
assert.equal(source.parseDiagnostics.length, 0);
const functionText = name => {
  const node = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, name); return node.getText(source).replace(/^export /, '');
};
const childSource = functionText('runCloseoutDiagnostic'), coordinatorSource = functionText('runAcceptance');
const surface = ts.createSourceFile('browser-surface-families.mjs',
  readFileSync(join(root, 'scripts/browser-surface-families.mjs'), 'utf8'), ts.ScriptTarget.Latest, true);
assert.equal(surface.parseDiagnostics.length, 0);
const findNodes = (tree, predicate) => {
  const result = []; function visit(node) {if (predicate(node)) result.push(node); ts.forEachChild(node, visit);}
  visit(tree); return result;
};
const fixtureWriters = findNodes(surface, node => ts.isCallExpression(node)
  && node.expression.getText(surface) === 'writeFileSync' && node.arguments[0]?.getText(surface).includes("'src/main.ts'"));
assert.equal(fixtureWriters.length, 1);
const fixtureRecipe = fixtureWriters[0].arguments[1].getText(surface);
function checkFixture(text, zoneless) {
  const tree = ts.createSourceFile('main.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(tree.parseDiagnostics.length, 0);
  const calls = findNodes(tree, ts.isCallExpression);
  const boot = calls.filter(node => ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'bootstrapModule');
  assert.equal(boot.length, 1); assert.equal(boot[0].arguments[0].getText(tree), 'LabModule');
  assert.equal(boot[0].arguments.length, zoneless ? 1 : 2, 'zoneful bootstrap must select a provider');
  const providers = calls.filter(node => ['provideZoneChangeDetection', 'provideZonelessChangeDetection'].includes(node.expression.getText(tree)));
  assert.equal(providers.length, 1); assert.equal(providers[0].arguments.length, 0);
  assert.equal(providers[0].expression.getText(tree), zoneless ? 'provideZonelessChangeDetection' : 'provideZoneChangeDetection');
  if (!zoneless) {
    const options = boot[0].arguments[1]; assert.equal(options.properties.length, 1);
    const property = options.properties[0]; assert.equal(property.name.text, 'applicationProviders');
    assert.equal(property.initializer.elements.length, 1); assert.equal(property.initializer.elements[0], providers[0]);
  }
  const witness = findNodes(tree, node => ts.isExpressionStatement(node)
    && ts.isBinaryExpression(node.expression) && node.expression.left.getText(tree) === '(window as any).__closeoutAngularZoneEntered');
  assert.equal(witness.length, 1);
  const expression = witness[0].expression.right;
  assert.ok(ts.isCallExpression(expression)); assert.equal(expression.expression.getText(tree), 'ngZone.run');
  const javascript = ts.transpileModule(witness[0].getText(tree), {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  // This checks the actual generated witness wiring only; these are fake zones.
  for (const entered of [true, false]) {
    const window = {}; let ran = 0, observed = 0;
    runInNewContext(javascript, {window, ngZone: {run(callback) {ran++; return callback();}},
      NgZone: {isInAngularZone() {observed++; return entered;}}});
    assert.equal(ran, 1); assert.equal(observed, 1); assert.equal(window.__closeoutAngularZoneEntered, entered);
  }
}
const renderedFixtures = [false, true].map(zoneless => runInNewContext(fixtureRecipe, {zoneless}));
for (const [index, text] of renderedFixtures.entries()) checkFixture(text, index === 1);
assert.throws(() => checkFixture(renderedFixtures[0].replace(', {applicationProviders:[provideZoneChangeDetection()]}', ''), false));
assert.throws(() => checkFixture(renderedFixtures[0].replace('=ngZone.run(() => NgZone.isInAngularZone())', '=true'), false));
assert.throws(() => checkFixture(renderedFixtures[1].replace('=ngZone.run(() => NgZone.isInAngularZone())', '=false'), true));
const zoneGuard = findNodes(surface, node => ts.isVariableDeclaration(node) && node.name.getText(surface) === 'zoneOk');
assert.equal(zoneGuard.length, 1);
for (const zoneless of [false, true]) {
  const values = {zoneless, zoneGlobal: zoneless ? 'undefined' : 'function', bundleHasZone: !zoneless, angularZoneEntered: !zoneless};
  const expression = zoneGuard[0].initializer.getText(surface);
  assert.equal(runInNewContext(expression, values), true);
  for (const [key, value] of [['zoneGlobal', 'object'], ['bundleHasZone', zoneless], ['angularZoneEntered', zoneless], ['angularZoneEntered', null]]) {
    assert.equal(runInNewContext(expression, {...values, [key]: value}), false, 'surface admits wrong runtime: ' + key);
  }
}
const line = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main';
const roster = line === 'main' ? rosterModule.loadMainReleaseRoster() : rosterModule.loadReleaseRoster(line);
const scratch = mkdtempSync(join(tmpdir(), 'progress-csp-coordinator-'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// Retained prior-artifact data is validator input only, never current execution.
let progress;
function findProgress(value) {
  if (!value || typeof value !== 'object') return;
  if (value.modes && Object.hasOwn(value, 'negative_data_image_blocked')) progress ??= value;
  for (const child of Object.values(value)) findProgress(child);
}
findProgress(JSON.parse(readFileSync(join(root, 'compatibility/rc/progress-color-native-checkpoints.json'))));
assert.ok(progress);
const life = {lifecycle: ['FADING_IN', 'VISIBLE', 'FADING_OUT', 'HIDDEN'], connected: [true, true, true, false]};
const positive = {found: true, ripple_display: 'none', focus_display: 'block', submenu_fill: 'rgb(0, 0, 0)',
  canvas_color: 'rgb(0, 0, 0)', ...life,
  negative: {found: true, ripple_display: 'block', focus_display: 'none', submenu_fill: 'rgb(8, 9, 10)'},
  fallback: {initial_state: 'FADING_IN', initial_connected: true, final_state: 'HIDDEN', final_connected: false, wait_completed: true}};
const contrast = {normal: {found: true, media_active: false, class_active: false, ripple_display: 'block',
  focus_display: 'none', submenu_fill: 'rgb(1, 2, 3)', ...life},
  historical_class: {...structuredClone(positive), media_active: false, class_active: true},
  forced_colors: {...structuredClone(positive), media_active: true, class_active: false}};
const digest = 'd'.repeat(64);
function nativeDetail(zoneless) {
  return {schema_version: 1, tarball_sha256: digest, browser: 'HeadlessChrome/128.0.0.0',
    zoneless, bundle_has_zone: !zoneless, zone_global: zoneless ? 'undefined' : 'function',
    angular_zone_entered: !zoneless, error: null,
    progress_csp: structuredClone(progress), core_high_contrast: structuredClone(contrast),
    fixture_only: 'Synthetic native outcomes; no qualification credit'};
}
const badProgress = [
  p => {p.modes.buffer.background_image = 'none';},
  p => {p.modes.buffer.mask_image = 'url("data:image/svg+xml,defect")';},
  p => {p.modes.buffer.background_color = 'transparent';},
  p => {p.modes.determinate.dots_present = true;},
  p => {delete p.modes.query;}, p => {p.modes.indeterminate.present = false;},
  p => {p.positive_violations.push({directive: 'img-src', blocked: 'data'});},
  p => {p.negative_data_image_blocked = false;}, p => {p.ie11_media_matches = true;},
  p => {p.legacy_buffer_inline_svg = false;}, p => {p.historical_data_uri_retained = false;},
  p => {p.compiled_css_sha256 = '';}, p => {p.error = 'fixture failure';},
];
const badNative = [
  {mutate: d => {d.tarball_sha256 = 'e'.repeat(64);}},
  {mutate: d => {d.schema_version = 2;}}, {mutate: d => {d.error = 'child failure';}},
  {mutate: d => {d.browser = 'Firefox/130';}}, {mutate: d => {d.zoneless = !d.zoneless;}},
  {mutate: d => {d.bundle_has_zone = !d.bundle_has_zone;}}, {mutate: d => {d.zone_global = 'object';}},
  {mutate: d => {d.angular_zone_entered = !d.angular_zone_entered;}}, {mutate: d => {delete d.angular_zone_entered;}},
  {mutate: d => {delete d.progress_csp;}}, {exit: 1}, {exit: null},
  {missing: true}, {malformed: true},
];
let sequence = 0;
async function run({runtime, change = {}, code = coordinatorSource, nativeCode = childSource} = {}) {
  const runDir = join(scratch, 'case-' + sequence++), outputDir = join(runDir, 'evidence/browser-matrix/fixture');
  mkdirSync(outputDir, {recursive: true}); mkdirSync(join(runDir, 'reports'));
  const binding = {source_clean: true, source_line: line, source_commit: 'a'.repeat(40), source_tree: 'b'.repeat(40)};
  const request = {binding, line, outputDir, runDir, runId: 'fixture-only', invocation: 'fixture'};
  const calls = [], emitted = {};
  let detail;
  const context = {root, process: {execPath: process.execPath, env: {NODE_OPTIONS: 'must-clear', NODE_PATH: 'must-clear'}},
    existsSync, readFileSync, writeFileSync, mkdirSync, join, relative, createHash, Buffer,
    console: {log() {}, error() {}}, ...rosterModule, qualifyRelease, qualifyCloseoutDiagnostic,
    coordinatorRequest: () => request,
    resolveLibraryFromRun: () => ({tarball: 'fixture-only.tgz', digest, bytes: 1}),
    preflight: () => ({missing: [], notes: [], chrome: '/fixture/chromium'}),
    fixtureQualificationDefects: () => [], fixtureQualificationDefectsFromTarball: () => [],
    writeDetail: value => {detail = value;}, runRippleHydrationReplay: async () => ({ok: true, fixture_only: true}),
    executeIds: async () => ({outcomes: roster.ids.map(id => ({id, ok: true, evidence: 'Synthetic fixture assertion'})),
      engines: {chromium: {launched: true, product: 'Chrome/128.0.0.0'},
        firefox: {launched: true, browserName: 'firefox', version: '130'},
        webkit: {launched: true, backend: 'webkitgtk', api: 'WebKit2-4.1', safari_certification: false}}}),
    gitValue: args => args[0] === 'status' ? '' : args[1] === 'HEAD' ? binding.source_commit : binding.source_tree,
    spawnSync: (command, args, options) => {
      assert.equal(command, process.execPath); assert.equal(args[0], join(root, 'scripts/browser-surface-families.mjs'));
      assert.equal(args[1], '--tarball'); assert.equal(args[2], 'fixture-only.tgz'); assert.equal(args[3], '--out');
      const zoneless = args.includes('--zoneless'), name = zoneless ? 'zoneless' : 'zoneful';
      assert.equal(args.length, zoneless ? 6 : 5); assert.equal(options.env.CHROME_BIN, '/fixture/chromium');
      assert.equal(options.env.NODE_PATH, ''); assert.equal(options.env.NODE_OPTIONS, '');
      assert.equal(options.timeout, 300000); assert.ok(!calls.includes(name), 'runtime launched twice'); calls.push(name);
      const observation = nativeDetail(zoneless), fault = runtime === name ? change : {};
      fault.mutate?.(observation); emitted[name] = observation;
      assert.equal(args[4], join(runDir, 'reports', `closeout-browser-diagnostics${zoneless ? '-zoneless' : ''}.json`));
      if (!fault.missing) writeFileSync(args[4], fault.malformed ? '{' : JSON.stringify(observation));
      return {status: Object.hasOwn(fault, 'exit') ? fault.exit : 0, stderr: 'fixture child stderr'};
    },
  };
  context.runCloseoutDiagnostic = runInNewContext('(' + nativeCode + ')', context);
  const exit = await runInNewContext('(' + code + ')', context)({runPath: 'fixture-only.json'});
  const report = JSON.parse(readFileSync(join(runDir, 'reports/browser-matrix.json')));
  const bytes = readFileSync(join(outputDir, 'browser-observations.json')), assertion = JSON.parse(bytes);
  assert.equal(report.outputs.length, 1); assert.equal(report.outputs[0].sha256, hash(bytes));
  assert.equal(report.outputs[0].bytes, bytes.length);
  assert.equal(report.outputs[0].path, 'evidence/browser-matrix/fixture/browser-observations.json');
  assert.deepEqual(report.expected_case_ids, roster.ids); assert.equal(report.passed, roster.ids.length);
  assert.equal(report.result, exit === 0 ? 'pass' : 'fail'); assert.equal(report.coverage, exit === 0 ? 'complete' : 'incomplete');
  return {exit, report, assertion, calls, emitted, detail};
}
try {
  const good = await run(); assert.equal(good.exit, 0); assert.deepEqual(good.calls, ['zoneful', 'zoneless']);
  for (const runtime of good.calls) {
    const observed = good.assertion.closeout_diagnostics[runtime];
    assert.deepEqual(observed.observation, good.emitted[runtime], 'actual raw native data missing from owned hashed output');
    assert.equal(observed.acceptance_credit, false); assert.equal(observed.progress_csp_passed, true);
    assert.equal(observed.core_high_contrast_passed, true); assert.equal(observed.status, 'executed');
    assert.deepEqual(JSON.parse(JSON.stringify(good.detail.closeout_diagnostics[runtime])), observed);
    for (const mutate of badProgress) {
      const failed = await run({runtime, change: {mutate: d => mutate(d.progress_csp)}});
      assert.equal(failed.exit, 1, runtime + ' defective progress admitted');
      assert.equal(failed.assertion.closeout_diagnostics[runtime].progress_csp_passed, false);
      assert.ok(failed.detail.problems.includes(runtime + ' progress CSP native guard missing or failed'));
    }
    for (const change of badNative) {
      const failed = await run({runtime, change}); assert.equal(failed.exit, 1, runtime + ' defective native child admitted');
      assert.equal(failed.assertion.closeout_diagnostics[runtime].progress_csp_passed, false);
    }
    assert.equal((await run({runtime, change: {mutate: d => {d.core_high_contrast = {};}}})).exit, 1,
      'existing core contrast guard was lost');
  }
  // Fresh output refusal must never reuse a previous successful diagnostic.
  const oldPath = join(scratch, 'reports/closeout-browser-diagnostics.json'); mkdirSync(join(scratch, 'reports'));
  const oldBytes = JSON.stringify(nativeDetail(false)); writeFileSync(oldPath, oldBytes);
  const refused = runInNewContext('(' + childSource + ')', {root, join, existsSync, console: {log() {}},
    spawnSync: () => {assert.fail('existing output must not launch or be reused');}})(
    {runDir: scratch}, {digest, tarball: 'fixture-only.tgz'}, {chrome: '/fixture/chromium'}, false);
  assert.equal(refused.status, 'not-run'); assert.equal(refused.progress_csp_passed, undefined);
  assert.equal(readFileSync(oldPath, 'utf8'), oldBytes);
  const withoutGate = coordinatorSource.replace(/    if\(!diagnostic\?\.progress_csp_passed\).*\n/, '');
  assert.notEqual(withoutGate, coordinatorSource);
  for (const runtime of ['zoneful', 'zoneless']) assert.equal((await run({runtime,
    change: {mutate: d => {d.progress_csp.modes.buffer.background_image = 'none';}}, code: withoutGate})).exit, 0,
  'removing progress gate must expose a false pass in each runtime');
  const wrongChild = childSource.replace("...(zoneless ? ['--zoneless'] : [])", '');
  assert.notEqual(wrongChild, childSource);
  await assert.rejects(() => run({nativeCode: wrongChild}), /runtime launched twice/);
  const unboundOutput = coordinatorSource.replace("    kind: 'browser-matrix-observations',\n    closeout_diagnostics:closeoutDiagnostics,", "    kind: 'browser-matrix-observations',");
  assert.notEqual(unboundOutput, coordinatorSource);
  assert.equal((await run({code: unboundOutput})).assertion.closeout_diagnostics, undefined,
    'removing binding must lose the actual observations');
  console.log(JSON.stringify({line, complete_cases: roster.ids.length, defective_progress_results_rejected: badProgress.length * 2,
    defective_native_results_rejected: badNative.length * 2, contrast_regressions_rejected: 2, stale_output_rejected: 1,
    coordinator_mutants_detected: 4, runtime_source_mutants_detected: 3,
    synthetic_native_outputs: true, native_executed: false, acceptance_credit: false}));
} finally {rmSync(scratch, {recursive: true, force: true});}
