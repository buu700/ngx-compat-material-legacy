/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Compile only authored external import/export declarations; inspect actual public symbols. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = process.cwd(), prefix = 'compatibility/rc/21x-base-class-removal-source-';
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex'), bound = new Map();
function readBound(path, expected) {
  const absolute = resolve(root, path), raw = readFileSync(absolute);
  if (expected) assert.equal(hash(raw), expected, path);
  const ref = {path: relative(root, absolute), sha256: hash(raw), bytes: raw.length};
  if (bound.has(absolute)) assert.deepEqual(bound.get(absolute), ref); else bound.set(absolute, ref);
  return raw;
}
assert.equal(process.version, 'v24.21.0'); assert.equal(ts.version, '5.9.2');
readBound(fileURLToPath(import.meta.url)); readBound(require.resolve('typescript'));
const closure = JSON.parse(readBound(prefix + 'owned-closure-supplement.json'));
for (const ref of closure.source_bindings) assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);
const versions = {};
for (const [name, expected] of [['@angular/core', '21.2.23'], ['@angular/material', '21.2.14'],
  ['@angular/cdk', '21.2.14'], ['typescript', '5.9.2']]) {
  const version = JSON.parse(readBound('node_modules/' + name + '/package.json')).version;
  assert.equal(version, expected, name); versions[name] = version;
}
versions.rxjs = JSON.parse(readBound('node_modules/rxjs/package.json')).version;
const selfBindings = closure.external_bindings.filter(b => b.specifier.startsWith('@ngx-compat/material-legacy'));
const external = closure.external_bindings.filter(b => !b.specifier.startsWith('@ngx-compat/material-legacy'));
const virtual = new Map(), records = [];
for (const binding of external) {
  const path = join(root, prefix + 'virtual-public-binding-' + records.length + '.ts');
  const body = binding.declaration + '\nexport {};\n';
  virtual.set(path, body); records.push({...binding, virtual_path: path});
}
const options = {strict: true, skipLibCheck: false, noEmit: true, types: [],
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
const host = ts.createCompilerHost(options), actualRead = host.readFile.bind(host), actualExists = host.fileExists.bind(host);
host.readFile = path => virtual.get(resolve(path)) ?? actualRead(path);
host.fileExists = path => virtual.has(resolve(path)) || actualExists(path);
host.getSourceFile = (path, languageVersion) => {
  const body = host.readFile(path); return body === undefined ? undefined : ts.createSourceFile(path, body, languageVersion, true);
};
host.writeFile = () => assert.fail('Import declaration probe must not emit');
const started = performance.now(), program = ts.createProgram([...virtual.keys()], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program).map(d => ({code: d.code,
  file: d.file ? relative(root, d.file.fileName) : null,
  message: ts.flattenDiagnosticMessageText(d.messageText, '\n')}));
assert.deepEqual(diagnostics, [], JSON.stringify(diagnostics));
const checker = program.getTypeChecker(), observations = [];
for (const record of records) {
  const source = program.getSourceFile(record.virtual_path), declaration = source.statements[0];
  const module = checker.getSymbolAtLocation(declaration.moduleSpecifier); assert.ok(module, record.specifier);
  const exports = checker.getExportsOfModule(module);
  const clause = ts.isImportDeclaration(declaration) ? declaration.importClause?.namedBindings : declaration.exportClause;
  if (!clause || ts.isNamespaceImport(clause)) {
    observations.push({...record, virtual_path: relative(root, record.virtual_path),
      kind: 'namespace-or-side-effect', named_symbols: [], namespace_member_use_qualified: false}); continue;
  }
  assert.ok(ts.isNamedImports(clause) || ts.isNamedExports(clause));
  const symbols = clause.elements.map(element => {
    const name = (element.propertyName || element.name).text;
    const exported = exports.find(symbol => symbol.name === name); assert.ok(exported, name);
    const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const aliasTags = exported.getJsDocTags(checker), targetTags = target.getJsDocTags(checker);
    const declarations = (target.declarations || []).map(node => ({path: relative(root, node.getSourceFile().fileName),
      kind: ts.SyntaxKind[node.kind], line: node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1}));
    assert.ok(declarations.length, name);
    return {imported_name: name, local_name: element.name.text,
      deprecated: [...aliasTags, ...targetTags].some(tag => tag.name === 'deprecated'),
      deprecation_tags: [...aliasTags, ...targetTags].filter(tag => tag.name === 'deprecated'),
      underscore_or_private_spelling: /^_|^ɵ/.test(name), declarations};
  });
  observations.push({...record, virtual_path: relative(root, record.virtual_path), kind: 'named', named_symbols: symbols});
}
for (const source of program.getSourceFiles()) if (!virtual.has(resolve(source.fileName)))
  assert.equal(readBound(source.fileName).toString(), source.text);
for (const [path, ref] of bound) {
  const raw = readFileSync(path); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const flagged = observations.flatMap(row => row.named_symbols.filter(s => s.deprecated || s.underscore_or_private_spelling)
  .map(symbol => ({path: row.path, specifier: row.specifier, ...symbol})));
const report = {schema_version: 1, line: '21.x', sha: closure.sha, node: process.version, versions,
  options, seconds: (performance.now() - started) / 1000, diagnostics,
  external_declarations: records.length, named_symbol_uses: observations.reduce((n, row) => n + row.named_symbols.length, 0),
  observations, flagged_named_uses: flagged, self_entrypoint_bindings_not_compiled: selfBindings,
  scope: 'Only actual authored external import/export declaration text compiled;actual peer declarations resolved and hashed. This proves export availability and records alias/target deprecation metadata,not full owner class typing,all namespace member usage,behavior,planned-removal policy outside declarations,DI or Rx/Node floors.',
  all_external_import_declarations_typecheck: true, deprecated_or_private_flags_require_individual_judgment: true,
  product_changes: 0, canonical_dispositions_changed: 0,
  whole_SHA_substantive_review_complete: false, actual_native_packed_browser_floor_or_full_audit_qualified: false,
  g11_claim: 'not-passed', source_bindings: [...bound.values()]};
writeFileSync(prefix + 'public-binding-qualified.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'actual-public-import-binding-diagnostic', external_declarations: records.length,
  named_symbol_uses: report.named_symbol_uses, flagged_named_uses: flagged.length,
  namespace_or_side_effect_declarations: observations.filter(o => o.kind !== 'named').length,
  self_entrypoint_declarations: selfBindings.length, seconds: report.seconds, whole_SHA_qualified: false}));
