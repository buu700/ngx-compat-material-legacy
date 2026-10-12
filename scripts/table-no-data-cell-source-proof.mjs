/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = p => readFileSync(join(root, p), 'utf8'), hash = b => createHash('sha256').update(b).digest('hex');
const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: root});
const worksheet = JSON.parse(read('compatibility/rc/table-no-data-cell-worksheet.json'));
const rowPath = 'projects/ngx-material-legacy/legacy-table/row.ts', specPath = 'projects/ngx-material-legacy/legacy-table/table.spec.ts';
const producerPath = 'scripts/packed-consumer-aot-smoke.mjs';
function onlyOne(text, from, to) {assert.equal(text.split(from).length - 1, 1, 'nonunique repair anchor'); return text.replace(from, to);}
function reverseRow(text) {return onlyOne(text,
  "    // Material 16 did not add classes to the cells inside a no-data row.\n    row._cellClassNames = [];\n    // Even an empty classList.add call creates a class attribute in the DOM.\n    row._cellSelector = ':not(*)';\n", '');}
function reverseSpec(text) {return onlyOne(text,
  "    expect(noDataRow.className).toBe('mat-no-data-row');\n    expect(noDataRow.querySelector('td')!.className).toBe('');\n", '');}
function reverseProducer(text) {
  for (const [from, to] of [
    ['<ng-template #manualNoDataTemplate matNoDataRow><div><span class="cdk-cell">Empty grid probe</span></div></ng-template>',
     '<ng-template #manualNoDataTemplate matNoDataRow><div>Empty grid probe</div></ng-template>'],
    ['    historical_cell_classes:manualNoDataRow._cellClassNames.length===0\n      &&nodeNoDataRow._cellClassNames.length===0,\n', ''],
    ['    rendered_legacy_row:false,\n    rendered_legacy_cell:false};', '    rendered_legacy_row:false};'],
    ["  noDataRowObservation.rendered_legacy_cell=fixture.nativeElement.querySelector('#constructor-grid .mat-no-data-row .cdk-cell')?.className==='cdk-cell';\n", ''],
  ]) text = onlyOne(text, from, to);
  return text;
}
const rows = worksheet.subjects.map(row => {
  const before = git(['show', worksheet.source_parent + ':' + row.path]).toString(); assert.equal(hash(before), row.before_sha256);
  const text = read(row.path), reversed = row.path === rowPath ? reverseRow(text) : row.path === specPath ? reverseSpec(text) : reverseProducer(text);
  assert.equal(reversed, before, 'unrelated program changed: ' + row.path);
  return {...row, candidate_sha256: hash(text), exact_reversal_to_parent: true};
});
const paths = git(['ls-tree', '-r', '--name-only', worksheet.source_parent, 'projects/ngx-material-legacy']).toString().trim().split('\n');
assert.deepEqual(paths, git(['ls-files', 'projects/ngx-material-legacy']).toString().trim().split('\n'));
const unchanged = [];
for (const path of paths.filter(p => p !== rowPath && p !== specPath)) {
  const bytes = readFileSync(join(root, path)), before = git(['show', worksheet.source_parent + ':' + path]);
  assert.deepEqual(bytes, before); unchanged.push({path, sha256: hash(bytes)});
}
const rowSource = ts.createSourceFile(rowPath, read(rowPath), ts.ScriptTarget.Latest, true);
const owner = rowSource.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MatLegacyNoDataRow'); assert.ok(owner);
assert.ok(owner.members.filter(ts.isPropertyDeclaration).every(n => n.modifiers?.some(m => m.kind === ts.SyntaxKind.DeclareKeyword)), 'returned object skips field initialization');
const ctor = owner.members.find(ts.isConstructorDeclaration); assert.equal(ctor.parameters.length, 1);
assert.equal(ctor.parameters[0].name.getText(rowSource), 'templateRef'); assert.equal(ctor.parameters[0].modifiers?.length || 0, 0);
assert.deepEqual(ctor.body.statements.filter(ts.isExpressionStatement).map(n => n.expression.left?.getText(rowSource)),
  ['row._contentClassName', 'row._contentClassNames', 'row._cellClassNames', 'row._cellSelector']);
const cyph = '/home/parallels/cyph', head = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'rev-parse', 'HEAD'], {cwd: cyph, encoding: 'utf8'}).trim();
const consumers = execFileSync('rg', ['-l', 'MatLegacyTable|MatTable|matNoDataRow', 'shared/js', '-g', '*.ts', '-g', '*.html'], {cwd: cyph, encoding: 'utf8'}).trim().split('\n').filter(Boolean);
const consumerSources = consumers.map(path => {const text = readFileSync(join(cyph, path), 'utf8');
  assert.doesNotMatch(text, /(?:new|extends)\s+MatLegacyNoDataRow\b/);
  return {path, sha256: hash(text), no_data_references: text.split('\n').flatMap((s, i) => /MatLegacyNoDataRow|matNoDataRow/.test(s) ? [{line: i + 1, text: s.trim()}] : [])};});
const report = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
  changed: rows, unchanged_product_members: unchanged,
  unchanged_styles: unchanged.filter(r => /\.(?:css|scss)$/.test(r.path)).length,
  unchanged_templates: unchanged.filter(r => r.path.endsWith('.html')).length,
  borrowed_helper_and_all_other_library_code_unchanged: true, no_emitted_owned_fields_or_parameter_properties: true,
  packed_producer_repair_scope: 'One existing no-data fixture now contains a matching descendant cell; two new booleans require empty owned cell classes and unchanged rendered cell class. All other producer bytes are identical after the four exact reversals. No native execution is claimed from source checks.',
  cyph: {head, read_only: true, sources: consumerSources, manual_no_data_construction_or_subclassing: 0},
  unexecuted: ['Strengthened historical native-table assertion and full packed owned-table/node/factory integration; deferred final Actions.'],
  producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: worksheet.line, source_changes: rows.length, unchanged_styles: report.unchanged_styles,
  unchanged_templates: report.unchanged_templates, cyph_sources: consumerSources.length}));
