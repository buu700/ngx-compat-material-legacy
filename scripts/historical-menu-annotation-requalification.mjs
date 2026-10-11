/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact annotation roles; full native query/provider behavior remains separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewPropertyDecoratorUses} from './property-decorator-use-review.mjs';
import {reviewParameterDecoratorUses} from './parameter-decorator-use-review.mjs';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const ANNOTATION_INPUTS = 'compatibility/rc/historical-menu-annotation-requalification-inputs.json';
const inputSha = '7f7318df1160f89229f031063f3a4805016ddc8d73056f84f0b60872481f08fb';
const key = row => [row.file, row.module, row.symbol].join('\0');
const index = rows => {
  const result = new Map(rows.map(row => [key(row), row]));
  assert.equal(result.size, rows.length, 'duplicate annotation role');
  return result;
};
const observations = new Set(['line', 'candidate_source_sha256', 'emit_sha256']);
function shape(value) {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([name]) => !observations.has(name)).map(([name, item]) => [name, shape(item)]));
  return value;
}
function publicPeerBinding(text, file) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const matches = source.statements.filter(ts.isImportDeclaration).filter(node =>
    node.moduleSpecifier.text === '@angular/material/menu' && node.importClause?.namedBindings &&
    ts.isNamedImports(node.importClause.namedBindings)).flatMap(node =>
    node.importClause.namedBindings.elements.filter(binding =>
      (binding.propertyName || binding.name).text === 'MatMenuItem' && binding.name.text === 'PeerMatMenuItem'));
  assert.equal(matches.length, 1, 'query/injection peer alias must denote the public MatMenuItem export');
  assert.equal(matches[0].isTypeOnly || matches[0].parent.parent.isTypeOnly, false,
    'peer query/injection token imported type-only');
}

export async function inspectHistoricalMenuAnnotationRequalification({root = rootDefault, readMember} = {}) {
  const read = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const bytes = read(ANNOTATION_INPUTS);
  assert.equal(hash(bytes), inputSha, 'annotation inputs changed');
  const inputs = JSON.parse(bytes), manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main', docs = new Map();
  for (const [path, sha] of Object.entries(inputs.lines[line].members)) {
    const member = read(path);
    assert.equal(hash(member), sha, 'annotation evidence changed: ' + path);
    docs.set(path, JSON.parse(member));
  }
  const readSource = path => read(path).toString('utf8');
  for (const file of ['legacy-menu/internal/menu-base.ts', 'legacy-menu/internal/menu-trigger-base.ts'])
    publicPeerBinding(readSource('projects/ngx-material-legacy/' + file), file);
  const fresh = {property: await reviewPropertyDecoratorUses({root, readSource, skipDiagnostics: true}),
    parameter: await reviewParameterDecoratorUses({root, readSource, skipDiagnostics: true})};
  const groups = [];
  for (const kind of ['property', 'parameter']) {
    const before = docs.get('compatibility/rc/' + kind + '-decorator-minimum-source-diagnostic.json');
    const after = docs.get('compatibility/rc/historical-menu-' + kind + '-requalification-diagnostic.json');
    assert.equal(after.line, line);
    const old = index(before.cases), now = index(after.cases), actual = index(fresh[kind].cases);
    assert.deepEqual([...actual.keys()].sort(), [...now.keys()].sort(), 'fresh annotation roster differs');
    for (const [id, row] of now)
      assert.deepEqual(actual.get(id), row, 'fresh annotation source differs: ' + id);
    assert.deepEqual([...old.keys()].filter(id => !now.has(id)), [], 'old annotation use lost');
    const added = [...now.values()].filter(row => !old.has(key(row)));
    assert.deepEqual(added.map(row => [row.file, row.symbol]), kind === 'property'
      ? [['legacy-menu/internal/menu-item-base.ts', 'Input']]
      : [['legacy-menu/internal/menu-item-base.ts', 'Inject'], ['legacy-menu/internal/menu-item-base.ts', 'Optional']]);
    const changed = [];
    for (const [id, row] of old) {
      const current = now.get(id);
      assert.equal(hash(read('projects/ngx-material-legacy/' + current.file)), current.candidate_source_sha256);
      if (JSON.stringify(shape(row)) === JSON.stringify(shape(current))) continue;
      changed.push(id);
      const expected = structuredClone(row);
      if (kind === 'property') {
        assert.equal(id, 'legacy-menu/internal/menu-base.ts\0@angular/core\0ContentChildren');
        assert.equal(expected.references.length, 2);
        for (const reference of expected.references) {
          assert.ok(reference.expression.startsWith('ContentChildren(MatMenuItem,'));
          reference.expression = reference.expression.replace('ContentChildren(MatMenuItem,', 'ContentChildren(PeerMatMenuItem,');
        }
      } else {
        assert.equal(id, 'legacy-menu/internal/menu-trigger-base.ts\0@angular/core\0Inject');
        expected.references.push({expression: 'Inject(PeerMatMenuItem)', role: 'constructor-parameter-annotation',
          target_class: '_MatMenuTriggerBase', parameter_index: 5, token_expression: 'PeerMatMenuItem'});
      }
      assert.deepEqual(shape(expected), shape(current), 'additional unreviewed annotation role change');
    }
    assert.equal(changed.length, 1);
    const counts = kind === 'property' ? [102, 322] : [114, 209];
    assert.equal(now.size, counts[0]);
    assert.equal(after.mutations.length, 23);
    assert.ok(after.mutations.every(control => control.rejected === true));
    for (const subject of after.authored_annotations) {
      assert.equal(subject.annotation_count, counts[1]);
      assert.equal(subject.annotations.length, counts[1]);
    }
    groups.push({group: kind, prior_roles: old.size, current_roles: now.size,
      unchanged_old_roles: old.size - changed.length, changed_roles: changed,
      added_cases: added, actual_annotations_per_subject: counts[1], producer_mutation_rejections: 23});
  }
  const base = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts';
  assert.equal(hash(read(base)), docs.get('compatibility/rc/owned-menu-item-runtime-diagnostic.json').sources.base);
  assert.equal(docs.get('compatibility/rc/owned-menu-item-implementation-decision.json').authority.kind,
    'explicit-owner-approved-historical-implementation');
  assert.equal(docs.get('compatibility/rc/owned-menu-item-minimum-api-diagnostic.json').actual_JIT_factory_subjects, 4);
  return {schema_version: 1, line, input_capsule_sha256: inputSha, groups,
    source_rows_for_review: 216,
    decision: 'One property role renames the selector spelling to the same public peer MatMenuItem token; both descendant options, targets and members stay exact. One constructor role adds an explicit public peer token at the existing optional/self item slot after its parameter type becomes owned. Three new base import roles restore the authentic historical Input role and Inject DOCUMENT/optional owned parent-panel annotations. All other old annotation shapes are exact; real original/minimum metadata factories replay every annotation. Existing authentic manual/JIT historical item proof is retained.',
    limits: 'Finite public metadata/flag/registration boundary only. Selector/read values, target classes and annotation token replay use explicit protocols. Actual public alias imports are inspected; complete native query/provider discovery, whole trigger DI, AOT/packed and advertised runtime/compiler/RxJS floors remain separate. No upstream/security/G11 clearance.',
    g11_claim: 'not-passed'};
}
