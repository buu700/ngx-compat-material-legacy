/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** The remaining twelve menu-invalidated import/type boundaries only. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewEventEmitterUses} from './event-emitter-use-review.mjs';
import {reviewInjectionTokenUses} from './injection-token-use-review.mjs';
import {reviewQueryListUses} from './query-list-use-review.mjs';
import {reviewOwnedCoercionInputTypes} from './coercion-input-type-review.mjs';
import {reviewPureCoercionUses} from './coercion-pure-use-review.mjs';
import {reviewDirectionalityUses} from './directionality-use-review.mjs';
import {reviewPassiveListenerUses} from './passive-listener-use-review.mjs';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const REMAINING_INPUTS = 'compatibility/rc/historical-menu-remaining-import-requalification-inputs.json';
const inputSha = '7762659b8cdb14c0a53f9d5aefe5293e774cb3c004a79aee5a9e0b4b1dc123ed';
const key = row => [row.file, row.module, row.symbol].join('\0');
const index = rows => {
  const result = new Map(rows.map(row => [key(row), row]));
  assert.equal(result.size, rows.length, 'duplicate remaining import role');
  return result;
};
const get = (value, path) => path.split('.').reduce((parent, name) => parent[name], value);
const omitted = new Set(['line', 'import_line', 'alias_line', 'candidate_source_sha256', 'emit_sha256']);
function shape(value) {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([name]) => !omitted.has(name)).map(([name, item]) =>
      [name, name === 'reference_lines' ? item.map(() => null) : shape(item)]));
  return value;
}
function inspectPanelSource(read) {
  const original = read('reference/material-16.2.14/interface-sources/menu-panel.ts').toString('utf8');
  const owned = read('projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts').toString('utf8');
  const declaration = source => source.slice(source.indexOf('export interface MatMenuPanel'));
  assert.equal(hash(original), '48ae888c7a12b733a45989cf0195bd42298203da9768e5354c31759004883b43');
  assert.equal(declaration(owned), declaration(original), 'historical owned panel declaration changed');
  const cases = [];
  for (const file of ['legacy-menu/internal/menu-base.ts', 'legacy-menu/internal/menu-trigger-base.ts']) {
    const text = read('projects/ngx-material-legacy/' + file).toString('utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    assert.equal(source.parseDiagnostics.length, 0);
    const imported = source.statements.filter(ts.isImportDeclaration);
    const local = imported.filter(node => node.moduleSpecifier.text === './menu-panel' && node.importClause?.isTypeOnly &&
      node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)).flatMap(node =>
      node.importClause.namedBindings.elements.filter(binding => binding.name.text === 'MatMenuPanel' && !binding.propertyName));
    assert.equal(local.length, 1, 'panel import must remain the exact owned type-only binding');
    for (const node of imported.filter(node => node.moduleSpecifier.text === '@angular/material/menu')) {
      assert.ok(!node.importClause?.namedBindings?.elements?.some(binding =>
        ['MatMenuPanel', 'MAT_MENU_PANEL'].includes((binding.propertyName || binding.name).text)), 'private peer panel import returned');
    }
    const references = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node.text === 'MatMenuPanel' && node !== local[0].name) {
        assert.ok(ts.isTypeReferenceNode(node.parent) || ts.isExpressionWithTypeArguments(node.parent) &&
          node.parent.parent.token === ts.SyntaxKind.ImplementsKeyword, 'owned panel type escapes into runtime');
        references.push({role: ts.SyntaxKind[node.parent.kind], expression: node.parent.getText(source)});
      }
      if (file.endsWith('/menu-base.ts') && ts.isIdentifier(node))
        assert.notEqual(node.text, 'MAT_MENU_PANEL', 'removed private seed token returned');
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(references.length > 0);
    cases.push({file, module: '@angular/material/menu', symbol: 'MatMenuPanel',
      candidate_source_sha256: hash(text), references});
  }
  const barrel = read('projects/ngx-material-legacy/legacy-menu/public-api.ts').toString('utf8');
  assert.equal(barrel.split("export type {MatMenuPanel as MatLegacyMenuPanel} from './internal/menu-panel';").length, 2,
    'historical public panel alias changed');
  return {owned_interface_sha256: hash(owned), untouched_interface_declaration_equal: true, cases,
    removed_private_token: {file: 'legacy-menu/internal/menu-base.ts', module: '@angular/material/menu', symbol: 'MAT_MENU_PANEL'}};
}

