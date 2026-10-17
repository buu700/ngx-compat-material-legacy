/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four complete CDK source decisions. No upstream execution or native/floor admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedCdkFile} from '../compatibility/rc/mixed-cdk-behavior-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const prefix = 'compatibility/rc/mixed-cdk-behavior-source-';
export const MIXED_CDK_SHAS = ['d8a6c3edd8d406b3f1b1c26805612eac8856b745',
  '5233a43d871fc09b302937286ecafff54e28fe14', '4f3c931072f9361c24c105a3a7be181340d78819',
  '0612c6a8725d360100548d90c1e3f40d62aa67b6'];
const pinSha = '4a2c595c74cd17de848a57ac7ddc45f5b3ec37b82f274d8c9b1891c3cc94a50c';
const parse = text => {
  const file = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0, 'unparseable source'); return file;
};
function collect(node, predicate) {
  const rows = []; function visit(n) {if (predicate(n)) rows.push(n); ts.forEachChild(n, visit);} visit(node); return rows;
}
const name = node => node.name?.getText() ?? '';
const named = (file, className) => {
  const matches = collect(file, n => ts.isClassDeclaration(n) && name(n) === className);
  assert.equal(matches.length, 1, 'missing or ambiguous class ' + className); return matches[0];
};
function member(file, className, memberName, kind) {
  const matches = named(file, className).members.filter(n => name(n) === memberName && (!kind || kind(n)));
  assert.equal(matches.length, 1, 'missing or ambiguous member ' + className + '.' + memberName); return matches[0];
}
function semantic(node, selectedIndex = false) {
  if (selectedIndex) {
    const text = node.getText?.();
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && node.left.getText() === 'this._selectedIndex') return ['writeSelectedIndex', semantic(node.right, true)];
    if (ts.isCallExpression(node) && node.expression.getText() === 'this._selectedIndex.set') return ['writeSelectedIndex', ...node.arguments.map(n => semantic(n, true))];
    if ((ts.isCallExpression(node) && node.expression.getText() === 'this._selectedIndex' && node.arguments.length === 0) ||
        (ts.isPropertyAccessExpression(node) && ['this._selectedIndex', 'this.selectedIndex'].includes(text))) return ['readSelectedIndex'];
  }
  const children = []; ts.forEachChild(node, n => {children.push(semantic(n, selectedIndex));});
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];
}
const fingerprint = (node, selectedIndex = false) => hash(JSON.stringify(semantic(node, selectedIndex)));
const fact = node => ({kind: ts.SyntaxKind[node.kind], start: node.getStart(), end: node.end,
  raw: node.getText(), sha256: hash(node.getText()), semantic_sha256: fingerprint(node)});
