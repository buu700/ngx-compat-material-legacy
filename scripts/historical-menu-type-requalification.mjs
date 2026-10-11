/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source requalification; never a component or runtime-floor verdict. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewFrameworkEnumUses} from './framework-enum-use-review.mjs';
import {reviewFrameworkLifecycleTypes} from './framework-lifecycle-type-review.mjs';
import {reviewKeycodeUses} from './keycode-use-review.mjs';
import {reviewFocusOriginTypes} from './focus-origin-type-review.mjs';
import {reviewPositionTypes} from './position-type-use-review.mjs';

const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const TYPE_INPUTS = 'compatibility/rc/historical-menu-type-requalification-inputs.json';
const inputSha = '9215c5b6a26d0b8860342b731090918ba653981267efcfb38517f49572d7be5f';
const key = row => [row.file, row.module, row.symbol].join('\0');
const index = rows => {
  const result = new Map(rows.map(row => [key(row), row]));
  assert.equal(result.size, rows.length, 'duplicate type boundary');
  return result;
};
// Locations and emitted-byte identities are observations; member/type/call text
// and enum values remain in the comparison.
const observations = new Set(['line', 'import_line',
  'candidate_source_sha256', 'original_emit_sha256', 'erased_emit_sha256']);
function roleShape(value) {
  if (Array.isArray(value)) return value.map(roleShape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([name]) => !observations.has(name)).map(([name, item]) =>
      [name, name === 'reference_lines' ? item.map(() => null) : roleShape(item)]));
  return value;
}

