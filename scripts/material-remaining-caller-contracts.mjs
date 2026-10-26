/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Seven original dependency obligations; no semantic or native admission. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {componentConfigGraph} from './component-config-caller-contracts.mjs';
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {"main": "29b36009d5570484e84afe031503b87e6d348267bdb3c7c05b4a528028a00646", "21.x": "838ef6fba77dc90eedb7ef4c4c3e6cba70831379ef8914a53b78b88cabca44b5"};
const authenticated = new Set();
const id = row => JSON.stringify([row.file, row.module, row.symbol]);
export const MATERIAL_REMAINING_PRIOR = 'compatibility/rc/material-remaining-caller-prior.json';

function original(root, parent, member) {
  const key = JSON.stringify([root, parent, member.path, member.sha256]);
  if (authenticated.has(key)) return;
  const bytes = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', parent + ':' + member.path], {cwd: root, maxBuffer: 24 * 1024 * 1024,
    env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
  assert.equal(hash(bytes), member.sha256, 'unauthenticated remaining caller input ' + member.path);
  assert.equal(bytes.length, member.bytes); authenticated.add(key);
}

export function materialRemainingCallerPrior({root = process.cwd(), read = raw(root)} = {}) {
  const bytes = read(MATERIAL_REMAINING_PRIOR), line = Object.keys(pins).find(key => hash(bytes) === pins[key]);
  assert.ok(line, 'changed original seven-role capture'); const prior = JSON.parse(bytes);
  assert.equal(prior.line, line); assert.equal(prior.selected.length, 7);
  assert.equal(new Set(prior.selected.map(item => id(item.original_row))).size, 7);
  assert.equal(prior.selected.filter(item => item.ledger.endsWith('/authored-dependency-dispositions.json')).length, 6);
  assert.equal(prior.sources.length, 5); assert.equal(prior.graph.length, 91); assert.equal(prior.metadata.length, 5);
  for (const member of [...prior.graph, ...prior.metadata, ...prior.ledgers, prior.SHA_ledger,
    prior.graph_owner, prior.alias_allowlist]) original(root, prior.source_parent, member);
  for (const member of prior.sources) {
    assert.equal(hash(member.text), member.sha256); assert.equal(Buffer.byteLength(member.text), member.bytes);
    assert.ok(prior.graph.some(other => other.path === member.path && other.sha256 === member.sha256));
  }
  for (const item of prior.selected) {
    assert.equal(item.original_row.disposition, 'open');
    const bytes = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show',
      prior.source_parent + ':' + item.ledger], {cwd: root, maxBuffer: 24 * 1024 * 1024,
      env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
    assert.deepEqual(JSON.parse(bytes).symbol_uses.find(row => id(row) === id(item.original_row)), item.original_row);
  }
  return prior;
}

export function materialRemainingCallerSource({root = process.cwd(), read = raw(root)} = {}) {
  const prior = materialRemainingCallerPrior({root, read});
  for (const member of [...prior.graph, ...prior.metadata, prior.graph_owner, prior.alias_allowlist])
    assert.equal(hash(read(member.path)), member.sha256, 'changed raw remaining source input ' + member.path);
  const graph = componentConfigGraph({root, read, selected: prior.selected});
  assert.deepEqual([...graph.sources].map(([path, text]) => ({path, sha256: hash(text), bytes: Buffer.byteLength(text)})), prior.graph);
  assert.deepEqual(graph.metadata, prior.metadata); assert.deepEqual(graph.edges, prior.edges); assert.deepEqual(graph.peers, prior.peers);
  const files = new Map([...graph.sources].map(([path, text]) =>
    [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const options = {noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022, experimentalDecorators: true};
  const host = ts.createCompilerHost(options);
  host.getSourceFile = path => files.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...files.keys()], options, host).getTypeChecker();
  const facts = prior.selected.map(item => {
    const row = item.original_row, path = 'projects/ngx-material-legacy/' + row.file, source = files.get(path), bindings = [];
    for (const statement of source.statements) {
      const clause = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings :
        ts.isExportDeclaration(statement) ? statement.exportClause : null;
      for (const spec of clause?.elements ?? []) if ((spec.propertyName ?? spec.name).text === row.symbol)
        bindings.push({statement, spec});
    }
    assert.equal(bindings.length, 1); const {statement, spec} = bindings[0];
    assert.equal(statement.moduleSpecifier.text, row.module);
    const symbol = checker.getSymbolAtLocation(spec.name); assert.ok(symbol); const occurrences = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node !== spec.name && node !== spec.propertyName && checker.getSymbolAtLocation(node) === symbol)
        occurrences.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          parent_kind: ts.SyntaxKind[node.parent.kind], expression: node.parent.getText(source)});
      ts.forEachChild(node, visit);
    }
    visit(source);
    const reexport = ts.isExportDeclaration(statement);
    assert.ok(reexport || occurrences.length > 0);
    return {file: row.file, module: row.module, symbol: row.symbol, ledger: item.ledger,
      candidate_source_sha256: hash(source.text), binding: {kind: ts.SyntaxKind[spec.kind], local_name: spec.name.text,
        module: row.module, text: statement.getText(source)}, occurrences, public_reexport: reexport,
      complete_context_members: [{kind: 'SourceFile', line: 1, sha256: hash(source.text), text: source.text}]};
  });
  assert.equal(facts.filter(fact => fact.public_reexport).length, 1);
  return {prior, facts, sources: graph.sources, metadata: graph.metadata, peers: graph.peers,
    ref: {path: MATERIAL_REMAINING_PRIOR, sha256: pins[prior.line]},
    local_binding_program_only: true, semantic_public_types_or_runtime_qualified: false,
    source_closures: 0, actual_native_packed_AOT_or_full_floor_qualified: false};
}
