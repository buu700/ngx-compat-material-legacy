/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete original/minimum source authentication only; no component execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {SELECT_DETACH_SHA, SELECT_DETACH_PATCH, TABLE_ONPUSH_SHA, TABLE_ONPUSH_PATCH} from '../scripts/upstream-artifact-behavior-evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), json = path => JSON.parse(read(path));
const ref = path => ({path, sha256: hash(read(path))}), ts = createRequire(import.meta.url)('typescript');
const option = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null;
const line = json('projects/ngx-material-legacy/package.json').version.startsWith('21.') ? '21.x' : 'main';
const patches = [
  {sha: SELECT_DETACH_SHA, path: 'compatibility/rc/select-detach-upstream.diff', sha256: SELECT_DETACH_PATCH, files: 2, hunks: 4},
  {sha: TABLE_ONPUSH_SHA, path: 'compatibility/rc/table-onpush-original.patch', sha256: TABLE_ONPUSH_PATCH, files: 2, hunks: 8},
];
for (const patch of patches) {
  const bytes = read(patch.path), text = bytes.toString(); assert.equal(hash(bytes), patch.sha256);
  assert.equal(text.split('\n').filter(row => row.startsWith('diff --git ')).length, patch.files);
  assert.equal(text.split('\n').filter(row => row.startsWith('@@ ')).length, patch.hunks);
  if (option('--original-git')) {
    const actual = execFileSync('git', ['-c', 'remote.origin.promisor=false', '-c', 'extensions.partialClone=', '-c', 'gc.auto=0',
      '--git-dir=' + option('--original-git'), 'show', '--format=', '--binary', patch.sha]);
    assert.equal(text.slice(text.indexOf('diff --git ')), actual.toString());
  }
  patch.original_git_diff_reverified = Boolean(option('--original-git'));
}
const materialPath = 'compatibility/rc/material-public-subjects.json', remainingPath = 'compatibility/rc/remaining-identity-public-subjects.json';
assert.equal(hash(read(materialPath)), 'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3');
assert.equal(hash(read(remainingPath)), 'c3600dff7acf9eeb0a0bbd0fd893273e392592fc1bae06110fb792ffe673a8fc');
const material = json(materialPath), remaining = json(remainingPath), earlier = json('compatibility/rc/select-detach-peer-source-review.json');
const cache = new Map();
function source(branch, key) {
  const id = branch + ':' + key; if (cache.has(id)) return cache.get(id);
  const extra = remaining.subjects.find(row => row.line === branch).members.find(row => row.key === key);
  const base = material.subjects.find(row => row.line === branch).members.find(row => row.package + '/' + row.module_path === key);
  const member = extra?.path ? extra : base; assert.ok(member, id);
  const stored = read(member.path); assert.equal(hash(stored), member.stored_sha256);
  const bytes = gunzipSync(stored); assert.equal(hash(bytes), member.sha256); assert.equal(bytes.length, member.bytes);
  cache.set(id, bytes.toString()); return bytes.toString();
}
const scroll = [];
for (const subject of earlier.subjects) {
  const templateModule = source(subject.line, subject.select.path); assert.equal(hash(templateModule), subject.select.module_sha256);
  const sf = ts.createSourceFile(subject.select.path, templateModule, ts.ScriptTarget.Latest, true); assert.equal(sf.parseDiagnostics.length, 0);
  const templates = [], target = subject.line === 'original' ? 'MatLegacySelect' : 'MatSelect';
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(sf).endsWith('ɵɵngDeclareComponent') && ts.isObjectLiteralExpression(node.arguments[0])) {
      const fields = node.arguments[0].properties, type = fields.find(row => row.name?.getText(sf) === 'type'), template = fields.find(row => row.name?.getText(sf) === 'template');
      if (type?.initializer.getText(sf) === target) { assert.ok(ts.isStringLiteral(template.initializer)); templates.push(template.initializer.text); }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf); assert.equal(templates.length, 1); assert.equal(hash(templates[0]), subject.select.template_sha256); assert.ok(templates[0].includes('(detach)="close()"'));
  const classes = [];
  for (const prior of subject.runtime) {
    const text = source(subject.line, prior.path); assert.equal(hash(text), prior.module_sha256);
    const parsed = ts.createSourceFile(prior.path, text, ts.ScriptTarget.Latest, true);
    const klass = parsed.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === prior.class); assert.ok(klass);
    assert.equal(hash(klass.getText(parsed)), prior.class_sha256);
    for (const method of prior.methods) {
      const found = klass.members.filter(node => method.name === 'constructor' ? ts.isConstructorDeclaration(node) : ts.isMethodDeclaration(node) && node.name?.getText(parsed) === method.name);
      assert.equal(found.length, 1); assert.equal(found[0].getText(parsed), method.text);
    }
    classes.push({class: prior.class, source_key: prior.path, module_sha256: prior.module_sha256, class_sha256: prior.class_sha256,
      methods: prior.methods.map(row => ({name: row.name, sha256: hash(row.text)}))});
  }
  assert.equal(classes.length, 4);
  scroll.push({line: subject.line, template_sha256: subject.select.template_sha256, detach_binding_present: true, classes});
}
const tablePins = {main: ['22.1.7', '2bdeb437714a07914ccb8d2f749fd75d72b63da1ab4cc0c069f64e714c2a6ad4'],
  '21.x': ['21.2.14', 'ea8d99a22482768bab22e19aba83b2a1498be6be340e46991965f539036b6c11']};
