/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Resolve actual selected RxJS call overloads; imported symbol tags merge unrelated overloads. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve, relative} from 'node:path';
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
const bindings = JSON.parse(readBound(prefix + 'public-binding-qualified.json'));
for (const ref of bindings.source_bindings) assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);
assert.ok(bindings.flagged_named_uses.every(row => row.specifier.startsWith('rxjs') && !row.underscore_or_private_spelling));
const paths = {};
for (const record of bindings.self_entrypoint_bindings_not_compiled) {
  const candidate = 'projects/ngx-material-legacy/' + record.specifier.slice('@ngx-compat/material-legacy/'.length) + '/index.ts';
  assert.ok(existsSync(resolve(root, candidate)), candidate);
  readBound(candidate); paths[record.specifier] = [resolve(root, candidate)];
}
const sourcePaths = [...new Set(bindings.observations.map(row => row.path))];
const flaggedNames = new Set(bindings.flagged_named_uses.map(row => row.imported_name));
const options = {strict: true, strictPropertyInitialization: false, experimentalDecorators: true,
  skipLibCheck: false, noEmit: true, types: [], target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], paths};
const started = performance.now(), host = ts.createCompilerHost(options);
host.writeFile = () => assert.fail('Selected signature inspection emits no files');
const program = ts.createProgram(sourcePaths.map(path => resolve(root, path)), options, host);
const checker = program.getTypeChecker(), observations = [];
for (const path of sourcePaths) {
  const source = program.getSourceFile(resolve(root, path)); assert.ok(source, path);
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const symbol = checker.getSymbolAtLocation(node.expression);
      const target = symbol && (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
      if (target && flaggedNames.has(target.name) && target.declarations?.some(d =>
        /\/rxjs\/dist\/types\//.test(d.getSourceFile().fileName))) {
        const signature = checker.getResolvedSignature(node); assert.ok(signature, node.getText(source));
        const declaration = signature.getDeclaration(); assert.ok(declaration);
        assert.match(declaration.getSourceFile().fileName, /\/rxjs\/dist\/types\//);
        const tags = ts.getJSDocTags(declaration).filter(tag => tag.tagName.text === 'deprecated');
        observations.push({path, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          function: target.name, call: node.getText(source),
          selected_declaration: {path: relative(root, declaration.getSourceFile().fileName),
            line: declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1,
            signature: declaration.getText()},
          deprecated: tags.length > 0,
          deprecation: tags.map(tag => typeof tag.comment === 'string' ? tag.comment : ts.getTextOfJSDocComment(tag.comment))});
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
assert.ok(observations.length > 20);
for (const source of program.getSourceFiles()) assert.equal(readBound(source.fileName).toString(), source.text);
for (const [path, ref] of bound) {
  const raw = readFileSync(path); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const flagged = observations.filter(row => row.deprecated);
const report = {schema_version: 1, line: '21.x', sha: bindings.sha, node: process.version,
  typescript: ts.version, versions: bindings.versions, options, seconds: (performance.now() - started) / 1000,
  imported_overload_tag_flags: bindings.flagged_named_uses.length, actual_calls: observations.length,
  observations, selected_deprecated_calls: flagged,
  scope: 'Actual owned source call expressions and self-entrypoint source paths inspected with the actual installed compiler/declarations. Only selected RxJS overloads are classified;whole-program diagnostics deliberately not collected and no complete source typecheck,behavior,Node/Rx floor,native/packed or application execution is claimed.',
  product_changes: 0, canonical_dispositions_changed: 0,
  whole_SHA_substantive_review_complete: false, actual_native_packed_browser_floor_or_full_audit_qualified: false,
  g11_claim: 'not-passed', source_bindings: [...bound.values()]};
writeFileSync(prefix + 'rx-signature-qualified.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'actual-rx-selected-signature-diagnostic', imported_overload_flags: bindings.flagged_named_uses.length,
  actual_calls: observations.length, selected_deprecated_calls: flagged.length, seconds: report.seconds,
  whole_program_typecheck_claimed: false, whole_SHA_qualified: false}));
