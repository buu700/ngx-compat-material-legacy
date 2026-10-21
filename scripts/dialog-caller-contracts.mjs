/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Authenticated finite dialog source roles; public SDK and behavior decisions stay separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {componentConfigGraph} from './component-config-caller-contracts.mjs';

const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {main: '5dad16b56a21a7cc0fdcaba15c43a367a05c2d60f9710cae12cd7e74cdb3c03f',
  '21.x': 'ffd0915b98cba04e203fb0ef2b5ea4ce64c0601737e080ee9e833d111deea5d5'};
const authenticated = new Set();
export const DIALOG_CALLER_PRIOR = 'compatibility/rc/dialog-caller-prior.json.gz';
export const DIALOG_CALLER_MODULES = ['@angular/cdk/dialog', '@angular/material/dialog'];
const id = row => JSON.stringify([row.file, row.module, row.symbol]);

function original(root, parent, member) {
  const key = JSON.stringify([root, parent, member.path, member.sha256]);
  if (authenticated.has(key)) return;
  const bytes = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0',
    '-c', 'maintenance.auto=0', 'show', parent + ':' + member.path],
  {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
  assert.equal(hash(bytes), member.sha256, 'unauthenticated dialog source input ' + member.path);
  assert.equal(bytes.length, member.bytes);
  authenticated.add(key);
}

export function dialogCallerPrior({root = process.cwd(), read = raw(root)} = {}) {
  const bytes = read(DIALOG_CALLER_PRIOR), line = Object.keys(pins).find(key => pins[key] === hash(bytes));
  assert.ok(line, 'changed dialog caller capture');
  const prior = JSON.parse(gunzipSync(bytes));
  assert.equal(prior.line, line);
  assert.equal(prior.selected.length, 18);
  assert.equal(new Set(prior.selected.map(item => id(item.original_row))).size, 18);
  assert.equal(prior.selected.filter(item => item.ledger.endsWith('/authored-dependency-dispositions.json')).length, 12);
  assert.equal(prior.sources.length, 8);
  assert.equal(prior.graph.length, 49);
  assert.equal(prior.metadata.length, 1);
  for (const member of [...prior.sources, ...prior.graph, ...prior.metadata,
    ...prior.ledgers, prior.alias_allowlist, prior.graph_owner]) {
    if (member.text !== undefined) {
      assert.equal(hash(member.text), member.sha256);
      assert.equal(Buffer.byteLength(member.text), member.bytes);
    }
    original(root, prior.source_parent, member);
  }
  for (const item of prior.selected) {
    const row = item.original_row;
    assert.ok(DIALOG_CALLER_MODULES.includes(row.module));
    assert.equal(row.disposition, 'open');
    const ledger = prior.ledgers.find(member => member.path === item.ledger);
    assert.ok(ledger);
    assert.deepEqual(JSON.parse(ledger.text).symbol_uses.find(candidate => id(candidate) === id(row)), row);
  }
  return prior;
}

/** The existing graph owner is reused; no new historical reader or SDK projection. */
export function dialogCallerSource({root = process.cwd(), read = raw(root)} = {}) {
  const prior = dialogCallerPrior({root, read});
  for (const member of [...prior.sources, prior.alias_allowlist, prior.graph_owner]) {
    assert.equal(hash(read(member.path)), member.sha256, 'changed raw dialog source input ' + member.path);
  }
  const graph = componentConfigGraph({root, selected: prior.selected, read});
  assert.deepEqual([...graph.sources].map(([path, text]) => ({path, sha256: hash(text),
    bytes: Buffer.byteLength(text)})), prior.graph, 'changed complete dialog source graph');
  assert.deepEqual(graph.metadata, prior.metadata);
  assert.deepEqual(graph.edges, prior.edges);
  assert.deepEqual(graph.peers, prior.peers);
  const files = new Map([...graph.sources].map(([path, text]) =>
    [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const options = {noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022,
    experimentalDecorators: true}, host = ts.createCompilerHost(options);
  host.getSourceFile = path => files.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...files.keys()].map(path => join(root, path)), options, host).getTypeChecker();
  const facts = prior.selected.map(item => {
    const row = item.original_row, path = 'projects/ngx-material-legacy/' + row.file, source = files.get(path);
    const candidates = [];
    for (const statement of source.statements) {
      const clause = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings :
        ts.isExportDeclaration(statement) ? statement.exportClause : null;
      for (const spec of clause?.elements ?? []) if ((spec.propertyName ?? spec.name).text === row.symbol) {
        candidates.push({statement, spec, module: statement.moduleSpecifier.text});
      }
    }
    const owned = row.file === 'legacy-dialog/internal/dialog-container-base.ts' &&
      row.module === '@angular/cdk/dialog' && row.symbol === 'CdkDialogContainer';
    let binding, occurrences = [];
    if (owned) {
      assert.equal(candidates.length, 0, 'retired CdkDialogContainer import unexpectedly restored');
      const declaration = source.statements.find(node => ts.isClassDeclaration(node) &&
        node.name?.text === '_MatDialogContainerBase');
      assert.ok(declaration);
      const parent = declaration.heritageClauses?.find(node => node.token === ts.SyntaxKind.ExtendsKeyword);
      assert.deepEqual(parent?.types.map(node => node.getText(source)), ['BasePortalOutlet']);
      function visit(node) {
        assert.ok(!(ts.isIdentifier(node) && node.text === 'CdkDialogContainer'),
          'retired peer name still used outside its original import');
        ts.forEachChild(node, visit);
      }
      visit(source);
      binding = {kind: 'OwnedClassReplacement', local_name: declaration.name.text,
        module: null, text: declaration.getText(source), line: source.getLineAndCharacterOfPosition(declaration.getStart(source)).line + 1};
    } else {
      assert.equal(candidates.length, 1, 'missing/ambiguous dialog binding ' + row.file + ':' + row.symbol);
      const candidate = candidates[0], symbol = checker.getSymbolAtLocation(candidate.spec.name);
      assert.ok(symbol);
      function visit(node) {
        if (ts.isIdentifier(node) && node !== candidate.spec.name && node !== candidate.spec.propertyName &&
          checker.getSymbolAtLocation(node) === symbol) {
          occurrences.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
            parent_kind: ts.SyntaxKind[node.parent.kind], expression: node.parent.getText(source)});
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
      binding = {kind: ts.SyntaxKind[candidate.spec.kind], local_name: candidate.spec.name.text,
        module: candidate.module, text: candidate.statement.getText(source),
        line: source.getLineAndCharacterOfPosition(candidate.spec.getStart(source)).line + 1};
    }
    return {file: row.file, module: row.module, symbol: row.symbol, ledger: item.ledger,
      candidate_source_sha256: hash(source.text), binding, occurrences,
      current_peer_use: binding.module === row.module, owned_original_container_replacement: owned,
      public_reexport: binding.kind === 'ExportSpecifier',
      complete_context_members: [{kind: 'SourceFile', line: 1, sha256: hash(source.text), text: source.text}]};
  });
  assert.equal(facts.filter(fact => fact.current_peer_use).length, 17);
  assert.equal(facts.filter(fact => fact.owned_original_container_replacement).length, 1);
  assert.equal(facts.filter(fact => fact.public_reexport).length, 3);
  return {prior, facts, sources: graph.sources, routes: graph.routes, peers: graph.peers,
    ref: {path: DIALOG_CALLER_PRIOR, sha256: pins[prior.line]},
    local_binding_program_only: true, semantic_public_types_or_runtime_qualified: false};
}
