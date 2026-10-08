/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ORIGINAL_PATH = 'reference/material-16.2.14/error-helper-sources/coercion-original.d.ts';
const ORIGINAL_SHA = 'ddf66648b065311cbc226d6585caa14b37f461698d525857aff60c988b66a6c9';
const SEED_SHA = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const NAMES = new Set(['BooleanInput', 'NumberInput']);

/** Inspect every finite frozen occurrence; no upstream runtime or floor claim. */
export function reviewOwnedCoercionInputTypes({root = defaultRoot, readSource, typescript} = {}) {
  const ts = typescript || createRequire(import.meta.url)('typescript');
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  const seedBytes = readFileSync(resolve(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(sha(seedBytes), SEED_SHA, 'frozen use population changed');
  const originalBytes = readFileSync(resolve(root, ORIGINAL_PATH));
  assert.equal(sha(originalBytes), ORIGINAL_SHA, 'untouched16 declarations changed');
  const sf = (name, text) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  const original = sf(ORIGINAL_PATH, originalBytes.toString('utf8'));
  const aliases = new Map(original.statements.filter(ts.isTypeAliasDeclaration)
    .filter(node => NAMES.has(node.name.text)).map(node => [node.name.text, node]));
  assert.equal(aliases.size, NAMES.size);
  function members(node, file) {
    assert.ok(ts.isUnionTypeNode(node.type), 'input alias must be a primitive union');
    return node.type.types.map(type => type.getText(file)).sort();
  }
  const expected = new Map([...aliases].map(([name, node]) => [name, members(node, original)]));
  const uses = JSON.parse(seedBytes).symbol_uses.filter(row =>
    row.module === '@angular/cdk/coercion' && NAMES.has(row.symbol));
  const files = new Map(), cases = [];
  const emit = text => ts.transpileModule(text, {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    experimentalDecorators: true, emitDecoratorMetadata: false,
  }}).outputText;
  for (const use of uses) {
    const path = 'projects/ngx-material-legacy/' + use.file;
    if (!files.has(path)) {
      const text = read(path), parsed = sf(path, text);
      assert.equal(parsed.parseDiagnostics.length, 0, 'invalid source syntax: ' + path);
      for (const node of parsed.statements.filter(ts.isImportDeclaration)) {
        if (node.moduleSpecifier.text !== '@angular/cdk/coercion') continue;
        const bindings = node.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            assert.ok(!NAMES.has((element.propertyName || element.name).text),
              'current compatibility alias imported: ' + path);
          }
        }
      }
      const local = parsed.statements.filter(ts.isTypeAliasDeclaration).filter(node => NAMES.has(node.name.text));
      const removed = [...local].sort((a, b) => b.getStart(parsed) - a.getStart(parsed))
        .reduce((body, node) => body.slice(0, node.getStart(parsed)) + body.slice(node.end), text);
      const compiled = emit(text), withoutTypes = emit(removed);
      assert.equal(compiled, withoutTypes, 'type-only ownership changed runtime emit: ' + path);
      files.set(path, {text, parsed, local, cap: {path, sha256: sha(text), bytes: Buffer.byteLength(text),
        emit_sha256: sha(compiled), emit_without_aliases_sha256: sha(withoutTypes)}});
    }
    const file = files.get(path), nodes = file.local.filter(node => node.name.text === use.symbol);
    assert.equal(nodes.length, 1, 'missing or duplicate owned alias: ' + use.file + ':' + use.symbol);
    const node = nodes[0];
    assert.ok(!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export), 'owned alias must stay unexported');
    assert.deepEqual(members(node, file.parsed), expected.get(use.symbol), 'original union changed: ' + use.file);
    const referenceLines = [];
    function visit(item) {
      if (ts.isIdentifier(item) && item.text === use.symbol && item !== node.name) {
        assert.ok(ts.isTypeReferenceNode(item.parent) && item.parent.typeName === item,
          'alias has a runtime or unsupported reference: ' + use.file);
        referenceLines.push(file.parsed.getLineAndCharacterOfPosition(item.getStart(file.parsed)).line + 1);
      }
      ts.forEachChild(item, visit);
    }
    visit(file.parsed);
    cases.push({...use, candidate_source_sha256: file.cap.sha256,
      alias_line: file.parsed.getLineAndCharacterOfPosition(node.getStart(file.parsed)).line + 1,
      declaration: node.getText(file.parsed), primitive_members: members(node, file.parsed),
      reference_lines: referenceLines, type_text: node.type.getText(file.parsed)});
  }

  // Compile the actual captured declarations with strict nullability. Both
  // assignment directions and valid literals must pass; two wrong values per
  // occurrence must fail exactly where expected. No Angular class is compiled.
  const fixture = resolve(root, '__owned_coercion_type_diagnostic__.ts');
  const lines = [...aliases].map(([name, node]) => `type Original${name} = ${node.type.getText(original)};`);
  const wrongLines = new Map();
  cases.forEach((item, index) => {
    const name = 'Owned' + index, originalName = 'Original' + item.symbol;
    lines.push(`type ${name} = ${item.type_text};`,
      `declare const old${index}:${originalName};const forward${index}:${name}=old${index};`,
      `declare const own${index}:${name};const backward${index}:${originalName}=own${index};`,
      `const valid${index}:${name}[]=${item.symbol === 'BooleanInput' ? "['false',true,false,null,undefined]" : "['3',3,null,undefined]"};`);
    lines.push(`const wrongPrimitive${index}:${name}=${item.symbol === 'BooleanInput' ? '7' : 'false'};`);
    wrongLines.set(lines.length, index);
    lines.push(`const wrongObject${index}:${name}={};`); wrongLines.set(lines.length, index);
  });
  const options = {strict: true, noEmit: true, types: [], lib: ['lib.es2022.d.ts'],
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext};
  const host = ts.createCompilerHost(options), hostRead = host.readFile.bind(host);
  host.readFile = path => path === fixture ? lines.join('\n') : hostRead(path);
  const exists = host.fileExists.bind(host); host.fileExists = path => path === fixture || exists(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  assert.equal(diagnostics.length, wrongLines.size, 'strict type diagnostic coverage differs');
  for (const diagnostic of diagnostics) {
    assert.equal(diagnostic.code, 2322); assert.equal(diagnostic.file?.fileName, fixture);
    const line = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
    assert.ok(wrongLines.has(line), 'unexpected type error at ' + line);
    wrongLines.delete(line);
  }
  assert.equal(wrongLines.size, 0);
  return {schema_version: 1, role: 'Exact owned primitive-input type and erasure review;not runtime/packed/floor qualification',
    node: process.version, compiler: ts.version,
    frozen_uses: {sha256: SEED_SHA, count: JSON.parse(seedBytes).symbol_uses.length},
    original: {path: ORIGINAL_PATH, sha256: ORIGINAL_SHA, bytes: originalBytes.length},
    sources: [...files.values()].map(file => file.cap), cases: cases.map(({type_text, ...item}) => item),
    strict_type_checks: {mutual_assignments: cases.length * 2, valid_literal_groups: cases.length,
      rejected_values: cases.length * 2},
    limitations: ['Complete actual aliases/references and diagnostic runtime emits are inspected;other source/peer contracts are separate.',
      'Strict compilation covers extracted actual primitive declarations only;no Angular/AOT/templates/classes,packed or peer/runtime-floor claim.',
      'Emit uses TS6 diagnostic options with emitDecoratorMetadata:false;no current built library is reattributed.']};
}
