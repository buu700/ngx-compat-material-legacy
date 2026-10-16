/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four complete original test preferences; source accounting admits no peer runtime/security. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex');
export const SURFACE_ASYNC_SHAS = ['01cc137b512f34af97f1adb40fc95043329beef2',
  '23914beeb3c369bcd6fe1ab72469e252a78b963b', 'c6505d8ea45631d58c5dc1f427996dfb93d6de92',
  'ef620d83d55275276d313be8ffc47fb5e282068e'];
export const SURFACE_ASYNC_PATHS = ['src/material/icon/icon.spec.ts', 'src/material/button-toggle/button-toggle.spec.ts',
  'src/material/expansion/expansion.spec.ts', 'src/material/sort/sort.spec.ts'];
export const SURFACE_ASYNC_CAPSULES = {
  main: ['2ed9950eeba1d35a3c356a7356dd247797e0b2c4dcc2c5057970cd174d2ad185', '664fcf7edf5f10c1d847538b2669fee5ca77a930160fa42afd5002236a210dee'],
  '21.x': ['8c1aaee79625c4473dcdece5428ad8b10f8bf74e02950a2b40a5fd67afeb079b', 'd7903e0bba977dac5e5a1b476dbea5b2b6d108dab0b17525019f992fafc97b64'],
};
// Ordered raw original pairs are authenticated upstream source, not candidate product goldens.
const pairDigests = ['d3511fbff97011e61a28783715f0900d1d044cda1ecc964fdb27e1e2756309cc',
  '6e90683d1db66cb92a05e00cd7b8681ef4145afc18333d66d8354f2f0f00c1fb',
  '9f4d360b29a4a294eeb21c6ab7108701735de57a00988a58d8d38089190047c2',
  '775ccc0625da9e806fc01dd009cc23b1d9e976cf5f583c7ee07fd639c3971d05'];
export const ICON_TRUST_CASES = ["'should throw an error when using an untrusted icon url'",
  "'should throw an error when using untrusted HTML'", "'should throw an error when the resolver returns an untrusted URL'"];
const importRemovals = [['fakeAsync', 'tick', 'waitForAsync'], ['fakeAsync', 'flush', 'tick', 'waitForAsync'],
  ['fakeAsync', 'flush', 'tick'], ['fakeAsync', 'tick', 'waitForAsync']];
