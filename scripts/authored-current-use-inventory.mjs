/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Live peer-use discovery augments, and never replaces, the frozen use roster. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {lstatSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseInventory, authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {additionalUseBaseline} from './authored-additional-use-baseline.mjs';

const ts = createRequire(import.meta.url)('typescript');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const productPrefix = 'projects/ngx-material-legacy/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const key = row => JSON.stringify([row?.file, row?.module, row?.symbol]);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function safePath(path) {
  assert.equal(typeof path, 'string');
  assert.ok(path.startsWith(productPrefix) && path.endsWith('.ts') && !path.endsWith('.spec.ts'));
  assert.ok(!path.includes('\\') && path.split('/').every(part => part && part !== '.' && part !== '..'));
}

/** Named imports/reexports plus namespace, default, side-effect and import-type routes.
 * A computed dynamic import is an unresolved route, rather than a silent omission.
 * Specs have their separate historical gate; production testing harnesses are included.
 */
export function scanCurrentAuthoredUses({root = defaultRoot, files, readSource} = {}) {
  const paths = files ?? execFileSync('rg', ['--files', '--hidden', '--no-ignore',
    productPrefix.slice(0, -1), '--glob', '*.ts', '--glob', '!*.spec.ts'],
    {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(Boolean);
  assert.ok(paths.length, 'empty current authored source population');
  assert.equal(new Set(paths).size, paths.length, 'duplicate authored source path');
  const sources = [], uses = new Map();
  for (const path of [...paths].sort(compare)) {
    safePath(path);
    if (!readSource) {
      let member = root;
      for (const part of path.split('/')) {
        member = join(member, part);
        assert.ok(!lstatSync(member).isSymbolicLink(), 'symlink in authored source route');
      }
      assert.ok(lstatSync(member).isFile());
    }
    const bytes = readSource ? readSource(path) : readFileSync(join(root, path));
    assert.ok(typeof bytes === 'string' || Buffer.isBuffer(bytes));
    const text = bytes.toString(), source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(source.parseDiagnostics.length, 0, 'unparsed authored source ' + path);
    const digest = hash(bytes), file = path.slice(productPrefix.length);
    sources.push({path, sha256: digest});
    const add = (module, symbol, node, kind, localName = null, typeOnly = false) => {
      const row = {file, module, symbol};
      const id = key(row);
      if (!uses.has(id)) uses.set(id, {...row, candidate_source_sha256: digest, occurrences: []});
      uses.get(id).occurrences.push({kind, local_name: localName, type_only: typeOnly,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1});
    };
    const peer = spec => typeof spec === 'string' && spec.startsWith('@angular/');
    for (const node of source.statements) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && peer(node.moduleSpecifier.text)) {
        const module = node.moduleSpecifier.text, clause = node.importClause;
        if (!clause) add(module, '<side-effect>', node, 'side-effect-import');
        else {
          if (clause.name) add(module, 'default', clause.name, 'default-import', clause.name.text, clause.isTypeOnly);
          const bindings = clause.namedBindings;
          if (bindings && ts.isNamedImports(bindings)) for (const item of bindings.elements)
            add(module, (item.propertyName || item.name).text, item, 'named-import', item.name.text,
              clause.isTypeOnly || item.isTypeOnly);
          else if (bindings && ts.isNamespaceImport(bindings))
            add(module, '*', bindings, 'namespace-import', bindings.name.text, clause.isTypeOnly);
        }
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier) && peer(node.moduleSpecifier.text)) {
        const module = node.moduleSpecifier.text, clause = node.exportClause;
        if (clause && ts.isNamedExports(clause)) for (const item of clause.elements)
          add(module, (item.propertyName || item.name).text, item, 'named-reexport', item.name.text,
            node.isTypeOnly || item.isTypeOnly);
        else add(module, '*', node, 'namespace-reexport', clause?.name?.text ?? null, node.isTypeOnly);
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        const spec = node.moduleReference.expression;
        if (spec && ts.isStringLiteral(spec) && peer(spec.text))
          add(spec.text, '*', node, 'import-equals', node.name.text, node.isTypeOnly);
      }
    }
    const visit = node => {
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) &&
          ts.isStringLiteral(node.argument.literal) && peer(node.argument.literal.text)) {
        const symbol = node.qualifier ? node.qualifier.getText(source).split('.')[0] : '*';
        add(node.argument.literal.text, symbol, node, 'import-type', null, true);
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const spec = node.arguments[0];
        if (spec && (ts.isStringLiteral(spec) || ts.isNoSubstitutionTemplateLiteral(spec))) {
          if (peer(spec.text)) add(spec.text, '*', node, 'dynamic-import');
        } else add('<computed-module>', '<unresolved>', node, 'computed-dynamic-import');
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const symbolUses = [...uses.values()].sort((a, b) => compare(key(a), key(b)));
  return {schema_version: 1, compiler: ts.version, source_files: sources,
    source_population_sha256: hash(JSON.stringify(sources)), symbol_uses: symbolUses};
}

