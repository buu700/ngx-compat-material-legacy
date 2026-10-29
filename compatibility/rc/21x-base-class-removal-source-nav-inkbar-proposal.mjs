/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Reproduce the missing historical immediate ink-bar hide and qualify an unapplied restoration. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';

const root = process.cwd(), prefix = 'compatibility/rc/21x-base-class-removal-source-';
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex'), bound = new Map();
function readBound(path, expected) {
  const absolute = resolve(root, path), raw = readFileSync(absolute);
  if (expected) assert.equal(hash(raw), expected, path);
  const ref = {path: relative(root, absolute), sha256: hash(raw), bytes: raw.length};
  if (bound.has(absolute)) assert.deepEqual(bound.get(absolute), ref);
  else bound.set(absolute, ref);
  return raw;
}
assert.equal(process.version, 'v24.21.0'); assert.equal(ts.version, '5.9.2');
readBound(fileURLToPath(import.meta.url)); readBound(require.resolve('typescript'));
const original = JSON.parse(gunzipSync(readBound(prefix + 'originals.json.gz',
  '3cb87a97a4365dd9959ec4c5fd4a5a2e1f0d5c3656e91e7e1aef65181955f49a')));
const worksheet = JSON.parse(readBound(prefix + 'worksheet.json',
  'a7459210660b5eea641d1239ef0a2c8fb329df8a4c2ef8c8a89a123353b1dace'));
for (const key of ['protected_ledger', 'protected_registry', 'protected_roster', 'prior_source_admission']) {
  const ref = worksheet[key]; assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);
}
const path = 'projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts';
const before = readBound(path).toString();
const headerPath = 'projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts';
const header = readBound(headerPath).toString();
const inkPath = 'projects/ngx-material-legacy/legacy-tabs/ink-bar.ts';
const inkText = readBound(inkPath).toString();
const tagged = original.tagged_reference.members.find(m => m.path === 'src/material/tabs/tab-nav-bar/tab-nav-bar.ts');
assert.ok(tagged); assert.equal(hash(tagged.body), tagged.sha256);
function member(text, owner, name) {
  const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === owner);
  assert.ok(cls, owner);
  const node = cls.members.find(n => ts.isMethodDeclaration(n) && n.name.getText(source) === name);
  assert.ok(node, name); return {source, cls, node, text: node.getText(source)};
}
const ownedMethod = member(before, '_MatTabNavBase', 'updateActiveLink');
const taggedMethod = member(tagged.body, '_MatTabNavBase', 'updateActiveLink');
const hide = member(inkText, 'MatLegacyInkBar', 'hide');
const oldHeader = ' * Copyright Google LLC All Rights Reserved.\n';
const newHeader = oldHeader + ' * Copyright (c) 2026 Ryan Lester.\n';
assert.equal(before.split(oldHeader).length, 2); assert.ok(before.includes(newHeader));
assert.equal(ownedMethod.text.split('this.selectedIndex = -1;').length, 2);
const fixedMethod = ownedMethod.text.replace('this.selectedIndex = -1;',
  'this.selectedIndex = -1;\n    this._inkBar.hide();');
