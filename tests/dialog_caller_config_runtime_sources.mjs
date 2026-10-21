/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Two isolated complete owned graphs; peer SDK sources are never rewritten. */
import assert from 'node:assert/strict';
import {writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, dirname, posix} from 'node:path';
import {pathToFileURL} from 'node:url';
const ts = createRequire(import.meta.url)('typescript');

export function emitDialogConfiguration({model, source, side, oldProgram}) {
  assert.equal(model.line, source.prior.line, 'owned graph on the wrong peer line');
  assert.ok(['before', 'candidate'].includes(side));
  const folder = join(model.root, side), roots = [];
  for (const [path, text] of source.sources) {
    const target = join(folder, path);
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, text);
    roots.push(target);
  }
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, experimentalDecorators: true,
    emitDecoratorMetadata: true, strict: true, strictPropertyInitialization: false,
    noImplicitOverride: true, skipLibCheck: false, types: [], rootDir: folder, outDir: folder,
    paths: Object.fromEntries([...source.routes].map(([specifier, path]) => [specifier, [join(folder, path)]]))};
  const program = ts.createProgram({rootNames: roots, options, oldProgram});
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics,
    {getCanonicalFileName: path => path, getCurrentDirectory: () => folder, getNewLine: () => '\n'}));
  const plain = new Map(), outputs = new Map(), metadataPath = 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts';
  const emitted = program.emit(undefined, (filename, text, bom, error, inputs) => {
    if (!filename.endsWith('.js')) return;
    assert.equal(inputs.length, 1);
    const path = inputs[0].fileName.slice(folder.length + 1);
    assert.ok(source.sources.has(path));
    plain.set(path, text);
    const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true), edits = [];
    assert.equal(sf.parseDiagnostics.length, 0);
    for (const statement of sf.statements) {
      if (!(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) || !statement.moduleSpecifier) continue;
      const specifier = statement.moduleSpecifier.text;
      let replacement;
      if (specifier.startsWith('.')) {
        const edges = source.edges.filter(edge => edge.from === path && edge.specifier === specifier);
        assert.equal(new Set(edges.map(edge => edge.to)).size, 1, 'unrecorded owned relative edge');
        replacement = posix.relative(posix.dirname(path), edges[0].to.replace(/\.ts$/, '.mjs'));
        if (!replacement.startsWith('.')) replacement = './' + replacement;
      } else if (source.routes.has(specifier)) {
        replacement = pathToFileURL(join(folder, source.routes.get(specifier).replace(/\.ts$/, '.mjs'))).href;
      } else if (specifier === '@angular/core' && path === metadataPath) {
        replacement = pathToFileURL(join(folder, 'observed-core.mjs')).href;
      }
      if (replacement) edits.push({start: statement.moduleSpecifier.getStart(sf), end: statement.moduleSpecifier.end,
        text: JSON.stringify(replacement)});
    }
    for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    const target = join(folder, path.replace(/\.ts$/, '.mjs'));
    writeFileSync(target, text);
    outputs.set(path, text);
  });
  assert.equal(emitted.emitSkipped, false);
  assert.equal(outputs.size, 49);
  writeFileSync(join(folder, 'observed-core.mjs'), `
import * as core from '@angular/core';
export * from '@angular/core';
export const parameterTokens = new WeakMap();
export function Inject(token) {
  const decorate = core.Inject(token);
  return (target,key,index) => {
    const values=parameterTokens.get(target)??new Map();
    values.set(index,token);parameterTokens.set(target,values);
    return decorate(target,key,index);
  };
}
`);
  return {program, options, plain, outputs, source_files: outputs.size,
    emitDecoratorMetadata: true, observed_public_Inject_source_files: [metadataPath],
    SDK_rewrites: false};
}
