/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const ts = createRequire(import.meta.url)('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const proof = JSON.parse(read('compatibility/rc/deferred-control-lifetime-source-proof.json'));
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const changed = new Set(proof.source_reviews_reopened.map(key));
assert.equal(changed.size, 27);
const rows = ['authored-dependency-dispositions', 'authored-dependency-current-dispositions']
  .flatMap(name => JSON.parse(read('compatibility/f10/' + name + '.json')).symbol_uses)
  .filter(row => changed.has(key(row)) || row.module === '@angular/cdk/a11y' && row.symbol === 'FocusMonitor');
assert.equal(rows.length, 43);
function binding(text, row) {
  const path = 'projects/ngx-material-legacy/' + row.file;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const specs = source.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === row.module
    && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
    .flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === row.symbol));
  let declaration, name, typeOnly = false, owned = false;
  if (specs.length) {
    assert.equal(specs.length, 1);
    declaration = specs[0]; name = declaration.name;
    typeOnly = !!declaration.isTypeOnly || !!declaration.parent.parent.isTypeOnly;
  } else {
    assert.equal(row.symbol, 'BooleanInput');
    declaration = source.statements.find(n => ts.isTypeAliasDeclaration(n) && n.name.text === row.symbol);
    assert.ok(declaration); name = declaration.name; typeOnly = true; owned = true;
    assert.equal(declaration.getText(source), 'type BooleanInput = string | boolean | null | undefined;');
  }
  const options = {noResolve: true, noLib: true}, host = ts.createCompilerHost(options);
  host.getSourceFile = p => p === resolve(root, path) ? source : undefined;
  const checker = ts.createProgram([resolve(root, path)], options, host).getTypeChecker();
  const symbol = checker.getSymbolAtLocation(name); assert.ok(symbol);
  const references = [];
  function visit(node) {
    if (ts.isIdentifier(node) && node !== name && checker.getSymbolAtLocation(node) === symbol) {
      references.push({node_kind: ts.SyntaxKind[node.parent.kind], expression: node.parent.getText(source),
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1});
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(references.length || row.file === 'legacy-slide-toggle/internal/slide-toggle-base.ts' && row.symbol === 'ViewChild',
    row.file + '#' + row.symbol + ' has no resolved references; only the pre-existing unused ViewChild import is allowed');
  return {local_name: name.text, type_only: typeOnly, owned_local_type: owned, references};
}
const comparisons = [];
for (const row of rows) {
  const path = 'projects/ngx-material-legacy/' + row.file, current = read(path);
  const parent = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', proof.source_parent + ':' + path],
    {cwd: root, encoding: 'utf8'});
  const before = binding(parent, row), after = binding(current, row);
  const roles = value => ({...value, references: value.references.map(({line, ...reference}) => reference)});
  assert.deepEqual(roles(after), roles(before), 'dependency import/type/call/decorator role changed outside the lifetime guards');
  if (changed.has(key(row))) {
    const prior = row.review_history.at(-1).source_review;
    const bytes = readFileSync(resolve(root, prior.path)); assert.equal(hash(bytes), prior.sha256);
    const receipt = JSON.parse(bytes).reviews.find(r => key(r) === key(row)); assert.ok(receipt);
    assert.equal(receipt.candidate_source_sha256, hash(parent));
  } else if (!row.file.endsWith('slide-toggle-base.ts')) assert.equal(current, parent);
  comparisons.push({file: row.file, module: row.module, symbol: row.symbol,
    prior_source_sha256: hash(parent), candidate_source_sha256: hash(current),
    source_binding: after, source_roles_identical_except_line_offsets: true,
    historical_review_requalified: changed.has(key(row))});
}
const target = rows.find(row => row.file.endsWith('slide-toggle-base.ts') && row.symbol === 'FocusMonitor');
const targetSource = read('projects/ngx-material-legacy/' + target.file);
for (const changed of [
  targetSource.replace('FocusMonitor, FocusOrigin', 'type FocusMonitor, FocusOrigin'),
  targetSource.replace('focusMonitor: FocusMonitor', 'focusMonitor: FocusOrigin'),
  targetSource + '\ntype UnreviewedFocusDependency = FocusMonitor;\n',
]) {
  assert.notEqual(changed, targetSource);
  assert.throws(() => assert.deepEqual(binding(changed, target), binding(targetSource, target)),
    error => error.code === 'ERR_ASSERTION');
}
const report = {schema_version: 1, line: proof.line, source_parent: proof.source_parent,
  comparisons, historical_rows: 27, focus_rows: 16, source_role_controls: 3,
  scope: 'Complete imported/local-replacement binding and resolved-reference comparison against actual parent source. Guard behavior is qualified separately by the lifetime diagnostic; historical receipts retain their original runtime subjects. No native/AOT/packed/compiler or runtime-floor qualification.',
  native_or_packed_qualified: false};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: proof.line, rows: 43, historical_rows: 27, focus_rows: 16, source_role_controls: 3}));
