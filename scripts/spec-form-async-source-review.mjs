/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Account for four complete original async migrations; no scheduler/runtime admission. */
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
export const FORM_ASYNC_SHAS = ['2ad427438e903cb9f40666207287b13b132a2bc1',
  '75ef78451f2ae49b916c494d7a898707d7051acf', '046e1a2789c2a18cc14707d7a78a0efab6a2fdd0',
  '1afcedeaf622d300a1238823e1376d1633c50074'];
export const FORM_ASYNC_PATHS = ['src/material/input/input.spec.ts', 'src/material/checkbox/checkbox.spec.ts',
  'src/material/slide-toggle/slide-toggle.spec.ts', 'src/material/bottom-sheet/bottom-sheet.spec.ts'];
export const FORM_ASYNC_CAPSULES = {
  main: ['a9f029dda3b1a55d113c0c1d98753c2425c573dfca25446158ab300cc6a9a5bb', 'f5d3981376bf00ae012b39c23555efaf856cae3334b7909adc9cbb004e1a04ee'],
  '21.x': ['b2c5c4c8e8b9f42eb3ee32d119f361ed11c130f97f807ea74bbd17d61bcb15f4', '7931efc95dc9e2a894f4f888b6ef76f79f088444cdc8538372a3f5788ad1dfa2'],
};
// Digests of the ordered authenticated original raw case pairs, not product goldens.
const casePairDigests = ['d00380c7b0882eda90e7c4d6bce59dc1fbd8ed376e366a269d60a43f0843af07',
  '1195192d1077e600159c7d5f86f63fb409cdae8576d7efc852bc9dc4f454db71',
  '5ef381508196c78fb28b8eb3de5d5361b381a9e5103356ef464dd849b31bc1d5',
  '5640c41f5c4392a6fb9a6e73b5b717ba5b0ec4feccafb0331f3cdc172ba97d8c'];
export const FORM_ASYNC_SPECIAL = {
  notch: ['3ed186e750d565b5c5a52531ef7c886b2a4b1e3f15ed527859f824fd7a41f792', '91e16f5a3f29cc749623560bbcd9bb233e538c11d44683483538c855c831856b'],
  checkboxThrow: ['2324463a528ba269fcb12933d5a58181048e725e10a690c0b89dc180dc149e37', 'f46aa51a688e757b76a88fbf795c354e7017e4c130dded87880385fbbdf937b4'],
  slideThrow: ['734291322a863a88e7b1a5ad2b54ad8bcc1828c11b1e8cd5a2c9746e3e07ac8a', '2c3369ea22569d4d05b052ee88fa76edcbef1f8e5a64609ecb3c85b0a4bca41d'],
  rapidSheet: ['e73daedffcac08c30900564957d82ec5818136c722b52da45a0d16694e3061a2', '9d319ae799ff55f682c574a9146a89b88c1a43a02331e7aa1f5e3b252a5c15c8'],
};
const inputAliases = new Map([["'MatMdcInput without forms'", "'MatInput without forms'"],
  ["'MatMdcInput with forms'", "'MatInput with forms'"]]);
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
const assertions = (node, file) => collect(node, n => ts.isExpressionStatement(n) &&
  n.expression.getText(file).startsWith('expect(')).map(n => ({sha256: fingerprint(n.expression), text: n.getText(file)}));