/** Review new routes with the same per-caller evidence rules as frozen routes.
 * Removed seed uses remain obligations of the frozen ledger, never automatic passes.
 */
export function currentAuthoredUseAdmission({root = defaultRoot, current, frozen, candidate, line, readMember, additionalBaseline}) {
  const frozenKeys = new Set(frozen.map(key));
  const currentKeys = new Set(current.symbol_uses.map(key));
  const additions = current.symbol_uses.filter(row => !frozenKeys.has(key(row)));
  const removed = frozen.filter(row => !currentKeys.has(key(row)));
  const baseline = additionalUseBaseline({root, current, additions, candidate, line, readMember, provided: additionalBaseline});
  const obligations = new Map(baseline.entries.map(row => [key(row), row]));
  for (const row of additions) obligations.set(key(row), row);
  const baselineOverlapsFrozen = baseline.entries.some(row => frozenKeys.has(key(row)));
  const scopeValid = baseline.valid && !baselineOverlapsFrozen && candidate?.schema_version === 1 && candidate?.line === line &&
    ['in-progress', 'closed'].includes(candidate?.status);
  const wanted = new Map(additions.map(row => [key(row), row]));
  const retired = new Map(baseline.retired.map(row => [key(row), row]));
  const liveCountValid = baseline.retired.length
    ? candidate?.live_symbol_use_count === additions.length
    : candidate?.live_symbol_use_count === undefined || candidate.live_symbol_use_count === additions.length;
  const snapshotValid = scopeValid && candidate?.current_source_population_sha256 === current.source_population_sha256 &&
    candidate?.current_uses === current.symbol_uses.length &&
    candidate?.current_source_files === current.source_files.length && liveCountValid &&
    candidate?.symbol_use_count === obligations.size && Array.isArray(candidate?.symbol_uses) &&
    candidate.symbol_uses.every(row => {
      const actual = wanted.get(key(row)) ?? retired.get(key(row));
      return actual && row.candidate_source_sha256 === actual.candidate_source_sha256 &&
        JSON.stringify(row.occurrences) === JSON.stringify(actual.occurrences);
    });
  const inventory = authoredUseInventory([...obligations.values()], candidate);
  const reviews = inventory.invalid ? {reviewed: 0, insufficient: inventory.invalid, insufficient_uses: []}
    : authoredUseReviewEvidence(candidate, line, readMember, hash);
  const ready = scopeValid && snapshotValid && inventory.complete && inventory.open === 0 &&
    candidate.status === 'closed' && reviews.insufficient === 0;
  return {ready, scope_valid: scopeValid, source_snapshot_valid: snapshotValid,
    current_uses: current.symbol_uses.length,
    current_source_files: current.source_files.length,
    current_source_population_sha256: current.source_population_sha256,
    additional_uses: additions.length, additional_obligations: obligations.size,
    retained_removed_additional_obligations: baseline.retired.length,
    additional_baseline: {valid: baseline.valid && !baselineOverlapsFrozen, mode: baseline.mode,
      original_obligations: baseline.entries.length, qualification: baseline.qualification,
      error: baselineOverlapsFrozen ? 'additional baseline overlaps frozen roster' : baseline.error},
    removed_seed_uses: removed.length, inventory, review_evidence: reviews};
}
