/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual example, metadata, heading, form and tooltip source decisions; no runtime admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedExampleDocsFile} from '../compatibility/rc/mixed-example-docs-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-example-docs-source-';
const hash = value => createHash('sha256').update(value).digest('hex');
const pinSha = 'f1fb4c3ec84bec29d68195f3a626e4b1200f507eb1e1924a4c2ea7cb675c4253';
export const EXAMPLE_DOCS_SHAS = ['487c4537847c68638811063adff7c59d8a5d6f7a', '6875bb6cb8e6bc13c3e480e85b3c93f8e7f28f98',
  '14d5de1f2f4d262df9c7afd1e1a1677f7886ec85', '7798bb7c64233db5e5d27a192c060ae52fc413d9'];
const parse = text => {const file = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0, 'unparseable original source'); return file;};
function collect(node, predicate) {const rows = []; function visit(n) {if (predicate(n)) rows.push(n); ts.forEachChild(n, visit);} visit(node); return rows;}
const name = node => node.name?.getText() ?? '';
export const headingProjection = text => text.replace(/(<\/?)[hH][12](?=[\s>])/g, '$1__reviewed_heading__')
  .replace(/h[12]\[tabindex="-1"\]/g, '__reviewed_heading__[tabindex="-1"]');
function semantic(node, heading = false) {const children = []; ts.forEachChild(node, n => {children.push(semantic(n, heading));});
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ?
      (heading ? headingProjection(node.text) : node.text) : null, children];}
const fingerprint = (node, heading = false) => hash(JSON.stringify(semantic(node, heading)));
const fact = node => ({kind: ts.SyntaxKind[node.kind], raw: node.getText(), sha256: hash(node.getText()), semantic_sha256: fingerprint(node)});
function metadataRole(node) {const object = node.parent, call = object?.parent;
  return ts.isObjectLiteralExpression(object) && ts.isCallExpression(call) &&
    ['Component', 'NgModule', 'TestBed.configureTestingModule'].includes(call.expression.getText());}
