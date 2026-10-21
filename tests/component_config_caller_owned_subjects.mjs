/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete current semantic emits; decorator capture is an explicit test metadata protocol. */
import assert from 'node:assert/strict';
import {writeFileSync, mkdirSync, symlinkSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, dirname, posix} from 'node:path';
import {pathToFileURL} from 'node:url';

const ts = createRequire(import.meta.url)('typescript');
const prefix = 'projects/ngx-material-legacy/';
export const COMPONENT_CONFIG_METADATA_PORT_FILES = [
  'legacy-snack-bar/snack-bar-module.ts', 'legacy-tooltip/tooltip-module.ts',
  'legacy-autocomplete/autocomplete-module.ts', 'legacy-paginator/paginator-module.ts',
  'legacy-select/select-module.ts', 'legacy-select/select.ts', 'legacy-radio/radio.ts',
  'legacy-list/list.ts',
].map(path => prefix + path);

export function emitComponentConfigOwned({model, source, overrides = new Map()}) {
  assert.equal(model.line, source.prior.line, 'current owned source executed on a different SDK line');
  const roots = [];
  for (const [path, text] of source.sources) {
    const target = join(model.root, path);
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, overrides.get(path) ?? text);
    roots.push(target);
  }
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, experimentalDecorators: true,
    emitDecoratorMetadata: false, strict: true, strictPropertyInitialization: false,
    noImplicitOverride: true, skipLibCheck: false, types: [], rootDir: model.root, outDir: model.root,
    paths: Object.fromEntries([...source.routes].map(([specifier, path]) => [specifier, [join(model.root, path)]]))};
  const program = ts.createProgram(roots, options), diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics,
    {getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
  const plain = new Map(), outputs = new Map();
  function prepare(path, text) {
    const parsed = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true), edits = [];
    assert.equal(parsed.parseDiagnostics.length, 0);
    for (const statement of parsed.statements) {
      if (!(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) || !statement.moduleSpecifier) continue;
      const specifier = statement.moduleSpecifier.text;
      let replacement;
      if (specifier.startsWith('.')) {
        const edges = source.edges.filter(edge => edge.from === path && edge.specifier === specifier);
        assert.ok(edges.length > 0, 'unrecorded runtime edge ' + path + ':' + specifier);
        assert.equal(new Set(edges.map(edge => edge.to)).size, 1);
        replacement = posix.relative(posix.dirname(path), edges[0].to.replace(/\.ts$/, '.mjs'));
        if (!replacement.startsWith('.')) replacement = './' + replacement;
      } else if (specifier === '@angular/core' && COMPONENT_CONFIG_METADATA_PORT_FILES.includes(path)) {
        replacement = pathToFileURL(join(model.root, 'owned-decorator-core.mjs')).href;
      }
      if (replacement) edits.push({start: statement.moduleSpecifier.getStart(parsed),
        end: statement.moduleSpecifier.end, text: JSON.stringify(replacement)});
    }
    for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    return text;
  }
  const result = program.emit(undefined, (filename, text, bom, error, sources) => {
    if (!filename.endsWith('.js')) return;
    assert.equal(sources.length, 1);
    const path = sources[0].fileName.slice(model.root.length + 1);
    assert.ok(source.sources.has(path));
    const target = join(model.root, path.replace(/\.ts$/, '.mjs')), output = prepare(path, text);
    writeFileSync(target, output);
    plain.set(path, text);
    outputs.set(target, output);
  });
  assert.equal(result.emitSkipped, false);
  assert.equal(outputs.size, 200);
  writeFileSync(join(model.root, 'owned-decorator-core.mjs'), `
import * as core from '@angular/core';
export * from '@angular/core';
export const capturedDecorators = new WeakMap();
function observed(kind, factory) {
  return metadata => {
    const decorate = factory(metadata);
    return type => {
      const row = capturedDecorators.get(type) ?? {};
      row[kind] = metadata;
      capturedDecorators.set(type, row);
      return decorate(type);
    };
  };
}
export const NgModule = observed('NgModule', core.NgModule);
export const Directive = observed('Directive', core.Directive);
export const Component = observed('Component', core.Component);
`);
  const folder = join(model.root, prefix);
  const exports = Object.fromEntries([...source.routes].map(([specifier, target]) =>
    ['./' + specifier.slice('@ngx-compat/material-legacy/'.length),
      './' + target.slice(prefix.length).replace(/\.ts$/, '.mjs')]));
  writeFileSync(join(folder, 'package.json'), JSON.stringify({name: '@ngx-compat/material-legacy', type: 'module', exports}));
  mkdirSync(join(model.root, 'node_modules/@ngx-compat'), {recursive: true});
  symlinkSync(folder, join(model.root, 'node_modules/@ngx-compat/material-legacy'), 'dir');
  return {program, options, outputs, plain, prepare, source_files: 200,
    metadata_protocol_files: [...COMPONENT_CONFIG_METADATA_PORT_FILES],
    complete_raw_source_types: true, generated_factory_template_or_query_execution: false};
}
