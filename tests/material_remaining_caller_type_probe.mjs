/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete owned graph and public consumer contracts; no Angular/native execution. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {materialRemainingCallerSource} from '../scripts/material-remaining-caller-contracts.mjs';
import {prepareMaterialRemainingPublicSubjects} from '../scripts/material-remaining-caller-public-subjects.mjs';
import {componentConfigGraph} from '../scripts/component-config-caller-contracts.mjs';
import {cdkModuleTypePublicRoute} from '../scripts/cdk-module-type-public-subjects.mjs';
const ts = createRequire(import.meta.url)('typescript'), root = process.cwd();
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const unstable = ['deprecated', 'breaking-change', 'docs-private', 'experimental', 'developerPreview'];
const fixture = `
import {InjectionToken, Type} from '@angular/core';
import {ComponentHarness, HarnessPredicate} from '@angular/cdk/testing';
import {MatFormFieldControl} from '@angular/material/form-field';
import {MatDividerModule} from '@angular/material/divider';
import {MatDividerHarness, DividerHarnessFilters} from '@angular/material/divider/testing';
import {MatDatepickerInputHarness, MatDateRangeInputHarness} from '@angular/material/datepicker/testing';
import {MatLegacyInput, MAT_LEGACY_INPUT_VALUE_ACCESSOR} from './projects/ngx-material-legacy/legacy-input/public-api';
import {MatLegacyFormFieldControl} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyFormFieldHarness} from './projects/ngx-material-legacy/legacy-form-field/testing/form-field-harness';
import {MatLegacyListHarnessBase} from './projects/ngx-material-legacy/legacy-list/testing/list-harness-base';
import {LegacyBaseListItemHarnessFilters} from './projects/ngx-material-legacy/legacy-list/testing/list-harness-filters';
class Item extends ComponentHarness {
  static hostSelector = '.type-fixture-item';
  static with(options: LegacyBaseListItemHarnessFilters = {}): HarnessPredicate<Item> {
    return new HarnessPredicate(Item, options);
  }
}
class InputExtension extends MatLegacyInput {
  protected override _getPlaceholder(): string | null {return super._getPlaceholder();}
}
declare const input: MatLegacyInput;
declare const form: MatLegacyFormFieldHarness;
declare const list: MatLegacyListHarnessBase<typeof Item, Item, LegacyBaseListItemHarnessFilters>;
const control: MatFormFieldControl<any> = input;
const legacyControl: MatLegacyFormFieldControl<any> = input;
const placeholder: string = control.placeholder;
const token: InjectionToken<any> = MAT_LEGACY_INPUT_VALUE_ACCESSOR;
const moduleType: Type<MatDividerModule> = MatDividerModule;
const filters: DividerHarnessFilters = {selector: '.type-fixture-divider'};
const dividers: Promise<MatDividerHarness[]> = list.getItemsWithSubheadersAndDividers({item: false, subheader: false, divider: filters});
const picker: Promise<MatDatepickerInputHarness | null> = form.getControl(MatDatepickerInputHarness);
const range: Promise<MatDateRangeInputHarness | null> = form.getControl(MatDateRangeInputHarness);
const pickerPredicate: Promise<MatDatepickerInputHarness | null> = form.getControl(MatDatepickerInputHarness.with({selector: '.picker'}));
const rangePredicate: Promise<MatDateRangeInputHarness | null> = form.getControl(MatDateRangeInputHarness.with({selector: '.range'}));
new MatLegacyInput();
// @ts-expect-error The approved input constructor no longer accepts retired manual dependencies.
new MatLegacyInput({});
// @ts-expect-error A real InjectionToken is not a numeric value.
const badToken: number = MAT_LEGACY_INPUT_VALUE_ACCESSOR;
// @ts-expect-error Reading the public placeholder contract produces a string.
const badPlaceholder: number = control.placeholder;
// @ts-expect-error The placeholder extension point remains protected.
input._getPlaceholder();
// @ts-expect-error Divider selectors remain strings.
const badFilters: DividerHarnessFilters = {selector: 1};
// @ts-expect-error Composed list queries retain the actual divider filter type.
list.getItemsWithSubheadersAndDividers({divider: {selector: 1}});
// @ts-expect-error Datepicker selectors remain strings.
MatDatepickerInputHarness.with({selector: 1});
// @ts-expect-error Date-range selectors remain strings.
MatDateRangeInputHarness.with({selector: 1});
// @ts-expect-error A control query is a harness constructor or predicate.
form.getControl(false);
// @ts-expect-error An optional datepicker control may be absent.
const requiredPicker: Promise<MatDatepickerInputHarness> = form.getControl(MatDatepickerInputHarness);
`;
assert.equal((fixture.match(/@ts-expect-error/g) ?? []).length, 10);
const ledgers = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json', 'compatibility/f10/disposition-ledger/ledger.json'];
const before = ledgers.map(path => hash(read(path))), source = materialRemainingCallerSource({root});
const loaded = prepareMaterialRemainingPublicSubjects(root);
try {
  const model = loaded.models.find(model => model.line === source.prior.line); assert.ok(model);
  const owned = join(model.root, 'owned'), graph = componentConfigGraph({root, selected: source.prior.selected});
  for (const [path, text] of source.sources) {
    const dest = join(owned, path); mkdirSync(dirname(dest), {recursive: true}); writeFileSync(dest, text, {flag: 'wx'});
  }
  const consumer = join(owned, 'consumer.ts'); writeFileSync(consumer, fixture, {flag: 'wx'});
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [], noEmit: true, strict: true, strictPropertyInitialization: false, noImplicitOverride: true,
    experimentalDecorators: true, skipLibCheck: false, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    paths: Object.fromEntries([...graph.routes].map(([spec, path]) => [spec, [join(owned, path)]]))};
  const program = ts.createProgram([...source.prior.sources.map(member => join(owned, member.path)), consumer], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
  const actual = program.getSourceFiles().filter(file => file.fileName.startsWith(owned + '/') && file.fileName !== consumer);
  assert.equal(actual.length, 91);
  for (const file of actual) assert.equal(hash(file.text), hash(source.sources.get(file.fileName.slice(owned.length + 1))));
  const checker = program.getTypeChecker();
  function exported(module, name) {
    const key = cdkModuleTypePublicRoute(model, module, 'types').key;
    const file = program.getSourceFile(join(model.root, 'node_modules', key)); assert.ok(file);
    const symbol = checker.getExportsOfModule(checker.getSymbolAtLocation(file)).find(symbol => symbol.name === name); assert.ok(symbol);
    return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  }
  function field(type, name) {
    const symbol = checker.getPropertyOfType(type, name); assert.ok(symbol);
    return {name, tags: symbol.getJsDocTags(checker).map(tag => tag.name), declarations: symbol.declarations.map(node => {
      const file = node.getSourceFile(), key = file.fileName.slice(join(model.root, 'node_modules').length + 1);
      assert.equal(hash(file.text), hash(model.sources.get(key)));
      return {key, sha256: hash(file.text), text: node.getText(), modifiers: (node.modifiers ?? []).map(modifier => ts.SyntaxKind[modifier.kind])};
    })};
  }
  const inputSymbol = exported('@angular/material/input', 'MatInput'), input = checker.getDeclaredTypeOfSymbol(inputSymbol);
  const extensionPoints = ['_isServer', '_isInlineSelect', '_getPlaceholder'].map(name => field(input, name));
  for (const point of extensionPoints) {
    assert.ok(point.tags.every(tag => !unstable.includes(tag)));
    assert.ok(point.declarations.every(declaration => !declaration.modifiers.includes('PrivateKeyword')));
  }
  const contract = checker.getDeclaredTypeOfSymbol(exported('@angular/material/form-field', 'MatFormFieldControl'));
  const placeholder = field(contract, 'placeholder'); assert.ok(placeholder.tags.every(tag => !unstable.includes(tag)));
  // Compare the instantiated types used by the source-entry consumer, rather
  // than two unrelated unbound generic declarations.
  const consumerSource = program.getSourceFile(consumer);
  const variables = consumerSource.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]);
  const instanceType = checker.getTypeFromTypeNode(variables.find(node => node.name.getText() === 'input').type);
  const contractType = checker.getTypeFromTypeNode(variables.find(node => node.name.getText() === 'control').type);
  assert.equal(contractType.symbol, exported('@angular/material/form-field', 'MatFormFieldControl'));
  assert.equal(checker.isTypeAssignableTo(instanceType, contractType), true);
  // This one implementation annotation is checked against both independent
  // public contracts below: the abstract control read and the Angular input.
  const implementation = field(input, 'placeholder');
  assert.ok(implementation.tags.every(tag => !unstable.filter(tag => tag !== 'docs-private').includes(tag)));
  assert.ok(implementation.declarations.every(declaration => !declaration.modifiers.includes('PrivateKeyword')));
  const declaration = inputSymbol.declarations.find(ts.isClassDeclaration); assert.ok(declaration);
  const directive = declaration.members.find(node => node.name?.getText() === 'ɵdir'); assert.ok(directive);
  const inputMap = directive.type.typeArguments[3]; assert.ok(ts.isTypeLiteralNode(inputMap));
  const publicInput = inputMap.members.find(node => node.name.text === 'placeholder'); assert.ok(publicInput);
  const alias = ts.isTypeLiteralNode(publicInput.type) ? publicInput.type.members.find(node => node.name.text === 'alias')?.type : publicInput.type;
  assert.ok(ts.isLiteralTypeNode(alias)); assert.equal(alias.literal.text, 'placeholder');
  assert.deepEqual(ledgers.map(path => hash(read(path))), before);
  const report = {schema_version: 1, line: model.line, node: process.version, typescript: ts.version,
    source: source.ref, SDK: loaded.material_remaining_capsule, owned_source_files: actual.length, diagnostics: 0,
    strict: true, strictPropertyInitialization: false, noImplicitOverride: true, experimentalDecorators: true,
    skipLibCheck: false, fixture_sha256: hash(fixture), negative_type_controls: 10,
    negative_controls_enforced_by_unused_expect_error_diagnostics: true,
    consumed_input_extension_points: extensionPoints,
    placeholder_public_contract: {abstract_control: placeholder, public_angular_input_metadata: publicInput.getText(),
      implementation_annotation_retained: implementation, source_instance_type: checker.typeToString(instanceType),
      public_contract_type: checker.typeToString(contractType), class_assignable_to_public_contract: true},
    canonical_ledgers_unchanged: true, product_changes: 0, source_closures: 0,
    actual_Angular_factory_or_runtime_executed: false, actual_native_packed_AOT_or_full_floor_qualified: false,
    g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: model.line, owned_sources: actual.length, diagnostics: 0, negative_type_controls: 10,
    public_input_extension_points: extensionPoints.length, public_placeholder_contract_checked: true, source_closures: 0}));
} finally {loaded.dispose();}
