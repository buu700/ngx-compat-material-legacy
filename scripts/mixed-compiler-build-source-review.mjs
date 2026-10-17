/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete compiler/build source observations, never a compiler or runtime pass. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedCompilerBuildFile} from '../compatibility/rc/mixed-compiler-build-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {lockSourceEntries} from './mixed-zone-moves-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = x => createHash('sha256').update(x).digest('hex');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-compiler-build-source-', pinSha = '382ac7ebfce7cf152024e1faeacd19c4b3b14202012cc68918af63220fbdb67d';
export const COMPILER_BUILD_SHAS = ['6d4051797150721b35858786ce41c53b98870718', '43d34030e3421049be6a561f54eed3864d36e361',
  'c16f55921aebbf4c3f07be0c68e85eab1e408867', 'ec2dbff5ec67bd2ceb36283bfc5c5f0526c9e51e'];
const oldAction = 'b5a3609f89c06eb4037dce22a93641213a5d1508', newAction = 'fd57e38fdd95d2d145adb87a1ff0cbbc231316bc';
const parse = text => {const file = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0); return file;};
const name = node => node?.name?.getText() ?? '';
function nodes(node, predicate) {const found = []; function visit(n) {if (predicate(n)) found.push(n); ts.forEachChild(n, visit);} visit(node); return found;}
function semantic(node, mode = 'complete', path = '') {
  if (mode === 'types-erased') {
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node) || node.kind === ts.SyntaxKind.ExclamationToken) return null;
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node)) return semantic(node.expression, mode, path);
  }
  if (mode === 'declaration-order' && path === 'goldens/material/timepicker/index.api.md' &&
      ts.isPropertyDeclaration(node) && name(node) === '_options' && name(node.parent) === 'MatTimepicker') return null;
  const children = []; ts.forEachChild(node, n => {const value = semantic(n, mode, path); if (value !== null) children.push(value);});
  if (mode === 'declaration-order' && (ts.isUnionTypeNode(node) || ts.isTypeLiteralNode(node))) children.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return [node.kind, node.operator ?? null, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];
}
const fingerprint = (node, mode, path) => hash(JSON.stringify(semantic(node, mode, path)));
const fact = node => ({kind: ts.SyntaxKind[node.kind], raw: node.getText(), sha256: hash(node.getText()), semantic_sha256: fingerprint(node)});
export function goldenDeclarationSource(text) {
  assert.equal((text.match(/^```/gm) || []).length, 2);
  const match = text.match(/^([\s\S]*?)^```ts\n([\s\S]*?)^```(\n[\s\S]*)$/m); assert.ok(match);
  assert.equal(match[0], text);
  return {prefix: match[1], body: match[2], suffix: match[3]};
}
/** This lexical inventory preserves complete YAML sections; it does not validate YAML or execute tags. */
export function yamlSourceSections(text) {
  const matches = [...text.matchAll(/^(?!#|\s)([^\n]+):[^\n]*$/gm)]; assert.ok(matches.length);
  const sections = matches.map((match, i) => {const raw = text.slice(match.index, matches[i + 1]?.index ?? text.length);
    return {header: match[0], raw, sha256: hash(raw)};});
  assert.equal(new Set(sections.map(n => n.header)).size, sections.length); return sections;
}
export function compilerSourceFrame(text, path) {
  if (path.endsWith('yarn.lock')) return {sha256: hash(text), bytes: Buffer.byteLength(text), entries: lockSourceEntries(text)};
  if (path.endsWith('pnpm-lock.yaml')) return {sha256: hash(text), bytes: Buffer.byteLength(text), sections: yamlSourceSections(text)};
  if (path.endsWith('.json')) {const parsed = ts.parseConfigFileTextToJson(path, text); assert.equal(parsed.error, undefined);
    return {sha256: hash(text), raw: text, json_data: parsed.config};}
  if (!path.endsWith('.ts') && !path.startsWith('goldens/')) return {sha256: hash(text), raw: text};
  const markdown = path.startsWith('goldens/') ? goldenDeclarationSource(text) : null;
  const file = parse(markdown ? markdown.body : text), classesAndFunctions = nodes(file, n => ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n)).map(fact);
  return {sha256: hash(text), raw: text, complete_semantic_sha256: fingerprint(file), types_erased_operation_sha256: fingerprint(file, 'types-erased'),
    markdown_surroundings: markdown ? {prefix: markdown.prefix, suffix: markdown.suffix} : null,
    reviewed_declaration_exclusions: path === 'goldens/material/timepicker/index.api.md' ? nodes(file,
      n => ts.isPropertyDeclaration(n) && name(n) === '_options' && name(n.parent) === 'MatTimepicker').map(fact) : [],
    declaration_order_projection_sha256: path.startsWith('goldens/') ? fingerprint(file, 'declaration-order', path) : null,
    class_and_function_frames: classesAndFunctions,
    type_and_optional_operation_frames: nodes(file, n => ts.isTypeNode(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) ||
      n.kind === ts.SyntaxKind.ExclamationToken || n.kind === ts.SyntaxKind.QuestionDotToken).map(fact),
    cases: path.endsWith('.spec.ts') ? originalEnvironmentCases({members: [{path, before: {text}}]}, 'before').map(({raw, ...row}) => row) : [],
    hooks: path.endsWith('.spec.ts') ? overlayHooks({members: [{path, before: {text}}]}, 'before').map(({raw, ...row}) => row) : []};
}
export function observeCompilerBuildSubject(subject, index) {
  assert.equal(subject.sha, COMPILER_BUILD_SHAS[index]);
  const files = subject.members.map(n => ({path: n.path, before: compilerSourceFrame(n.before.text, n.path), after: compilerSourceFrame(n.after.text, n.path)}));
  const specs = {members: subject.members.filter(n => n.path.endsWith('.spec.ts'))};
  const before = originalEnvironmentCases(specs, 'before'), after = originalEnvironmentCases(specs, 'after'), byKey = new Map(after.map(n => [n.key, n]));
  assert.equal(before.length, [77, 2, 155, 132][index]); assert.equal(after.length, before.length);
  const pairs = before.map(old => {const next = byKey.get(old.key); assert.ok(next); assert.equal(old.mode, next.mode);
    return {key: old.key, before_sha256: old.sha256, after_sha256: next.sha256, complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256};});
  assert.equal(pairs.filter(n => n.complete_callback_semantics_equal).length, [77, 1, 155, 132][index]);
  const actionPins = [];
  if (index === 1) for (const member of subject.members.filter(n => n.path.startsWith('.github/') || n.path === 'WORKSPACE')) {
    assert.ok(member.before.text.includes(oldAction)); assert.equal(member.before.text.replaceAll(oldAction, newAction), member.after.text);
    actionPins.push({path: member.path, before_pin: oldAction, after_pin: newAction, occurrences: member.before.text.split(oldAction).length - 1,
      complete_bytes_equal_after_exact_pin_substitution: true});
  }
  if (index === 1) assert.equal(actionPins.length, 14);
  const declarationOrder = [];
  if (index === 3) for (const file of files) {
    if (file.path.startsWith('goldens/')) {assert.deepEqual(file.before.markdown_surroundings, file.after.markdown_surroundings);
      assert.equal(file.before.declaration_order_projection_sha256, file.after.declaration_order_projection_sha256);
      if (file.path === 'goldens/material/timepicker/index.api.md') {
        assert.deepEqual(file.before.reviewed_declaration_exclusions.map(n => n.raw), ['protected _options: Signal<readonly MatOption<any>[]>;']);
        assert.deepEqual(file.after.reviewed_declaration_exclusions.map(n => n.raw), ['protected _options: Signal<readonly MatOption<D>[]>;']);
      }
      declarationOrder.push({path: file.path, complete_projection_equal: true, reviewed_member_excluded: file.path.includes('/timepicker/') ? '_options' : null});}
    else if (file.path.endsWith('.ts')) assert.equal(file.before.types_erased_operation_sha256, file.after.types_erased_operation_sha256);
  }
  if (index === 3) assert.equal(declarationOrder.length, 17);
  return {sha: subject.sha, files, pairs, action_pin_substitutions: actionPins, declaration_order_projections: declarationOrder,
    cases_before: before.length, cases_after: after.length, unchanged_complete_callbacks: pairs.filter(n => n.complete_callback_semantics_equal).length,
    emitted_decorator_metadata_fixture_error_lifecycle_or_runtime_equivalence_proved: false,
    actual_Sass_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false};
}
export function reviewCompilerBuildSubject(subject, index, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]),
    pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'original complete source bytes drifted');
  const observed = observeCompilerBuildSubject(subject, index); assert.deepEqual(observed, pin.observation); return observed;
}
export function inspectCompilerBuildOwnedContext({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), intake = JSON.parse(read(prefix + 'intake.json'));
  for (const ref of intake.owned_context_read) assert.equal(hash(read(ref.path)), ref.sha256, 'owned context changed ' + ref.path);
  const extra = ['tsconfig.json', 'projects/ngx-material-legacy/tsconfig.lib.json'].map(path => ({path, sha256: hash(read(path)),
    json_data: ts.parseConfigFileTextToJson(path, read(path).toString()).config}));
  const paths = candidateProductSourcePaths(root); assert.equal(paths.length, 1028);
  for (const path of paths.filter(n => n.endsWith('.ts'))) {
    const file = parse(read(path).toString());
    for (const node of nodes(file, n => ts.isImportDeclaration(n) || ts.isExportDeclaration(n))) if (node.moduleSpecifier)
      assert.ok(!/^@angular\/(?:aria(?:\/|$)|cdk\/(?:listbox|schematics)(?:\/|$)|material\/timepicker(?:\/|$))/.test(node.moduleSpecifier.text), 'unowned runtime/schematic dependency');
  }
  return {owned_context: intake.owned_context_read, compiler_configuration: extra, source_members: paths.length,
    source_members_sha256: hash(JSON.stringify(paths.map(path => ({path, sha256: hash(read(path))})))),
    required_consumer_HTML_CSS_SCSS_changes: 0, actual_compiler_Sass_Angular_native_or_floor_executed: false};
}
export function compilerBuildPins({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), raw = read(prefix + 'observation-pins.json.gz');
  assert.equal(hash(raw), pinSha); return JSON.parse(gunzipSync(raw));
}
export function inspectCompilerBuildSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = compilerBuildPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = n => {const raw = read(prefix + n); assert.equal(hash(raw), pins.capsules[line][n]); return JSON.parse(gunzipSync(raw));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz');
  assert.deepEqual(originals.subjects.map(n => n.sha), COMPILER_BUILD_SHAS); assert.deepEqual(acquisition.subjects, COMPILER_BUILD_SHAS);
  const censusRaw = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusRaw));
  assert.equal(census.commits.length, 1697); assert.equal(hash(censusRaw), originals.source_inventory.sha256);
  for (const packet of [originals, acquisition]) {assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);}
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
  assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  const subjects = originals.subjects.map((subject, index) => {
    const original = census.commits.find(n => n.sha === subject.sha); assert.equal(original.raw_commit, subject.raw_commit);
    assert.deepEqual(original.complete_changed_files, subject.complete_changed_files);
    assert.equal(hash(read(prefix + subject.sha + '.original.patch')), subject.diff_sha256);
    const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = []; assert.equal(parts.length, subject.members.length);
    for (const [i, member] of subject.members.entries()) {const diff = parts[i];
      hunks.push(...reviewCompleteMixedCompilerBuildFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]],
        diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, COMPILER_BUILD_SHAS));}
    assert.equal(hunks.length, subject.original_hunks);
    return {...reviewCompilerBuildSubject(subject, index, pins.subjects[index]), hunks, review: pins.subjects[index].review};
  });
  const owned = inspectCompilerBuildOwnedContext({root, readMember: read}); assert.deepEqual(owned, pins.owned_context[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root); assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, owned_context: owned, complete_original_files: 91, complete_original_body_records: 182,
    complete_original_hunks: 816, retained_source_case_identities: 366, unchanged_complete_source_callbacks: 365,
    owned_product_members: product.product_members, current_required_historical_case_ids: 2228,
    product_or_consumer_changes: 0, required_consumer_HTML_CSS_SCSS_changes: 0,
    actual_Sass_Angular_compiler_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectCompilerBuildSources(), at = process.argv.indexOf('--out');
  if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: 4, files: 91, hunks: 816, cases: 366, callback_equal: 365, actual_runtime_qualified: false}));
}
