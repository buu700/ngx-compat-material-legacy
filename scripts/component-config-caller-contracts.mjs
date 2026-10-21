/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite remaining component configuration roles; no canonical writes or runtime credit. */
import assert from 'node:assert/strict';
import {readFileSync, lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join, posix} from 'node:path';

const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const raw = root => path => {
  let cursor = root;
  for (const part of path.split('/')) {
    assert.ok(part && part !== '.' && part !== '..');
    cursor = join(cursor, part);
    assert.equal(lstatSync(cursor).isSymbolicLink(), false);
  }
  assert.ok(lstatSync(cursor).isFile());
  return readFileSync(cursor);
};
const pins = {main: '3c12b3538e4d5d1fc307f1f58f911fce7d2045763c0518b6233fc61d01a6e0f6', '21.x': '3754c37913758aae0c5b9af9981b79ff7956551229ff78994fbcffaf4de547d5'};
const authenticated = new Set();
export const COMPONENT_CONFIG_PRIOR = 'compatibility/rc/component-config-caller-prior.json.gz';
export const COMPONENT_CONFIG_MODULES = ['autocomplete', 'checkbox', 'list', 'paginator',
  'progress-bar', 'progress-spinner', 'radio', 'select', 'snack-bar', 'tooltip']
  .map(name => '@angular/material/' + name);

function original(root, parent, member) {
  const key = JSON.stringify([root, parent, member.path, member.sha256]);
  if (authenticated.has(key)) return;
  const bytes = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0',
    '-c', 'maintenance.auto=0', 'show', parent + ':' + member.path],
  {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
  assert.equal(hash(bytes), member.sha256, 'unauthenticated configuration input ' + member.path);
  assert.equal(bytes.length, member.bytes);
  authenticated.add(key);
}

/** Shared discovery used by acquisition and verification; all current source bytes are retained. */
export function componentConfigGraph({root = process.cwd(), selected, read = raw(root)}) {
  const sources = new Map(), routes = new Map(), metadata = [], edges = [], peers = new Set();
  function visit(path) {
    if (sources.has(path)) return;
    const text = read(path).toString();
    sources.set(path, text);
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(source.parseDiagnostics.length, 0);
    function edge(specifier) {
      let target;
      if (specifier.startsWith('@ngx-compat/material-legacy/')) {
        const suffix = specifier.slice('@ngx-compat/material-legacy/'.length);
        assert.ok(suffix && !suffix.split('/').includes('..'));
        const folder = 'projects/ngx-material-legacy/' + suffix, path = folder + '/ng-package.json';
        const bytes = read(path), config = JSON.parse(bytes);
        target = posix.normalize(posix.join(folder, config.lib.entryFile));
        assert.ok(target.startsWith(folder + '/'));
        if (!routes.has(specifier)) metadata.push({specifier, path, sha256: hash(bytes),
          bytes: bytes.length, entry: target});
        routes.set(specifier, target);
      } else if (specifier.startsWith('.')) {
        const base = posix.normalize(posix.join(posix.dirname(path), specifier));
        assert.ok(base.startsWith('projects/ngx-material-legacy/'));
        const candidates = [];
        for (const path of [base, base + '.ts', base + '/index.ts']) {
          if (!path.endsWith('.ts')) continue;
          try {read(path); candidates.push(path);} catch (error) {
            if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
          }
        }
        assert.equal(candidates.length, 1, 'missing configuration caller dependency ' + specifier);
        target = candidates[0];
      } else {peers.add(specifier); return;}
      edges.push({from: path, specifier, to: target});
      visit(target);
    }
    for (const statement of source.statements) {
      if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier) {
        edge(statement.moduleSpecifier.text);
      }
    }
    function nested(node) {
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        edge(node.argument.literal.text);
      }
      assert.ok(!(ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword),
        'unqualified dynamic configuration caller dependency');
      ts.forEachChild(node, nested);
    }
    nested(source);
  }
  for (const row of selected) visit('projects/ngx-material-legacy/' + row.original_row.file);
  return {sources, routes, metadata, edges, peers: [...peers].sort()};
}