const parse = text => { const file = ts.createSourceFile('source.spec.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0); return file; };
const collect = (node, predicate) => { const rows = []; function visit(n) { if (predicate(n)) rows.push(n); ts.forEachChild(n, visit); }
  visit(node); return rows; };
function semantic(node) { const children = []; ts.forEachChild(node, n => { children.push(semantic(n)); });
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags &
    (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing) : null,
  ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children]; }
const fingerprint = node => hash(JSON.stringify(semantic(node)));
const callName = (node, file) => ts.isCallExpression(node) ? node.expression.getText(file) : '';
const predicates = (node, file) => collect(node, n => ts.isExpressionStatement(n) &&
  n.expression.getText(file).startsWith('expect(')).map(n => ({sha256: fingerprint(n.expression), text: n.getText(file)}));
function callback(row, argument) {
  const file = parse(row.raw), call = file.statements[0]?.expression;
  assert.ok(ts.isCallExpression(call)); assert.equal(callName(call, file), row.mode);
  assert.equal(call.arguments.length, argument + 1); assert.equal(hash(row.raw), row.sha256);
  const outer = call.arguments[argument]; assert.equal(fingerprint(outer), row.callback_sha256, 'stale callback metadata');
  const wrapped = ts.isCallExpression(outer) && ['fakeAsync', 'waitForAsync'].includes(callName(outer, file));
  if (wrapped) assert.equal(outer.arguments.length, 1);
  const fn = wrapped ? outer.arguments[0] : outer; assert.ok(ts.isArrowFunction(fn));
  if (argument === 1) assert.ok(ts.isBlock(fn.body)); assert.equal(fn.parameters.length, 0);
  const async = !!fn.modifiers?.some(n => n.kind === ts.SyntaxKind.AsyncKeyword);
  assert.ok(!fn.modifiers || (fn.modifiers.length === 1 && async));
  const actual = predicates(outer, file); if (row.assertions) assert.deepEqual(actual, row.assertions, 'stale predicate metadata');
  return {file, fn, assertions: actual, wrapper: (wrapped ? callName(outer, file) + '-' : '') + (async ? 'async-arrow' : 'sync-arrow')};
}
function permittedSteps(index) {
  assert.ok(Number.isInteger(index) && index >= 0 && index < 4);
  const steps = ['fixture.detectChanges();'];
  if (index === 0 || index === 1 || index === 3) steps.push('tick();');
  if (index === 1 || index === 2) steps.push('flush();');
  if (index === 2) steps.push('fixtureOne.detectChanges();', 'fixtureTwo.detectChanges();',
    'tick(250);', 'await wait(300);', 'await fixture.whenStable();');
  if (index === 3) steps.push('cdkTableMatSortAppFixture.detectChanges();', 'matTableMatSortAppFixture.detectChanges();',
    'matSortWithArrowPositionFixture.detectChanges();', 'await fixture.whenStable();');
  return new Set(steps);
}
export function projectSurfaceAsyncBody(row, index, argument = 1) {
  const {file, fn, wrapper, assertions} = callback(row, argument), permitted = permittedSteps(index), steps = [];
  const result = ts.transform(fn.body, [context => {
    const visit = node => {
      if (ts.isExpressionStatement(node)) {
        let expression = node.expression; if (ts.isAwaitExpression(expression)) expression = expression.expression;
        const name = callName(expression, file);
        // HTTP TestRequest.flush and subscriber/helper operations remain in the body.
        if (['tick', 'flush', 'flushMicrotasks', 'wait'].includes(name) || /\.(detectChanges|whenStable)$/.test(name)) {
          const text = node.getText(file); assert.ok(permitted.has(text), 'unrecorded boundary ' + text);
          steps.push({text, source_start: node.getStart(file), source_sha256: hash(text)}); return undefined;
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return node => ts.visitNode(node, visit);
  }]);
  try { return {wrapper, steps, assertions, projected_body_sha256: fingerprint(result.transformed[0]),
    scheduler_deadline_frame_or_lifetime_equivalence_proved: false}; } finally { result.dispose(); }
}
export function compareSurfaceAsyncCases(sha, before, after) {
  const index = SURFACE_ASYNC_SHAS.indexOf(sha); assert.ok(index >= 0);
  assert.equal(before.length, [60, 73, 29, 26][index]);
  assert.equal(new Set(before.map(n => n.key)).size, before.length);
  assert.equal(new Set(after.map(n => n.key)).size, after.length);
  assert.deepEqual(before.map(n => n.key), after.map(n => n.key), 'full case identity/order/mode changed');
  const pairs = before.map((old, i) => {
    const next = after[i]; assert.equal(old.mode, 'it'); assert.equal(next.mode, 'it');
    const a = projectSurfaceAsyncBody(old, index), b = projectSurfaceAsyncBody(next, index);
    assert.equal(a.projected_body_sha256, b.projected_body_sha256, 'unreviewed nonboundary/helper/assertion/declaration change');
    assert.deepEqual(a.assertions.map(n => n.sha256), b.assertions.map(n => n.sha256), 'predicate changed');
    return {path: old.path, suites: old.suites, name: old.name, mode: old.mode,
      before_sha256: old.sha256, after_sha256: next.sha256,
      unchanged_complete_callback_semantics: old.callback_sha256 === next.callback_sha256,
      exact_predicate_expressions_equal: true, all_nonboundary_operations_equal: true, before: a, after: b,
      fixture_scheduler_security_or_peer_behavior_equivalence_proved: false};
  });
  assert.equal(hash(JSON.stringify(pairs.map(n => [n.path, n.suites, n.name, n.before_sha256, n.after_sha256]))),
    pairDigests[index], 'ordered authenticated raw pair changed');
  return pairs;
}
function scopes(call, file) { const rows = []; for (let n = call.parent; n; n = n.parent) {
  if (ts.isCallExpression(n) && callName(n, file) === 'describe') rows.unshift(n.arguments[0].getText(file));
} return rows; }
function hooks(member, side) {
  const file = parse(member[side].text), counts = new Map();
  return collect(file, n => ts.isCallExpression(n) && ['beforeEach', 'afterEach'].includes(callName(n, file))).map(call => {
    assert.ok(ts.isExpressionStatement(call.parent));
    const mode = callName(call, file), suites = scopes(call, file), base = JSON.stringify([member.path, mode, suites]), occurrence = counts.get(base) || 0;
    counts.set(base, occurrence + 1);
    return {path: member.path, mode, suites, key: base + '#' + occurrence, raw: call.getText(file),
      sha256: hash(call.getText(file)), callback_sha256: fingerprint(call.arguments[0])};
  });
}
function registrations(member, side) {
  const file = parse(member[side].text);
  return collect(file, n => ts.isCallExpression(n) && ['it', 'fit', 'xit', 'beforeEach', 'afterEach'].includes(callName(n, file)))
    .map(n => [callName(n, file), scopes(n, file), ['it', 'fit', 'xit'].includes(callName(n, file)) ? n.arguments[0].getText(file) : null]);
}
export function reviewSurfaceAsyncGlobals(subject) {
  const index = SURFACE_ASYNC_SHAS.indexOf(subject.sha); assert.ok(index >= 0); assert.equal(subject.members.length, 1);
  const member = subject.members[0], a = hooks(member, 'before'), b = hooks(member, 'after');
  assert.deepEqual(a.map(n => n.key), b.map(n => n.key), 'setup/cleanup scope or order changed');
  assert.deepEqual(registrations(member, 'before'), registrations(member, 'after'), 'registration interleaving changed');
  const hookPairs = a.map((old, i) => {
    const before = projectSurfaceAsyncBody(old, index, 0), after = projectSurfaceAsyncBody(b[i], index, 0);
    assert.equal(before.projected_body_sha256, after.projected_body_sha256, 'unreviewed setup/provider/cleanup change');
    return {mode: old.mode, suites: old.suites, before_sha256: old.sha256, after_sha256: b[i].sha256, before, after,
      injector_or_creation_equivalence_proved: false};
  });
  const before = parse(member.before.text), after = parse(member.after.text), imports = [], waitHelpers = [];
  function global(file) {
    const removed = []; let waitCount = 0;
    const result = ts.transform(file, [context => {
      const visit = node => {
        if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
            ['it', 'fit', 'xit', 'beforeEach', 'afterEach'].includes(callName(node.expression, file))) return undefined;
        if (ts.isImportSpecifier(node) && importRemovals[index].includes(node.name.text)) {
          let parent = node; while (parent && !ts.isImportDeclaration(parent)) parent = parent.parent;
          if (parent?.moduleSpecifier.text === '@angular/core/testing') {
            assert.ok(!node.propertyName || node.propertyName.text === node.name.text); removed.push(node.name.text); return undefined;
          }
        }
        if (index === 2 && ts.isFunctionDeclaration(node) && node.name?.text === 'wait') {
          const expected = parse('function wait(milliseconds: number) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }');
          assert.deepEqual(semantic(node), semantic(expected.statements[0])); waitCount++; return undefined;
        }
        return ts.visitEachChild(node, visit, context);
      };
      return node => ts.visitNode(node, visit);
    }]);
    try { imports.push(removed.sort()); waitHelpers.push(waitCount); return fingerprint(result.transformed[0]); }
    finally { result.dispose(); }
  }
  assert.equal(global(before), global(after), 'unreviewed noncase helper/import/metadata change');
  assert.deepEqual(imports, [[...importRemovals[index]].sort(), []]);
  assert.deepEqual(waitHelpers, index === 2 ? [0, 1] : [0, 0]);
  const fixtureClasses = file => collect(file, ts.isClassDeclaration).filter(node => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isCallExpression(parent) && ['it', 'fit', 'xit', 'beforeEach', 'afterEach'].includes(callName(parent, file))) return false;
    } return true;
  }).map(node => ({name: node.name?.text, raw_sha256: hash(node.getText(file))}));
  const classes = fixtureClasses(before); assert.deepEqual(classes, fixtureClasses(after), 'fixture class/template/style bytes changed');
  return {hookPairs, fixtureClasses: classes, removed_testing_imports: imports[0], native_wait_helper_added: index === 2,
    all_other_noncase_helpers_and_metadata_equal: true, retained_expansion_waitForAsync_binding_and_setup: index === 2};
}
export function analyzeSurfaceAsyncOriginal(subject) {
  const index = SURFACE_ASYNC_SHAS.indexOf(subject.sha); assert.ok(index >= 0);
  assert.deepEqual(subject.members.map(n => n.path), [SURFACE_ASYNC_PATHS[index]]);
  assert.deepEqual(subject.complete_changed_files.map(n => n.path), [SURFACE_ASYNC_PATHS[index]]);
  assert.equal(subject.complete_changed_files[0].status, 'M');
  for (const field of ['before_mode', 'after_mode']) assert.equal(subject.complete_changed_files[0][field], '100644');
  const hunks = reviewCompleteSingleSpec(subject, SURFACE_ASYNC_SHAS), before = originalEnvironmentCases(subject, 'before'), after = originalEnvironmentCases(subject, 'after');
  assert.equal(hunks.length, [28, 24, 11, 8][index]); const pairs = compareSurfaceAsyncCases(subject.sha, before, after);
  const trustChecks = index === 0 ? ICON_TRUST_CASES.map(name => {
    const old = before.filter(n => n.name === name), next = after.filter(n => n.name === name);
    assert.equal(old.length, 1); assert.equal(next.length, 1); assert.equal(old[0].raw, next[0].raw);
    return {path: old[0].path, suites: old[0].suites, name, raw_sha256: old[0].sha256,
      complete_original_case_unchanged: true, actual_security_validation_executed: false};
  }) : [];
  return {sha: subject.sha, complete_original_files: 1, complete_original_hunks: hunks.length, hunks,
    static_occurrences_paired: pairs.length, unchanged_complete_callback_semantics: pairs.filter(n => n.unchanged_complete_callback_semantics).length,
    pairs, ...reviewSurfaceAsyncGlobals(subject), trustChecks,
    actual_Angular_native_artifact_or_floor_qualified: false, security_clearance: 'not-passed'};
}
export function inspectSurfaceAsyncSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path)));
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const [originals, acquisition] = ['compatibility/rc/spec-surface-async-source-subjects.json.gz',
    'compatibility/rc/spec-surface-async-source-acquisition.json.gz'].map((path, i) => {
    const bytes = read(path); assert.equal(hash(bytes), SURFACE_ASYNC_CAPSULES[line][i]); return JSON.parse(gunzipSync(bytes));
  });
  for (const packet of [originals, acquisition]) { assert.equal(packet.line, line);
    assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);
    assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects, SURFACE_ASYNC_SHAS); }
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
  assert.equal(acquisition.upstream_or_candidate_source_executed, false); assert.deepEqual(originals.subjects.map(n => n.sha), SURFACE_ASYNC_SHAS);
  const census = JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz'))); assert.equal(census.line, line);
  for (const subject of originals.subjects) { const original = census.commits.find(n => n.sha === subject.sha);
    assert.equal(subject.raw_commit, original.raw_commit); assert.deepEqual(subject.complete_changed_files, original.complete_changed_files); }
  const subjects = originals.subjects.map(analyzeSurfaceAsyncOriginal), repair = inspectChipEmptyRepair({root, readMember: read});
  const context = JSON.parse(read('compatibility/rc/spec-stability-context-checkpoint.json'));
  for (const ref of context.output_metadata) if (ref.path !== 'compatibility/f10/disposition-ledger/ledger.json') assert.equal(hash(read(ref.path)), ref.sha256);
  const previous = JSON.parse(read('compatibility/rc/spec-form-async-source-checkpoint.json'));
  assert.equal(previous.source_controls_passed, 77); assert.equal(previous.unrelated_ledger_rows_unchanged, 1693);
  return {schema_version: 1, line, subjects, complete_original_files: 4, complete_original_hunks: 71, static_occurrences_paired: 188,
    case_additions_removals_or_renames: 0, unchanged_complete_callback_semantics: 147, exact_predicate_expressions_equal: 188,
    owned_product_members: repair.product_members, current_owned_cases_preserved: 2223, production_HTML_CSS_SCSS_or_template_changes: 0,
    actual_new_Angular_chip_case_executed: false, actual_Angular_native_artifact_or_floor_qualified: false,
    security_clearance: 'not-passed', g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectSurfaceAsyncSources(), out = process.argv.indexOf('--out');
  if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...report, subjects: report.subjects.map(({pairs, hookPairs, hunks, fixtureClasses, ...summary}) =>
    ({...summary, setup_hooks: hookPairs.length, fixture_classes: fixtureClasses.length}))}));
}
