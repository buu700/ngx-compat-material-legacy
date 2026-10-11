/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Read-only finite before/after review of menu-repair import evidence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewElementRefUses} from './element-ref-use-review.mjs';
import {scanChangeDetectorUses} from './change-detector-use-review.mjs';
import {reviewCurrentInjectionContexts} from './current-injection-context-review.mjs';
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MENU_IMPORT_INPUTS = 'compatibility/rc/historical-menu-import-requalification-inputs.json';
const inputSha = 'a2cb2a361fce6ad71af5722c3c1b58ed22ef6dc3965f4b4e0d1b1e9fe68e499b';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prefix = 'projects/ngx-material-legacy/';
const adapter = 'legacy-menu/internal/menu-item-context.ts';
const historical = 'legacy-menu/internal/menu-item-base.ts';
const groups = [
  ['element-ref', 'public-element-ref-boundary', 'element-ref-minimum-source-diagnostic', 'owned-menu-item-element-ref-requalification'],
  ['change-detector', 'public-change-detector-boundary', 'change-detector-minimum-source-diagnostic', 'owned-menu-item-detector-requalification'],
  ['injection-context', 'current-injection-context-boundaries', 'current-injection-context-source-proof', 'owned-menu-item-current-context-requalification'],
];
const key = row => [row.file, row.module, row.symbol].join('\0');
// Only observation locations and authenticated source identities are excluded
// from role-shape comparison. All token/type/call/constructor flags remain.
function roleShape(value) {
  if (Array.isArray(value)) return value.map(roleShape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([name]) => !['line', 'candidate_source_sha256', 'source_sha256'].includes(name))
    .map(([name, item]) => [name, roleShape(item)]));
  return value;
}
function index(rows) {const result = new Map(rows.map(row => [key(row), row])); assert.equal(result.size, rows.length); return result;}
function cases(report) {return (report.source_review || report).cases;}
function counter(rows) {
  const result = new Map(); for (const row of rows) {
    const key = JSON.stringify([row.file, row.method, row.expression]); result.set(key, (result.get(key) || 0) + 1);
  } return result;
}

