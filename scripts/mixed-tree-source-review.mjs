/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual tree-source applicability. No upstream execution or peer/native admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedTreeFile} from '../compatibility/rc/mixed-tree-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-tree-source-';
const hash = value => createHash('sha256').update(value).digest('hex');
const pinSha = '55c34d2a4c6ed3554f341de1445b9b6776cf04fc20a01c9931d45d7a269f8bec';
export const TREE_SHAS = ['43b8dcbb1f17a9d5fcedc88e996c241ab9e28dd8', '004a9436d325dc87bde2a4bd37d821dfc6375745',
  '1f992d06c693a6e09332ac83d837c9ff8e1fdf7b', 'cc5332259611bd59dcca3bebf4b99f8052c9c36a'];
const parse = text => {const file = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0, 'unparseable original'); return file;};
function collect(node, predicate) {const rows = []; function visit(n) {if (predicate(n)) rows.push(n); ts.forEachChild(n, visit);} visit(node); return rows;}
function semantic(node) {const children = []; ts.forEachChild(node, n => {children.push(semantic(n));});
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];}
const fingerprint = node => hash(JSON.stringify(semantic(node)));
const fact = node => ({kind: ts.SyntaxKind[node.kind], raw: node.getText(), sha256: hash(node.getText()), semantic_sha256: fingerprint(node)});
const name = node => node.name?.getText() ?? '';
function method(file, className, memberName) {const cls = file.statements.find(n => ts.isClassDeclaration(n) && name(n) === className);
  assert.ok(cls); const matches = cls.members.filter(n => name(n) === memberName); assert.equal(matches.length, 1); return matches[0];}
/** Remove exactly the reviewed runtime members/host field, retaining every other operation. */
export function projectTreeRuntime(text, index, path) {
  const file = parse(text), removed = [];
  const changed = ts.transform(file, [context => {const visit = node => {
    let drop = false;
    if (index < 3) drop = (ts.isGetAccessorDeclaration(node) && name(node) === 'isLeafNode') ||
      (ts.isPropertyAssignment(node) && name(node) === "'[attr.aria-expanded]'");
    else if (path.endsWith('/nested-node.ts')) {
      drop = ts.isImportDeclaration(node) || (ts.isMethodDeclaration(node) && name(node) === 'ngOnInit') ||
        (ts.isPropertyDeclaration(node) && name(node) === '_type');
      if (ts.isExpressionWithTypeArguments(node) && node.expression.getText() === 'OnInit') {removed.push(fact(node)); return undefined;}
    } else drop = (ts.isMethodDeclaration(node) &&
      ((name(node.parent) === 'CdkTree' && name(node) === '_setNodeTypeIfUnset') ||
       (name(node.parent) === 'CdkTreeNode' && name(node) === 'ngOnInit'))) ||
      (ts.isPropertyDeclaration(node) && name(node.parent) === 'CdkTreeNode' && name(node) === '_type');
    if (drop) {removed.push(fact(node)); return undefined;}
    return ts.visitEachChild(node, visit, context);
  }; return node => ts.visitNode(node, visit);}]);
  const result = {semantic_sha256: fingerprint(changed.transformed[0]), removed}; changed.dispose(); return result;
}
function sourceFrame(member, side) {
  const text = member[side].text;
  if (!member.path.endsWith('.ts')) return {sha256: hash(text), untouched_upstream_API_reference: text};
  const file = parse(text), subject = {members: [member]};
  return {sha256: hash(text), semantic_sha256: fingerprint(file), imports: file.statements.filter(ts.isImportDeclaration).map(fact),
    cases: originalEnvironmentCases(subject, side).map(({raw, normalized_callback_sha256, ...row}) => row),
    hooks: overlayHooks(subject, side).map(({raw, ...row}) => row),
    functions_classes_and_templates: collect(file, n => ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n) ||
      (ts.isPropertyAssignment(n) && ['template', 'styles', 'templateUrl', 'styleUrls'].includes(name(n)))).map(fact)};
}
export function observeTreeSubject(subject, index) {
  assert.equal(subject.sha, TREE_SHAS[index]);
  const files = subject.members.map(member => ({path: member.path, before: sourceFrame(member, 'before'), after: sourceFrame(member, 'after')}));
  const runtime = subject.members.filter(n => n.path.endsWith('.ts') && !n.path.endsWith('.spec.ts')).map(member => {
    const before = projectTreeRuntime(member.before.text, index, member.path), after = projectTreeRuntime(member.after.text, index, member.path);
    assert.equal(before.semantic_sha256, after.semantic_sha256, 'runtime escapes individual reviewed delta');
    return {path: member.path, before, after};
  });
  const specs = subject.members.filter(n => n.path.endsWith('.spec.ts'));
  const before = originalEnvironmentCases({members: specs}, 'before'), after = originalEnvironmentCases({members: specs}, 'after');
  assert.equal(before.length, after.length); const byKey = new Map(after.map(n => [n.key, n]));
  const pairs = before.map(old => {const next = byKey.get(old.key); assert.ok(next, 'source case identity lost');
    assert.equal(old.mode, next.mode); return {key: old.key, before_sha256: old.sha256, after_sha256: next.sha256,
      complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256};});
  const tree = parse(subject.members.find(n => n.path === 'src/cdk/tree/tree.ts').after.text);
  const behavior = index < 3 ? {leaf_getter_present: index !== 1,
    getter: index === 1 ? null : fact(method(tree, 'CdkTreeNode', 'isLeafNode'))} : {
    classifier: fact(method(tree, 'CdkTree', '_setNodeTypeIfUnset')),
    base_initializer: fact(method(tree, 'CdkTreeNode', 'ngOnInit')),
    base_type: fact(method(tree, 'CdkTreeNode', '_type')),
    nested_type: fact(method(parse(subject.members.find(n => n.path.endsWith('/nested-node.ts')).after.text), 'CdkNestedTreeNode', '_type'))};
  return {sha: subject.sha, files, runtime, pairs, behavior, cases_before: before.length, cases_after: after.length,
    unchanged_complete_callbacks: pairs.filter(n => n.complete_callback_semantics_equal).length,
    source_conclusion_only: true, actual_lifecycle_Angular_accessibility_browser_or_floor_qualified: false};
}
export function reviewTreeSubject(subject, index, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]),
    pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'unreviewed complete original bytes');
  const observed = observeTreeSubject(subject, index); assert.deepEqual(observed, pin.observation, 'unreviewed complete original frame'); return observed;
}
export function inspectTreeRelations(subjects) {
  assert.deepEqual(subjects.map(n => n.sha), TREE_SHAS); const rows = [];
  for (const [i, member] of subjects[0].members.entries()) {
    const revert = subjects[1].members[i], reapply = subjects[2].members[i];
    assert.equal(member.path, revert.path); assert.equal(member.path, reapply.path);
    assert.deepEqual(member.before, revert.after); assert.deepEqual(member.before, reapply.before);
    assert.deepEqual(member.after, revert.before); assert.deepEqual(member.after, reapply.after);
    rows.push({path: member.path, before_sha256: hash(member.before.text), after_sha256: hash(member.after.text),
      exact_revert_and_byte_identical_reapply: true});
  }
  assert.equal(subjects[0].diff, subjects[2].diff); return rows;
}
export function inspectTreeOwnedScope({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), paths = candidateProductSourcePaths(root), rows = [];
  const forbidden = /^@angular\/(?:cdk|material)(?:-experimental)?\/tree(?:\/|$)/;
  for (const path of paths) {const raw = read(path), text = raw.toString(); rows.push({path, sha256: hash(raw)});
    if (path.endsWith('.ts')) {const file = parse(text);
      for (const n of collect(file, n => ts.isImportDeclaration(n) || ts.isExportDeclaration(n) ||
        (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || n.expression.getText() === 'require')))) {
        const specifier = n.moduleSpecifier || n.arguments?.[0];
        if (specifier && ts.isStringLiteral(specifier)) assert.ok(!forbidden.test(specifier.text), 'owned tree dependency ' + path);
      }
      for (const n of collect(file, ts.isClassDeclaration)) assert.ok(!/^(?:Cdk|Mat)(?:Nested)?Tree/.test(name(n)), 'ordinary tree fork ' + path);
    }
    assert.ok(!/<\s*(?:mat|cdk)-(?:nested-)?tree(?:\s|>|-)/.test(text), 'owned tree template ' + path);
  }
  assert.equal(paths.length, 1028);
  return {source_members: paths.length, members_sha256: hash(JSON.stringify(rows)),
    owned_tree_import_export_dynamic_import_or_require_routes: 0, ordinary_tree_forks: 0,
    required_consumer_HTML_CSS_SCSS_changes: 0, scope_source_only: true, actual_peer_or_floor_executed: false};
}
export function treePins({root = rootDefault, readMember} = {}) {const read = readMember || (p => readFileSync(resolve(root, p)));
  const raw = read(prefix + 'observation-pins.json.gz'); assert.equal(hash(raw), pinSha, 'review pins changed'); return JSON.parse(gunzipSync(raw));}