/** Three explicitly enumerated new types in the authenticated historical base. */
export function inspectOwnedMenuItemTypeUses(text) {
  const file = 'legacy-menu/internal/menu-item-base.ts';
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true, emitDecoratorMetadata: false};
  const host = ts.createCompilerHost(options), read = host.readFile.bind(host);
  const path = resolve('/', file);
  host.readFile = name => name === path ? text : read(name);
  const program = ts.createProgram([path], options, host), source = program.getSourceFile(path);
  assert.equal(source.parseDiagnostics.length, 0);
  const checker = program.getTypeChecker(), cases = [], selected = new Set(['OnDestroy', 'AfterViewInit', 'FocusOrigin']);
  const imported = source.statements.filter(ts.isImportDeclaration);
  for (const [module, symbol] of [['@angular/core', 'OnDestroy'], ['@angular/core', 'AfterViewInit'],
    ['@angular/cdk/a11y', 'FocusOrigin']]) {
    const bindings = imported.filter(node => node.moduleSpecifier.text === module &&
      node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
      .flatMap(node => node.importClause.namedBindings.elements.filter(binding =>
        (binding.propertyName || binding.name).text === symbol));
    assert.equal(bindings.length, 1, 'missing/ambiguous owned-base type import: ' + symbol);
    const binding = bindings[0], identity = checker.getSymbolAtLocation(binding.name), references = [];
    assert.deepEqual(identity?.declarations, [binding], 'owned-base type shadowed');
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName &&
        checker.getSymbolAtLocation(node) === identity) {
        const parent = node.parent;
        if (symbol === 'FocusOrigin') {
          assert.ok(ts.isTypeReferenceNode(parent) && parent.typeName === node && !parent.typeArguments,
            'runtime or generic owned FocusOrigin use');
          assert.ok(ts.isParameter(parent.parent) && parent.parent.name.getText(source) === 'origin' &&
            ts.isMethodDeclaration(parent.parent.parent) && parent.parent.parent.name.getText(source) === 'focus',
            'FocusOrigin escaped the historical focus parameter');
          references.push({role: 'focus-parameter', expression: parent.parent.getText(source)});
        } else {
          assert.ok(ts.isExpressionWithTypeArguments(parent) && !parent.typeArguments &&
            ts.isHeritageClause(parent.parent) && parent.parent.token === ts.SyntaxKind.ImplementsKeyword &&
            parent.parent.parent.name?.text === '_LegacyMenuItemBase', 'runtime or nonhistorical lifecycle use');
          references.push({role: 'historical-implements', expression: parent.getText(source)});
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(references.length, 1, 'owned-base type reference count changed');
    cases.push({file, module, symbol, candidate_source_sha256: hash(text), references});
  }
  const edits = [];
  for (const node of imported) {
    if (!node.importClause?.namedBindings || !ts.isNamedImports(node.importClause.namedBindings)) continue;
    const bindings = node.importClause.namedBindings;
    const kept = bindings.elements.filter(binding => !selected.has((binding.propertyName || binding.name).text));
    if (kept.length === bindings.elements.length) continue;
    assert.ok(kept.length, 'owned-base removal unexpectedly deletes an entire import');
    edits.push([bindings.getStart(source), bindings.end, '{' + kept.map(binding => binding.getText(source)).join(', ')
      + (bindings.elements.hasTrailingComma ? ',' : '') + '}']);
  }
  let erased = text;
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
    erased = erased.slice(0, start) + replacement + erased.slice(end);
  const emit = raw => ts.transpileModule(raw, {compilerOptions: options}).outputText;
  assert.equal(emit(text), emit(erased), 'owned-base type removal changed executable emit');
  return {cases, emit_sha256: hash(emit(text)), erased_emit_sha256: hash(emit(erased)),
    metadata_mode: 'emitDecoratorMetadata:false', compiler: ts.version};
}

export async function inspectHistoricalMenuTypeRequalification({root = rootDefault, readMember} = {}) {
  const read = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const bytes = read(TYPE_INPUTS);
  assert.equal(hash(bytes), inputSha, 'type requalification inputs changed');
  const inputs = JSON.parse(bytes), manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main', docs = new Map();
  for (const [path, sha] of Object.entries(inputs.lines[line].members)) {
    const member = read(path);
    assert.equal(hash(member), sha, 'type evidence changed: ' + path);
    docs.set(path, JSON.parse(member));
  }
  const readSource = path => read(path).toString('utf8');
  const fresh = {enum: reviewFrameworkEnumUses({root, readSource}),
    lifecycle: reviewFrameworkLifecycleTypes({root, readSource}),
    keycodes: await reviewKeycodeUses({root, readSource}),
    'focus-origin': reviewFocusOriginTypes({root, readSource}),
    position: reviewPositionTypes({root, readSource})};
  const groups = [];
  for (const definition of inputs.groups) {
    const savedBefore = docs.get(definition.prior_diagnostic), before = savedBefore.diagnostic || savedBefore;
    const after = docs.get(definition.fresh_diagnostic), prior = docs.get(definition.prior_review);
    assert.equal(after.line, line); assert.equal(prior.line, line);
    const old = index(before.cases), now = index(after.cases), actual = index(fresh[definition.id].cases);
    const reviewed = index(prior.reviews);
    assert.equal(now.size, definition.current_cases);
    assert.deepEqual([...old.keys()], [...now.keys()], 'type/literal roster changed');
    assert.deepEqual([...actual.values()], [...now.values()], 'fresh type source differs');
    const changed = [], olderDiagnosticChanges = [];
    for (const [id, row] of old) {
      assert.deepEqual(roleShape(row), roleShape(now.get(id)), 'type/literal role changed: ' + id);
      const current = now.get(id);
      assert.equal(hash(read('projects/ngx-material-legacy/' + current.file)), current.candidate_source_sha256);
      if (row.candidate_source_sha256 !== current.candidate_source_sha256)
        olderDiagnosticChanges.push([current.file, current.symbol]);
      if (reviewed.get(id)?.candidate_source_sha256 !== current.candidate_source_sha256)
        changed.push([current.file, current.symbol]);
    }
    assert.equal(changed.length, definition.requalified_rows);
    assert.ok(changed.every(([file]) => ['legacy-menu/menu-item.ts', 'legacy-menu/internal/menu-base.ts',
      'legacy-menu/internal/menu-trigger-base.ts'].includes(file)), 'unreviewed non-menu source change');
    assert.equal(after.mutations.length, {enum: 20, lifecycle: 18, keycodes: 24, 'focus-origin': 13, position: 25}[definition.id]);
    assert.ok(after.mutations.every(mutation => definition.id === 'keycodes'
      ? mutation.result === 'rejected' : mutation.rejected === true), 'unrejected producer mutation');
    groups.push({id: definition.id, cases: now.size, unchanged_roles: old.size,
      changed_source_rows: changed, older_diagnostic_source_observations_changed: olderDiagnosticChanges,
      producer_mutation_rejections: after.mutations.length});
  }
  const basePath = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts';
  const owned = inspectOwnedMenuItemTypeUses(readSource(basePath));
  assert.equal(hash(read(basePath)), docs.get('compatibility/rc/owned-menu-item-runtime-diagnostic.json').sources.base);
  assert.equal(docs.get('compatibility/rc/owned-menu-item-implementation-decision.json').authority.kind,
    'explicit-owner-approved-historical-implementation');
  assert.equal(docs.get('compatibility/rc/owned-menu-item-minimum-api-diagnostic.json').actual_JIT_factory_subjects, 4);
  return {schema_version: 1, line, input_capsule_sha256: inputSha, groups, owned,
    requalified_frozen_rows: groups.reduce((total, group) => total + group.changed_source_rows.length, 0),
    new_current_type_rows: owned.cases.length,
    decision: 'All prior enum metadata, lifecycle/default type, keycode/modifier, focus-origin and position type roles remain exact after the approved menu restoration. Three new owned-base imports are single historical implements/parameter types and erase without executable changes; their public original/minimum declarations and strict domains are independently exercised by the existing complete producers. Historical class/API behavior is separately authenticated.',
    limits: 'Finite type/literal/import roles and pure modifier behavior only. No full class/type checking, hook invocation, focus routing, keyboard routes, node providers, native/AOT/packed or advertised runtime/compiler/RxJS floors. No upstream/security/G11 clearance.',
    g11_claim: 'not-passed'};
}