/** Keep all operations beyond the exact reviewed imports and fixture metadata roles. */
export function projectExampleMetadata(text, index) {
  assert.ok(index === 0 || index === 1); const file = parse(text), removed = [];
  const approved = index === 0 ? ['MatDialogModule', 'MatDialogTitle', 'MatDialogContent', 'MatDialogActions', 'MatDialogClose'] :
    ['MatSnackBarModule', 'MatSnackBarLabel', 'MatSnackBarActions', 'MatSnackBarAction'];
  const fixture = index === 0 ? 'DialogHarnessTest' : 'SnackbarHarnessTest';
  const changed = ts.transform(file, [context => {const visit = node => {
    if (ts.isImportDeclaration(node)) {removed.push(fact(node)); return undefined;}
    if (ts.isPropertyAssignment(node) && metadataRole(node)) {
      if (name(node) === 'imports' && ts.isArrayLiteralExpression(node.initializer)) {
        const items = node.initializer.elements.filter(n => !approved.includes(n.getText()));
        if (items.length !== node.initializer.elements.length) {
          removed.push(fact(node)); if (!items.length) return undefined;
          return ts.factory.updatePropertyAssignment(node, node.name, ts.factory.updateArrayLiteralExpression(node.initializer, items));
        }
      }
      if ((name(node) === 'standalone' && node.initializer.kind === ts.SyntaxKind.TrueKeyword) ||
          (name(node) === 'declarations' && node.initializer.getText() === '[' + fixture + ']')) {
        removed.push(fact(node)); return undefined;
      }
    }
    return ts.visitEachChild(node, visit, context);
  }; return node => ts.visitNode(node, visit);}]);
  const result = {semantic_sha256: fingerprint(changed.transformed[0]), removed}; changed.dispose(); return result;
}
export function projectTooltipExampleCase(text) {
  const file = parse(text), removed = [];
  const changed = ts.transform(file, [context => {const visit = node => {
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText() === 'it' &&
        node.expression.arguments[0]?.getText() === "'should have a delay when showing on touchstart'") {
      removed.push(fact(node)); return undefined;
    }
    return ts.visitEachChild(node, visit, context);
  }; return node => ts.visitNode(node, visit);}]);
  assert.equal(removed.length, 1, 'missing/ambiguous tooltip timing case');
  const result = {semantic_sha256: fingerprint(changed.transformed[0]), removed}; changed.dispose(); return result;
}
function sourceFrame(member, side) {
  const text = member[side].text;
  if (!member.path.endsWith('.ts')) return {sha256: hash(text), raw: text};
  const file = parse(text), subject = {members: [member]};
  return {sha256: hash(text), semantic_sha256: fingerprint(file), imports: file.statements.filter(ts.isImportDeclaration).map(fact),
    cases: originalEnvironmentCases(subject, side).map(({raw, normalized_callback_sha256, ...row}) => row),
    hooks: overlayHooks(subject, side).map(({raw, ...row}) => row),
    declarations: file.statements.filter(n => !ts.isImportDeclaration(n)).map(fact)};
}
export function observeExampleDocsSubject(subject, index) {
  assert.equal(subject.sha, EXAMPLE_DOCS_SHAS[index]);
  const files = subject.members.map(member => ({path: member.path, before: sourceFrame(member, 'before'), after: sourceFrame(member, 'after')}));
  const projections = [];
  for (const member of subject.members) {
    if (index < 2) {
      const before = projectExampleMetadata(member.before.text, index), after = projectExampleMetadata(member.after.text, index);
      assert.equal(before.semantic_sha256, after.semantic_sha256, 'operation escaped finite metadata projection ' + member.path);
      projections.push({path: member.path, before, after, provider_compiler_or_runtime_equivalence_proved: false});
    } else if (index === 2) {
      const before = member.path.endsWith('.ts') ? fingerprint(parse(member.before.text), true) : hash(headingProjection(member.before.text));
      const after = member.path.endsWith('.ts') ? fingerprint(parse(member.after.text), true) : hash(headingProjection(member.after.text));
      assert.equal(before, after, 'operation escaped heading tag/focus-query literal changes');
      projections.push({path: member.path, before_projected_sha256: before, after_projected_sha256: after,
        heading_accessibility_typography_or_focus_equivalence_proved: false});
    } else if (member.path === 'src/material/tooltip/tooltip.spec.ts') {
      const before = projectTooltipExampleCase(member.before.text), after = projectTooltipExampleCase(member.after.text);
      assert.equal(before.semantic_sha256, after.semantic_sha256, 'unreviewed tooltip operation outside the one timing case');
      projections.push({path: member.path, before, after, scheduler_or_lifetime_equivalence_proved: false});
    }
  }
  const specs = subject.members.filter(n => n.path.endsWith('.spec.ts'));
  const before = originalEnvironmentCases({members: specs}, 'before'), after = originalEnvironmentCases({members: specs}, 'after');
  assert.equal(before.length, after.length); const byKey = new Map(after.map(n => [n.key, n]));
  const pairs = before.map(old => {const next = byKey.get(old.key); assert.ok(next, 'source regression identity lost');
    assert.equal(old.mode, next.mode); return {key: old.key, before_sha256: old.sha256, after_sha256: next.sha256,
      complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256};});
  return {sha: subject.sha, files, projections, pairs, cases_before: before.length, cases_after: after.length,
    unchanged_complete_callbacks: pairs.filter(n => n.complete_callback_semantics_equal).length,
    source_conclusion_only: true, actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false};
}
export function reviewExampleDocsSubject(subject, index, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]),
    pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'complete original body drift');
  const observed = observeExampleDocsSubject(subject, index); assert.deepEqual(observed, pin.observation, 'unreviewed complete original frame'); return observed;
}
export function inspectExampleDocsOwnedContext({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), context = JSON.parse(read(prefix + 'intake.json'));
  for (const ref of context.owned_context_read) assert.equal(hash(read(ref.path)), ref.sha256, 'owned preparation changed ' + ref.path);
  const paths = candidateProductSourcePaths(root), rows = [];
  for (const path of paths) {const raw = read(path); rows.push({path, sha256: hash(raw)});
    if (!path.endsWith('.ts')) continue;
    const file = parse(raw.toString());
    for (const node of collect(file, n => ts.isImportDeclaration(n) || ts.isExportDeclaration(n))) {
      if (!node.moduleSpecifier) continue;
      assert.ok(!/@angular\/(?:components-examples|dev-app|universal-app)|\/(?:components-examples|dev-app|universal-app)\//.test(node.moduleSpecifier.text),
        'owned example/application dependency ' + path);
    }
  }
  assert.equal(paths.length, 1028);
  const dialog = read('projects/ngx-material-legacy/legacy-dialog/dialog-content-directives.ts').toString();
  assert.equal((dialog.match(/standalone: false/g) || []).length, 4);
  const tooltipPath = 'projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts', tooltip = read(tooltipPath).toString();
  const touch = originalEnvironmentCases({members: [{path: tooltipPath, after: {text: tooltip}}]}, 'after')
    .find(n => n.name === "'should have a delay when showing on touchstart'");
  assert.ok(touch?.raw.includes('fakeAsync(() =>') && touch.raw.includes('tick(250)') && touch.raw.includes('tick(500)') &&
    touch.raw.includes('finishCurrentTooltipAnimation(overlayContainerElement, true)'));
  const dialogSpec = read('projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts').toString();
  assert.ok(dialogSpec.includes("'h1[tabindex=\"-1\"]'"));
  assert.ok(read('projects/ngx-material-legacy/legacy-chips/chip-input.ts').toString().includes('chipInput: MatLegacyChipInput;'));
  for (const family of ['dialog', 'snack-bar']) {
    const text = read('testing/legacy-runner/shims/harness/' + family + '/shared.spec.ts').toString();
    assert.ok(text.includes('LEGACY_NOOP_ANIMATIONS')); assert.ok(text.includes('declarations: ['));
  }
  return {source_members: paths.length, members_sha256: hash(JSON.stringify(rows)), owned_context: context.owned_context_read,
    owned_touchstart_case: touch, current_legacy_dialog_directives_standalone: false, owned_dialog_heading_query: 'h1[tabindex="-1"]',
    required_consumer_HTML_CSS_SCSS_changes: 0, source_only: true, actual_fixture_native_or_floor_executed: false};
}
export function exampleDocsPins({root = rootDefault, readMember} = {}) {const read = readMember || (p => readFileSync(resolve(root, p)));
  const raw = read(prefix + 'observation-pins.json.gz'); assert.equal(hash(raw), pinSha, 'review pins changed'); return JSON.parse(gunzipSync(raw));}