export function inspectTreeSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = treePins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = name => {const bytes = read(prefix + name); assert.equal(hash(bytes), pins.capsules[line][name]); return JSON.parse(gunzipSync(bytes));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz');
  assert.deepEqual(originals.subjects.map(n => n.sha), TREE_SHAS); assert.deepEqual(acquisition.subjects, TREE_SHAS);
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
      hunks.push(...reviewCompleteMixedTreeFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]],
        diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, TREE_SHAS));}
    assert.equal(hunks.length, subject.original_hunks);
    return {...reviewTreeSubject(subject, index, pins.subjects[index]), hunks, review: pins.subjects[index].review};
  });
  const relations = inspectTreeRelations(originals.subjects); assert.deepEqual(relations, pins.relations);
  const owned = inspectTreeOwnedScope({root, readMember: read}); assert.deepEqual(owned, pins.owned_scope[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root);
  assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, relations, owned_scope: owned, complete_original_files: 16, complete_original_bodies: 32,
    complete_original_hunks: 41, retained_source_case_identities: subjects.reduce((n, s) => n + s.cases_before, 0),
    unchanged_complete_source_callbacks: subjects.reduce((n, s) => n + s.unchanged_complete_callbacks, 0), owned_product_members: product.product_members,
    current_required_historical_case_ids: 2228, product_or_consumer_changes: 0, required_consumer_HTML_CSS_SCSS_changes: 0,
    actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectTreeSources(), at = process.argv.indexOf('--out');
  if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: report.subjects.length, original_files: 16, original_hunks: 41,
    retained_cases: report.retained_source_case_identities, unchanged_callbacks: report.unchanged_complete_source_callbacks, actual_runtime_qualified: false}));
}
