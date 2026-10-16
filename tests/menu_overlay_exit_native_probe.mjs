/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Validator corruption controls; no browser/CSS or product qualification. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveMainRoster, samplePass, assertCase, SOURCE_LINE} from '../scripts/native-motion-roster.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(resolve(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const observations = [], roster = deriveMainRoster(), menuIds = roster.ids.filter(id => id.includes('/enabled-disabled-reduced/menu/'));
assert.equal(menuIds.length, 18);
for (const id of menuIds) {
  const sample = samplePass(id); assert.deepEqual(assertCase(id, sample), []); observations.push({id, positive: true});
  const reject = (field, value) => {
    const changed = structuredClone(sample); changed.exit[field] = value;
    assert.ok(assertCase(id, changed).length, id + ' accepted bad exit ' + field);
    observations.push({id, changed: field, rejected: true});
  };
  for (const field of ['semanticClosed', 'retainedAtClose', 'nonInteractiveAtClose', 'removed']) reject(field, false);
  const missing = structuredClone(sample); delete missing.exit; assert.ok(assertCase(id, missing).length);
  observations.push({id, changed: 'missing-exit', rejected: true});
  if (id.endsWith('/enabled')) {
    for (const field of ['trustedStarts', 'trustedEnds']) { reject(field, 0); reject(field, 2); }
    for (const field of ['startConnected', 'endConnected', 'renderedAtStart']) reject(field, false);
    reject('animationName', 'mat-legacy-menu-enter');
    for (const value of [0, 99, null, '100', Infinity]) reject('durationMs', value);
  } else {
    reject('trustedStarts', 1); reject('trustedEnds', 1);
  }
}
let sourceBoundary = null;
const args = process.argv.slice(2);
if (args.includes('--source-proof')) {
  const inputRaw = read('compatibility/rc/menu-overlay-exit-inputs.json'), input = JSON.parse(inputRaw);
  assert.equal(hash(inputRaw), {main: '89adacb82ca70d1a5050be84cfb7920ac2e3155a4fa7d2cab2a7dbbce71cbdd2',
    '21.x': '89bce486f9b09f28d3fe2fa7bf9d7e7f3386a2f01ee8bae6d8fa39b8c56e9a78'}[input.line]);
  assert.match(input.source_parent, /^[0-9a-f]{40}$/);
  const before = path => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', input.source_parent + ':' + path],
    {cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
  for (const member of input.members) assert.equal(hash(before(member.path)), member.sha256);
  const tagged = read(input.original_trigger.path); assert.equal(hash(tagged), input.original_trigger.sha256);
  assert.equal(hash(gunzipSync(tagged)), input.original_trigger.uncompressed_sha256);
  for (const member of input.members.filter(row => !['projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
    'scripts/native-motion-consumer.ts', 'scripts/native-motion-roster.mjs'].includes(row.path))) assert.equal(hash(read(member.path)), member.sha256);
  const ts = createRequire(import.meta.url)('typescript');
  const parse = (path, text) => { const f = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(f.parseDiagnostics.length, 0); return f; };
  const producer = 'scripts/native-motion-consumer.ts', oldConsumer = parse(producer, before(producer)), newConsumer = parse(producer, read(producer).toString());
  const members = file => file.statements.find(node => ts.isClassDeclaration(node) && node.members.some(m => m.name?.getText(file) === 'measureMenu')).members
    .filter(node => node.name?.getText(file) !== 'measureMenu').map(node => node.getText(file));
  assert.deepEqual(members(oldConsumer), members(newConsumer), 'native fixture changed outside menu measurement');
  const native = 'scripts/native-motion-roster.mjs', oldNative = parse(native, before(native)), newNative = parse(native, read(native).toString());
  const otherStatements = file => file.statements.filter(node => !(ts.isFunctionDeclaration(node)
    && ['enabledProblem', 'samplePass'].includes(node.name?.text))).map(node => node.getText(file));
  assert.deepEqual(otherStatements(oldNative), otherStatements(newNative), 'other motion contracts/rosters changed');
  const trigger = 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts', oldTrigger = parse(trigger, before(trigger)), newTrigger = parse(trigger, read(trigger).toString());
  const owner = file => file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === '_MatMenuTriggerBase');
  const signatures = file => owner(file).members.filter(node => !node.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)).map(node =>
    node.body ? file.text.slice(node.getStart(file), node.body.pos).trim() : node.getText(file));
  assert.deepEqual(signatures(oldTrigger), signatures(newTrigger), 'historical public TypeScript API changed');
  const imports = file => file.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text !== './menu-content-base').map(node => node.getText(file));
  assert.deepEqual(imports(oldTrigger), imports(newTrigger), 'new upstream dependency introduced');
  const minimumDeclarations = [];
  for (const version of ['21.2.14', '22.1.7']) {
    const path = `compatibility/rc/position-type-sources/${version}/cdk/types/_overlay-module-chunk.d.ts`;
    const text = read(path).toString(); minimumDeclarations.push({version, path, sha256: hash(text)});
    assert.match(text, /\/\*\* Detaches the backdrop \(if any\) associated with the overlay\. \*\/\s+detachBackdrop\(\): void;/);
  }
  const matrix = 'compatibility/rc/matrices/full-verify.json'; assert.equal(read(matrix).toString(), before(matrix));
  sourceBoundary = {input_capsule_sha256: hash(inputRaw), unchanged_public_signatures: true, unchanged_upstream_imports: true,
    menu_base_content_template_and_style_bytes_unchanged: true, other_native_fixture_members_and_roster_statements_unchanged: true,
    both_minimum_public_detachBackdrop_declarations_checked: true, minimum_declarations: minimumDeclarations, entire_matrix_unchanged: true};
}
const report = {schema_version: 1, line: SOURCE_LINE, menu_mode_cases: menuIds.length, validator_controls: observations.length,
  source_boundary: sourceBoundary, observations, actual_native_or_artifact_or_floor_executed: false, g11_claim: 'not-passed',
  source_members: ['projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts', 'scripts/native-motion-consumer.ts', 'scripts/native-motion-roster.mjs', 'tests/menu_overlay_exit_native_probe.mjs']
    .map(path => ({path, sha256: hash(read(path))}))};
const out = args.indexOf('--report'); if (out >= 0) writeFileSync(args[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, observations: undefined, source_members: undefined}));