export function componentConfigPrior({root = process.cwd(), read = raw(root)} = {}) {
  const bytes = read(COMPONENT_CONFIG_PRIOR), line = Object.keys(pins).find(key => pins[key] === hash(bytes));
  assert.ok(line, 'changed component configuration capture');
  const prior = JSON.parse(gunzipSync(bytes));
  assert.equal(prior.line, line);
  assert.equal(prior.selected.length, 73);
  assert.equal(prior.selected.filter(row => row.ledger.endsWith('/authored-dependency-dispositions.json')).length, 44);
  assert.equal(new Set(prior.selected.map(row => JSON.stringify([row.original_row.file,
    row.original_row.module, row.original_row.symbol]))).size, 73);
  for (const selected of prior.selected) {
    assert.ok(COMPONENT_CONFIG_MODULES.includes(selected.original_row.module));
    assert.equal(selected.original_row.disposition, 'open');
  }
  for (const member of [...prior.sources, ...prior.graph, ...prior.metadata, ...prior.ledgers, prior.alias_allowlist]) {
    if (member.text !== undefined) {
      assert.equal(hash(member.text), member.sha256);
      assert.equal(Buffer.byteLength(member.text), member.bytes);
    }
    original(root, prior.source_parent, member);
  }
  return prior;
}

export function componentConfigSource({root = process.cwd(), read = raw(root)} = {}) {
  const prior = componentConfigPrior({root, read});
  for (const member of [...prior.sources, prior.alias_allowlist]) {
    assert.equal(hash(read(member.path)), member.sha256, 'changed raw configuration caller ' + member.path);
  }
  const graph = componentConfigGraph({root, selected: prior.selected, read});
  assert.deepEqual([...graph.sources].map(([path, text]) => ({path, sha256: hash(text),
    bytes: Buffer.byteLength(text)})), prior.graph, 'changed complete configuration source graph');
  assert.deepEqual(graph.metadata, prior.metadata);
  assert.deepEqual(graph.edges, prior.edges);
  assert.deepEqual(graph.peers, prior.peers);
  const files = new Map([...graph.sources].map(([path, text]) =>
    [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const options = {noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022,
    experimentalDecorators: true}, host = ts.createCompilerHost(options);
  host.getSourceFile = path => files.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...files.keys()].map(path => join(root, path)), options, host).getTypeChecker();
  const facts = prior.selected.map(selected => {
    const row = selected.original_row, path = 'projects/ngx-material-legacy/' + row.file, source = files.get(path);
    const candidates = [];
    for (const statement of source.statements) {
      const clause = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings :
        ts.isExportDeclaration(statement) ? statement.exportClause : null;
      for (const spec of clause?.elements ?? []) if ((spec.propertyName ?? spec.name).text === row.symbol) {
        candidates.push({statement, spec, module: statement.moduleSpecifier?.text});
      }
      if ((ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) ||
        ts.isClassDeclaration(statement)) && statement.name?.text === row.symbol) {
        candidates.push({statement, spec: statement, module: null});
      }
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === row.symbol) {
          candidates.push({statement, spec: declaration, module: null});
        }
      }
    }
    assert.equal(candidates.length, 1, 'missing/ambiguous configuration role ' + row.file + ':' + row.symbol);
    const binding = candidates[0], symbol = checker.getSymbolAtLocation(binding.spec.name);
    assert.ok(symbol, 'unbound configuration role');
    const occurrences = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.spec.name && node !== binding.spec.propertyName &&
        checker.getSymbolAtLocation(node) === symbol) {
        occurrences.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          parent_kind: ts.SyntaxKind[node.parent.kind], expression: node.parent.getText(source)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    return {file: row.file, module: row.module, symbol: row.symbol, ledger: selected.ledger,
      candidate_source_sha256: hash(source.text), current_peer_use: binding.module === row.module,
      current_module: binding.module, binding: {local_name: binding.spec.name.text,
        kind: ts.SyntaxKind[binding.spec.kind], line: source.getLineAndCharacterOfPosition(binding.spec.getStart(source)).line + 1,
        text: binding.statement.getText(source)}, occurrences,
      public_reexport: ts.isExportSpecifier(binding.spec),
      complete_context_members: [{kind: 'SourceFile', line: 1, sha256: hash(source.text), text: source.text}]};
  });
  return {prior, ...graph, facts, source_closures_prepared: 0,
    scope: 'Raw complete source and checker-bound local/import/reexport identity only; genuine types and runtime remain separate.'};
}
