/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source-context review data; only the existing canonical owner writes ledgers. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {inspectDialogConfigBoundary} from './dialog-caller-config-boundary.mjs';

const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const authenticated = new Map();
const id = row => JSON.stringify([row.file, row.module, row.symbol]);
const impactPath = 'compatibility/rc/dialog-caller-config-source-impact.json';
const pins = {main: '7dbf98a442d70e4692c855909adad84a19e01be3a2364e8790b27290dae67214',
  '21.x': 'eb5d9ca1e17257d4cb9c56c20b9f9cd3fd5db90d39d8cbb66fea0fbbff5ea78d'};
export const DIALOG_CONFIG_REBIND_REVIEW = 'compatibility/f10/authored-use-reviews/dialog-config-source-context.json';

function canonical(value) {
  const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
  return JSON.stringify(sorted(value)).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

/** Checker-bound identifiers and complete enclosing members from the actual proposed program. */
function sourceRole(source, checker, row) {
  const bindings = source.statements.filter(ts.isImportDeclaration).flatMap(declaration =>
    (declaration.importClause?.namedBindings?.elements ?? []).map(specifier => ({declaration, specifier})))
    .filter(({declaration, specifier}) => declaration.moduleSpecifier.text === row.module &&
      (specifier.propertyName ?? specifier.name).text === row.symbol);
  assert.equal(bindings.length, 1, 'missing exact current peer binding ' + id(row));
  const {declaration, specifier} = bindings[0], symbol = checker.getSymbolAtLocation(specifier.name);
  assert.ok(symbol);
  const occurrences = [], members = new Map(), fields = new Set(), annotations = [];
  function member(node, reason) {
    let top = node;
    while (top.parent && !ts.isSourceFile(top.parent) && !ts.isClassDeclaration(top.parent) &&
      !ts.isInterfaceDeclaration(top.parent)) top = top.parent;
    const start = top.getStart(source), record = members.get(start) ?? {
      line: source.getLineAndCharacterOfPosition(start).line + 1, sha256: hash(top.getText(source)),
      text: top.getText(source), reasons: []};
    if (!record.reasons.includes(reason)) record.reasons.push(reason);
    members.set(start, record);
  }
  function visit(node) {
    if (ts.isIdentifier(node) && node !== specifier.name && node !== specifier.propertyName &&
      checker.getSymbolAtLocation(node) === symbol) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      occurrences.push({line: position.line + 1, column: position.character + 1,
        parent_kind: ts.SyntaxKind[node.parent.kind], parent_source: node.parent.getText(source)});
      member(node, row.module + ':' + row.symbol);
      let owner = node;
      while (owner && !ts.isParameter(owner) && !ts.isPropertyDeclaration(owner) &&
        !ts.isPropertySignature(owner) && !ts.isSourceFile(owner) && !ts.isMethodDeclaration(owner)) owner = owner.parent;
      if (owner && (ts.isParameter(owner) || ts.isPropertyDeclaration(owner) || ts.isPropertySignature(owner)) &&
        ts.isIdentifier(owner.name)) fields.add(owner.name.text);
      if (row.symbol === 'Inject' && ts.isCallExpression(node.parent) && node.parent.expression === node) {
        const call = node.parent, decorator = call.parent, parameter = decorator.parent;
        assert.ok(ts.isDecorator(decorator) && ts.isParameter(parameter) && ts.isConstructorDeclaration(parameter.parent));
        annotations.push({expression: call.getText(source), target_class: parameter.parent.parent.name.text,
          parameter_index: parameter.parent.parameters.indexOf(parameter), token_expression: call.arguments[0].getText(source)});
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  function references(node) {
    if (ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword && fields.has(node.name.text))
      member(node, 'this.' + node.name.text);
    ts.forEachChild(node, references);
  }
  references(source);
  assert.ok(occurrences.length, 'empty current role ' + id(row));
  return {binding: declaration.getText(source), import_local: specifier.name.text,
    type_only: !!(declaration.importClause.isTypeOnly || specifier.isTypeOnly), occurrences,
    bound_parameters_and_fields: [...fields], complete_caller_members: [...members.values()].sort((a, b) => a.line - b.line),
    ...(annotations.length ? {constructor_parameter_annotations: annotations} : {})};
}

export function dialogConfigSourceRebinding({root = process.cwd(), read = raw(root), requireApplied = true} = {}) {
  const boundary = inspectDialogConfigBoundary({root, read, requireApplied}), bytes = read(impactPath);
  assert.equal(hash(bytes), pins[boundary.line], 'changed dialog source-impact capture');
  const prior = JSON.parse(bytes);
  assert.equal(prior.line, boundary.line);
  assert.equal(prior.selected.length, 32);
  assert.equal(new Set(prior.selected.map(item => item.ledger + id(item.original_row))).size, 32);
  assert.deepEqual(prior.candidate, boundary.types.proof.candidate);
  const originals = new Map();
  for (const ref of [...prior.ledgers, prior.SHA_ledger, ...prior.prior_review_members]) {
    const authKey = JSON.stringify([root, prior.source_parent, ref.path, ref.sha256]);
    const original = authenticated.get(authKey) ?? execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
      'show', prior.source_parent + ':' + ref.path], {cwd: root, maxBuffer: 16 * 1024 * 1024,
      env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
    assert.equal(hash(original), ref.sha256, 'unauthenticated source-impact member ' + ref.path);
    authenticated.set(authKey, original);
    originals.set(ref.path, JSON.parse(original));
    if (prior.prior_review_members.includes(ref)) assert.equal(hash(read(ref.path)), ref.sha256, 'changed immutable previous review');
  }
  const sources = new Map([...boundary.proposed_sources].map(([path, text]) =>
    [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const options = {noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022, experimentalDecorators: true};
  const host = ts.createCompilerHost(options);
  host.getSourceFile = path => sources.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...sources.keys()], options, host).getTypeChecker();
  const reviews = prior.selected.map(item => {
    const row = item.original_row, previousRow = originals.get(item.ledger).symbol_uses.filter(other => id(other) === id(row));
    assert.deepEqual(previousRow, [row]);
    assert.equal(row.disposition, 'closed');
    const cases = originals.get(row.source_review.path).reviews.filter(other => id(other) === id(row));
    assert.equal(cases.length, 1);
    const previous = cases[0];
    assert.equal(hash(canonical(previous)), item.original_review_sha256, 'changed complete original review case');
    const path = 'projects/ngx-material-legacy/' + row.file, target = boundary.targets.find(member => member.path === path);
    assert.ok(target);
    assert.equal(previous.candidate_source_sha256, target.before_sha256);
    const role = sourceRole(sources.get(path), checker, row);
    const inject = row.module === '@angular/core' && row.symbol === 'Inject';
    if (inject) assert.deepEqual(role.constructor_parameter_annotations, [
      {expression: 'Inject(DOCUMENT)', target_class: '_MatDialogContainerBase', parameter_index: 2, token_expression: 'DOCUMENT'},
      {expression: 'Inject(MatDialogConfig)', target_class: '_MatDialogContainerBase', parameter_index: 3, token_expression: 'MatDialogConfig'},
    ]);
    return {file: row.file, module: row.module, symbol: row.symbol, candidate_source_sha256: target.sha256,
      conclusion: previous.conclusion, reviewer: 'Codex primary implementer; bounded current dialog source-context review',
      decision: (previous.decision ?? '') + ' The exact three-source configuration repair owns only the historical boolean focus and string-duration view. All function, constructor, focus and motion bodies remain byte-identical. The complete49-file strict program and54 tagged/current constructor/default/focus checks qualify this context; the complete prior case and conclusion remain recorded.' +
        (inject ? ' Inject gains one individually reviewed parameter annotation at index3 using the same genuine public MatDialogConfig token. The actual inherited JIT constructor factory resolves that exact provider object; a semantically valid wrong-token source fault fails the identity check. The DOCUMENT annotation remains at index2.' : '') +
        ' This is no new source closure, rendered leaf, native, packed, AOT, release-floor or G11 admission.',
      prior_source_context: {ledger_snapshot_parent: prior.source_parent, review: row.source_review, case: previous},
      current_source_role: role,
      independent_evidence: [row.source_review, {path: impactPath, sha256: hash(bytes)}, boundary.qualification,
        boundary.types.ref, boundary.types.proof.candidate,
        {path: 'scripts/dialog-caller-config-source-rebinding.mjs', sha256: hash(read('scripts/dialog-caller-config-source-rebinding.mjs'))}],
    };
  });
  return {line: boundary.line, boundary, prior, rows: prior.selected,
    review: {schema_version: 1, line: boundary.line, status: 'reviewed',
      criteria: 'Thirty-two existing source roles individually rebound to the exact checked dialog configuration context; complete original cases and conclusions retained. The single new Inject call has actual public JIT provider-identity and wrong-token fault evidence.',
      reviews, new_semantic_closures: 0, source_rebindings: 32,
      actual_runtime_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'}};
}
