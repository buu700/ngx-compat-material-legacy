/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current menu roles and one explicit pre-application type-only diagnostic view. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {join, posix} from 'node:path';
import {gunzipSync} from 'node:zlib';

const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {main: 'a6cf639de2151c32bc80b82be63ae4390453dc8c92a309801c1c153de9a82a00',
  '21.x': '2da547a58102ec0a5715ebfdc91a86085d9728a6b6f747e35bf15cf8d0f8fe8e'};
const authenticated = new Set();
export const MENU_CALLER_PRIOR = 'compatibility/rc/menu-caller-prior.json.gz';
export const MENU_PANEL_SOURCE = 'projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts';
export const MENU_PANEL_PROPOSAL = 'compatibility/rc/menu-panel-content-type-proposal.json';
const proposalPins={main:'03b5186005f138b3e1e7e10502a3fb1816fec637d63234bdbf6df7d153f9397d','21.x':'81a3d9708ba94fc61457935bfd480cfb2c4248838a6eeba86b13cba0bcfed653'};

export function menuCallerSource({root = process.cwd(), read = raw(root), propose = false} = {}) {
  const bytes = read(MENU_CALLER_PRIOR), digest = hash(bytes), line = Object.keys(pins).find(line => pins[line] === digest);
  assert.ok(line, 'changed menu caller capture'); const prior = JSON.parse(gunzipSync(bytes)); assert.equal(prior.line, line);
  assert.equal(prior.selected.length, 17); assert.equal(prior.sources.length, 7); assert.equal(prior.support.length, 6);
  for (const member of [...prior.sources, ...prior.support, ...prior.ledgers, prior.alias_allowlist]) {
    assert.equal(hash(member.text), member.sha256);
    const key = [root, prior.source_parent, member.path, member.sha256].join(':');
    if (!authenticated.has(key)) {
      const original = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show', prior.source_parent + ':' + member.path],
        {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
      assert.equal(hash(original), member.sha256); authenticated.add(key);
    }
  }
  const proposalBytes=read(MENU_PANEL_PROPOSAL);assert.equal(hash(proposalBytes),proposalPins[line],'changed menu type proposal');
  const captured=JSON.parse(proposalBytes),proposal=captured.diagnostic;assert.equal(captured.source_parent,prior.source_parent);assert.equal(proposal.line,line);assert.equal(proposal.path,MENU_PANEL_SOURCE);
  const member=prior.sources.find(m=>m.path===MENU_PANEL_SOURCE);assert.ok(member);assert.equal(proposal.before,member.text);assert.equal(hash(proposal.before),proposal.before_sha256);assert.equal(hash(proposal.after),proposal.after_sha256);
  const from="import type {MatMenuContent, MenuPositionX, MenuPositionY} from '@angular/material/menu';",to="import type {MenuPositionX, MenuPositionY} from '@angular/material/menu';\nimport type {MatLegacyMenuContent as MatMenuContent} from '../menu-content';";
  assert.equal(proposal.before.split(from).length,2);assert.equal(proposal.after,proposal.before.replace(from,to),'non-finite menu panel edit');
  const emit=text=>{const r=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true},reportDiagnostics:true});assert.equal(r.diagnostics.length,0);return r.outputText;};
  assert.equal(emit(proposal.before),emit(proposal.after));assert.equal(hash(emit(proposal.before)),proposal.emitted_JS_sha256);
  const actualPanel=read(MENU_PANEL_SOURCE);assert.ok([proposal.before_sha256,proposal.after_sha256].includes(hash(actualPanel)),'changed raw menu panel source');
  const applied=hash(actualPanel)===proposal.after_sha256,projected=!!propose&&!applied;
  for(const m of [...prior.sources,...prior.support,prior.alias_allowlist])if(m.path!==MENU_PANEL_SOURCE)assert.equal(hash(read(m.path)),m.sha256,'changed menu source/resource '+m.path);
  const view=path=>projected&&path===MENU_PANEL_SOURCE?Buffer.from(proposal.after):read(path);

  const sources = new Map(), routes = new Map(), metadata = [], edges = [];
  function visit(path) {
    if (sources.has(path)) return; const text = view(path).toString(); sources.set(path, text);
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0);
    function edge(specifier) {
      let target;
      if (specifier.startsWith('@ngx-compat/material-legacy/')) {
        const suffix = specifier.slice('@ngx-compat/material-legacy/'.length); assert.ok(!suffix.includes('..'));
        const folder = 'projects/ngx-material-legacy/' + suffix, path = folder + '/ng-package.json', bytes = read(path);
        const config = JSON.parse(bytes); target = posix.join(folder, config.lib.entryFile);
        assert.ok(target.startsWith(folder + '/'));
        if (!routes.has(specifier)) metadata.push({specifier, path, sha256: hash(bytes), entry: target});
        routes.set(specifier, target);
      } else if (specifier.startsWith('.')) {
        const base = posix.normalize(posix.join(posix.dirname(path), specifier)); assert.ok(base.startsWith('projects/ngx-material-legacy/'));
        const candidates = [];
        for (const candidate of [base, base + '.ts', base + '/index.ts']) {
          if (!candidate.endsWith('.ts')) continue;
          try {read(candidate); candidates.push(candidate);} catch (error) {if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;}
        }
        assert.equal(candidates.length, 1, 'missing/ambiguous menu source dependency'); target = candidates[0];
      } else return;
      edges.push({from: path, specifier, to: target}); visit(target);
    }
    for (const n of source.statements) if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) edge(n.moduleSpecifier.text);
    function nested(n) {
      if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) edge(n.argument.literal.text);
      assert.ok(!(ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword), 'unqualified dynamic owned menu dependency');
      ts.forEachChild(n, nested);
    }
    nested(source);
  }
  for (const member of prior.sources) visit(member.path);
  const files = new Map([...sources].map(([path, text]) => [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const options = {noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022, experimentalDecorators: true};
  const host = ts.createCompilerHost(options); host.getSourceFile = path => files.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...files.keys()].map(path => join(root, path)), options, host).getTypeChecker();
  const facts = prior.selected.map(selected => {
    const row = selected.original_row, path = 'projects/ngx-material-legacy/' + row.file, source = files.get(path);
    const imports = source.statements.filter(ts.isImportDeclaration).flatMap(n => (n.importClause?.namedBindings?.elements ?? []).map(spec => ({declaration: n, spec})));
    const exports = source.statements.filter(ts.isExportDeclaration).flatMap(n => (n.exportClause?.elements ?? []).map(spec => ({declaration: n, spec})));
    const bindings = [...imports, ...exports].filter(b => b.declaration.moduleSpecifier?.text === row.module && (b.spec.propertyName ?? b.spec.name).text === row.symbol);
    const removed=row.symbol==='MAT_MENU_PANEL'||(row.symbol==='MatMenuContent'&&row.file==='legacy-menu/internal/menu-panel.ts'&&(applied||projected));
    assert.equal(bindings.length,removed?0:1);
    if(removed){
      const ownModule=row.symbol==='MatMenuContent'?'../menu-content':row.file==='legacy-menu/menu.ts'?'./internal/menu-panel-token':'./menu-panel-token';
      const ownName=row.symbol==='MatMenuContent'?'MatLegacyMenuContent':'MAT_MENU_PANEL';
      const owned=imports.filter(b=>b.declaration.moduleSpecifier.text===ownModule&&(b.spec.propertyName??b.spec.name).text===ownName&&b.spec.name.text===row.symbol);
      assert.equal(owned.length,1,'wrong owned menu binding '+row.file+':'+row.symbol);
      const ownedSymbol=checker.getSymbolAtLocation(owned[0].spec.name),ownedOccurrences=[];assert.ok(ownedSymbol);
      function ownedVisit(n){if(ts.isIdentifier(n)&&n!==owned[0].spec.name&&n!==owned[0].spec.propertyName&&checker.getSymbolAtLocation(n)===ownedSymbol)ownedOccurrences.push({line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1,kind:ts.SyntaxKind[n.parent.kind],text:n.parent.getText(source)});ts.forEachChild(n,ownedVisit);}
      ownedVisit(source);assert.ok(ownedOccurrences.length,'unused owned menu replacement');
      return {file: row.file, module: row.module, symbol: row.symbol, ledger: selected.ledger, candidate_source_sha256: hash(source.text),
        removed_upstream_use: true, owned_binding: owned[0].declaration.getText(source), owned_occurrences:ownedOccurrences, occurrences: [], unused_import: false,
        complete_source_context: {path, sha256: hash(source.text), text: source.text}};
    }
    const {declaration, spec} = bindings[0], reexport = ts.isExportDeclaration(declaration), symbol = checker.getSymbolAtLocation(spec.name), occurrences = [];
    function visit(n) {
      if (ts.isIdentifier(n) && n !== spec.name && n !== spec.propertyName && checker.getSymbolAtLocation(n) === symbol) occurrences.push({line: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1, kind: ts.SyntaxKind[n.parent.kind], text: n.parent.getText(source)});
      ts.forEachChild(n, visit);
    }
    if (!reexport) visit(source);
    return {file: row.file, module: row.module, symbol: row.symbol, ledger: selected.ledger, candidate_source_sha256: hash(source.text),
      removed_upstream_use: false, reexport, local_name: spec.name.text, binding: declaration.getText(source), occurrences,
      unused_import: !reexport && occurrences.length === 0, complete_source_context: {path, sha256: hash(source.text), text: source.text}};
  });
  assert.equal(facts.filter(f => f.removed_upstream_use).length, applied||projected?3:2); assert.equal(facts.filter(f => f.unused_import).length, 0);
  return {prior, sources, routes, metadata, edges, facts, proposal, applied, proposed_view:projected, proposal_ref:{path:MENU_PANEL_PROPOSAL,sha256:hash(proposalBytes)}};
}