const candidate = before.replace(ownedMethod.text, fixedMethod);
assert.equal(candidate.replace(fixedMethod, ownedMethod.text), before);
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text), out = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan())
    out.push([kind, scanner.getTokenText()]);
  return out;
}
assert.deepEqual(tokens(fixedMethod), tokens(taggedMethod.text));
const actualHeader = ts.createSourceFile('header.ts', header, ts.ScriptTarget.Latest, true);
const headerClass = actualHeader.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MatPaginatedTabHeader');
const inkPort = headerClass.members.find(n => n.name?.getText(actualHeader) === '_inkBar');
assert.ok(ts.isTypeLiteralNode(inkPort.type));
assert.equal(inkPort.type.members.find(n => n.name.getText(actualHeader) === 'hide').type.getText(actualHeader), '() => void');
assert.match(member(header, 'MatPaginatedTabHeader', '_alignInkBarToSelectedTab').text, /this\._inkBar\.hide\(\)/);
function replay(methodText, methodName = 'updateActiveLink') {
  const emitted = ts.transpileModule('class Subject {' + methodText + '}', {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None,
  }}).outputText;
  return new Function(emitted + ';return Subject.prototype[' + JSON.stringify(methodName) + '];')();
}
const hideMethod = replay(hide.text, 'hide');
const scenarios = [
  {id: 'inactive-links', items: [{active: false, id: 'a'}, {active: false, id: 'b'}]},
  {id: 'empty-links', items: []},
  {id: 'active-link', items: [{active: false, id: 'a'}, {active: true, id: 'b'}]},
  {id: 'missing-query', items: null},
];
const observations = [];
function observe(methodText, scenario) {
  const style = {visibility: 'visible'}, changes = [];
  const ink = {_elementRef: {nativeElement: {style}}, hide: hideMethod};
  const receiver = {_items: scenario.items === null ? null : {toArray: () => scenario.items},
    selectedIndex: 0, _inkBar: ink, tabPanel: {_activeTabId: null},
    _changeDetectorRef: {markForCheck: () => changes.push('mark')}};
  replay(methodText).call(receiver);
  return {selected_index: receiver.selectedIndex, visibility: style.visibility,
    panel_active_id: receiver.tabPanel._activeTabId, change_notifications: changes.length};
}
for (const scenario of scenarios) {
  const current = observe(ownedMethod.text, scenario), proposed = observe(fixedMethod, scenario);
  if (scenario.id === 'inactive-links' || scenario.id === 'empty-links') {
    assert.equal(current.selected_index, -1); assert.equal(proposed.selected_index, -1);
    assert.equal(current.visibility, 'visible'); assert.equal(proposed.visibility, 'hidden');
    assert.equal(current.change_notifications, 0); assert.equal(proposed.change_notifications, 0);
  } else assert.deepEqual(current, proposed);
  observations.push({id: scenario.id, current, proposed});
}
assert.equal(observations[2].proposed.panel_active_id, 'b');
assert.equal(observations[2].proposed.selected_index, 1);
assert.equal(observations[2].proposed.change_notifications, 1);
const wrongControl = fixedMethod.replace('this._inkBar.hide();', 'this._inkBar.hide;');
assert.equal(observe(wrongControl, scenarios[0]).visibility, 'visible');
assert.notDeepEqual(tokens(wrongControl), tokens(taggedMethod.text));
const diff = spawnSync('/nix/store/lfh101cfjj8p8npcari9hk0lbqi33yvh-python3-3.14.7/bin/python3',
  ['-c', 'import sys,json,difflib;d=json.load(sys.stdin);sys.stdout.write("".join(difflib.unified_diff(d[0].splitlines(True),d[1].splitlines(True),fromfile=d[2],tofile=d[3])))'],
  {input: JSON.stringify([before, candidate, 'a/' + path, 'b/' + path]), encoding: 'utf8'});
assert.equal(diff.status, 0, diff.stderr); assert.ok(diff.stdout);
const check = spawnSync('git', ['apply', '--check', '-'], {cwd: root, input: diff.stdout, encoding: 'utf8'});
assert.equal(check.status, 0, check.stderr);
for (const [file, ref] of bound) {
  const raw = readFileSync(file); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const patchPath = prefix + 'nav-inkbar-proposed.patch';
writeFileSync(patchPath, diff.stdout, {flag: 'wx'});
const report = {schema_version: 1, line: '21.x', sha: worksheet.sha, node: process.version,
  typescript: ts.version, scope: 'Exact owned updateActiveLink and ink-bar hide methods replayed;receiver/query/style/CDR fields are protocols. Untouched tagged method is parsed for exact token identity and never executed. No real Angular view,layout,native frame or packed behavior is qualified.',
  finding: 'When no nav link is active,the owned method sets selectedIndex=-1 but leaves the existing ink bar visible until a later header content check. Tagged16 calls hide synchronously in the method.',
  decision: 'Restore the exact tagged method token body through one owned finite hide() call;the existing required ownership notices remain. Preserve later header alignment and all active-link behavior. Carry this unapplied proposal to a separately bounded repair after whole source assessment.',
  actual_owned_finite_hide_port_verified: true, proposed_method_tokens_equal_untouched_tag: true,
  observations, noninvoking_control_rejected: true,
  patch: {path: patchPath, sha256: hash(diff.stdout), bytes: Buffer.byteLength(diff.stdout)},
  proposed_source: candidate, git_apply_check: {executed: true, exit_code: 0, applied: false},
  source_bindings: [...bound.values()], product_changes: 0, canonical_dispositions_changed: 0,
  exceptions_changed: 0, whole_SHA_substantive_review_complete: false,
  actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'};
writeFileSync(prefix + 'nav-inkbar-proposal-qualified.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'historical-immediate-inkbar-hide-proposal-qualified',
  scenarios: scenarios.length, gap_reproduced_cases: 2, control_rejected: true,
  exact_tagged_method_restored: true, product_patch_applied: false}));
