/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {analyzeTestImportCleanup} from './upstream-test-import-cleanup-analysis.mjs';
const ts = createRequire(import.meta.url)('typescript');
const hash = text => createHash('sha256').update(text).digest('hex');
const gitHash = text => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
export const UNUSED_FIXTURE_ORIGINALS = 'compatibility/rc/upstream-unused-modern-fixture-originals.json.gz';
export const UNUSED_FIXTURE_PROFILES = Object.freeze({
  '8f0bde9c3976175e62685a5c0764b5d5626accbd': {stem: 'list/selection-list.spec.ts', names: ['SelectionListWithOnlyOneOption'], files: ['src/material/list/list.spec.ts', 'src/material/list/selection-list.spec.ts', 'src/material/list/testing/list-harness.spec.ts']},
  '195260b58ba90de63ff69c2ceed6af9d45c57b82': {stem: 'progress-spinner/progress-spinner.spec.ts', names: ['IndeterminateSpinnerInShadowDom', 'IndeterminateSpinnerInShadowDomWithNgIf'], files: ['src/material/progress-spinner/progress-spinner.spec.ts', 'src/material/progress-spinner/testing/progress-spinner-harness.spec.ts']},
  'a2a960a690e4d9dbb4f862585121eb150c280923': {stem: 'slide-toggle/slide-toggle.spec.ts', names: ['SlideToggleWithoutLabel', 'SlideToggleProjectedLabel', 'TextBindingComponent'], files: ['src/material/slide-toggle/slide-toggle.spec.ts', 'src/material/slide-toggle/testing/slide-toggle-harness.spec.ts']},
});
const parse = (path, text) => {const f = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(f.parseDiagnostics.length, 0); return f;};
const classes = f => new Map(f.statements.filter(ts.isClassDeclaration).map(n => [n.name.text, n]));
const metadata = cls => {
  assert.ok(cls);
  const d = ts.getDecorators(cls)?.find(d => ts.isCallExpression(d.expression) && d.expression.expression.text === 'Component');
  assert.ok(d && d.expression.arguments.length === 1); const o = d.expression.arguments[0]; assert.ok(ts.isObjectLiteralExpression(o)); return o;
};
const template = (cls, file) => {
  const p = metadata(cls).properties.find(p => p.name?.getText(file) === 'template');
  assert.ok(p && ts.isPropertyAssignment(p) && ts.isStringLiteralLike(p.initializer)); return p.initializer.text;
};
const identifiers = (file, name) => {
  const ids = []; const visit = n => {if (ts.isIdentifier(n) && n.text === name) ids.push(n); ts.forEachChild(n, visit);}; visit(file); return ids;
};
const importsRef = (n, file) => ts.isArrayLiteralExpression(n.parent) && ts.isPropertyAssignment(n.parent.parent)
  && n.parent.parent.name.getText(file) === 'imports' && ts.isObjectLiteralExpression(n.parent.parent.parent)
  && ts.isCallExpression(n.parent.parent.parent.parent) && n.parent.parent.parent.parent.expression.getText(file) === 'TestBed.configureTestingModule';
const createCalls = (file, name) => {
  const calls = []; const visit = n => {
    if (ts.isCallExpression(n) && n.expression.getText(file) === 'TestBed.createComponent' && n.arguments[0]?.getText(file) === name)
      calls.push({line: file.getLineAndCharacterOfPosition(n.getStart(file)).line + 1, call: n.getText(file)});
    ts.forEachChild(n, visit);
  }; visit(file); return calls;
};

