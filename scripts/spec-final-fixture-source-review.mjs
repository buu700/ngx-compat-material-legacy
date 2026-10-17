/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Immutable original-source review. No scheduling, DI, compiler or renderer equivalence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const prefix = 'compatibility/rc/spec-final-fixture-source-';
export const FINAL_FIXTURE_SHAS = ['2600e0d7970960f126acd57967815f88e5c2be81',
  '4e0ea8e7dc8033a30e84c64b42eda5899c7ddacf', '357cfd3b8d5fa9505215914b10de27c148f7a02d',
  '79c67d40f4fa4ca636be0157711bc33bca32fb81'];
const pinSha = 'ea846e2253ad4b2e9785c320e9cf264bfd09acd3301434075d7f91061e830306';
const parse = text => {
  const file = ts.createSourceFile('original.spec.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0, 'unparseable original'); return file;
};
const semantic = node => {
  const children = []; ts.forEachChild(node, n => {children.push(semantic(n));});
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];
};
function collect(node, predicate) {
  const rows = []; function visit(n) {if (predicate(n)) rows.push(n); ts.forEachChild(n, visit);} visit(node); return rows;
}
const callName = (node, file) => ts.isCallExpression(node) ? node.expression.getText(file) : '';
function record(node, file) {
  const ancestry = []; let child = node;
  for (let p = node.parent; p; p = p.parent) {
    const children = []; ts.forEachChild(p, n => {children.push(n);});
    ancestry.unshift([ts.SyntaxKind[p.kind], children.indexOf(child)]); child = p;
  }
  return {start: node.getStart(file), end: node.end, kind: ts.SyntaxKind[node.kind], ancestry,
    raw: node.getText(file), sha256: hash(node.getText(file)), semantic_sha256: hash(JSON.stringify(semantic(node)))};
}
/** This projection proves only retained source operations, never fake/real-clock equivalence. */
export function projectFinalClock(member, side) {
  const file = parse(member[side].text), records = [];
  function capture(kind, node) {records.push({operation: kind, ...record(node, file)});}
  const transformed = ts.transform(file, [context => {
    const visit = node => {
      if (side === 'before' && member.path === 'src/material/tooltip/tooltip.spec.ts' && ts.isBlock(node)) {
        const statements = [...node.statements];
        const index = statements.findIndex((n, i) => n.getText(file) === "tooltipDirective.position = 'above';" &&
          statements[i + 1]?.getText(file) === "spyOn(tooltipDirective._overlayRef!, 'updatePosition').and.callThrough();");
        if (index >= 0) {
          capture('individual-spy-installed-before-position-update', statements[index]);
          capture('individual-spy-installed-before-position-update', statements[index + 1]);
          [statements[index], statements[index + 1]] = [statements[index + 1], statements[index]];
          return ts.factory.updateBlock(node, statements.map(n => ts.visitNode(n, visit)).filter(Boolean));
        }
      }
      if (ts.isImportDeclaration(node)) {capture('import', node); return undefined;}
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
        const call = node.expression, name = callName(call, file);
        if (!call.arguments.length && ['flush', 'flushMicrotasks', 'tick'].includes(name)) {
          capture('zero-argument-clock-drain', node); return undefined;
        }
        if (!call.arguments.length && name.endsWith('.changeDetectorRef.markForCheck')) {
          capture('explicit-render-mark', node); return undefined;
        }
      }
      if (ts.isCallExpression(node) && callName(node, file) === 'fakeAsync' &&
          (ts.isArrowFunction(node.arguments[0]) || ts.isFunctionExpression(node.arguments[0]))) {
        assert.equal(node.arguments.length, 1); capture('fakeAsync-wrapper', node);
        assert.ok(ts.isArrowFunction(node.arguments[0]) || ts.isFunctionExpression(node.arguments[0]));
        return ts.visitNode(node.arguments[0], visit);
      }
      if (ts.isCallExpression(node) && ['it', 'fit', 'xit'].includes(callName(node, file))) {
        // Names/modes/order are independently pinned in the complete case inventory.
        capture('case-name', node.arguments[0]);
        return ts.factory.updateCallExpression(node, node.expression, node.typeArguments,
          [ts.factory.createStringLiteral('__reviewed_original_case__'), ...node.arguments.slice(1).map(n => ts.visitNode(n, visit))]);
      }
      return ts.visitEachChild(node, visit, context);
    }; return node => ts.visitNode(node, visit);
  }]);
  const fingerprint = hash(JSON.stringify(semantic(transformed.transformed[0]))); transformed.dispose();
  return {fingerprint, records};
}
function assertionRoot(node, file) {
  if (!ts.isCallExpression(node)) return false;
  let target = node.expression;
  while (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target) || ts.isCallExpression(target)) {
    target = target.expression;
  }
  return ts.isIdentifier(target) && /^(expect|assert)/.test(target.text);
}
function sourceFrame(member, side) {
  const file = parse(member[side].text), subject = {members: [member]};
  const cases = originalEnvironmentCases(subject, side).map(({raw, ...row}) => row);
  const hooks = overlayHooks(subject, side).map(({raw, ...row}) => row);
  const assertions = collect(file, n => assertionRoot(n, file) &&
    !(n.parent && (ts.isPropertyAccessExpression(n.parent) || ts.isElementAccessExpression(n.parent)) &&
      assertionRoot(n.parent.parent, file))).map(n => record(n, file));
  const fixtures = collect(file, n => ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n)).map(n =>
    ({name: n.name?.getText(file) ?? null, ...record(n, file)}));
  const templates = collect(file, n => ts.isPropertyAssignment(n) &&
    ['template', 'styles', 'templateUrl', 'styleUrl', 'styleUrls'].includes(n.name.getText(file))).map(n => record(n, file));
  const imports = file.statements.filter(ts.isImportDeclaration).map(n => record(n, file));
  return {body_sha256: hash(member[side].text), program_semantic_sha256: hash(JSON.stringify(semantic(file))),
    cases, hooks, assertions, fixtures, templates, imports};
}
/** Complete raw/semantic frames are facts from untouched originals, not candidate goldens. */
export function observeFinalFixtureFile(member, sha) {
  assert.ok(FINAL_FIXTURE_SHAS.includes(sha)); assert.match(member.path, /\.spec\.ts$/);
  const before = sourceFrame(member, 'before'), after = sourceFrame(member, 'after');
  assert.equal(before.cases.length, after.cases.length, 'test occurrences lost/added');
  for (let i = 0; i < before.cases.length; i++) assert.equal(before.cases[i].mode, after.cases[i].mode, 'test mode changed');
  const pairs = before.cases.map((row, i) => ({before_key: row.key, after_key: after.cases[i].key,
    callback_semantics_equal: row.callback_sha256 === after.cases[i].callback_sha256}));
  const clock = sha === FINAL_FIXTURE_SHAS[0] ? {before: projectFinalClock(member, 'before'), after: projectFinalClock(member, 'after')} : null;
  if (clock) assert.equal(clock.before.fingerprint, clock.after.fingerprint,
    'unreviewed non-clock/render operation ' + member.path);
  return {path: member.path, before, after, pairs, clock};
}
export function reviewFinalFixtureFile(member, sha, pin) {
  assert.equal(member.path, pin.path);
  const actual = observeFinalFixtureFile(member, sha);
  // The remaining DI, promise and standalone changes are individually reviewed finite original frames.
  // They are deliberately NOT normalized into a claim of runtime equivalence.
  assert.equal(hash(JSON.stringify(actual)), hash(JSON.stringify(pin.observation)),
    'unreviewed original case/hook/assertion/helper/template/import frame');
  assert.ok(pin.review.length >= 40, 'missing individual per-file applicability reasoning');
  return actual;
}
export function finalFixturePins({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path))), bytes = read(prefix + 'observation-pins.json.gz');
  assert.equal(hash(bytes), pinSha, 'original observation pins changed');
  const pins = JSON.parse(gunzipSync(bytes)); assert.deepEqual(pins.subjects.map(n => n.sha), FINAL_FIXTURE_SHAS); return pins;
}
export function inspectFinalFixtureSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path)));
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const pins = finalFixturePins({root, readMember: read});
  const originalsBytes = read(prefix + 'subjects.json.gz'), acquisitionBytes = read(prefix + 'acquisition.json.gz');
  assert.equal(hash(originalsBytes), pins.capsules[line].originals); assert.equal(hash(acquisitionBytes), pins.capsules[line].acquisition);
  const originals = JSON.parse(gunzipSync(originalsBytes)), acquisition = JSON.parse(gunzipSync(acquisitionBytes));
  const censusBytes = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusBytes));
  assert.equal(census.line, line); assert.equal(census.commits.length, 1697);
  assert.equal(originals.source_inventory.sha256, hash(censusBytes));
  for (const packet of [originals, acquisition]) {
    assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);
    assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects, FINAL_FIXTURE_SHAS);
  }
  assert.deepEqual(acquisition.subjects, FINAL_FIXTURE_SHAS);
  assert.equal(acquisition.private_temporary_object_view_removed, true); assert.equal(acquisition.shared_cache_written, false);
  assert.equal(acquisition.credentials_used_or_changed, false); assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  const subjects = originals.subjects.map((subject, index) => {
    const pin = pins.subjects[index], row = census.commits.find(n => n.sha === subject.sha);
    assert.equal(subject.sha, pin.sha); assert.equal(subject.raw_commit, row.raw_commit);
    assert.deepEqual(subject.complete_changed_files, row.complete_changed_files);
    assert.deepEqual(subject.members.map(n => n.path), pin.files.map(n => n.path));
    assert.equal(hash(subject.diff), pin.diff_sha256); assert.equal(subject.diff_sha256, pin.diff_sha256);
    assert.equal(hash(read(prefix + subject.sha + '.original.patch')), pin.diff_sha256);
    const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = [];
    assert.equal(parts.length, subject.members.length);
    const files = subject.members.map((member, i) => {
      const identity = subject.complete_changed_files[i], diff = parts[i];
      assert.equal(identity.status, 'M'); assert.equal(identity.before_mode, '100644'); assert.equal(identity.after_mode, '100644');
      hunks.push(...reviewCompleteSingleSpec({...subject, members: [member], complete_changed_files: [identity], diff,
        diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, FINAL_FIXTURE_SHAS));
      return {...reviewFinalFixtureFile(member, subject.sha, pin.files[i]), review: pin.files[i].review};
    });
    assert.equal(hunks.length, pin.hunks); assert.equal(hunks.length, subject.original_hunks);
    const cases = files.flatMap(n => n.pairs);
    return {sha: subject.sha, complete_original_files: files.length, complete_original_hunks: hunks.length, hunks, files,
      cases_before: cases.length, cases_after: cases.length, same_position_complete_callbacks: cases.filter(n => n.callback_semantics_equal).length,
      case_identity_changes: cases.filter(n => n.before_key !== n.after_key),
      hooks_before: files.reduce((n, f) => n + f.before.hooks.length, 0), hooks_after: files.reduce((n, f) => n + f.after.hooks.length, 0),
      decision: pin.decision, source_conclusion_only: true, actual_Angular_native_artifact_or_floor_qualified: false};
  });
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root);
  assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, complete_original_files: 84, complete_original_bodies: 168,
    complete_original_hunks: 536, paired_cases: subjects.reduce((n, s) => n + s.cases_before, 0),
    owned_product_members: product.product_members, current_owned_case_bodies: 2223, current_required_historical_case_ids: 2228,
    product_or_consumer_changes: 0, required_consumer_CSS_SCSS_changes: 0,
    source_conclusion_only: true, actual_Angular_native_artifact_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectFinalFixtureSources(), out = process.argv.indexOf('--out');
  if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...result, subjects: result.subjects.map(({hunks, files, ...row}) => row)}));
}