const canonicalSuites = (row, index) => row.suites.map(n => index === 0 ? inputAliases.get(n) || n : n);
const canonicalKey = (row, index) => JSON.stringify([row.path, row.mode, canonicalSuites(row, index),
  row.name_identity, row.key.match(/#(\d+)$/)?.[1]]);
function special(kind, before, after) { assert.deepEqual([before.sha256, after.sha256], FORM_ASYNC_SPECIAL[kind]); }
function callback(row, argument = 1) {
  const file = parse(row.raw), call = file.statements[0]?.expression;
  assert.ok(ts.isCallExpression(call)); assert.equal(callName(call, file), row.mode);
  assert.equal(call.arguments.length, argument + 1); assert.equal(hash(row.raw), row.sha256);
  const outer = call.arguments[argument]; assert.equal(fingerprint(outer), row.callback_sha256, 'stale callback metadata');
  const fake = ts.isCallExpression(outer) && callName(outer, file) === 'fakeAsync';
  if (fake) assert.equal(outer.arguments.length, 1);
  const fn = fake ? outer.arguments[0] : outer; assert.ok(ts.isArrowFunction(fn));
  if (argument === 1) assert.ok(ts.isBlock(fn.body));
  assert.equal(fn.parameters.length, 0);
  const async = !!fn.modifiers?.some(n => n.kind === ts.SyntaxKind.AsyncKeyword);
  assert.ok(!fn.modifiers || (fn.modifiers.length === 1 && async));
  const actual = assertions(outer, file);
  if (row.assertions) assert.deepEqual(row.assertions, actual, 'stale assertion metadata');
  return {file, fn, assertions: actual, wrapper: fake ? 'fakeAsync-arrow' : async ? 'async-arrow' : 'sync-arrow'};
}
const commonSteps = ['fixture.detectChanges();', 'flush();', 'flushMicrotasks();', 'tick();', 'await fixture.whenStable();'];
function permittedSteps(index, row) {
  const rows = [...commonSteps];
  if (index === 0) rows.push('groupFixture.detectChanges();', 'tick(16);');
  if (index === 3) rows.push('viewContainerFixture.detectChanges();', 'templateRefFixture.detectChanges();',
    'tick(500);', 'tick(1000);', 'await viewContainerFixture.whenStable();', 'await wait(0);');
  if (row.sha256 === FORM_ASYNC_SPECIAL.notch[1]) rows.push('await wait(16);');
  return new Set(rows);
}
export function projectFormAsyncBody(row, index, argument = 1) {
  const {file, fn, wrapper, assertions: predicates} = callback(row, argument), steps = [], locals = [];
  const permitted = permittedSteps(index, row);
  const result = ts.transform(fn.body, [context => {
    const visit = node => {
      if (row.sha256 === FORM_ASYNC_SPECIAL.notch[1] && ts.isVariableStatement(node) &&
          node.declarationList.declarations.some(n => n.name.getText(file) === 'wait')) {
        const expected = parse('const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));');
        assert.deepEqual(semantic(node), semantic(expected.statements[0]));
        locals.push({kind: 'native-Promise-setTimeout-local-helper', source_sha256: hash(node.getText(file))});
        return undefined;
      }
      if (ts.isExpressionStatement(node)) {
        let expression = node.expression; if (ts.isAwaitExpression(expression)) expression = expression.expression;
        const name = callName(expression, file);
        if (['tick', 'flush', 'flushMicrotasks', 'wait'].includes(name) || /\.(detectChanges|whenStable)$/.test(name)) {
          const text = node.getText(file); assert.ok(permitted.has(text), 'unrecorded boundary operation ' + text);
          let withinAssert = false;
          for (let parent = node.parent; parent && parent !== fn.body; parent = parent.parent) {
            if (ts.isCallExpression(parent) && callName(parent, file) === 'expect') withinAssert = true;
          }
          steps.push({text, source_start: node.getStart(file), source_sha256: hash(text), within_expect_subject: withinAssert});
          return undefined;
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return node => ts.visitNode(node, visit);
  }]);
  try { return {wrapper, steps, locals, assertions: predicates, projected_body_sha256: fingerprint(result.transformed[0]),
    removed_operations_are_observations_not_equivalent_schedulers: true}; } finally { result.dispose(); }
}
export function compareFormAsyncCases(subjectSha, before, after) {
  const index = FORM_ASYNC_SHAS.indexOf(subjectSha); assert.ok(index >= 0);
  const left = before.map(n => canonicalKey(n, index)), right = after.map(n => canonicalKey(n, index));
  assert.equal(new Set(left).size, before.length); assert.equal(new Set(right).size, after.length);
  assert.deepEqual(left, right, 'case identity/order/mode differs beyond the two explicit input suite renames');
  assert.equal(before.length, [102, 74, 49, 58][index]);
  const pairs = before.map((old, i) => {
    const next = after[i]; assert.equal(old.mode, 'it'); assert.equal(next.mode, 'it');
    const a = projectFormAsyncBody(old, index), b = projectFormAsyncBody(next, index);
    const exception = Object.entries(FORM_ASYNC_SPECIAL).find(([, values]) => values[0] === old.sha256)?.[0];
    if (exception) special(exception, old, next);
    const equal = a.projected_body_sha256 === b.projected_body_sha256;
    assert.equal(equal, exception !== 'rapidSheet', 'unreviewed nonboundary operation change');
    const predicatesEqual = JSON.stringify(a.assertions.map(n => n.sha256)) === JSON.stringify(b.assertions.map(n => n.sha256));
    assert.equal(predicatesEqual, !['checkboxThrow', 'slideThrow', 'rapidSheet'].includes(exception), 'unreviewed predicate change');
    if (exception === 'notch') { assert.equal(b.locals.length, 1); assert.equal(b.steps.filter(n => n.text === 'await wait(16);').length, 3); }
    if (exception === 'rapidSheet') { assert.equal(a.assertions.length, 1); assert.equal(b.assertions.length, 0); }
    return {path: old.path, before_suites: old.suites, after_suites: next.suites, name: old.name, mode: old.mode,
      before_sha256: old.sha256, after_sha256: next.sha256,
      unchanged_complete_callback_semantics: old.callback_sha256 === next.callback_sha256,
      exact_predicate_expressions_equal: predicatesEqual, body_equal_after_only_recorded_boundary_changes: equal,
      individual_observation: exception || null, before: a, after: b,
      scheduler_fixture_frame_deadline_or_lifetime_equivalence_proved: false};
  });
  const rawPairs = pairs.map(n => [n.path, n.before_suites, n.name, n.before_sha256, n.after_sha256]);
  assert.equal(hash(JSON.stringify(rawPairs)), casePairDigests[index], 'ordered original raw case pair changed');
  return pairs;
}
function suites(call, file) { const rows = []; for (let n = call.parent; n; n = n.parent) {
  if (ts.isCallExpression(n) && callName(n, file) === 'describe') rows.unshift(n.arguments[0].getText(file));
} return rows; }
function hooks(member, side, index) {
  const file = parse(member[side].text), occurrences = new Map();
  return collect(file, n => ts.isCallExpression(n) && ['beforeEach', 'afterEach'].includes(callName(n, file))).map(call => {
    assert.ok(ts.isExpressionStatement(call.parent));
    const mode = callName(call, file), scope = suites(call, file), base = JSON.stringify([member.path, mode,
      scope.map(n => index === 0 ? inputAliases.get(n) || n : n)]), occurrence = occurrences.get(base) || 0;
    occurrences.set(base, occurrence + 1);
    return {path: member.path, mode, suites: scope, key: base + '#' + occurrence, raw: call.getText(file),
      sha256: hash(call.getText(file)), callback_sha256: fingerprint(call.arguments[0])};
  });
}
function registrationStream(member, side, index) {
  const file = parse(member[side].text);
  return collect(file, n => ts.isCallExpression(n) && ['it', 'fit', 'xit', 'beforeEach', 'afterEach'].includes(callName(n, file)))
    .map(call => [callName(call, file), suites(call, file).map(n => index === 0 ? inputAliases.get(n) || n : n),
      ['it', 'fit', 'xit'].includes(callName(call, file)) ? call.arguments[0].getText(file) : null]);
}
export function reviewFormAsyncGlobals(subject) {
  const index = FORM_ASYNC_SHAS.indexOf(subject.sha); assert.ok(index >= 0); assert.equal(subject.members.length, 1);
  const member = subject.members[0], before = parse(member.before.text), after = parse(member.after.text);
  const a = hooks(member, 'before', index), b = hooks(member, 'after', index);
  assert.deepEqual(a.map(n => n.key), b.map(n => n.key), 'setup hook scope or order changed');
  const hookPairs = a.map((old, i) => {
    const first = projectFormAsyncBody(old, index, 0), next = projectFormAsyncBody(b[i], index, 0);
    assert.equal(first.projected_body_sha256, next.projected_body_sha256, 'unreviewed setup operation change');
    return {mode: old.mode, before_suites: old.suites, after_suites: b[i].suites,
      before_sha256: old.sha256, after_sha256: b[i].sha256, before: first, after: next,
      setup_scheduler_provider_or_creation_equivalence_proved: false};
  });
  assert.deepEqual(registrationStream(member, 'before', index), registrationStream(member, 'after', index), 'registration interleaving changed');
  const removedImports = [], aliasCounts = [], waitHelpers = [];
  const global = (file, side) => {
    let aliases = 0, helpers = 0; const removed = [];
    const result = ts.transform(file, [context => {
      const visit = node => {
        if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
            ['it', 'fit', 'xit', 'beforeEach', 'afterEach'].includes(callName(node.expression, file))) return undefined;
        if (ts.isImportSpecifier(node) && ['fakeAsync', 'flush', 'flushMicrotasks', 'tick'].includes(node.name.text)) {
          let parent = node; while (parent && !ts.isImportDeclaration(parent)) parent = parent.parent;
          if (parent?.moduleSpecifier.text === '@angular/core/testing') { removed.push(node.name.text); return undefined; }
        }
        if (index === 0 && ts.isCallExpression(node) && callName(node, file) === 'describe' && inputAliases.has(node.arguments[0].getText(file))) {
          const [name, ...rest] = node.arguments; aliases++;
          return ts.factory.updateCallExpression(node, node.expression, node.typeArguments,
            [ts.factory.createStringLiteral(inputAliases.get(name.getText(file)).slice(1, -1)), ...rest.map(n => ts.visitNode(n, visit))]);
        }
        if (index === 3 && ts.isFunctionDeclaration(node) && node.name?.text === 'wait') {
          const expected = parse('function wait(milliseconds: number) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }');
          assert.deepEqual(semantic(node), semantic(expected.statements[0])); helpers++; return undefined;
        }
        return ts.visitEachChild(node, visit, context);
      };
      return node => ts.visitNode(node, visit);
    }]);
    try { removedImports.push(removed.sort()); aliasCounts.push(aliases); waitHelpers.push(helpers);
      return fingerprint(result.transformed[0]); } finally { result.dispose(); }
  };
  assert.equal(global(before, 'before'), global(after, 'after'), 'unreviewed noncase program or metadata change');
  assert.deepEqual(removedImports, [[['fakeAsync', 'flush', 'tick'], ['fakeAsync', 'flush', 'flushMicrotasks'],
    ['fakeAsync', 'flush', 'flushMicrotasks', 'tick'], ['fakeAsync', 'flush', 'flushMicrotasks', 'tick']][index].sort(), []]);
  assert.deepEqual(aliasCounts, index === 0 ? [2, 0] : [0, 0]); assert.deepEqual(waitHelpers, index === 3 ? [0, 1] : [0, 0]);
  const fixtureClasses = file => collect(file, ts.isClassDeclaration).filter(node => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isCallExpression(parent) && ['it', 'fit', 'xit', 'beforeEach', 'afterEach'].includes(callName(parent, file))) return false;
    } return true;
  }).map(node => ({name: node.name?.text, raw_sha256: hash(node.getText(file))}));
  const classes = fixtureClasses(before); assert.deepEqual(classes, fixtureClasses(after), 'fixture class/template/style bytes changed');
  return {hookPairs, fixtureClasses: classes, removed_testing_imports: removedImports[0],
    explicit_input_suite_renames: index === 0 ? [...inputAliases] : [], native_wait_helper_added: index === 3,
    all_other_noncase_operations_and_metadata_equal: true, class_template_and_style_bytes_preserved: true};
}
export function analyzeFormAsyncOriginal(subject) {
  const index = FORM_ASYNC_SHAS.indexOf(subject.sha); assert.ok(index >= 0);
  assert.deepEqual(subject.members.map(n => n.path), [FORM_ASYNC_PATHS[index]]);
  assert.deepEqual(subject.complete_changed_files.map(n => n.path), [FORM_ASYNC_PATHS[index]]);
  assert.equal(subject.complete_changed_files[0].status, 'M');
  for (const field of ['before_mode', 'after_mode']) assert.equal(subject.complete_changed_files[0][field], '100644');
  const hunks = reviewCompleteSingleSpec(subject, FORM_ASYNC_SHAS), pairs = compareFormAsyncCases(subject.sha,
    originalEnvironmentCases(subject, 'before'), originalEnvironmentCases(subject, 'after'));
  assert.equal(hunks.length, [81, 51, 31, 42][index]);
  return {sha: subject.sha, complete_original_files: 1, complete_original_hunks: hunks.length, hunks,
    full_ordered_case_pairing: true, static_occurrences_paired: pairs.length,
    unchanged_complete_callback_semantics: pairs.filter(n => n.unchanged_complete_callback_semantics).length,
    exact_predicate_expressions_equal: pairs.filter(n => n.exact_predicate_expressions_equal).length,
    whole_bodies_equal_after_only_recorded_boundary_changes: pairs.filter(n => n.body_equal_after_only_recorded_boundary_changes).length,
    pairs, ...reviewFormAsyncGlobals(subject), actual_Angular_native_artifact_or_floor_qualified: false};
}
export function inspectFormAsyncSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path)));
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const originalsPath = 'compatibility/rc/spec-form-async-source-subjects.json.gz', acquisitionPath = 'compatibility/rc/spec-form-async-source-acquisition.json.gz';
  const [originals, acquisition] = [originalsPath, acquisitionPath].map((path, i) => {
    const bytes = read(path); assert.equal(hash(bytes), FORM_ASYNC_CAPSULES[line][i]); return JSON.parse(gunzipSync(bytes));
  });
  for (const packet of [originals, acquisition]) {
    assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);
    assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects, FORM_ASYNC_SHAS);
  }
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
  assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  assert.deepEqual(originals.subjects.map(n => n.sha), FORM_ASYNC_SHAS);
  const census = JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));
  for (const subject of originals.subjects) { const original = census.commits.find(n => n.sha === subject.sha);
    assert.equal(subject.raw_commit, original.raw_commit); assert.deepEqual(subject.complete_changed_files, original.complete_changed_files); }
  const subjects = originals.subjects.map(analyzeFormAsyncOriginal), repair = inspectChipEmptyRepair({root, readMember: read});
  const context = JSON.parse(read('compatibility/rc/spec-stability-context-checkpoint.json'));
  for (const ref of context.output_metadata) if (ref.path !== 'compatibility/f10/disposition-ledger/ledger.json') assert.equal(hash(read(ref.path)), ref.sha256);
  const previous = JSON.parse(read('compatibility/rc/spec-stability-source-checkpoint.json'));
  assert.equal(previous.source_controls_passed, 74); assert.equal(previous.unrelated_ledger_rows_unchanged, 1693);
  return {schema_version: 1, line, subjects, complete_original_files: 4, complete_original_hunks: 205,
    static_occurrences_paired: 283, explicit_input_suite_renames: 2, case_additions_or_removals: 0,
    owned_product_members: repair.product_members, old_owned_cases_preserved: 2222, current_owned_cases: 2223,
    production_HTML_CSS_SCSS_or_template_changes: 0, new_Angular_chip_case_executed: false,
    actual_Angular_native_artifact_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectFormAsyncSources(), out = process.argv.indexOf('--out');
  if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...report, subjects: report.subjects.map(({pairs, hookPairs, hunks, fixtureClasses, ...summary}) =>
    ({...summary, setup_hooks: hookPairs.length, fixture_classes: fixtureClasses.length}))}));
}
