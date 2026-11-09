/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Main-only current epoch; historical acquisition remains in the immutable caller module.
 */
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {componentConfigPrior,componentConfigGraph,COMPONENT_CONFIG_PRIOR} from './component-config-caller-contracts.mjs';
export {componentConfigPrior,COMPONENT_CONFIG_PRIOR};
const ts=createRequire(import.meta.url)('typescript'), hash=value=>createHash('sha256').update(value).digest('hex');
const raw=root=>path=>{let cursor=root;for(const part of path.split('/')){assert.ok(part&&part!=='.'&&part!=='..');cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);};
export const COMPONENT_CONFIG_CURRENT_MAIN='compatibility/rc/component-config-caller-current-main.json';
const CURRENT_MAIN_PIN='044a5f30efde42550c4c03ba2d2b52f776363921c981892fb3c45a89ab3f1bc4', authenticated=new Set();
function original(root,parent,member){const key=JSON.stringify([root,parent,member.path,member.sha256]);if(authenticated.has(key))return;const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+member.path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(bytes),member.sha256,'unauthenticated current configuration input '+member.path);assert.equal(bytes.length,member.bytes);authenticated.add(key);}

export function componentConfigSource({root = process.cwd(), read = raw(root)} = {}) {
  const prior = componentConfigPrior({root, read});
  assert.equal(prior.line, 'main', 'current epoch is main-only');
  let epoch = prior;
  if (prior.line === 'main') {
    const bytes = read(COMPONENT_CONFIG_CURRENT_MAIN);
    assert.equal(hash(bytes), CURRENT_MAIN_PIN, 'changed current configuration epoch');
    epoch = JSON.parse(bytes);
    assert.equal(epoch.line, 'main');
    assert.equal(epoch.source_commit, 'fdef9be37d516b922efc5301c8f16d0e456f4d48');
    assert.equal(epoch.prior_sha256, hash(read(COMPONENT_CONFIG_PRIOR)));
    assert.deepEqual(epoch.selected_sources.map(member => member.path), prior.sources.map(member => member.path));
    for (const member of [...epoch.graph, ...epoch.metadata, epoch.alias_allowlist]) original(root, epoch.source_commit, member);
  }
  for (const member of [...(epoch.selected_sources || prior.sources), epoch.alias_allowlist]) {
    assert.equal(hash(read(member.path)), member.sha256, 'changed raw configuration caller ' + member.path);
  }
  const graph = componentConfigGraph({root, selected: prior.selected, read});
  assert.deepEqual([...graph.sources].map(([path, text]) => ({path, sha256: hash(text),
    bytes: Buffer.byteLength(text)})), epoch.graph, 'changed complete configuration source graph');
  assert.deepEqual(graph.metadata, epoch.metadata);
  assert.deepEqual(graph.edges, epoch.edges);
  assert.deepEqual(graph.peers, epoch.peers);
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
  return {prior, epoch, ...graph, facts, source_closures_prepared: 0,
    scope: 'Raw complete source and checker-bound local/import/reexport identity only; genuine types and runtime remain separate.'};
}