export async function inspectHistoricalMenuRemainingImports({root = rootDefault, readMember} = {}) {
  const read = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const bytes = read(REMAINING_INPUTS);
  assert.equal(hash(bytes), inputSha, 'remaining import inputs changed');
  const inputs = JSON.parse(bytes), manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main', docs = new Map();
  for (const [path, sha] of Object.entries(inputs.lines[line].members)) {
    const member = read(path);
    assert.equal(hash(member), sha, 'remaining import evidence changed: ' + path);
    docs.set(path, path.endsWith('.json') ? JSON.parse(member) : member);
  }
  const readSource = path => read(path).toString('utf8');
  const fresh = {
    emitter: await reviewEventEmitterUses({root, readSource, skipDiagnostics: true}),
    token: await reviewInjectionTokenUses({root, readSource, skipDiagnostics: true}),
    query: await reviewQueryListUses({root, readSource, skipDiagnostics: true}),
    'coercion-type': reviewOwnedCoercionInputTypes({root, readSource}),
    'coercion-pure': await reviewPureCoercionUses({root, readSource}),
    directionality: reviewDirectionalityUses({root, readSource}),
    passive: reviewPassiveListenerUses({root, readSource}),
  };
  const groups = [];
  for (const definition of inputs.groups) {
    const before = docs.get(definition.prior_diagnostic), after = docs.get(definition.fresh_diagnostic);
    const prior = docs.get(definition.prior_review), old = index(get(before, definition.prior_cases));
    const now = index(get(after, definition.fresh_cases)), actual = index(fresh[definition.id].cases);
    assert.equal(after.line, line); assert.equal(prior.line, line);
    assert.deepEqual([...old.keys()].sort(), [...now.keys()].sort(), 'remaining import roster changed');
    assert.deepEqual([...actual.keys()].sort(), [...now.keys()].sort(), 'fresh remaining roster changed');
    const changedRoles = [];
    for (const [id, row] of old) {
      assert.deepEqual(actual.get(id), now.get(id), 'fresh remaining source differs: ' + id);
      const expected = structuredClone(row);
      if (definition.id === 'directionality' && row.file === 'legacy-menu/internal/menu-trigger-base.ts') {
        let replacements = 0;
        for (const context of expected.contexts) {
          const before = '@Optional() @Self() private _menuItemInstance: MatMenuItem';
          if (context.source.includes(before)) {
            assert.equal(context.source.split(before).length, 2);
            context.source = context.source.replace(before, '@Optional() @Self() @Inject(PeerMatMenuItem) private _menuItemInstance: MatMenuItem');
            replacements++;
          }
        }
        assert.equal(replacements, 1, 'direction context has an unreviewed menu constructor change');
        changedRoles.push(id);
      }
      assert.deepEqual(shape(expected), shape(now.get(id)), 'remaining dependency role changed: ' + id);
      assert.equal(hash(read('projects/ngx-material-legacy/' + row.file)), now.get(id).candidate_source_sha256);
    }
    const changedSources = prior.reviews.filter(row => row.candidate_source_sha256 !== now.get(key(row))?.candidate_source_sha256)
      .map(row => [row.file, row.symbol]);
    assert.equal(changedSources.length, definition.requalified_rows);
    assert.ok(changedSources.every(([file]) => ['legacy-menu/internal/menu-base.ts',
      'legacy-menu/internal/menu-trigger-base.ts'].includes(file)), 'unreviewed remaining caller change');
    if (definition.id === 'query') assert.deepEqual(shape(before.owned_contexts), shape(after.owned_contexts),
      'tagged owned QueryList method context changed');
    groups.push({group: definition.id, whole_group_cases: now.size, source_rows_requalified: changedSources,
      individually_reviewed_context_delta: changedRoles});
  }
  const panel = inspectPanelSource(read);
  const counts = {};
  for (const [id, count] of [['emitter', 18], ['token', 18], ['query', 22], ['coercion-type', 7], ['coercion-pure', 23]]) {
    const definition = inputs.groups.find(group => group.id === id);
    const document = docs.get(definition.fresh_diagnostic);
    const diagnostic = document.diagnostic || document;
    assert.equal(diagnostic.mutations.length, count);
    counts[id] = count;
  }
  const direction = docs.get(inputs.groups.find(group => group.id === 'directionality').fresh_diagnostic);
  assert.equal(direction.source_negative_controls, 10); assert.equal(direction.mutations.length, 12);
  const passive = docs.get(inputs.groups.find(group => group.id === 'passive').fresh_diagnostic);
  assert.equal(passive.source_mutations.length, 13); assert.equal(passive.runtime_mutations.length, 12);
  assert.equal(docs.get('compatibility/rc/owned-menu-item-implementation-decision.json').authority.kind,
    'explicit-owner-approved-historical-implementation');
  const annotation = docs.get('compatibility/rc/historical-menu-annotation-requalification-proof.json');
  assert.equal(annotation.line, line);
  assert.deepEqual(annotation.groups.map(group => group.changed_roles.length), [1, 1]);
  return {schema_version: 1, line, input_capsule_sha256: inputSha, groups, panel,
    producer_negative_controls: {...counts, direction_source: 10, direction_runtime: 12,
      passive_source: 13, passive_runtime: 12},
    source_requalified_rows: 12,
    decision: 'All emitter/token/query/coercion/passive boundary roles remain exact. Direction constructor context changes only by the separately authenticated explicit peer item annotation at the existing optional/self slot; direction slot/value/forwarding and the rest of the complete recorded contexts stay exact. Owned panel declaration/public alias is unchanged from the untouched tag; both local type-only imports are inspected and the unused private seed token remains absent. Genuine original/minimum protocol, erasure/type and mutation probes were run independently on both branches.',
    limits: 'Finite imported dependency/type/helper contracts only. Genuine namespace/framework providers use disclosed receiver/DOM/token/clock protocols; current node query/provider/full-trigger/native/AOT/packed and advertised Node/compiler/RxJS floors remain unqualified. The panel strict fixture uses the borrowed installed peer and does not qualify21 minima. No upstream/security/G11 clearance.',
    g11_claim: 'not-passed'};
}
