/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete build/harness applicability; original tools are inert source data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedBuildHarnessFile} from '../compatibility/rc/mixed-build-harness-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {lockSourceEntries} from './mixed-zone-moves-source-review.mjs';
import {yamlSourceSections} from './mixed-compiler-build-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = x => createHash('sha256').update(x).digest('hex');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-build-harness-source-', pinSha = '5875983308eeba6f75c33fa5dae4a03d186bc7ee73beb64f8f1528bef933b314';
export const BUILD_HARNESS_SHAS = ['f3602573ad8c79ccbcf76ac2355a9a95ab377566', '47b3be5f6fe9bc23e62b2036210ec31f79ab22d4',
  'f81b620f62179350d008b069d0d7228695a00ce0', '3da71ce7f921f16392bf454eddbd1c421bfbdd32'];
const duplicateCalls = {'src/cdk/table/text-column.spec.ts': 'faae823544cab2b184d000324464373cf7cac057a623738887f7920077a67795',
  'src/material/datepicker/calendar-body.spec.ts': '2264f3301f402cdd0f662e8fb508e2ee0e682ad7d2069cb91e3f3d13ceb5a8b4'};
const parse = text => {const file = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0); return file;};
const name = n => n?.name?.getText() ?? '';
function nodes(node, predicate) {const found = []; function visit(n) {if (predicate(n)) found.push(n); ts.forEachChild(n, visit);} visit(node); return found;}
const registration = n => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['it', 'fit', 'xit', 'describe', 'fdescribe', 'xdescribe'].includes(n.expression.text);
function semantic(node, mode = '', drop = new Set()) {
  if (drop.has(node)) return null;
  if (mode === 'titles' && node.parent && registration(node.parent) && node.parent.arguments[0] === node) return ['reviewed-registration-title'];
  if (mode === 'literal-property') {
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) return ['literal-property', semantic(node.expression, mode, drop), node.name.text, !!node.questionDotToken];
    if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) return ['literal-property', semantic(node.expression, mode, drop), node.argumentExpression.text, !!node.questionDotToken];
  }
  const children = []; ts.forEachChild(node, n => {const value = semantic(n, mode, drop); if (value !== null) children.push(value);});
  return [node.kind, node.operator ?? null, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];
}
const fingerprint = (node, mode, drop) => hash(JSON.stringify(semantic(node, mode, drop)));
const fact = node => ({kind: ts.SyntaxKind[node.kind], raw: node.getText(), sha256: hash(node.getText()), semantic_sha256: fingerprint(node)});
export function projectBuildHarnessFile(text, path, mode, side) {
  const file = parse(text), drop = new Set(), excluded = [];
  if (mode === 'literal-property' && path === 'src/cdk/schematics/utils/project-style-file.ts') {
    const found = nodes(file, n => ts.isFunctionDeclaration(n) && name(n) === 'getProjectStyleFile'); assert.equal(found.length, 1);
    found.forEach(n => {drop.add(n); excluded.push(fact(n));});
  }
  if (mode === 'titles' && duplicateCalls[path]) {
    const calls = nodes(file, n => ts.isCallExpression(n) && hash(n.getText()) === duplicateCalls[path]);
    assert.equal(calls.length, side === 'before' ? 2 : 1);
    if (side === 'before') {const node = calls[1].parent; assert.ok(ts.isExpressionStatement(node)); drop.add(node); excluded.push(fact(calls[1]));}
  }
  return {projection_sha256: fingerprint(file, mode, drop), excluded,
    registration_titles: nodes(file, registration).map(n => ({callee: n.expression.text, argument: n.arguments[0] ? fact(n.arguments[0]) : null}))};
}
function sourceFrame(member, side) {
  const raw = member[side].text, path = member.path;
  if (path.includes('/.yarn/releases/')) return {sha256: hash(raw), bytes: Buffer.byteLength(raw), git_blob: member[side].git_blob,
    archived_executable_tool_only: true, original_tool_executed: false, tool_internals_security_or_behavior_reviewed: false};
  if (path.endsWith('yarn.lock')) return raw.includes('__metadata:') ? {sha256: hash(raw), bytes: Buffer.byteLength(raw), lexical_YAML_sections: yamlSourceSections(raw)} :
    {sha256: hash(raw), bytes: Buffer.byteLength(raw), entries: lockSourceEntries(raw)};
  if (path.endsWith('.json') || path === 'MODULE.bazel.lock') {const parsed = ts.parseConfigFileTextToJson(path, raw); assert.equal(parsed.error, undefined);
    return {sha256: hash(raw), raw, json_data: parsed.config};}
  if (!/\.[cm]?[jt]s$/.test(path)) return {sha256: hash(raw), raw};
  const file = parse(raw), subject = {members: [member]};
  return {sha256: hash(raw), raw, semantic_sha256: fingerprint(file),
    class_and_function_frames: nodes(file, n => ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n)).map(fact),
    registration_titles: nodes(file, registration).map(n => ({callee: n.expression.text, argument: n.arguments[0] ? fact(n.arguments[0]) : null})),
    cases: path.endsWith('.spec.ts') ? originalEnvironmentCases(subject, side).map(({raw, ...row}) => row) : [],
    hooks: path.endsWith('.spec.ts') ? overlayHooks(subject, side).map(({raw, ...row}) => row) : []};
}
export function pairBuildHarnessCases(subject, index) {
  const pairs = [], removed = [];
  for (const member of subject.members.filter(n => n.path.endsWith('.spec.ts'))) {
    let before = originalEnvironmentCases({members: [member]}, 'before'); const after = originalEnvironmentCases({members: [member]}, 'after');
    if (index === 3 && duplicateCalls[member.path]) {
      const duplicates = before.filter(n => n.sha256 === duplicateCalls[member.path]); assert.equal(duplicates.length, 2);
      assert.equal(duplicates[0].callback_sha256, duplicates[1].callback_sha256); assert.ok(duplicates[1].key.endsWith('#1'));
      assert.equal(after.filter(n => n.sha256 === duplicateCalls[member.path]).length, 1);
      removed.push({...duplicates[1], retained_byte_identical_registration_key: duplicates[0].key}); before = before.filter(n => n.key !== duplicates[1].key);
    }
    assert.equal(before.length, after.length, 'unreviewed lost/new case');
    for (const [i, old] of before.entries()) {const next = after[i]; assert.equal(old.mode, next.mode);
      if (index !== 3) assert.equal(old.key, next.key);
      pairs.push({path: member.path, before_key: old.key, after_key: next.key, before_sha256: old.sha256, after_sha256: next.sha256,
        complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256, exact_identity_relabel: old.key !== next.key});}
  }
  assert.equal(removed.length, index === 3 ? 2 : 0);
  assert.equal(pairs.length, [86, 85, 82, 2763][index]);
  assert.equal(pairs.filter(n => n.complete_callback_semantics_equal).length, [78, 85, 82, 2763][index]);
  assert.equal(pairs.filter(n => n.exact_identity_relabel).length, index === 3 ? 684 : 0); return {pairs, removed};
}
export function observeBuildHarnessSubject(subject, index) {
  assert.equal(subject.sha, BUILD_HARNESS_SHAS[index]);
  const files = subject.members.map(n => ({path: n.path, before: sourceFrame(n, 'before'), after: sourceFrame(n, 'after')}));
  const {pairs, removed} = pairBuildHarnessCases(subject, index), projections = [];
  if (index === 0) for (const member of subject.members.filter(n => /\.[cm]?[jt]s$/.test(n.path) && !n.path.endsWith('/ngOnChangesPropertyAccessRule.ts'))) {
    const before = projectBuildHarnessFile(member.before.text, member.path, 'literal-property', 'before'),
      after = projectBuildHarnessFile(member.after.text, member.path, 'literal-property', 'after');
    assert.equal(before.projection_sha256, after.projection_sha256, 'unreviewed property-access operation'); projections.push({path: member.path, before, after});
  }
  if (index === 3) for (const member of subject.members.filter(n => n.path.endsWith('.spec.ts'))) {
    const before = projectBuildHarnessFile(member.before.text, member.path, 'titles', 'before'), after = projectBuildHarnessFile(member.after.text, member.path, 'titles', 'after');
    assert.equal(before.projection_sha256, after.projection_sha256, 'unreviewed operation beyond registration titles and exact duplicate removals');
    projections.push({path: member.path, before, after});
  }
  let initializer = null;
  if (index === 2) {
    const old = subject.members.find(n => n.path === 'test/angular-test-init-spec.ts'), next = subject.members.find(n => n.path === 'test/angular-test.init.ts'); assert.ok(old && next);
    const imports = "import 'zone.js';\nimport 'zone.js/testing';\nimport 'reflect-metadata';\n\n";
    assert.ok(next.after.text.includes(imports)); assert.equal(next.after.text.replace(imports, ''), old.before.text);
    initializer = {deleted_path: old.path, added_path: next.path, added_side_effect_imports: imports,
      complete_other_bytes_equal: true, owned_zoneful_error_stability_or_loading_order_equivalence_proved: false};
  }
  return {sha: subject.sha, files, pairs, explicitly_removed_exact_duplicate_registrations: removed, complete_source_projections: projections,
    initializer, cases_before: pairs.length + removed.length, cases_after: pairs.length,
    unchanged_complete_callbacks: pairs.filter(n => n.complete_callback_semantics_equal).length,
    exact_identity_relabels: pairs.filter(n => n.exact_identity_relabel).length,
    fixture_compiler_bootstrap_error_lifecycle_or_runtime_equivalence_proved: false,
    actual_original_tool_Sass_Angular_native_artifact_browser_SSR_or_floor_qualified: false};
}
export function reviewBuildHarnessSubject(subject, index, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]),
    pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'original complete source bytes drifted');
  const observed = observeBuildHarnessSubject(subject, index); assert.deepEqual(observed, pin.observation); return observed;
}
export function inspectBuildHarnessOwnedContext({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), intake = JSON.parse(read(prefix + 'intake.json'));
  for (const ref of intake.owned_context_read) assert.equal(hash(read(ref.path)), ref.sha256, 'owned runner/tool/migration context changed ' + ref.path);
  const paths = candidateProductSourcePaths(root); assert.equal(paths.length, 1028);
  const bootstrap = read('testing/legacy-runner/init-test-env.ts').toString(); assert.ok(bootstrap.includes('provideZoneChangeDetection()'));
  assert.ok(!bootstrap.includes('prototype.whenStable')); assert.ok(!bootstrap.includes('provideExperimentalZonelessChangeDetection'));
  return {owned_context: intake.owned_context_read, source_members: paths.length,
    source_members_sha256: hash(JSON.stringify(paths.map(path => ({path, sha256: hash(read(path))})))),
    explicit_owned_zoneful_preparation: true, public_fixture_stability_untouched: true, historical_callbacks_unchanged: true,
    required_consumer_HTML_CSS_SCSS_changes: 0, actual_Angular_native_or_floor_executed: false};
}
export function buildHarnessPins({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), raw = read(prefix + 'observation-pins.json.gz'); assert.equal(hash(raw), pinSha); return JSON.parse(gunzipSync(raw));
}
export function inspectBuildHarnessSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = buildHarnessPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = n => {const raw = read(prefix + n); assert.equal(hash(raw), pins.capsules[line][n]); return JSON.parse(gunzipSync(raw));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz');
  assert.deepEqual(originals.subjects.map(n => n.sha), BUILD_HARNESS_SHAS); assert.deepEqual(acquisition.subjects, BUILD_HARNESS_SHAS);
  const censusRaw = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusRaw));
  assert.equal(census.commits.length, 1697); assert.equal(hash(censusRaw), originals.source_inventory.sha256);
  for (const packet of [originals, acquisition]) {assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);}
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
  assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  const subjects = originals.subjects.map((subject, index) => {
    const original = census.commits.find(n => n.sha === subject.sha); assert.equal(original.raw_commit, subject.raw_commit);
    assert.deepEqual(original.complete_changed_files, subject.complete_changed_files); assert.equal(hash(read(prefix + subject.sha + '.original.patch')), subject.diff_sha256);
    const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = []; assert.equal(parts.length, subject.members.length);
    for (const [i, member] of subject.members.entries()) {const diff = parts[i];
      hunks.push(...reviewCompleteMixedBuildHarnessFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]],
        diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, BUILD_HARNESS_SHAS));}
    assert.equal(hunks.length, subject.original_hunks);
    return {...reviewBuildHarnessSubject(subject, index, pins.subjects[index]), hunks, review: pins.subjects[index].review};
  });
  const owned = inspectBuildHarnessOwnedContext({root, readMember: read}); assert.deepEqual(owned, pins.owned_context[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root); assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, owned_context: owned, complete_original_files: 110, complete_original_body_records: 220,
    file_status_counts: {M: 105, A: 2, D: 3}, executable_file_identities: 3, complete_original_hunks: 1118,
    source_case_identities_before: 3018, retained_source_case_identities: 3016, unchanged_complete_source_callbacks: 3008,
    exact_identity_relabels: 684, explicitly_removed_exact_duplicate_registrations: 2, archived_executable_tool_bundles_not_behavior_or_security_reviewed: 2,
    owned_product_members: product.product_members, current_required_historical_case_ids: 2228,
    product_or_consumer_changes: 0, required_consumer_HTML_CSS_SCSS_changes: 0,
    actual_original_tool_Sass_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectBuildHarnessSources(), at = process.argv.indexOf('--out');
  if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: 4, files: 110, hunks: 1118, before: 3018, after: 3016, callback_equal: 3008, relabels: 684, actual_runtime_qualified: false}));
}
