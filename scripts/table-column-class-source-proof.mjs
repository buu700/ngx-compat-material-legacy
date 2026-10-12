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
const worksheet = JSON.parse(read('compatibility/rc/table-column-class-worksheet.json'));
const cellPath = 'projects/ngx-material-legacy/legacy-table/cell.ts', modulePath = 'projects/ngx-material-legacy/legacy-table/table-module.ts';
const specPath = 'projects/ngx-material-legacy/legacy-table/table.spec.ts', added = worksheet.added_helper;
const old = p => git(['show', worksheet.source_parent + ':' + p]).toString();
const parse = (p, t) => {const s = ts.createSourceFile(p, t, ts.ScriptTarget.Latest, true); assert.equal(s.parseDiagnostics.length, 0); return s;};
const printer = ts.createPrinter({removeComments: true});
const classes = text => {const s = parse(cellPath, text); return new Map(s.statements.filter(ts.isClassDeclaration).map(n => [n.name.text, {node: n, source: s}]));};
const before = classes(old(cellPath)), current = classes(read(cellPath)), print = (n, s) => printer.printNode(ts.EmitHint.Unspecified, n, s);
assert.deepEqual([...before.keys()], [...current.keys()]);
for (const [name, row] of before) {
  const now = current.get(name);
  assert.deepEqual((ts.getDecorators(row.node) || []).map(n => print(n, row.source)),
    (ts.getDecorators(now.node) || []).map(n => print(n, now.source)), name + ' metadata changed');
  if (name.endsWith('CellDef')) assert.equal(print(row.node, row.source), print(now.node, now.source));
  if (name === 'MatLegacyColumnDef') {
    for (const member of ['sticky', 'stickyEnd']) assert.deepEqual(row.node.members.filter(n => n.name?.text === member).map(n => print(n, row.source)), now.node.members.filter(n => n.name?.text === member).map(n => print(n, now.source)));
    const oldCtor = row.node.members.find(ts.isConstructorDeclaration), ctor = now.node.members.find(ts.isConstructorDeclaration);
    assert.equal(print(ctor, now.source).replace('    markLegacyColumn(definition);\n', ''), print(oldCtor, row.source));
    const accessors = now.node.members.filter(n => n.name?.text === 'name'); assert.equal(accessors.length, 2);
    assert.equal(accessors[0].body.statements[0].expression.getText(now.source), 'super.name');
    assert.equal(accessors[1].body.statements[0].expression.getText(now.source), 'super.name = name');
    assert.ok(!now.node.members.some(n => n.name?.text === '_updateColumnCssClassName'));
  } else if (name === 'MatLegacyHeaderCell' || name === 'MatLegacyFooterCell' || name === 'MatLegacyCell') {
    const oldCtor = row.node.members.find(ts.isConstructorDeclaration), ctor = now.node.members.find(ts.isConstructorDeclaration);
    assert.deepEqual(ctor.parameters.map(n => print(n, now.source)), oldCtor.parameters.map(n => print(n, row.source)));
    const body = print(ctor.body, now.source).replace('const cell = constructWithPublicDependencies', 'return constructWithPublicDependencies')
      .replace('    addLegacyColumnClass(columnDef, elementRef.nativeElement);\n', '').replace('    return cell;\n', '');
    assert.equal(body, print(oldCtor.body, row.source));
  }
}
assert.doesNotMatch(read(cellPath), /_columnCssClassName|_setNameInput|_updateColumnCssClassName|this\._name/);
assert.equal(read(modulePath).replace("import {_LegacyTableColumnClasses} from './internal/column-classes';\n", '')
  .replaceAll(', _LegacyTableColumnClasses]', ']'), old(modulePath));
const helper = parse(added, read(added));
assert.doesNotMatch(helper.text, /_columnCssClassName|_setNameInput|_updateColumnCssClassName/);
assert.match(helper.text, /new WeakSet<CdkColumnDef>\(\)/); assert.match(helper.text, /definition\.cssClassFriendlyName/);
assert.ok(!helper.text.includes('Map<') && !helper.text.includes('MatLegacyColumnDef'));
const spec = parse(specPath, read(specPath)), title = 'preserves legacy column classes on public CDK header, data and footer cells';
const removals = [];
function visit(n) {if (ts.isCallExpression(n) && n.expression.getText(spec) === 'it' && n.arguments[0]?.text === title) removals.push(n.parent); ts.forEachChild(n, visit);}
visit(spec); const fixture = spec.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MixedLegacyColumnCellsApp'); assert.ok(fixture); removals.push(fixture); assert.equal(removals.length, 2);
let retained = spec.text;
for (const n of removals.sort((a, b) => b.getFullStart() - a.getFullStart())) retained = retained.slice(0, n.getFullStart()) + retained.slice(n.end);
retained = retained.replace('        MixedLegacyColumnCellsApp,\n', '');
assert.equal(printer.printFile(parse(specPath, retained)), printer.printFile(parse(specPath, old(specPath))));
const paths = git(['ls-tree', '-r', '--name-only', worksheet.source_parent, 'projects/ngx-material-legacy']).toString().trim().split('\n');
const unchanged = [];
for (const path of paths.filter(p => ![cellPath, modulePath, specPath].includes(p))) {
  const bytes = readFileSync(join(root, path)); assert.deepEqual(bytes, git(['show', worksheet.source_parent + ':' + path])); unchanged.push({path, sha256: hash(bytes)});
}
const cyph = '/home/parallels/cyph';
const consumerPaths = execFileSync('rg', ['-l', 'matColumnDef|MatLegacyColumnDef|MatColumnDef', 'shared/js', '-g', '*.ts', '-g', '*.html'], {cwd: cyph, encoding: 'utf8'}).trim().split('\n').filter(Boolean);
const consumers = consumerPaths.map(path => {const text = readFileSync(join(cyph, path), 'utf8'); assert.doesNotMatch(text, /extends\s+(?:MatLegacyColumnDef|MatColumnDef)|_updateColumnCssClassName|_columnCssClassName/); return {path, sha256: hash(text)};});
const changed = [cellPath, modulePath, specPath].map(path => ({path, before_sha256: hash(old(path)), candidate_sha256: hash(read(path))}));
const report = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent, changed,
  added: [{path: added, sha256: hash(read(added))}], unchanged_product_members: unchanged,
  unchanged_styles: unchanged.filter(r => /\.(?:css|scss)$/.test(r.path)).length,
  unchanged_templates: unchanged.filter(r => r.path.endsWith('.html')).length,
  preserved: ['All existing selectors/host/provider metadata, constructor arguments and sticky code.',
    'All existing historical test programs; one additive mixed-CDK regression/fixture.',
    'All other library files and all product templates/CSS/SCSS; no consumer edits.'],
  permitted_TypeScript_change: 'Remove owned overrides/calls of docs-private planned-change CDK hooks; inherited private/protected upstream declarations remain upstream-owned. Public column name/constructor/input contracts and final class output are preserved.',
  cyph: {head: execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'rev-parse', 'HEAD'], {cwd: cyph, encoding: 'utf8'}).trim(), read_only: true, consumers, private_hook_or_subclass_uses: 0},
  producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))),
  unexecuted: ['Actual Angular module/node/mixed-cell integration regression; deferred final Actions.'], g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: worksheet.line, preserved_classes: before.size, unchanged_styles: report.unchanged_styles,
  unchanged_templates: report.unchanged_templates, cyph_consumers: consumers.length}));