/** Independently tagged original fixtures; they are never rewritten from current expectations. */
export function readUnusedFixtureOriginals(readMember) {
  const stored = readMember(UNUSED_FIXTURE_ORIGINALS); assert.equal(hash(stored), 'd2c70db586071dcb462a140df1623adb1334b70ec86b9dafa08f05f8601362b0');
  const raw = gunzipSync(stored); assert.equal(hash(raw), 'd98b3295b4bc682eb965426ab6ed5b5b8c74e24841f2559de5dab4e1d24e05bf');
  const packet = JSON.parse(raw); assert.equal(packet.tag, '16.2.14'); assert.equal(packet.commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
  assert.deepEqual(packet.members.map(m => m.path), Object.values(UNUSED_FIXTURE_PROFILES).map(p => 'src/material/legacy-' + p.stem));
  const inventory = JSON.parse(readMember('testing/legacy-runner/historical-specs.json'));
  for (const member of packet.members) {
    assert.equal(gitHash(member.text), member.git_blob); assert.equal(hash(member.text), member.sha256);
    assert.equal(member.sha256, inventory.find(r => r.historical_path === member.path)?.historical_sha256);
  }
  return packet.members;
}

/** Individual source applicability: dead modern fixture deletion does not erase live historical cases. */
export function unusedModernFixtureScope(sha, subject, readMember, line) {
  const profile = UNUSED_FIXTURE_PROFILES[sha]; assert.ok(profile && subject.sha === sha);
  assert.ok(['main', '21.x'].includes(line));
  const manifest = JSON.parse(readMember('projects/ngx-material-legacy/package.json'));
  assert.equal(manifest.version.startsWith('21.') ? '21.x' : 'main', line);
  assert.deepEqual(subject.members.map(m => m.path), profile.files);
  const target = subject.members.find(m => m.path === 'src/material/' + profile.stem);
  const before = parse(target.path, target.before.text), after = parse(target.path, target.after.text), oldClasses = classes(before);
  const definitions = profile.names.map(name => {
    const c = oldClasses.get(name); assert.ok(c && !c.heritageClauses && !c.modifiers?.some(ts.isExportModifier));
    assert.ok(!classes(after).has(name)); assert.equal(identifiers(after, name).length, 0);
    const refs = identifiers(before, name); assert.ok(refs.every(n => n === c.name || importsRef(n, before)), 'active modern fixture');
    assert.ok(c.members.every(n => ts.isPropertyDeclaration(n) && !n.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)), 'fixture definition has active initialization');
    const props = metadata(c).properties;
    assert.ok(props.every(p => ts.isPropertyAssignment(p) && ['template', 'imports', 'encapsulation', 'selector'].includes(p.name.getText(before))), 'fixture provider or other metadata');
    assert.equal(ts.getDecorators(c).length, 1, 'other class decorator');
    const imported = props.find(p => p.name.getText(before) === 'imports');
    assert.ok(imported && ts.isArrayLiteralExpression(imported.initializer) && imported.initializer.elements.every(ts.isIdentifier), 'active fixture module expression');
    const encapsulation = props.find(p => p.name.getText(before) === 'encapsulation');
    assert.ok(!encapsulation || encapsulation.initializer.getText(before) === 'ViewEncapsulation.ShadowDom', 'active encapsulation expression');
    for (const member of c.members) for (const decorator of ts.getDecorators(member) || [])
      assert.equal(decorator.expression.getText(before), 'ViewChild(MatProgressSpinner, {read: ElementRef})', 'other property decorator');
    const selector = props.find(p => p.name.getText(before) === 'selector');
    assert.ok(!selector || ts.isStringLiteral(selector.initializer));
    return {name, setup_import_refs: refs.length - 1, template_sha256: hash(template(c, before)), selector: selector?.initializer.text || null,
      start: c.getStart(before), end: c.end};
  });
  let stripped = before.text;
  for (const d of [...definitions].sort((a, b) => b.start - a.start)) stripped = stripped.slice(0, d.start) + stripped.slice(d.end);
  const remaining = parse(target.path, stripped), strings = [];
  const visit = n => {if (ts.isStringLiteralLike(n)) strings.push(n.text); ts.forEachChild(n, visit);}; visit(remaining);
  for (const d of definitions.filter(d => d.selector)) {
    assert.match(d.selector, /^[a-z][a-z-]+$/);
    assert.ok(!strings.some(s => s.includes('<' + d.selector)), 'remaining template reaches removed fixture');
  }
  const sourceChecks = subject.members.map(m => analyzeTestImportCleanup(m.path, m.path === target.path ? stripped : m.before.text, m.after.text));
  const tagged = readUnusedFixtureOriginals(readMember).find(m => m.path === 'src/material/legacy-' + profile.stem);
  const original = parse(tagged.path, tagged.text), originalClasses = classes(original);
  const path = 'projects/ngx-material-legacy/legacy-' + profile.stem, bytes = readMember(path), current = parse(path, bytes.toString()), currentClasses = classes(current);
  const retained = profile.names.map(name => {
    const oldTemplate = template(originalClasses.get(name), original), currentTemplate = template(currentClasses.get(name), current);
    assert.equal(currentTemplate, oldTemplate, 'historical fixture DOM changed');
    const metadataValue = (cls, file, name) => {
      const p = metadata(cls).properties.find(p => p.name?.getText(file) === name);
      return !p ? null : ts.isStringLiteralLike(p.initializer) ? p.initializer.text : p.initializer.getText(file);
    };
    const originalSelector = metadataValue(originalClasses.get(name), original, 'selector');
    const originalEncapsulation = metadataValue(originalClasses.get(name), original, 'encapsulation');
    assert.equal(metadataValue(currentClasses.get(name), current, 'selector'), originalSelector, 'historical projection selector changed');
    assert.equal(metadataValue(currentClasses.get(name), current, 'encapsulation'), originalEncapsulation, 'historical shadow encapsulation changed');
    const originalCalls = createCalls(original, name), currentCalls = createCalls(current, name);
    assert.equal(currentCalls.length, originalCalls.length, 'historical case lost');
    assert.deepEqual(currentCalls.map(c => c.call), originalCalls.map(c => c.call));
    return {name, original_template_sha256: hash(oldTemplate), current_template_sha256: hash(currentTemplate),
      original_selector: originalSelector, current_selector: originalSelector,
      original_encapsulation: originalEncapsulation, current_encapsulation: originalEncapsulation,
      original_create_calls: originalCalls, current_create_calls: currentCalls};
  });
  return {schema_version: 1, line, sha, diff_sha256: subject.diff_sha256, complete_changed_files: profile.files,
    unused_modern_fixtures: definitions.map(({start, end, ...facts}) => facts), unchanged_remaining_test_source: sourceChecks,
    original_subject_capsule_sha256: hash(readMember(UNUSED_FIXTURE_ORIGINALS)), original_tagged_member: {path: tagged.path, sha256: tagged.sha256},
    retained_historical_member: {path, sha256: hash(bytes)}, retained,
    source_only: true, shadow_DOM_label_projection_native_or_packed_executed: false, g11_claim: 'not-passed'};
}
