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
import {reviewThemePaletteTypes} from '../scripts/theme-palette-type-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8'), sha = text => createHash('sha256').update(text).digest('hex');
const subjects = JSON.parse(read('compatibility/rc/theme-palette-type-declaration-subjects.json'));
const report = reviewThemePaletteTypes({root});
assert.equal(report.cases.length, 9); assert.equal(report.sources.length, 9);
assert.equal(report.strict_assignments, 4); assert.equal(report.strict_equalities, 2);
assert.equal(report.accepted_literals, 12); assert.equal(report.rejected_literals, 9);
report.mutations = [];
function reject(id, expected, overrides = {}, subjectData = subjects) {
  assert.throws(() => reviewThemePaletteTypes({root, subjectData, readSource: path => overrides[path] ?? read(path)}), expected, id);
  report.mutations.push({id, rejected: true});
}
const path = report.sources[0].path, raw = read(path);
reject('runtime-palette-use', /runtime\/unsupported/, {[path]: raw + '\nconsole.log(ThemePalette);\n'});
reject('missing-palette-import', /missing\/ambiguous/, {[path]: raw.replace("import {ThemePalette} from '@angular/material/core';", '')});
reject('ambiguous-palette-import', /missing\/ambiguous/, {[path]: raw + "\nimport type {ThemePalette as DuplicatePalette} from '@angular/material/core';\n"});
reject('shadowed-palette-reference', /shadowed palette reference/, {[path]: raw + '\nfunction shadowedPalette(){type ThemePalette=never;let value:ThemePalette;}\n'});
reject('modern-generic-palette-use', /modern generic palette use/, {[path]: raw + '\ntype ModernPalette=ThemePalette<string>;\n'});
const aliased = raw.replace('import {ThemePalette}', 'import {ThemePalette as PaletteLabel}').replace(/:\s*ThemePalette/g, ': PaletteLabel');
assert.notEqual(aliased, raw);
assert.equal(reviewThemePaletteTypes({root, readSource: file => file === path ? aliased : read(file)}).cases[0].local_name, 'PaletteLabel');
report.alias_binding_positive = 1;
for (const line of ['main', '21.x']) {
  const subject = subjects.subjects.find(s => s.line === line);
  function semantic(id, capName, edit, expected) {
    const original = read(subject[capName].path), changed = edit(original); assert.notEqual(changed, original, id);
    const model = structuredClone(subjects), cap = model.subjects.find(s => s.line === line)[capName];
    cap.sha256 = sha(changed); cap.bytes = Buffer.byteLength(changed);
    reject(line + ':' + id, expected, {[cap.path]: changed}, model);
  }
  semantic('custom-label-widening', 'source', s => s.replace("'warn' | undefined", "'warn' | undefined | 'custom-palette'"), /historical palette domain changed/);
  semantic('remove-undefined', 'source', s => s.replace("'warn' | undefined", "'warn'"), /historical palette domain changed/);
  semantic('add-null', 'source', s => s.replace("'warn' | undefined", "'warn' | undefined | null"), /historical palette domain changed/);
  semantic('generic-palette-alias', 'source', s => s.replace('type ThemePalette =', 'type ThemePalette<T> ='), /generic palette alias/);
  semantic('actual-deprecated-palette', 'source', s => s.replace('type ThemePalette =', '/** @deprecated */\ntype ThemePalette ='), /private\/deprecated\/experimental/);
  semantic('actual-private-palette', 'source', s => s.replace('type ThemePalette =', '/** @docs-private */\ntype ThemePalette ='), /private\/deprecated\/experimental/);
  semantic('missing-public-palette-export', 'entry', s => s.replace("export { ThemePalette } from './_palette-chunk.js';", ''), /missing\/ambiguous public palette export/);
  semantic('wrong-public-palette-chain', 'entry', s => s.replaceAll('./_palette-chunk.js', './_unrelated-palette-chunk.js'), /palette export chain changed/);
  semantic('missing-palette-target-export', 'source', s => s.replace('export type { ThemePalette };', ''), /palette declaration not exported by target/);
  semantic('wrong-public-palette-package-entry', 'package_manifest', s => {
    const pkg = JSON.parse(s); pkg.exports['./core'].types = './types/unrelated.d.ts'; return JSON.stringify(pkg);
  }, /public palette package entry changed/);
  reject(line + ':stale-palette-subject', /palette declaration subject changed/, {[subject.source.path]: read(subject.source.path) + '\n// stale subject\n'});
}
const args = process.argv.slice(2);
if (args.length) {
  assert.equal(args.length, 2); assert.equal(args[0], '--report'); assert.equal(existsSync(args[1]), false);
  writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({line: report.line, uses: report.cases.length, files: report.sources.length,
  references: report.cases.reduce((count, row) => count + row.references.length, 0), accepted: report.accepted_literals,
  rejected: report.rejected_literals, mutants_rejected: report.mutations.length, alias_binding_positive: report.alias_binding_positive}));
