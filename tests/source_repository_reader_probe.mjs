/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** The shipped raw reader must satisfy the real source graph resolver contract. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, lstatSync, symlinkSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {componentConfigGraph} from '../scripts/component-config-caller-contracts.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const path = 'scripts/check-upstream-audit-disposition.mjs', current = readFileSync(join(root, path), 'utf8');
const worksheet = JSON.parse(readFileSync(join(root, 'compatibility/rc/packed-upstream-source-worksheet.json')));
const previous = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show', worksheet.source_checkpoint + ':' + path],
  {cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
function model(text) {
  const name = join(root, path), source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(source.parseDiagnostics.length, 0);
  const compilerOptions = {noLib: true, allowJs: true, checkJs: true};
  const host = ts.createCompilerHost(compilerOptions);
  host.getSourceFile = filename => filename === name ? source : undefined;
  const checker = ts.createProgram([name], compilerOptions, host).getTypeChecker();
  const declaration = source.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations)
    .find(n => n.name.getText(source) === 'currentSymbolAdmission');
  const options = declaration.initializer.arguments[0];
  const reader = options.properties.find(n => n.name?.getText(source) === 'readMember').initializer;
  return {source, checker, reader};
}
const actual = model(current);
const definition = actual.source.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === 'readRegularRepoBytes');
assert.ok(definition);
function assertWiring(text) {
  const value = model(text); assert.ok(ts.isIdentifier(value.reader));
  const declarations = value.checker.getSymbolAtLocation(value.reader)?.declarations;
  assert.equal(declarations?.length, 1);
  assert.ok(ts.isFunctionDeclaration(declarations[0]) && declarations[0].name.text === 'readRegularRepoBytes');
}
assertWiring(current);
const wrongWire = current.replace('readMember: readRegularRepoBytes', 'readMember: () => null');
assert.notEqual(wrongWire, current); assert.throws(() => assertWiring(wrongWire));
const old = model(previous);
const oldDefinition = old.source.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === 'regularRepoMember');
const owned = mkdtempSync(join(tmpdir(), 'ngx-source-reader-'));
const make = code => new Function('root', 'join', 'lstatSync', 'readFileSync', code)(owned, join, lstatSync, readFileSync);
const read = make(definition.getText(actual.source) + '\nreturn readRegularRepoBytes;');
const oldRead = make(oldDefinition.getText(old.source) + '\nreturn (' + old.reader.getText(old.source) + ');');
let report;
try {
  const folder = 'projects/ngx-material-legacy/legacy-dialog'; mkdirSync(join(owned, folder), {recursive: true});
  const owner = folder + '/reader-owner.ts', dependency = folder + '/dialog-animation-params.ts';
  writeFileSync(join(owned, owner), "import {duration} from './dialog-animation-params';\nexport const value = duration;\n");
  writeFileSync(join(owned, dependency), 'export const duration = 1;\n');
  assert.equal(Buffer.isBuffer(read(owner)), true);
  assert.equal(read(owner).equals(readFileSync(join(owned, owner))), true);
  const missing = folder + '/dialog-animation-params/index.ts';
  assert.equal(oldRead(missing), null);
  assert.throws(() => read(missing), error => error.code === 'ENOENT');
  const selected = [{original_row: {file: 'legacy-dialog/reader-owner.ts'}}];
  assert.throws(() => componentConfigGraph({root: owned, selected, read: oldRead}), /missing configuration caller dependency/);
  const graph = componentConfigGraph({root: owned, selected, read});
  assert.deepEqual([...graph.sources.keys()], [owner, dependency]);
  assert.equal(graph.edges.length, 1); assert.equal(graph.edges[0].to, dependency);

  const controls = [];
  for (const invalid of ['', '../escape', '/absolute.ts', './dot.ts', 'a//b.ts', 'a/../b.ts', 'a\\b.ts', 12]) {
    assert.throws(() => read(invalid), error => error.code !== 'ENOENT');
    controls.push({id: 'unsafe-' + String(invalid), rejected: true});
  }
  assert.throws(() => read(folder), error => error.code !== 'ENOENT');
  controls.push({id: 'directory-is-not-a-source-file', rejected: true});
  symlinkSync(join(owned, dependency), join(owned, folder, 'linked.ts'));
  symlinkSync(join(owned, folder), join(owned, 'linked-directory'));
  for (const path of [folder + '/linked.ts', 'linked-directory/reader-owner.ts']) {
    assert.throws(() => read(path), error => error.code !== 'ENOENT');
    controls.push({id: 'symlink-' + path, rejected: true});
  }
  // A blocked symlink must not masquerade as missing and select an alternate file.
  mkdirSync(join(owned, folder, 'linked')); writeFileSync(join(owned, folder, 'linked/index.ts'), 'export const duration = 2;\n');
  writeFileSync(join(owned, owner), "import {duration} from './linked';\nexport const value = duration;\n");
  assert.throws(() => componentConfigGraph({root: owned, selected, read}), /symlink in source member/);
  controls.push({id: 'unsafe-primary-candidate-does-not-fall-back', rejected: true});
  report = {schema_version: 1, line: worksheet.line, passed: true, actual_root_reader_wired: true,
    before_null_reader_reproduces_actual_graph_failure: true, after_strict_reader_resolves_actual_graph: true,
    negative_controls: controls.length, controls, source_parser: ts.version,
    source_members: [path, 'scripts/component-config-caller-contracts.mjs', 'tests/source_repository_reader_probe.mjs',
      'tests/test_source_repository_reader.py'].map(path => ({path, sha256: hash(readFileSync(join(root, path)))})),
    product_or_runtime_qualification: false, g11_claim: 'not-passed'};
} finally { rmSync(owned, {recursive: true, force: true}); }
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, controls: undefined, source_members: undefined}));