function linearBlock(file) {
  const method = member(file, 'CdkStepper', 'ngAfterViewInit', ts.isMethodDeclaration);
  const matches = method.body.statements.filter(n => ts.isIfStatement(n) &&
    n.expression.getText().startsWith('this.linear && ') && n.getText().includes('visitedSteps'));
  assert.equal(matches.length, 1, 'linear initialization block missing'); return matches[0];
}
function observerFunction(file) {
  const matches = file.statements.filter(n => ts.isFunctionDeclaration(n) && name(n) === 'shouldIgnoreRecord');
  assert.equal(matches.length, 1, 'comment filter helper missing'); return matches[0];
}
function observerSubscription(file) {
  const method = member(file, 'ContentObserver', 'observe', n => ts.isMethodDeclaration(n) && !!n.body);
  const matches = collect(method, n => ts.isVariableDeclaration(n) && name(n) === 'subscription');
  assert.equal(matches.length, 1); return matches[0].initializer;
}
/** Remove only the individually reviewed runtime delta; persist every exact original node. */
export function projectMixedRuntime(text, index, side) {
  const file = parse(text), removed = [];
  const drop = node => {removed.push(fact(node)); return undefined;};
  const changed = ts.transform(file, [context => {
    const visit = node => {
      if (ts.isImportDeclaration(node)) return drop(node);
      if (index === 0 && side === 'after' && ts.isFunctionDeclaration(node) && name(node) === 'shouldIgnoreRecord') return drop(node);
      if (index === 0 && ts.isVariableDeclaration(node) && name(node) === 'subscription' && node.initializer &&
          node.initializer.getText().endsWith('.subscribe(observer)')) {
        removed.push(fact(node.initializer));
        return ts.factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type,
          ts.factory.createIdentifier('__reviewed_observer_subscription__'));
      }
      if (index === 1 && side === 'after' && ts.isIfStatement(node) &&
          node.expression.getText().startsWith('this.linear && ') && node.getText().includes('visitedSteps')) return drop(node);
      if (index === 2 && ts.isSetAccessorDeclaration(node) && name(node) === 'selectedIndex') return drop(node);
      if (index === 3 && (ts.isPropertyDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) &&
          ['disabled', '_disabled'].includes(name(node))) return drop(node);
      return ts.visitEachChild(node, visit, context);
    }; return node => ts.visitNode(node, visit);
  }]);
  const value = {fingerprint: fingerprint(changed.transformed[0]), removed}; changed.dispose(); return value;
}
function specFrame(member, side) {
  const text = member[side].text, file = parse(text), subject = {members: [member]};
  return {sha256: hash(text), semantic_sha256: fingerprint(file),
    cases: originalEnvironmentCases(subject, side).map(({raw, ...row}) => row),
    hooks: overlayHooks(subject, side).map(({raw, ...row}) => row),
    imports: file.statements.filter(ts.isImportDeclaration).map(fact),
    functions_and_classes: collect(file, n => ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n)).map(fact),
    templates_and_styles: collect(file, n => ts.isPropertyAssignment(n) &&
      ['template', 'styles', 'templateUrl', 'styleUrl', 'styleUrls'].includes(name(n))).map(fact)};
}
export function observeMixedCdkSubject(subject, index) {
  assert.equal(subject.sha, MIXED_CDK_SHAS[index]);
  const runtimePath = ['src/cdk/observers/observe-content.ts', 'src/cdk/stepper/stepper.ts',
    'src/cdk/stepper/stepper.ts', 'src/cdk/accordion/accordion-item.ts'][index];
  const runtime = subject.members.find(n => n.path === runtimePath); assert.ok(runtime);
  const before = projectMixedRuntime(runtime.before.text, index, 'before'), after = projectMixedRuntime(runtime.after.text, index, 'after');
  assert.equal(before.fingerprint, after.fingerprint, 'runtime change escapes individual delta');
  const oldFile = parse(runtime.before.text), newFile = parse(runtime.after.text);
  let behavior;
  if (index === 0) {
    assert.equal(oldFile.statements.filter(n => ts.isFunctionDeclaration(n) && name(n) === 'shouldIgnoreRecord').length, 0);
    behavior = {filter: fact(observerFunction(newFile)), subscription: fact(observerSubscription(newFile))};
  } else if (index === 1) {
    behavior = {added_linear_initialization: fact(linearBlock(newFile))};
  } else if (index === 2) {
    behavior = {before_setter: fact(member(oldFile, 'CdkStepper', 'selectedIndex', ts.isSetAccessorDeclaration)),
      after_setter: fact(member(newFile, 'CdkStepper', 'selectedIndex', ts.isSetAccessorDeclaration))};
  } else {
    behavior = {before_disabled: fact(member(oldFile, 'CdkAccordionItem', 'disabled', ts.isPropertyDeclaration)),
      getter: fact(member(newFile, 'CdkAccordionItem', 'disabled', ts.isGetAccessorDeclaration)),
      setter: fact(member(newFile, 'CdkAccordionItem', 'disabled', ts.isSetAccessorDeclaration)),
      signal: fact(member(newFile, 'CdkAccordionItem', '_disabled', ts.isPropertyDeclaration))};
  }
  const specs = subject.members.filter(n => n.path.endsWith('.spec.ts')).map(n =>
    ({path: n.path, before: specFrame(n, 'before'), after: specFrame(n, 'after')}));
  const casesBefore = specs.flatMap(n => n.before.cases), casesAfter = specs.flatMap(n => n.after.cases);
  const afterByKey = new Map(casesAfter.map(n => [n.key, n]));
  const retained = casesBefore.map(n => {const next = afterByKey.get(n.key); assert.ok(next, 'old regression test lost');
    assert.equal(n.mode, next.mode); return {key: n.key, callback_semantics_equal: n.callback_sha256 === next.callback_sha256};});
  const beforeKeys = new Set(casesBefore.map(n => n.key)), added = casesAfter.filter(n => !beforeKeys.has(n.key));
  assert.equal(added.length, [4, 1, 1, 0][index], 'unexpected new regression cases');
  const golden = subject.members.filter(n => n.path.endsWith('.md')).map(n =>
    ({path: n.path, before: n.before.text, after: n.after.text}));
  return {sha: subject.sha, runtime_path: runtimePath, before, after, behavior, specs, retained_cases: retained,
    added_cases: added, golden, cases_before: casesBefore.length, cases_after: casesAfter.length,
    unchanged_complete_retained_callbacks: retained.filter(n => n.callback_semantics_equal).length};
}
function signalInitializer(file, className, field, value, compiled) {
  const node = member(file, className, field, ts.isPropertyDeclaration).initializer;
  const raw = node.getText().replace(/\s/g, '');
  const wanted = compiled ? 'signal(' + value + ',...(ngDevMode?[{debugName:' + JSON.stringify(field) + '}]:[]))' : 'signal(' + value + ')';
  assert.equal(raw, wanted, 'unreviewed signal initial value or compiler debug metadata');
  return {initializer: fact(node), initial_value: value, exact_compiler_debug_name_only: compiled};
}
/** Check source-map claims against the shipped JS as well as the complete original delta. */
export function inspectMixedCdkFloor(floor, originals) {
  assert.ok(['main', '21.x'].includes(floor.line)); assert.equal(floor.version, floor.line === 'main' ? '22.1.7' : '21.2.14');
  assert.equal(floor.archive.version, floor.version); assert.equal(floor.archive.name, '@angular/cdk');
  assert.equal(floor.archive_sha256_verified, true); assert.equal(floor.archive_sri_sha512_verified, true);
  const members = new Map();
  for (const row of floor.members) {assert.equal(hash(row.text), row.sha256); assert.equal(Buffer.byteLength(row.text), row.bytes);
    assert.equal(members.has(row.archive_member), false); members.set(row.archive_member, row);}
  const manifest = JSON.parse(members.get('package/package.json').text); assert.equal(manifest.version, floor.version);
  const result = [];
  for (const source of floor.mapped_sources) {
    assert.equal(hash(source.text), source.source_sha256);
    const area = source.public_entry.split('/').at(-1), entry = manifest.exports['./' + area];
    assert.deepEqual(source.package_export, entry); assert.equal(entry.default, './fesm2022/' + area + '.mjs');
    const runtime = members.get('package/' + entry.default.slice(2)), mapping = JSON.parse(members.get(source.source_map_member).text);
    assert.equal(mapping.file, area + '.mjs'); const at = mapping.sources.indexOf(source.source_map_path);
    assert.ok(at >= 0); assert.equal(mapping.sourcesContent[at], source.text);
    const types = parse(members.get('package/' + entry.types.slice(2)).text), src = parse(source.text), js = parse(runtime.text);
    const className = {observers: 'ContentObserver', stepper: 'CdkStepper', accordion: 'CdkAccordionItem'}[area]; assert.ok(className);
    named(types, className); named(src, className); named(js, className);
    assert.ok(js.statements.some(n => ts.isExportDeclaration(n) && n.exportClause &&
      ts.isNamedExports(n.exportClause) && n.exportClause.elements.some(e => e.name.text === className)), 'missing public runtime export');
    const checks = {};
    if (area === 'observers') {
      const original = parse(originals[0].members.find(n => n.path === 'src/cdk/observers/observe-content.ts').after.text);
      for (const file of [src, js]) {
        assert.equal(fingerprint(observerFunction(file).body), fingerprint(observerFunction(original).body), 'comment filter behavior changed');
        const current = observerSubscription(file), historical = observerSubscription(original);
        assert.ok(ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression));
        assert.equal(current.expression.name.text, 'subscribe');
        assert.equal(fingerprint(current.expression.expression), fingerprint(historical.expression.expression), 'observer filtering pipeline changed');
        assert.equal(current.arguments.length, 1);
        const callback = current.arguments[0];
        assert.ok(ts.isArrowFunction(callback) && ts.isBlock(callback.body));
        assert.equal(callback.body.getText().replace(/\s/g, ''), '{this._ngZone.run(()=>{observer.next(records);});}',
          'unreviewed current observer delivery context');
      }
      assert.equal(fingerprint(observerSubscription(src)), fingerprint(observerSubscription(js)), 'mapped/shipped delivery context differs');
      checks.comment_filter = fact(observerFunction(src)); checks.subscription = fact(observerSubscription(src));
      checks.current_delivery_inside_NgZone_differs_from_original_direct_subscriber = true;
    } else if (area === 'stepper') {
      const originalLinear = parse(originals[1].members.find(n => n.path.endsWith('/stepper.ts')).after.text);
      const originalEvent = parse(originals[2].members.find(n => n.path.endsWith('/stepper.ts')).after.text);
      for (const file of [src, js]) {
        const getter = member(file, className, 'selectedIndex', ts.isGetAccessorDeclaration);
        assert.equal(getter.body.getText().replace(/\s/g, ''), '{returnthis._selectedIndex();}', 'selected-index read is not transparent');
        signalInitializer(file, className, '_selectedIndex', '0', file === js);
        assert.equal(fingerprint(linearBlock(file), true), fingerprint(linearBlock(originalLinear), true), 'visited-step initialization changed');
        assert.equal(fingerprint(member(file, className, 'selectedIndex', ts.isSetAccessorDeclaration).body, true),
          fingerprint(member(originalEvent, className, 'selectedIndex', ts.isSetAccessorDeclaration).body, true), 'interaction/selection guard changed');
      }
      checks.linear_initialization = fact(linearBlock(src));
      checks.selection_setter = fact(member(src, className, 'selectedIndex', ts.isSetAccessorDeclaration));
      checks.signal_read_write_normalization_only = true;
      checks.shipped_signal_initializer = signalInitializer(js, className, '_selectedIndex', '0', true);
    } else {
      const original = parse(originals[3].members.find(n => n.path.endsWith('/accordion-item.ts')).after.text);
      for (const kind of [ts.isGetAccessorDeclaration, ts.isSetAccessorDeclaration])
        assert.equal(fingerprint(member(src, className, 'disabled', kind)), fingerprint(member(original, className, 'disabled', kind)),
          'disabled public Input/coercion source metadata changed');
      for (const file of [src, js]) {
        for (const kind of [ts.isGetAccessorDeclaration, ts.isSetAccessorDeclaration])
          assert.equal(fingerprint(member(file, className, 'disabled', kind).body), fingerprint(member(original, className, 'disabled', kind).body));
        signalInitializer(file, className, '_disabled', 'false', file === js);
        assert.equal(member(original, className, '_disabled', ts.isPropertyDeclaration).initializer.getText(), 'signal(false)');
      }
      checks.disabled_getter = fact(member(src, className, 'disabled', ts.isGetAccessorDeclaration));
      checks.disabled_setter = fact(member(src, className, 'disabled', ts.isSetAccessorDeclaration));
      checks.disabled_signal = fact(member(src, className, '_disabled', ts.isPropertyDeclaration));
      checks.shipped_signal_initializer = signalInitializer(js, className, '_disabled', 'false', true);
    }
    result.push({public_entry: source.public_entry, mapped_source_sha256: source.source_sha256,
      public_runtime_sha256: runtime.sha256, checks, actual_runtime_or_floor_executed: false});
  }
  assert.deepEqual(result.map(n => n.public_entry), ['@angular/cdk/observers', '@angular/cdk/stepper', '@angular/cdk/accordion']);
  return {line: floor.line, version: floor.version, entries: result, source_comparison_only: true, actual_runtime_or_floor_qualified: false};
}
export function reviewMixedCdkSubject(subject, index, pin) {
  const observed = observeMixedCdkSubject(subject, index);
  assert.equal(hash(JSON.stringify(observed)), hash(JSON.stringify(pin.observation)), 'unreviewed complete original source frame');
  return observed;
}
export function inspectMixedOwnedScope({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path))), paths = candidateProductSourcePaths(root), rows = [];
  const forbidden = ['@angular/cdk/stepper', '@angular/cdk/accordion', '@angular/material/stepper', '@angular/material/expansion'];
  for (const path of paths) {
    const raw = read(path), text = raw.toString();
    if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) {
      const file = parse(text);
      for (const node of collect(file, n => ts.isImportDeclaration(n) || ts.isExportDeclaration(n))) {
        if (node.moduleSpecifier) assert.ok(!forbidden.includes(node.moduleSpecifier.text), 'owned stepper/accordion dependency '+path);
      }
      for (const node of collect(file, ts.isClassDeclaration))
        assert.ok(!['ContentObserver', 'CdkObserveContent', 'CdkStep', 'CdkStepper', 'CdkAccordion', 'CdkAccordionItem'].includes(name(node)), 'ordinary CDK fork '+path);
    }
    rows.push({path, sha256: hash(raw)});
  }
  // This source inventory includes ts/scss/css/html; the independent product seal also covers metadata/assets.
  assert.equal(paths.length, 1028);
  const modules = ['legacy-tabs/tabs-module.ts', 'legacy-form-field/form-field-module.ts',
    'legacy-checkbox/checkbox-module.ts', 'legacy-slide-toggle/slide-toggle-module.ts'];
  for (const relative of modules) assert.ok(read('projects/ngx-material-legacy/'+relative).toString().includes("from '@angular/cdk/observers'"));
  return {source_members: paths.length, source_extensions: ['.ts', '.scss', '.css', '.html'], members_sha256: hash(JSON.stringify(rows)),
    owned_stepper_or_accordion_dependencies: 0, ordinary_CDK_forks: 0, public_observer_module_routes: modules,
    source_scope_only: true, actual_public_peer_or_floor_executed: false};
}
export function mixedCdkPins({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path))), bytes = read(prefix + 'observation-pins.json.gz');
  assert.equal(hash(bytes), pinSha, 'original observation pins changed'); return JSON.parse(gunzipSync(bytes));
}
export function inspectMixedCdkSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path))), line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const pins = mixedCdkPins({root, readMember: read}), originalBytes = read(prefix + 'subjects.json.gz'), acquisitionBytes = read(prefix + 'acquisition.json.gz');
  assert.equal(hash(originalBytes), pins.capsules[line].originals); assert.equal(hash(acquisitionBytes), pins.capsules[line].acquisition);
  const originals = JSON.parse(gunzipSync(originalBytes)), acquisition = JSON.parse(gunzipSync(acquisitionBytes));
  assert.deepEqual(originals.subjects.map(n => n.sha), MIXED_CDK_SHAS); assert.deepEqual(acquisition.subjects, MIXED_CDK_SHAS);
  for (const packet of [originals, acquisition]) {
    assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);
  }
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
  assert.equal(acquisition.upstream_or_candidate_source_executed, false); assert.equal(acquisition.private_temporary_object_view_removed, true);
  const censusBytes = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusBytes));
  assert.equal(originals.source_inventory.sha256, hash(censusBytes)); assert.equal(census.line, line); assert.equal(census.commits.length, 1697);
  const subjects = originals.subjects.map((subject, index) => {
    const row = census.commits.find(n => n.sha === subject.sha); assert.equal(subject.raw_commit, row.raw_commit);
    assert.deepEqual(subject.complete_changed_files, row.complete_changed_files);
    const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = [];
    assert.equal(parts.length, subject.members.length); assert.equal(hash(read(prefix + subject.sha + '.original.patch')), subject.diff_sha256);
    for (const [i, member] of subject.members.entries()) {
      const diff = parts[i]; hunks.push(...reviewCompleteMixedCdkFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]], diff,
        diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, MIXED_CDK_SHAS));
    }
    const observed = reviewMixedCdkSubject(subject, index, pins.subjects[index]);
    assert.equal(hunks.length, subject.original_hunks); assert.equal(subject.diff_sha256, pins.subjects[index].diff_sha256);
    return {...observed, complete_original_files: subject.members.length, complete_original_hunks: hunks.length, hunks,
      review: pins.subjects[index].review, source_conclusion_only: true, actual_runtime_or_floor_qualified: false};
  });
  const floorBytes = read(prefix + 'published-peer-floors.json.gz'); assert.equal(hash(floorBytes), pins.floor_capsule_sha256);
  const floors = JSON.parse(gunzipSync(floorBytes)); assert.equal(hash(read(floors.metadata_capsule.path)), floors.metadata_capsule.sha256);
  const floorReviews = floors.floors.map(floor => inspectMixedCdkFloor(floor, originals.subjects));
  assert.equal(hash(JSON.stringify(floorReviews)), hash(JSON.stringify(pins.floor_reviews)), 'unreviewed published minimum source frame');
  const context = JSON.parse(read(prefix + 'intake.json'));
  for (const ref of context.owned_observer_routes_read) assert.equal(hash(read(ref.path)), ref.sha256, 'owned observer preparation changed');
  const ownedScope = inspectMixedOwnedScope({root, readMember: read});
  assert.equal(hash(JSON.stringify(ownedScope)), hash(JSON.stringify(pins.owned_scope[line])), 'owned CDK scope changed');
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root);
  assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, floor_reviews: floorReviews, owned_scope: ownedScope, complete_original_files: 11,
    complete_original_bodies: 22, complete_original_hunks: 21,
    owned_product_members: product.product_members, current_owned_case_bodies: 2223, current_required_historical_case_ids: 2228,
    source_conclusion_only: true, product_or_consumer_changes: 0, required_consumer_CSS_SCSS_changes: 0,
    actual_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectMixedCdkSources(), out = process.argv.indexOf('--out');
  if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...report, subjects: report.subjects.map(({specs, before, after, behavior, retained_cases, added_cases, hunks, ...row}) => row), floor_reviews: report.floor_reviews.map(n => ({line: n.line, version: n.version, public_entries: n.entries.length}))}));
}
