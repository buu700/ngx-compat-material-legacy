/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete global-setup source decision; no original framework/source execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteGlobalZonelessFile} from '../compatibility/rc/mixed-global-zoneless-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = x => createHash('sha256').update(x).digest('hex');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-global-zoneless-source-', pinSha = '1de4456c8e282bb00ca308a9449c76c94b1879f2e2d58291c98e66219b19af4a';
export const GLOBAL_ZONELESS_SHA = 'ad7a14b85f35c5e194685fda2adcb19009c49c02';
const parse = text => {const file = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0); return file;};
function nodes(root, predicate) {const rows = []; function visit(n) {if (predicate(n)) rows.push(n); ts.forEachChild(n, visit);} visit(root); return rows;}
function semantic(node, drop = new Set()) {
  if (drop.has(node)) return null;
  const children = []; ts.forEachChild(node, n => {const value = semantic(n, drop); if (value !== null) children.push(value);});
  return [node.kind, node.operator ?? null, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];
}
const fingerprint = (node, drop) => hash(JSON.stringify(semantic(node, drop)));
const fact = n => ({kind: ts.SyntaxKind[n.kind], raw: n.getText(), sha256: hash(n.getText()), semantic_sha256: fingerprint(n)});
export function projectGlobalZonelessProviders(text, after) {
  const file = parse(text), drop = new Set(), exclusions = [];
  const provider = n => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'provideZoneChangeDetection' && n.arguments.length === 0;
  const providers = n => ts.isPropertyAssignment(n) && n.name.getText() === 'providers' && ts.isArrayLiteralExpression(n.initializer) && n.initializer.elements.length > 0 && n.initializer.elements.every(provider);
  const onlyConfiguration = n => {
    if (!ts.isExpressionStatement(n) || !ts.isCallExpression(n.expression) || n.expression.expression.getText() !== 'TestBed.configureTestingModule' || n.expression.arguments.length !== 1) return false;
    const arg = n.expression.arguments[0]; return ts.isObjectLiteralExpression(arg) && arg.properties.length === 1 && providers(arg.properties[0]);
  };
  const remove = n => {drop.add(n); exclusions.push(fact(n));};
  const beforeCalls = nodes(file, provider); if (!after) assert.equal(beforeCalls.length, 0);
  if (after) for (const n of nodes(file, () => true)) {
    if (provider(n) || providers(n) || onlyConfiguration(n)) remove(n);
    if (ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@angular/core' && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
      const specifiers = n.importClause.namedBindings.elements, selected = specifiers.filter(x => !x.propertyName && x.name.text === 'provideZoneChangeDetection');
      for (const item of selected) remove(item);
      if (selected.length && selected.length === specifiers.length && !n.importClause.name) remove(n);
    }
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) && n.expression.expression.getText() === 'beforeEach' && n.expression.arguments.length === 1) {
      const hook = n.expression.arguments[0];
      if (ts.isArrowFunction(hook) && hook.parameters.length === 0 && ts.isBlock(hook.body) && hook.body.statements.length === 1 && onlyConfiguration(hook.body.statements[0])) remove(n);
    }
  }
  return {whole_source_projection_sha256: fingerprint(file, drop), exclusions,
    projection_only_fixture_provider_hook_error_lifetime_runtime_equivalence_proved: false};
}
function frame(member, side) {
  const raw = member[side].text, result = {sha256: hash(raw), bytes: Buffer.byteLength(raw)};
  if (!member.path.endsWith('.ts')) return {...result, json_data: member.path === 'package.json' ? JSON.parse(raw) : null};
  const file = parse(raw);
  return {...result, whole_ast_sha256: fingerprint(file), imports: nodes(file, ts.isImportDeclaration).map(fact),
    class_and_function_frames: nodes(file, n => ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n)).map(n => ({kind: ts.SyntaxKind[n.kind], name: n.name?.getText() ?? '', sha256: hash(n.getText()), semantic_sha256: fingerprint(n)})),
    notification_setup_wait_and_assertion_calls: nodes(file, n => ts.isCallExpression(n) && /(?:configureTestingModule|initTestEnvironment|createComponent|markForCheck|detectChanges|whenStable|isStable|tick|flush|flushMicrotasks|afterRender|provideZoneChangeDetection|provideExperimentalZonelessChangeDetection|spyOn|toThrow|toThrowError|toHaveBeenCalled|toHaveBeenCalledTimes|toBeLessThanOrEqual|toBeGreaterThanOrEqual)$/.test(n.expression.getText())).map(fact),
    error_cleanup_frames: nodes(file, n => ts.isThrowStatement(n) || ts.isTryStatement(n) || ts.isCatchClause(n)).map(fact),
    hooks: overlayHooks({members: [member]}, side).map(({raw, ...row}) => row)};
}
const caseIdentity = n => ({path: n.path, mode: n.mode, suites: n.suites, suite_identities: n.suite_identities, name: n.name, name_identity: n.name_identity, key: n.key, sha256: n.sha256, callback_sha256: n.callback_sha256, assertions: n.assertions});
export function pairGlobalZonelessCases(subject, notes) {
  const specs = {members: subject.members.filter(n => n.path.endsWith('.spec.ts'))}, before = originalEnvironmentCases(specs, 'before'), after = originalEnvironmentCases(specs, 'after');
  assert.equal(before.length, 4232); assert.equal(after.length, 4232);
  const byKey = new Map(after.map(n => [n.key, n])); assert.equal(byKey.size, after.length); assert.equal(new Set(before.map(n => n.key)).size, before.length);
  const pairs = before.map(old => {const next = byKey.get(old.key); assert.ok(next); assert.equal(next.mode, old.mode);
    return {before: caseIdentity(old), after: caseIdentity(next), complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256};});
  assert.equal(pairs.filter(n => n.complete_callback_semantics_equal).length, 4105);
  const critical = notes.critical_assertion_changes.map(row => {const pair = pairs.find(n => n.before.key === row.key); assert.ok(pair);
    assert.equal(pair.before.path, row.path); assert.equal(pair.before.callback_sha256, row.before_complete_callback_sha256); assert.equal(pair.after.callback_sha256, row.after_complete_callback_sha256);
    assert.equal(pair.complete_callback_semantics_equal, false); return {...row, before: pair.before, after: pair.after};});
  assert.equal(critical.length, 8); return {pairs, critical};
}
export function compareGlobalZonelessMetadata(subject) {
  const member = subject.members.find(n => n.path === 'package.json'), before = JSON.parse(member.before.text), after = JSON.parse(member.after.text), changes = [];
  const old = structuredClone(before), next = structuredClone(after);
  for (const group of ['dependencies', 'devDependencies']) for (const key of Object.keys(before[group])) {
    if (before[group][key] === after[group][key]) continue;
    assert.ok(key.startsWith('@angular/')); assert.equal(before[group][key], '^18.0.0-rc.0'); assert.equal(after[group][key], '^18.0.0-rc.2');
    changes.push({group, key, before: old[group][key], after: next[group][key]}); old[group][key] = next[group][key] = '<exact-reviewed-prerelease-substitution>';
  }
  assert.equal(changes.length, 11); assert.deepEqual(next, old);
  const lock = subject.members.find(n => n.path === 'yarn.lock');
  function sections(raw) {
    const boundaries = [0]; for (const match of raw.matchAll(/^[^\s#][^\n]*:\r?$/gm)) if (match.index !== 0) boundaries.push(match.index);
    boundaries.push(raw.length); const rows = boundaries.slice(0, -1).map((start, i) => {const text = raw.slice(start, boundaries[i + 1]); return {key: start === 0 ? '<preamble>' : text.split('\n')[0], text};});
    assert.equal(rows.map(n => n.text).join(''), raw); assert.equal(new Set(rows.map(n => n.key)).size, rows.length); return rows;
  }
  const a = sections(lock.before.text), b = sections(lock.after.text), byKey = new Map(b.map(n => [n.key, n.text])), removed = [], added = [], unchanged = [];
  for (const row of a) {if (!byKey.has(row.key)) removed.push(row); else {assert.equal(byKey.get(row.key), row.text); unchanged.push({key: row.key, sha256: hash(row.text)});}}
  const oldKeys = new Set(a.map(n => n.key)); for (const row of b) if (!oldKeys.has(row.key)) added.push(row);
  assert.equal(removed.length, 11); assert.equal(added.length, 11);
  for (const change of changes) {assert.equal(removed.filter(n => n.key === JSON.stringify(change.key + '@^18.0.0-rc.0') + ':').length, 1); assert.equal(added.filter(n => n.key === JSON.stringify(change.key + '@^18.0.0-rc.2') + ':').length, 1);}
  return {package_changes: changes, lock_unchanged_lexical_sections: unchanged, lock_removed_complete_lexical_sections: removed, lock_added_complete_lexical_sections: added,
    lexical_comparison_only_install_advisory_or_dependency_qualification: false};
}
export function observeGlobalZonelessSubject(subject, notes) {
  assert.equal(subject.sha, GLOBAL_ZONELESS_SHA); assert.equal(subject.members.length, 149);
  const files = subject.members.map(n => ({path: n.path, before: frame(n, 'before'), after: frame(n, 'after')}));
  const projections = subject.members.filter(n => n.path.endsWith('.spec.ts')).map(n => {const before = projectGlobalZonelessProviders(n.before.text, false), after = projectGlobalZonelessProviders(n.after.text, true);
    return {path: n.path, before, after, whole_source_equal_after_exact_provider_preparation_projection: before.whole_source_projection_sha256 === after.whole_source_projection_sha256};});
  assert.equal(projections.length, 130); assert.equal(projections.filter(n => n.whole_source_equal_after_exact_provider_preparation_projection).length, 86);
  assert.deepEqual(projections.filter(n => !n.whole_source_equal_after_exact_provider_preparation_projection).map(n => n.path), notes.provider_projection_review_lead.residual_paths);
  const {pairs, critical} = pairGlobalZonelessCases(subject, notes);
  return {sha: subject.sha, files, pairs, critical_assertion_changes: critical, source_provider_preparation_projections: projections, dependency_metadata: compareGlobalZonelessMetadata(subject),
    source_cases_before: 4232, source_cases_after: 4232, unchanged_complete_callbacks: 4105, changed_complete_callbacks: 127,
    source_provider_projection_equal_files: 86, individually_read_residual_files: 44,
    provider_fixture_notification_error_lifetime_style_or_emitted_metadata_equivalence_proved: false, actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false};
}
export function reviewGlobalZonelessSubject(subject, notes, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]), pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'complete original source drifted');
  const actual = observeGlobalZonelessSubject(subject, notes); assert.deepEqual(actual, pin.observation); return actual;
}
export function inspectGlobalZonelessOwnedContext({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), intake = JSON.parse(read(prefix + 'intake.json'));
  for (const ref of intake.owned_context_read) assert.equal(hash(read(ref.path)), ref.sha256, 'owned runner/toolchain/context drifted ' + ref.path);
  const paths = candidateProductSourcePaths(root); assert.equal(paths.length, 1028); const bootstrap = read('testing/legacy-runner/init-test-env.ts').toString();
  assert.ok(bootstrap.includes('provideZoneChangeDetection()')); assert.ok(!bootstrap.includes('prototype.whenStable')); assert.ok(!bootstrap.includes('provideExperimentalZonelessChangeDetection'));
  return {owned_context: intake.owned_context_read, source_members: paths.length, source_members_sha256: hash(JSON.stringify(paths.map(path => ({path, sha256: hash(read(path))})))),
    explicit_owned_public_zoneful_preparation: true, public_fixture_stability_untouched: true, experimental_zoneless_setup_adopted: false,
    required_consumer_HTML_CSS_SCSS_changes: 0, actual_framework_error_lifecycle_or_floor_executed: false};
}
export function globalZonelessPins({root = rootDefault, readMember} = {}) {const read = readMember || (p => readFileSync(resolve(root, p))), raw = read(prefix + 'observation-pins.json.gz'); assert.equal(hash(raw), pinSha); return JSON.parse(gunzipSync(raw));}
export function inspectGlobalZonelessSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = globalZonelessPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = n => {const raw = read(prefix + n); assert.equal(hash(raw), pins.capsules[line][n]); return n.endsWith('.gz') ? JSON.parse(gunzipSync(raw)) : JSON.parse(raw);};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz'), notes = load('source-read-notes.json');
  assert.deepEqual(originals.subjects.map(n => n.sha), [GLOBAL_ZONELESS_SHA]); assert.deepEqual(acquisition.subjects, [GLOBAL_ZONELESS_SHA]);
  const censusRaw = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusRaw)); assert.equal(census.commits.length, 1697); assert.equal(hash(censusRaw), originals.source_inventory.sha256);
  for (const packet of [originals, acquisition]) {assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256); assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);}
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false); assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  const subject = originals.subjects[0], source = census.commits.find(n => n.sha === GLOBAL_ZONELESS_SHA); assert.equal(source.raw_commit, subject.raw_commit); assert.deepEqual(source.complete_changed_files, subject.complete_changed_files);
  assert.equal(hash(read(prefix + subject.sha + '.original.patch')), subject.diff_sha256);
  const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = []; assert.equal(parts.length, 149);
  for (const [i, member] of subject.members.entries()) {const diff = parts[i]; hunks.push(...reviewCompleteGlobalZonelessFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]], diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, [GLOBAL_ZONELESS_SHA]));}
  assert.equal(hunks.length, 467); const observation = reviewGlobalZonelessSubject(subject, notes, pins.subject);
  const owned = inspectGlobalZonelessOwnedContext({root, readMember: read}); assert.deepEqual(owned, pins.owned_context[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root); assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subject: {...observation, hunks, review: pins.subject.review}, owned_context: owned,
    complete_original_files: 149, complete_original_body_records: 298, complete_original_hunks: 467, retained_source_case_identities: 4232,
    unchanged_complete_source_callbacks: 4105, changed_complete_callbacks: 127, critical_assertion_changes: 8,
    owned_product_members: product.product_members, current_required_historical_case_ids: 2228, product_or_consumer_changes: 0,
    required_consumer_HTML_CSS_SCSS_changes: 0, actual_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectGlobalZonelessSources(), at = process.argv.indexOf('--out'); if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, files: 149, hunks: 467, cases: 4232, callback_equal: 4105, critical_assertion_changes: 8, actual_runtime_qualified: false}));
}
