/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact owned keyboard method and untouched tagged contract; no Angular view/browser claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve, relative} from 'node:path';
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
const path = 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts';
const before = readBound(path).toString();
const template = readBound('projects/ngx-material-legacy/legacy-menu/menu.html').toString();
assert.doesNotMatch(template, /\(keydown\)/);
const peerSource = readBound('node_modules/@angular/cdk/fesm2022/_overlay-module-chunk.mjs').toString();
const peerAst = ts.createSourceFile('peer.mjs', peerSource, ts.ScriptTarget.Latest, true);
const dispatcher = peerAst.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'OverlayKeyboardDispatcher');
assert.ok(dispatcher); assert.doesNotMatch(dispatcher.getText(peerAst), /stopPropagation/);
const versions = {};
for (const [name, expected] of [['@angular/core', '21.2.23'], ['@angular/cdk', '21.2.14']]) {
  const version = JSON.parse(readBound('node_modules/' + name + '/package.json')).version;
  assert.equal(version, expected); versions[name] = version;
}
readBound(fileURLToPath(import.meta.resolve('@angular/cdk/keycodes')));
const keys = await import('@angular/cdk/keycodes');
function method(text) {
  const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const owner = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === '_MatMenuBase');
  assert.ok(owner);
  const node = owner.members.find(n => ts.isMethodDeclaration(n) && n.name.getText(source) === '_handleKeydown');
  assert.ok(node); return node.getText(source);
}
const tagged = original.tagged_reference.members.find(m => m.path === 'src/material/menu/menu.ts');
assert.ok(tagged); assert.equal(hash(tagged.body), tagged.sha256);
const current = method(before), historical = method(tagged.body);
assert.ok(current.endsWith('\n  }'));
const proposed = current.slice(0, -4) + '\n    event.stopPropagation();\n  }';
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text), out = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan())
    out.push([kind, scanner.getTokenText()]);
  return out;
}
assert.deepEqual(tokens(proposed), tokens(historical));
const google = ' * Copyright Google LLC All Rights Reserved.\n';
const notice = google + ' * Copyright (c) 2026 Ryan Lester.\n';
assert.equal(before.split(google).length, 2);
const noticeAdded = !before.includes(notice);
const candidate = before.replace(current, proposed).replace(google, noticeAdded ? notice : google);
assert.equal(candidate.replace(proposed, current).replace(notice, noticeAdded ? google : notice), before);
function replay(body) {
  const code = ts.transpileModule('class Subject {' + body + '}', {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None,
  }}).outputText;
  const names = ['ESCAPE', 'LEFT_ARROW', 'RIGHT_ARROW', 'UP_ARROW', 'DOWN_ARROW', 'hasModifierKey'];
  return new Function(...names, code + ';return Subject.prototype._handleKeydown;')(...names.map(name => keys[name]));
}
function observe(body, scenario) {
  const events = [], receiver = {_keyManager: {setFocusOrigin: value => events.push(['origin', value]),
    onKeydown: event => events.push(['manager-key', event.keyCode])},
    parentMenu: scenario.parent ? {} : null, direction: scenario.direction || 'ltr',
    closed: {emit: reason => events.push(['closed', reason])}};
  const event = {keyCode: scenario.key, altKey: !!scenario.modified,
    preventDefault: () => events.push(['prevent-default']), stopPropagation: () => events.push(['stop'])};
  replay(body).call(receiver, event); return events;
}
const scenarios = [
  {id: 'escape', key: keys.ESCAPE}, {id: 'modified-escape', key: keys.ESCAPE, modified: true},
  {id: 'nested-ltr-left', key: keys.LEFT_ARROW, parent: true},
  {id: 'nested-rtl-right', key: keys.RIGHT_ARROW, parent: true, direction: 'rtl'},
  {id: 'root-left', key: keys.LEFT_ARROW}, {id: 'down-delegates', key: keys.DOWN_ARROW},
];
const rows = scenarios.map(scenario => {
  const baseline = observe(current, scenario), fixed = observe(proposed, scenario);
  const stops = scenario.id === 'down-delegates' ? [] : [['stop']];
  assert.deepEqual(fixed, [...baseline, ...stops]);
  if (scenario.id === 'escape') assert.deepEqual(baseline, [['prevent-default'], ['closed', 'keydown']]);
  if (scenario.id === 'down-delegates') assert.deepEqual(fixed, [['origin', 'keyboard'], ['manager-key', keys.DOWN_ARROW]]);
  return {id: scenario.id, current: baseline, proposed: fixed};
});
const noninvoking = proposed.replace('event.stopPropagation();', 'event.stopPropagation;');
assert.deepEqual(observe(noninvoking, scenarios[0]), observe(current, scenarios[0]));
assert.notDeepEqual(tokens(noninvoking), tokens(historical));
const diff = spawnSync('/nix/store/lfh101cfjj8p8npcari9hk0lbqi33yvh-python3-3.14.7/bin/python3',
  ['-c', 'import sys,json,difflib;d=json.load(sys.stdin);sys.stdout.write("".join(difflib.unified_diff(d[0].splitlines(True),d[1].splitlines(True),fromfile=d[2],tofile=d[3])))'],
  {input: JSON.stringify([before, candidate, 'a/' + path, 'b/' + path]), encoding: 'utf8'});
assert.equal(diff.status, 0, diff.stderr);
const check = spawnSync('git', ['apply', '--check', '-'], {cwd: root, input: diff.stdout, encoding: 'utf8'});
assert.equal(check.status, 0, check.stderr);
for (const [file, ref] of bound) {
  const raw = readFileSync(file); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const patchPath = prefix + 'menu-keyboard-proposed.patch';
writeFileSync(patchPath, diff.stdout, {flag: 'wx'});
const report = {schema_version: 1, line: '21.x', sha: worksheet.sha, node: process.version,
  typescript: ts.version, versions,
  scope: 'Exact owned method replay with genuine current public keycode constants/helper. Receiver,key-manager,closed emitter and event are protocols. Tagged method is parsed for token identity and never executed. Owned template and current dispatcher source inspected;no real DOM propagation,Angular view,overlay stack,native keyboard,packed or floor claim.',
  finding: 'Current handled Escape/Left/Right paths omit the tagged stopPropagation call,while default delegated keys still return early. The public dispatcher selects one overlay without stopping DOM propagation,so it does not supply the removed method side effect.',
  decision: 'Restore the exact tagged method body with one stopPropagation call after handled branches. Leave template/event transport,default key-manager delegation,closing outputs and positioning unchanged. Carry this unapplied proposal into a separately bounded repair after whole source assessment.',
  observations: rows, method_tokens_equal_untouched_tag: true, noninvoking_control_rejected: true,
  required_notice_added: noticeAdded, proposed_source: candidate,
  patch: {path: patchPath, sha256: hash(diff.stdout), bytes: Buffer.byteLength(diff.stdout)},
  git_apply_check: {executed: true, exit_code: 0, applied: false}, source_bindings: [...bound.values()],
  product_changes: 0, canonical_dispositions_changed: 0, exceptions_changed: 0,
  whole_SHA_substantive_review_complete: false, actual_native_packed_browser_floor_or_full_audit_qualified: false,
  g11_claim: 'not-passed'};
writeFileSync(prefix + 'menu-keyboard-proposal-qualified.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'historical-menu-keyboard-propagation-proposal-qualified', scenarios: rows.length,
  exact_tagged_method_restored: true, control_rejected: true, product_patch_applied: false}));