export async function inspectHistoricalMenuImportRequalification({root = defaultRoot, readMember} = {}) {
  const read = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const raw = read(MENU_IMPORT_INPUTS); assert.equal(hash(raw), inputSha, 'menu import input identity changed');
  const inputs = JSON.parse(raw); assert.equal(inputs.schema_version, 1);
  const manifest = JSON.parse(read(prefix + 'package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  const selected = inputs.lines[line]; assert.ok(selected);
  const documents = new Map();
  for (const [path, expected] of Object.entries(selected.members)) {
    const bytes = read(path); assert.equal(hash(bytes), expected, 'menu import evidence identity changed: ' + path);
    documents.set(path, JSON.parse(bytes));
  }
  const source = path => read(path).toString('utf8');
  const fresh = {
    'element-ref': await reviewElementRefUses({root, skipDiagnostics: true, readSource: source}),
    'change-detector': scanChangeDetectorUses({root, readSource: source}),
    'injection-context': reviewCurrentInjectionContexts({root, readSource: source}),
  };
  const result = [];
  for (const [name, reviewName, beforeName, afterName] of groups) {
    const prior = documents.get('compatibility/f10/authored-use-reviews/' + reviewName + '.json');
    const before = documents.get('compatibility/rc/' + beforeName + '.json');
    const after = documents.get('compatibility/rc/' + afterName + '.json');
    assert.equal(prior.line, line); assert.equal(after.line, line);
    const old = index(cases(before)), current = index(cases(after));
    const observed = index(cases(fresh[name]));
    assert.deepEqual([...observed.keys()].sort(), [...current.keys()].sort(), 'fresh source population differs: ' + name);
    for (const [identity, row] of current) assert.deepEqual(observed.get(identity), row,
      'fresh source role differs from executed evidence: ' + identity);
    for (const row of current.values()) assert.equal(hash(read(prefix + row.file)), row.candidate_source_sha256);
    const retired = [...old.values()].filter(row => !current.has(key(row)));
    const added = [...current.values()].filter(row => !old.has(key(row)));
    assert.deepEqual(retired.map(row => row.file), [name === 'injection-context' ? 'legacy-menu/menu-item.ts' : adapter]);
    assert.deepEqual(added.map(row => row.file), name === 'injection-context' ? [] : [historical]);
    const common = [...old.values()].filter(row => current.has(key(row)));
    for (const row of common) assert.deepEqual(roleShape(row), roleShape(current.get(key(row))), 'existing import role changed: ' + key(row));
    const changedSources = prior.reviews.filter(row => current.has(key(row))
      && row.candidate_source_sha256 !== current.get(key(row)).candidate_source_sha256).map(row => row.file).sort();
    assert.deepEqual(changedSources, name === 'injection-context' ? []
      : ['legacy-menu/internal/menu-base.ts', 'legacy-menu/internal/menu-trigger-base.ts']);
    const originalRows = prior.reviews.filter(row => current.has(key(row)));
    assert.equal(originalRows.length, name === 'element-ref' ? 71 : name === 'change-detector' ? 38 : 9);
    result.push({group: name, prior_review_path: 'compatibility/f10/authored-use-reviews/' + reviewName + '.json',
      prior_review_sha256: selected.members['compatibility/f10/authored-use-reviews/' + reviewName + '.json'],
      old_cases: old.size, current_cases: current.size, common_roles_unchanged: common.length,
      changed_source_rows_reviewed_individually: changedSources,
      changed_source_reason: name === 'injection-context' ? 'No remaining guard source changed.'
        : 'The approved menu item type now names the owned historical base; the public item token is kept for queries and explicit self/optional trigger injection. ElementRef/ChangeDetectorRef types, token expressions and call sites are unchanged apart from observation line offsets.',
      retired_cases: retired, added_cases: added, current_cases_for_review: [...current.values()]});
  }
  const beforeDetector = documents.get('compatibility/rc/change-detector-minimum-source-diagnostic.json');
  const afterDetector = documents.get('compatibility/rc/owned-menu-item-detector-requalification.json');
  assert.deepEqual(fresh['change-detector'].calls, afterDetector.calls);
  const oldCalls = counter(beforeDetector.calls), newCalls = counter(afterDetector.calls);
  const extra = [];
  for (const [key, count] of oldCalls) assert.ok((newCalls.get(key) || 0) >= count, 'historical detector call removed');
  for (const [key, count] of newCalls) for (let i = oldCalls.get(key) || 0; i < count; i++) extra.push(JSON.parse(key));
  assert.deepEqual(extra, [[historical, 'markForCheck', 'this._changeDetectorRef?.markForCheck()'],
    [historical, 'markForCheck', 'this._changeDetectorRef?.markForCheck()']]);
  const api = documents.get('compatibility/rc/owned-menu-item-minimum-api-diagnostic.json');
  assert.equal(api.actual_JIT_factory_subjects, 4); assert.equal(api.runtime_mutations_rejected, 44);
  assert.equal(api.settlement_mutations_rejected, 76); assert.equal(api.packed_or_native_qualified, false);
  const runtime = documents.get('compatibility/rc/owned-menu-item-runtime-diagnostic.json');
  assert.equal(runtime.results.length, 6); assert.equal(runtime.g11_claim, 'not-passed');
  assert.equal(runtime.sources.base, hash(read(prefix + historical)), 'tested historical item base changed');
  assert.equal(runtime.sources.leaf, hash(read(prefix + 'legacy-menu/menu-item.ts')), 'tested historical item leaf changed');
  assert.equal(hash(read(runtime.original_subject.path)), runtime.original_subject.sha256, 'original item oracle changed');
  const authority = documents.get('compatibility/rc/owned-menu-item-implementation-decision.json');
  assert.equal(authority.authority.kind, 'explicit-owner-approved-historical-implementation');
  const element = documents.get('compatibility/rc/owned-menu-item-element-ref-requalification.json');
  assert.equal(element.source_override_used, false); assert.equal(element.mutations.length, 21);
  assert.equal(afterDetector.source_override_used, false); assert.equal(afterDetector.source_mutations.length, 8);
  assert.equal(afterDetector.runtime_mutations.length, 8);
  const context = documents.get('compatibility/rc/owned-menu-item-current-context-requalification.json');
  assert.equal(context.source_negative_controls.length, 26); assert.equal(context.runtime_controls.length, 12);
  return {schema_version: 1, line, source_commit: selected.source_commit,
    input_capsule_sha256: inputSha, groups: result, original_detector_calls_retained: beforeDetector.calls.length,
    added_historical_detector_calls: extra,
    limits: 'Finite public import/type/token/member/context requalification only. Exact source roles, unchanged existing calls and authenticated executed evidence are checked; the two changed menu sources are individually scoped above. Native/AOT/packed/application/scheduler, full consumer floors and substantive upstream/security obligations remain separate.',
    g11_claim: 'not-passed'};
}
