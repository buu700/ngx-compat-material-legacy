/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewFrameworkEnumUses} from '../scripts/framework-enum-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(resolve(root, path), 'utf8');
const sha = source => createHash('sha256').update(source).digest('hex');
const subjects = JSON.parse(read('compatibility/rc/framework-enum-public-subjects.json'));
const report = reviewFrameworkEnumUses({root, population: 'current'});
assert.equal(report.cases.length, 76); assert.equal(report.files, 38);
assert.equal(report.frozen_uses,78);assert.equal(report.retired_frozen_uses.length,2);assert.equal(report.whole_current_population_reviewed,true);
assert.equal(report.cases.flatMap(row => row.references).filter(row => row.member === 'Eager').length, 12);
assert.deepEqual([...new Set(report.cases.flatMap(row => row.references.map(reference => row.symbol + '.' + reference.member)))].sort(), ['ChangeDetectionStrategy.Eager', 'ChangeDetectionStrategy.OnPush', 'ViewEncapsulation.None']);
const eager = report.cases.find(row => row.references.some(reference => reference.member === 'Eager'));
const path = 'projects/ngx-material-legacy/' + eager.file, source = read(path);
report.mutations = [];
function reject(id, expected, changes = {}, subjectData = subjects) {
  assert.throws(() => reviewFrameworkEnumUses({root, population: 'current', subjectData, readSource: path => changes[path] ?? read(path)}), expected, id);
  report.mutations.push({id, rejected: true});
}
reject('deprecated-default-reintroduced', /deprecated authored enum member/, {[path]: source.replace('ChangeDetectionStrategy.Eager', 'ChangeDetectionStrategy.Default')});
reject('new-shadow-opt-in', /new enum opt-in needs separate contract/, {[path]: source.replace('ViewEncapsulation.None', 'ViewEncapsulation.ExperimentalIsolatedShadowDom')});
reject('runtime-enum-escape', /unsupported enum reference/, {[path]: source + '\nconsole.log(ViewEncapsulation);\n'});
reject('dynamic-member-access', /unsupported enum reference/, {[path]: source.replace('ViewEncapsulation.None', "ViewEncapsulation['None']")});
reject('wrong-metadata-slot', /outside metadata slot/, {[path]: source.replace('encapsulation: ViewEncapsulation.None', 'changeDetection: ViewEncapsulation.None')});
reject('missing-import', /missing\/ambiguous enum import/, {[path]: source.replace(/\bViewEncapsulation,/, '')});
reject('redeclared-import', /shadowed or redeclared/, {[path]: source + '\nconst ViewEncapsulation = {None: 2};\n'});
reject('foreign-component-decorator', /outside public Component metadata/, {[path]: source.replace('@Component(', '@ForeignComponent(')});
for (const line of ['main', '21.x']) {
  const subject = subjects.subjects.find(subject => subject.line === line);
  const declaration = subject.members.find(member => /(?:_debug_node|_discovery)-chunk\.d\.ts$/.test(member.path));
  const runtime = subject.members.find(member => /_debug_node-chunk\.mjs$/.test(member.path));
  function changed(id, changes, expected) {
    const rebound = structuredClone(subjects);
    for (const [path, text] of Object.entries(changes)) {
      assert.notEqual(text, read(path));
      const member = rebound.subjects.find(subject => subject.line === line).members.find(member => member.path === path);
      member.sha256 = sha(text); member.bytes = Buffer.byteLength(text);
    }
    reject(line + ':' + id, expected, changes, rebound);
  }
  changed('wrong-eager-declaration', {[declaration.path]: read(declaration.path).replace('Eager = 1,', 'Eager = 2,')}, /declaration\/runtime enum value differs/);
  changed('wrong-matching-public-values', {
    [declaration.path]: read(declaration.path).replace('OnPush = 0,', 'OnPush = 7,'),
    [runtime.path]: read(runtime.path).replace('["OnPush"] = 0]', '["OnPush"] = 7]'),
  }, /historical enum value changed/);
  changed('deprecated-eager', {[declaration.path]: read(declaration.path).replace('    Eager = 1,', '    /** @deprecated forbidden diagnostic member */\n    Eager = 1,')}, /deprecated authored enum member/);
  changed('private-none', {[declaration.path]: read(declaration.path).replace('    None = 2,', '    /** @docs-private forbidden diagnostic member */\n    None = 2,')}, /deprecated authored enum member/);
  changed('missing-public-runtime-export', {[runtime.path]: read(runtime.path).replace(/, ViewEncapsulation(?=,| \})/, '')}, /missing public runtime enum binding/);
  reject(line + ':stale-member', /enum subject bytes changed/, {[declaration.path]: read(declaration.path) + '\n// unbound change\n'});
}
reject('runtime-enum-import-type-only',/runtime enum imported type only/,{[path]:source.replace('ChangeDetectionStrategy,','type ChangeDetectionStrategy,')});
const retiredPath='projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts',retired=read(retiredPath);
for(const name of ['ChangeDetectionStrategy','ViewEncapsulation'])reject('retired-'+name+'-returned',/retired enum import or panel returned/,{[retiredPath]:retired+`\nimport {${name}} from '@angular/core';\n`});
reject('retired-panel-runtime-returned',/retired enum import or panel returned/,{[retiredPath]:retired+'\nexport class MatTabNavPanel {}\n'});
assert.throws(()=>reviewFrameworkEnumUses({root,population:'unknown'}),/unknown enum population/);report.mutations.push({id:'unknown-population',rejected:true});
const outsidePath='projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts';
reject('outside-current-population',/current enum population changed/,{[outsidePath]:read(outsidePath)+"\nimport {ViewEncapsulation} from '@angular/core';\n"});
assert.equal(report.mutations.length,26);
const args = process.argv.slice(2);
assert.equal(args.length, 2); assert.equal(args[0], '--report'); assert.equal(existsSync(args[1]), false);
writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({line: report.line, uses: report.cases.length, files: report.files, references: report.cases.flatMap(row => row.references).length, eager_references: 12, mutants_rejected: report.mutations.length}));