export function inspectExampleDocsSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = exampleDocsPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = n => {const raw = read(prefix + n); assert.equal(hash(raw), pins.capsules[line][n]); return JSON.parse(gunzipSync(raw));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz');
  assert.deepEqual(originals.subjects.map(n => n.sha), EXAMPLE_DOCS_SHAS); assert.deepEqual(acquisition.subjects, EXAMPLE_DOCS_SHAS);
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
      hunks.push(...reviewCompleteMixedExampleDocsFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]],
        diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, EXAMPLE_DOCS_SHAS));}
    assert.equal(hunks.length, subject.original_hunks);
    return {...reviewExampleDocsSubject(subject, index, pins.subjects[index]), hunks, review: pins.subjects[index].review};
  });
  const owned = inspectExampleDocsOwnedContext({root, readMember: read}); assert.deepEqual(owned, pins.owned_context[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root);
  assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, owned_context: owned, complete_original_files: 34, complete_original_bodies: 68,
    complete_original_hunks: 77, retained_source_case_identities: subjects.reduce((n, s) => n + s.cases_before, 0),
    unchanged_complete_source_callbacks: subjects.reduce((n, s) => n + s.unchanged_complete_callbacks, 0), owned_product_members: product.product_members,
    current_required_historical_case_ids: 2228, product_or_consumer_changes: 0, required_consumer_HTML_CSS_SCSS_changes: 0,
    actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectExampleDocsSources(), at = process.argv.indexOf('--out');
  if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: 4, original_files: 34, original_hunks: 77,
    retained_cases: report.retained_source_case_identities, unchanged_callbacks: report.unchanged_complete_source_callbacks, actual_runtime_qualified: false}));
}
