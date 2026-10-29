/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Explicit ownership judgments for every remaining tagged declaration; no implicit exclusion. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const root = process.cwd(), prefix = 'compatibility/rc/21x-base-class-removal-source-';
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex'), bound = new Map();
function readBound(path, expected) {
  const absolute = resolve(root, path), raw = readFileSync(absolute);
  if (expected) assert.equal(hash(raw), expected, path);
  const ref = {path: relative(root, absolute), sha256: hash(raw), bytes: raw.length};
  if (bound.has(absolute)) assert.deepEqual(bound.get(absolute), ref); else bound.set(absolute, ref);
  return raw;
}
assert.equal(process.version, 'v24.21.0'); assert.equal(ts.version, '5.9.2');
readBound(fileURLToPath(import.meta.url)); readBound(require.resolve('typescript'));
const initial = JSON.parse(readBound(prefix + 'owned-member-inventory.json'));
const supplement = JSON.parse(readBound(prefix + 'owned-closure-supplement.json'));
const imports = JSON.parse(readBound(prefix + 'public-binding-qualified.json'));
const rx = JSON.parse(readBound(prefix + 'rx-signature-qualified.json'));
for (const report of [initial, supplement, imports, rx]) for (const ref of report.source_bindings)
  assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);
assert.equal(imports.diagnostics.length, 0); assert.equal(rx.selected_deprecated_calls.length, 0);
const original = JSON.parse(gunzipSync(readBound(prefix + 'originals.json.gz')));
const allPairs = [...initial.pairs, ...supplement.additional_pairs];
const shared = new Set(['autocomplete:MatAutocompleteDefaultOptions', 'form-field:ErrorHarnessFilters',
  'menu:MatMenuDefaultOptions', 'paginator:MatPaginatorSelectConfig', 'paginator:PageEvent',
  'radio:MatRadioDefaultOptions', 'tooltip:MatTooltipDefaultOptions']);
const explicit = {'dialog:MatTestDialogOpener': 'dialog:MatTestLegacyDialogOpener',
  'dialog:MatTestDialogOpenerModule': 'dialog:MatTestLegacyDialogOpenerModule',
  'tooltip:TooltipComponent': 'tooltip:LegacyTooltipComponent'};