const table = [];
for (const [branch, [version, digest]] of Object.entries(tablePins)) {
  const path = `compatibility/rc/table-public-module-sources/cdk-${version}-table.mjs`, bytes = read(path); assert.equal(hash(bytes), digest);
  const sf = ts.createSourceFile(path, bytes.toString(), ts.ScriptTarget.Latest, true), klass = sf.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'CdkTable');
  assert.equal(sf.parseDiagnostics.length, 0); assert.ok(klass);
  const methods = ['_observeRenderChanges', 'renderRows', '_updateNoDataRow'].map(name => {
    const method = klass.members.find(node => ts.isMethodDeclaration(node) && node.name?.getText(sf) === name); assert.ok(method);
    return {name, sha256: hash(method.getText(sf)), source: method.getText(sf)};
  });
  assert.match(methods[0].source, /this\.dataSource\.connect\(this\)/); assert.match(methods[0].source, /this\.renderRows\(\)/);
  assert.match(methods[1].source, /this\._updateNoDataRow\(\)/);
  assert.match(methods[2].source, /this\._isShowingNoDataRow = shouldShow;\s*this\._changeDetectorRef\.markForCheck\(\)/);
  table.push({line: branch, cdk_version: version, module: {path, sha256: digest}, methods});
}
const ownedTablePath = 'projects/ngx-material-legacy/legacy-table/table.ts', owned = ts.createSourceFile(ownedTablePath, read(ownedTablePath).toString(), ts.ScriptTarget.Latest, true);
const tableClass = owned.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'MatLegacyTable');
assert.equal(tableClass.heritageClauses[0].types[0].expression.getText(owned), 'CdkTable');
assert.ok(!tableClass.members.some(node => node.name && ['renderRows', '_updateNoDataRow', '_observeRenderChanges'].includes(node.name.getText(owned))));
const ownCallerPaths = [ownedTablePath, 'projects/ngx-material-legacy/legacy-table/row.ts', 'projects/ngx-material-legacy/legacy-table/table-module.ts',
  'projects/ngx-material-legacy/legacy-table/table-data-source.ts', 'projects/ngx-material-legacy/legacy-table/internal/table-data-source-base.ts',
  'projects/ngx-material-legacy/legacy-table/internal/table-outlet.ts', 'projects/ngx-material-legacy/legacy-select/select.html',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts', 'projects/ngx-material-legacy/legacy-select/select.ts'];
let cyph = null;
if (option('--cyph')) {
  const directory = option('--cyph');
  const result = execFileSync('rg', ['-l', 'mat-table|matNoDataRow|mat-select|MatLegacySelect', 'shared/js/cyph/components', '--glob', '*.ts', '--glob', '*.html'], {cwd: directory, encoding: 'utf8'});
  const files = result.trim().split('\n').filter(Boolean).sort();
  cyph = {read_only: true, head: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: directory, encoding: 'utf8'}).trim(),
    files: files.map(path => ({path, sha256: hash(readFileSync(join(directory, path)))})), consumer_build_executed: false,
    scope: 'Visible rg-discovered TS/HTML only; no ignored/generated/private/dynamic or full consumer qualification.'};
}
const output = {schema_version: 1, line, role: 'Entire original patches, authentic tagged/minimum sources and owned caller routes; static only', patches,
  capsules: [ref(materialPath), ref(remainingPath)], scroll, table, owned_callers: ownCallerPaths.map(ref),
  public_source_review: ref('compatibility/rc/select-detach-peer-source-review.json'), public_table_source_review: ref('compatibility/rc/table-public-module-import-source-proof.json'),
  cyph, actual_peer_constructor_or_Angular_packed_or_native_executed: false, g11_claim: 'not-passed',
  producer_sha256: hash(read('tests/dual_behavior_source_auth_probe.mjs'))};
if (option('--out')) writeFileSync(join(root, option('--out')), JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, original_patches: patches.length, total_original_hunks: patches.reduce((sum, row) => sum + row.hunks, 0),
  scroll_source_contexts: scroll.length, scroll_classes: scroll.reduce((sum, row) => sum + row.classes.length, 0), table_floor_methods: 6,
  owned_callers: ownCallerPaths.length, cyph_files: cyph?.files.length ?? null, actual_packed_executed: false}));
