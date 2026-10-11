/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual modern-input changes do not replace the retained legacy slider architecture. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';

const ts = createRequire(import.meta.url)('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex');
const gitHash = (kind, text) => createHash('sha1').update(`${kind} ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const printer = ts.createPrinter({removeComments: true});
export const SLIDER_INPUT_ROLE = 'C04 three individual modern slider input applicability reviews';
export const SLIDER_INPUT_SUBJECTS = 'compatibility/rc/upstream-slider-input-subjects.json.gz';
export const SLIDER_INPUT_SHAS = ['776e530f7d9dbec0208f5f6302ad46db66a4da16', 'eef45562035448212e0f827c5dbc31b3fd621255', '291b9db9105846ff0ae37581263725bebb6f0a45'];
const expectedPaths = [
  ['src/material/slider/slider-input.ts', 'src/material/slider/slider-interface.ts', 'src/material/slider/slider-thumb.ts', 'src/material/slider/slider.spec.ts', 'src/material/slider/slider.ts', 'tools/public_api_guard/material/slider.md'],
  ['src/material/slider/slider-input.ts'], ['src/material/slider/slider-input.ts'],
];
const retained = ['constructor', 'ngAfterViewInit', 'ngOnDestroy', '_onFocus', '_pointerDown', '_pointerMove', '_pointerUp', '_updateValueFromPosition'];
const absence = ['MatSliderThumb', 'MatSliderRangeThumb', 'MatSliderVisualThumb', '_isCursorOnSliderThumb', '_updateWidthActive', '_updateWidthInactive'];
const candidate = ['projects/ngx-material-legacy/legacy-slider/slider.ts', 'projects/ngx-material-legacy/legacy-slider/slider.html'];
const parse = (path, text) => {const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0); return file;};

export function analyzeSliderInputSubjects(readMember) {
  const stored = readMember(SLIDER_INPUT_SUBJECTS); assert.equal(hash(stored), '8b183009711204961acc0e16f33b6b381f1b2dceabb7671aaf3b7e29fea72340');
  const raw = gunzipSync(stored); assert.equal(hash(raw), '1fce0d98d512b9e39fad9afd9559cd44f7bb3774e6cddcc5b0455b99613bd3ac');
  const body = JSON.parse(raw); assert.equal(body.schema_version, 1); assert.equal(body.tagged_original_commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
  assert.deepEqual(body.reviews.map(r => r.sha), SLIDER_INPUT_SHAS);
  for (const [index, review] of body.reviews.entries()) {
    assert.equal(gitHash('commit', review.raw_commit), review.sha);
    assert.deepEqual(review.raw_commit.split('\n').filter(x => x.startsWith('parent ')), ['parent ' + review.parent]);
    assert.equal(hash(review.diff), review.diff_sha256);
    assert.deepEqual(review.diff.split('\n').filter(x => x.startsWith('diff --git ')).map(x => x.split(' b/')[1]), expectedPaths[index]);
    assert.deepEqual(review.members.map(m => m.path), expectedPaths[index]);
    for (const member of review.members) for (const side of ['before', 'after']) {
      assert.equal(gitHash('blob', member[side].text), member[side].git_blob); assert.equal(hash(member[side].text), member[side].sha256);
      assert.ok(review.diff.includes('index ' + member.before.git_blob + '..' + member.after.git_blob), 'patch/blob pair is not bound');
    }
  }
  assert.deepEqual(body.original.map(m => m.path), ['src/material/legacy-slider/slider.ts', 'src/material/legacy-slider/slider.html']);
  for (const member of body.original) {assert.equal(gitHash('blob', member.text), member.git_blob); assert.equal(hash(member.text), member.sha256);}
  return body;
}

/** Whole source population absence, original template identity and exact retained handlers. */
export function reviewSliderInputScope(readMember, productPaths, line) {
  assert.ok(['main', '21.x'].includes(line));
  const original = analyzeSliderInputSubjects(readMember);
  const manifest = JSON.parse(readMember('projects/ngx-material-legacy/package.json'));
  assert.equal(manifest.version.startsWith('21.') ? '21.x' : 'main', line);
  const text = readMember(candidate[0]).toString(), html = readMember(candidate[1]).toString();
  assert.equal(html, original.original[1].text, 'legacy DOM differs from the untouched tag');
  assert.doesNotMatch(html, /<input\b|matSlider(?:Start|End)?Thumb/);
  const current = parse(candidate[0], text), tagged = parse(original.original[0].path, original.original[0].text);
  const getClass = file => {const cls = file.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MatLegacySlider'); assert.ok(cls); return cls;};
  const cls = getClass(current), old = getClass(tagged);
  assert.equal(cls.heritageClauses[0].types[0].expression.getText(current), '_MatSliderBase');
  assert.ok(current.statements.some(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(current) === '_MatSliderBase')));
  assert.ok(!current.statements.filter(ts.isImportDeclaration).some(n => n.moduleSpecifier.text === '@angular/material/slider'));
  const contexts = retained.map(name => {
    const select = (c, f) => c.members.find(n => name === 'constructor' ? ts.isConstructorDeclaration(n) : n.name?.getText(f) === name);
    const before = select(old, tagged), after = select(cls, current); assert.ok(before && after);
    const print = (n, f) => printer.printNode(ts.EmitHint.Unspecified, n, f);
    assert.equal(print(after, current), print(before, tagged), 'retained legacy pointer/focus contract changed: ' + name);
    return {name, candidate_line: current.getLineAndCharacterOfPosition(after.getStart(current)).line + 1,
      original_member_sha256: hash(print(before, tagged)), candidate_member_sha256: hash(print(after, current))};
  });
  const paths = [...productPaths()].sort(); assert.ok(paths.length && candidate.every(p => paths.includes(p))); assert.equal(new Set(paths).size, paths.length);
  const sources = paths.map(path => {const bytes = readMember(path); assert.ok(bytes?.length);
    for (const needle of absence) assert.ok(!bytes.toString().includes(needle), 'modern input architecture reachable in candidate: ' + needle);
    return {path, sha256: hash(bytes)};
  });
  return {schema_version: 1, line, subject_capsule_sha256: hash(readMember(SLIDER_INPUT_SUBJECTS)),
    candidate_sources: candidate.map(path => ({path, sha256: hash(readMember(path))})), original_template_sha256: original.original[1].sha256,
    retained_contexts: contexts, absent_modern_identifiers: absence, product_source_files: sources.length,
    product_source_population_sha256: hash(JSON.stringify(sources)), original_changed_files: original.reviews.reduce((n, r) => n + r.members.length, 0),
    reviews: original.reviews.map((r, index) => ({sha: r.sha, diff_sha256: r.diff_sha256, paths: expectedPaths[index]})),
    source_only: true, iOS_or_native_or_packed_execution: false, g11_claim: 'not-passed'};
}

export function sliderInputScopeEvidenceOk(body, entry, readMember, productPaths, line) {
  try {
    assert.equal(body.role, SLIDER_INPUT_ROLE); assert.equal(body.line, line);
    assert.deepEqual(body.reviews.map(r => r.sha), SLIDER_INPUT_SHAS);
    const actual = reviewSliderInputScope(readMember, productPaths, line); assert.deepEqual(body.source_scope, actual);
    const index = SLIDER_INPUT_SHAS.indexOf(entry.sha); assert.ok(index >= 0);
    const review = body.reviews[index], patch = actual.reviews[index];
    assert.equal(review.sha, entry.sha); assert.equal(review.diff_sha256, patch.diff_sha256);
    assert.deepEqual(review.paths, patch.paths); assert.deepEqual(entry.files, patch.paths);
    assert.equal(review.final_disposition, 'not-applicable'); assert.equal(entry.final_disposition, review.final_disposition);
    assert.equal(review.review_depth, 'individual-compatibility'); assert.equal(entry.individual_proof.review_depth, review.review_depth);
    assert.deepEqual(entry.individual_proof.affected_branches, ['main', '21.x']);
    assert.equal(entry.individual_proof.proof_kind, 'retained-legacy-slider-input-scope');
    assert.equal(entry.individual_proof.diff_sha256, patch.diff_sha256); assert.equal(entry.individual_proof.decision, review.decision);
    assert.equal(review.patch_file, entry.individual_proof.patch_file);
    const bytes = readMember(review.patch_file); assert.equal(hash(bytes), patch.diff_sha256);
    assert.ok(review.decision.length > 120); return true;
  } catch {return false;}
}
