/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewPositionTypes} from '../scripts/position-type-use-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');
const subjects = JSON.parse(read('compatibility/rc/position-type-declaration-subjects.json'));
const report = reviewPositionTypes({root});
assert.equal(report.cases.length, 16); assert.equal(report.sources.length, 8);
assert.equal(report.strict_assignments, 24); assert.equal(report.strict_equalities, 12);
assert.equal(report.strict_positive_assignments, 285); assert.equal(report.strict_negative_assignments, 69);
report.mutations = [];
function reject(id, expected, overrides = {}, subjectData = subjects) {
  assert.throws(() => reviewPositionTypes({root, subjectData, readSource: path => overrides[path] ?? read(path)}), expected, id);
  report.mutations.push({id, rejected: true});
}
const selected = report.cases.find(row => row.symbol === 'ConnectedPosition');
const selectedPath = 'projects/ngx-material-legacy/' + selected.file, source = read(selectedPath);
reject('runtime-position-type-reference', /executable emit|runtime\/unsupported/, {[selectedPath]: source + '\nconsole.log(ConnectedPosition);\n'});
const missing = source.replace('import {ConnectedPosition}', 'import {}'); assert.notEqual(missing, source);
reject('missing-position-import', /missing\/ambiguous|unbound/, {[selectedPath]: missing});
reject('ambiguous-position-import', /missing\/ambiguous/, {[selectedPath]: source + "\nimport type {ConnectedPosition as Duplicate} from '@angular/cdk/overlay';\n"});
reject('shadowed-position-type', /shadowed position type use/, {[selectedPath]: source + '\nfunction shadowedPosition(){type ConnectedPosition=never;let value:ConnectedPosition;}\n'});
reject('modern-generic-position-type', /modern generic position type use/, {[selectedPath]: source + '\ntype ModernPosition=ConnectedPosition<any>;\n'});
const aliased = source.replace('import {ConnectedPosition}', 'import {ConnectedPosition as LegacyPosition}').replace('_positions: ConnectedPosition[]', '_positions: LegacyPosition[]');
assert.notEqual(aliased, source);
const aliasReport = reviewPositionTypes({root, readSource: path => path === selectedPath ? aliased : read(path)});
assert.equal(aliasReport.cases.find(row => row.file === selected.file && row.symbol === selected.symbol).local_name, 'LegacyPosition');
report.alias_binding_positive = 1;

for (const line of ['main', '21.x']) {
  const overlay = subjects.subjects.find(s => s.line === line && s.module === '@angular/cdk/overlay');
  const bidi = subjects.subjects.find(s => s.line === line && s.module === '@angular/cdk/bidi');
  function semantic(id, capName, subject, edit, expected) {
    const original = read(subject[capName].path), changed = edit(original);
    assert.notEqual(changed, original, id);
    const model = structuredClone(subjects), cap = model.subjects.find(s => s.line === line && s.module === subject.module)[capName];
    cap.sha256 = sha(changed); cap.bytes = Buffer.byteLength(changed);
    // A co-located entry/source must retain one identical identity.
    if (subject.entry.path === subject.source.path && ['entry', 'source'].includes(capName)) {
      const target = model.subjects.find(s => s.line === line && s.module === subject.module);
      target.entry.sha256 = target.source.sha256 = cap.sha256;
      target.entry.bytes = target.source.bytes = cap.bytes;
    }
    reject(line + ':' + id, expected, {[cap.path]: changed}, model);
  }
  semantic('direction-domain-widened', 'source', bidi, s => s.replace("type Direction = 'ltr' | 'rtl';", "type Direction = 'ltr' | 'rtl' | 'auto';"), /historical position type shape changed/);
  semantic('required-axis-made-optional', 'source', overlay, s => s.replace("overlayY: 'top' | 'center' | 'bottom';", "overlayY?: 'top' | 'center' | 'bottom';"), /historical position type shape changed/);
  semantic('position-weight-made-readonly', 'source', overlay, s => s.replace('    weight?: number;', '    readonly weight?: number;'), /historical position type shape changed/);
  semantic('generic-position-declaration', 'source', overlay, s => s.replace('interface ConnectedPosition {', 'interface ConnectedPosition<T> {'), /generic position type/);
  semantic('actual-deprecated-position-marker', 'source', overlay, s => s.replace('interface ConnectedPosition {', '/** @deprecated */\ninterface ConnectedPosition {'), /private\/deprecated\/experimental/);
  semantic('actual-private-direction-marker', 'source', bidi, s => s.replace('type Direction =', '/** @docs-private */\ntype Direction ='), /private\/deprecated\/experimental/);
  semantic('missing-public-position-export', 'entry', overlay, s => s.replace(', ConnectedPosition,', ','), /missing\/ambiguous public position export/);
  semantic('wrong-public-position-export-chain', 'entry', overlay, s => s.replaceAll('./_overlay-module-chunk.js', './_unrelated-position-chunk.js'), /public position export chain changed/);
  semantic('wrong-public-package-type-entry', 'package_manifest', overlay, s => {
    const pkg = JSON.parse(s); pkg.exports['./overlay'].types = './types/unrelated.d.ts'; return JSON.stringify(pkg);
  }, /public package type entry changed/);
  reject(line + ':stale-position-subject', /position declaration subject changed/, {[overlay.source.path]: read(overlay.source.path) + '\n// stale source\n'});
}
const args = process.argv.slice(2);
if (args.length) {
  assert.equal(args.length, 2); assert.equal(args[0], '--report'); assert.equal(existsSync(args[1]), false);
  writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({line: report.line, uses: report.cases.length, files: report.sources.length,
  assignments: report.strict_assignments, equalities: report.strict_equalities, positives: report.strict_positive_assignments,
  negatives: report.strict_negative_assignments, mutants_rejected: report.mutations.length, alias_binding_positive: report.alias_binding_positive}));
