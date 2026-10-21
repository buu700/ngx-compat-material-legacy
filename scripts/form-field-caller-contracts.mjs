/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current form-field import/re-export roles; no historical source projection. */
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
const pins = {main: '9dc98dd04874c66a033fbe00e4adf0751c61fff5853ffba7919f0a9d83635bb2',
  '21.x': 'ed043948c1f38f3d90f1cbf6c2067ab60eac29a6ce2fe0f7967ffd3a3a7db6fb'};
const authenticated = new Set();
export const FORM_FIELD_CALLER_PRIOR = 'compatibility/rc/form-field-caller-prior.json.gz';

export function formFieldCallerSource({root = process.cwd(), read = raw(root)} = {}) {
  const bytes = read(FORM_FIELD_CALLER_PRIOR), digest = hash(bytes), line = Object.keys(pins).find(line => pins[line] === digest);
  assert.ok(line, 'changed form-field caller capture'); const prior = JSON.parse(gunzipSync(bytes)); assert.equal(prior.line, line);
  assert.equal(prior.selected.length, 18); assert.equal(prior.sources.length, 8); assert.equal(prior.support.length, 28);
  for (const member of [...prior.sources, ...prior.support, ...prior.ledgers, prior.alias_allowlist]) {
    assert.equal(hash(member.text), member.sha256);
    const key = [root, prior.source_parent, member.path, member.sha256].join(':');
    if (!authenticated.has(key)) {
      const original = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show', prior.source_parent + ':' + member.path],
        {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
      assert.equal(hash(original), member.sha256); authenticated.add(key);
    }
  }
  for (const member of [...prior.sources, ...prior.support, prior.alias_allowlist]) assert.equal(hash(read(member.path)), member.sha256, 'changed form-field source/resource ' + member.path);
  const sources = new Map(), routes = new Map(), metadata = [], edges = [];
  function visit(path) {
    if (sources.has(path)) return; const text = read(path).toString(); sources.set(path, text);
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
        assert.equal(candidates.length, 1, 'missing/ambiguous form-field source dependency'); target = candidates[0];
      } else return;
      edges.push({from: path, specifier, to: target}); visit(target);
    }
    for (const n of source.statements) if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) edge(n.moduleSpecifier.text);
    function nested(n) {
      if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) edge(n.argument.literal.text);
      assert.ok(!(ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword), 'unqualified dynamic owned form-field dependency');
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
    const replacementSymbols={MAT_FORM_FIELD:'MAT_LEGACY_FORM_FIELD',MAT_ERROR:'MAT_LEGACY_ERROR',MAT_PREFIX:'MAT_LEGACY_PREFIX',MAT_SUFFIX:'MAT_LEGACY_SUFFIX',MatFormField:'MatLegacyFormField'};
    const removed = Object.hasOwn(replacementSymbols,row.symbol)&&!row.file.endsWith('/owned-tokens.ts');
    assert.equal(bindings.length, removed ? 0 : 1);
    if (removed) {
      const ownModule=['legacy-autocomplete/internal/autocomplete-trigger-base.ts','legacy-select/internal/select-base.ts'].includes(row.file)?'@ngx-compat/material-legacy/legacy-form-field':'./owned-tokens';
      const owned=imports.filter(b=>b.declaration.moduleSpecifier.text===ownModule&&(b.spec.propertyName??b.spec.name).text===replacementSymbols[row.symbol]&&b.spec.name.text===row.symbol);
      assert.equal(owned.length,1,'wrong owned form-field binding '+row.file+':'+row.symbol);
      const ownedSymbol=checker.getSymbolAtLocation(owned[0].spec.name),ownedOccurrences=[];assert.ok(ownedSymbol);
      function ownedVisit(n){if(ts.isIdentifier(n)&&n!==owned[0].spec.name&&n!==owned[0].spec.propertyName&&checker.getSymbolAtLocation(n)===ownedSymbol)ownedOccurrences.push({line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1,kind:ts.SyntaxKind[n.parent.kind],text:n.parent.getText(source)});ts.forEachChild(n,ownedVisit);}
      ownedVisit(source);assert.ok(ownedOccurrences.length,'unused owned form-field replacement');
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
  assert.equal(facts.filter(f => f.removed_upstream_use).length, 11); assert.equal(facts.filter(f => f.unused_import).length, 0);
  return {prior, sources, routes, metadata, edges, facts};
}