function declaration(body, name) {
  const source = ts.createSourceFile('subject.ts', body, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const node = source.statements.find(n => (ts.isClassDeclaration(n) || ts.isInterfaceDeclaration(n)) && n.name?.text === name);
  assert.ok(node, name); return {source, node};
}
function properties({source, node}) {
  return node.members.filter(n => ts.isPropertySignature(n) || ts.isPropertyDeclaration(n))
    .map(n => ({name: n.name.getText(source), optional: !!n.questionToken,
      type: n.type?.getText(source) || null,
      deprecated: ts.getJSDocTags(n).some(tag => tag.tagName.text === 'deprecated')}));
}
const rows = [];
for (const missing of supplement.still_unmatched_tagged_declarations) {
  const [family, name] = missing.key.split(':');
  const taggedMember = original.tagged_reference.members.find(m => m.path === missing.path);
  assert.ok(taggedMember); assert.equal(hash(taggedMember.body), taggedMember.sha256);
  const old = declaration(taggedMember.body, name);
  const base = {...missing, tagged_source_sha256: taggedMember.sha256};
  if (shared.has(missing.key)) {
    const uses = imports.observations.flatMap(row => row.named_symbols.filter(s => s.imported_name === name)
      .map(symbol => ({path: row.path, specifier: row.specifier, symbol})));
    assert.ok(uses.length, missing.key); assert.ok(uses.every(use => !use.symbol.deprecated));
    const target = uses[0].symbol.declarations[0];
    const actual = declaration(readBound(target.path).toString(), name);
    const oldProperties = properties(old), currentProperties = properties(actual);
    const propertyComparisons = oldProperties.map(property => {
      const current = currentProperties.find(p => p.name === property.name);
      assert.ok(current, missing.key + '.' + property.name);
      return {name: property.name, tagged: property, current,
        exact_type_spelling: property.type === current.type, optionality_equal: property.optional === current.optional};
    });
    rows.push({...base, category: 'historically-shared-public-data-contract', uses,
      property_comparisons: propertyComparisons,
      current_extra_properties: currentProperties.filter(p => !oldProperties.some(old => old.name === p.name)),
      judgment: 'Retain the historical shared public type/value role for its finite legacy fields;do not transplant the modern component. Every directly declared tagged field still exists at the actual minimum. Optional newer fields do not authorize modern structure,default values or features;own legacy constructors/default factories and call sites govern behavior. This is declaration inspection,not structural bidirectional type or runtime proof.'});
    continue;
  }
  if (missing.key === 'paginator:MatPaginatorDefaultOptions') {
    const owned = allPairs.find(p => p.key === 'paginator:MatLegacyPaginatorDefaultOptions'); assert.ok(owned);
    rows.push({...base, category: 'separate-owned-legacy-options', owned_path: owned.owned_path,
      judgment: 'The retained paginator owns MatLegacyPaginatorDefaultOptions and its distinct defaults token,including historical form-field appearances. The modern default-options interface and outline fallback do not replace that local generic contract.'}); continue;
  }
  if (missing.key === 'form-field:_MatErrorHarnessBase') {
    readBound(prefix + 'error-harness-assessment.json');
    rows.push({...base, category: 'removed-shared-base-with-required-local-helper-restoration',
      owned_path: 'projects/ngx-material-legacy/legacy-form-field/testing/error-harness.ts',
      judgment: 'The direct legacy class retains host/getText/predicate behavior but omits the historical protected helper. The exact minimum reproduction and unapplied local restoration proposal cover the gap. Do not silently discard this declaration or accept private current helper visibility.'}); continue;
  }
  const targetKey = explicit[missing.key] || family + ':MatLegacy' + name.replace(/^Mat/, '');
  const owned = allPairs.find(p => p.key === targetKey);
  assert.ok(owned, missing.key + ' -> ' + targetKey);
  readBound(owned.owned_path);
  const special = missing.key === 'tabs:MatTabBodyPortal' ? 'shared-portal-behavior-retained-through-public-parent-adapter'
    : missing.key === 'form-field:MatErrorHarness' ? 'modern-harness-instance-type-role-with-owned-legacy-behavior'
    : 'modern-concrete-declaration-not-transplanted';
  rows.push({...base, category: special, owned_counterpart: targetKey, owned_path: owned.owned_path,
    judgment: special === 'shared-portal-behavior-retained-through-public-parent-adapter'
      ? 'The historical legacy portal inherited this shared class. Its behavior is now owned by MatLegacyTabBodyPortal over genuine public CdkPortalOutlet with explicit host/centering/leaving cleanup. Current modern tab component/query contracts are not imported;prior constructor/factory/native scopes remain distinct.'
      : special === 'modern-harness-instance-type-role-with-owned-legacy-behavior'
        ? 'The legacy error harness has its own historical selector and instance behavior. The qualified restoration uses the public current harness only as the exact historical generic type constraint;no current runtime parent or modern selector is introduced.'
        : 'The owned counterpart retains the historical legacy component/event/harness contract through local bases or finite public-peer adapters. Folding tagged shared bases into this ordinary modern declaration does not authorize changing legacy selectors,queries,tokens,constructors or structure. The declaration is explicitly accounted for rather than excluded by its name alone.'});
}
assert.equal(rows.length, 65); assert.equal(new Set(rows.map(row => row.key)).size, 65);
for (const [path, ref] of bound) {
  const raw = readFileSync(path); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const report = {schema_version: 1, line: '21.x', sha: initial.sha, node: process.version, typescript: ts.version,
  role: 'Explicit source ownership judgments for all65remaining tagged declarations,including shared data contracts and removed helper/portal roles;not an implicit modern-only batch exclusion or full product admission',
  judgments: rows, declarations_accounted_for: rows.length, unaccounted_for: 0,
  shared_data_declarations: rows.filter(row => row.category === 'historically-shared-public-data-contract').length,
  direct_property_comparisons: rows.flatMap(row => row.property_comparisons || []).length,
  property_variances: rows.flatMap(row => (row.property_comparisons || []).filter(p =>
    !p.exact_type_spelling || !p.optionality_equal || p.current.deprecated).map(p => ({key: row.key, ...p}))),
  minimum_external_declaration_bindings_compiled: imports.external_declarations,
  minimum_named_symbol_uses_resolved: imports.named_symbol_uses,
  actual_rx_calls_with_nondeprecated_selected_overloads: rx.actual_calls,
  required_local_repairs_applied: false, product_changes: 0, canonical_dispositions_changed: 0,
  whole_SHA_substantive_review_complete: false, actual_native_packed_browser_floor_or_full_audit_qualified: false,
  g11_claim: 'not-passed', source_bindings: [...bound.values()]};
writeFileSync(prefix + 'unmatched-declarations-assessed.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'all-unmatched-tagged-declarations-source-accounted', declarations: rows.length,
  shared_data_declarations: report.shared_data_declarations, direct_property_comparisons: report.direct_property_comparisons,
  property_variances: report.property_variances.length, whole_SHA_qualified: false}));
