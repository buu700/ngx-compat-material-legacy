/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned constructors/factories and evaluated provider expressions; no generated views. */
import assert from 'node:assert/strict';

const [line, mode] = process.argv.slice(2);
await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), rx = await import('rxjs');
const {documentProtocol} = await import('./a11y-node-protocol.mjs');
if (mode === 'production') core.enableProdMode();
const port = documentProtocol(core);
globalThis.document = port.document;
globalThis.window = port.window;
globalThis.getComputedStyle = port.window.getComputedStyle;
const owned = path => import('./projects/ngx-material-legacy/' + path + '.mjs');
const {capturedDecorators} = await import('./owned-decorator-core.mjs');
const snack = await import('@angular/material/snack-bar');
const paginator = await import('@angular/material/paginator');
const selection = await import('@angular/material/select');
const radio = await import('@angular/material/radio');
const list = await import('@angular/material/list');
const cases = [], observations = {};
const {MatLegacySnackBarConfig} = await owned('legacy-snack-bar/snack-bar-config');
const config = new MatLegacySnackBarConfig();
assert.ok(config instanceof snack.MatSnackBarConfig);
assert.equal(config.politeness, 'assertive', 'owned-snack-config-retains-assertive');
observations.snackConfig = {politeness: config.politeness, peerSubtype: true};
cases.push('owned-snack-config-manual-constructor');
const snackBase = await owned('legacy-snack-bar/internal/snack-bar-base');
const defaultConfig = snackBase.MAT_SNACK_BAR_DEFAULT_OPTIONS_FACTORY();
assert.ok(defaultConfig instanceof MatLegacySnackBarConfig, 'owned-snack-factory-config-class');
assert.equal(defaultConfig.politeness, 'assertive', 'owned-snack-factory-retains-assertive');
cases.push('owned-snack-default-factory');
const {MatLegacySnackBarModule} = await owned('legacy-snack-bar/snack-bar-module');
const snackMetadata = capturedDecorators.get(MatLegacySnackBarModule)?.NgModule;
assert.ok(snackMetadata);
const injector = core.Injector.create({providers: snackMetadata.providers});
try {
  const supplied = injector.get(snack.MAT_SNACK_BAR_DEFAULT_OPTIONS);
  assert.ok(supplied instanceof MatLegacySnackBarConfig, 'owned-snack-module-provider-config-class');
  assert.equal(supplied.politeness, 'assertive', 'owned-snack-module-provider-retains-assertive');
  assert.equal(injector.get(snack.MAT_SNACK_BAR_DEFAULT_OPTIONS), supplied);
  observations.snackModuleProvider = {actualFactory: true, publicTokenIdentity: true,
    legacyConfig: true, politeness: supplied.politeness, singleton: true};
  cases.push('owned-snack-module-evaluated-provider');
} finally {injector.destroy();}

const overlay = await import('@angular/cdk/overlay');
const tooltip = await import('@angular/material/tooltip');
const autocomplete = await import('@angular/material/autocomplete');
const selectBase = await owned('legacy-select/internal/select-base');
observations.scrollProviders = [];
for (const [file, name, token, expected] of [
  ['legacy-tooltip/tooltip-module', 'MatLegacyTooltipModule', tooltip.MAT_TOOLTIP_SCROLL_STRATEGY, {scrollThrottle: 20}],
  ['legacy-autocomplete/autocomplete-module', 'MatLegacyAutocompleteModule', autocomplete.MAT_AUTOCOMPLETE_SCROLL_STRATEGY, null],
  ['legacy-select/select-module', 'MatLegacySelectModule', selectBase.MAT_SELECT_SCROLL_STRATEGY, null],
]) {
  const module = (await owned(file))[name], metadata = capturedDecorators.get(module)?.NgModule;
  assert.ok(metadata);
  const calls = [], value = {publicStrategyPayload: name};
  const service = {scrollStrategies: {reposition(options) {calls.push(options ?? null); return value;}}};
  const supplied = core.Injector.create({providers: [...metadata.providers, {provide: overlay.Overlay, useValue: service}]});
  try {
    const factory = supplied.get(token);
    assert.equal(factory(), value, 'owned-scroll-factory-result-' + name);
    assert.deepEqual(calls, [expected], 'owned-scroll-factory-options-' + name);
    observations.scrollProviders.push({module: name, actualFactory: true, evaluatedProvider: true,
      publicOverlayPayloadIdentity: true, options: calls[0]});
    cases.push('owned-evaluated-scroll-provider-' + name);
  } finally {supplied.destroy();}
}

const {MatLegacyPaginatorModule} = await owned('legacy-paginator/paginator-module');
const paginatorMetadata = capturedDecorators.get(MatLegacyPaginatorModule)?.NgModule;
assert.ok(paginatorMetadata);
const parentIntl = new paginator.MatPaginatorIntl();
parentIntl.itemsPerPageLabel = 'owner paginator label';
const parent = core.Injector.create({providers: [{provide: paginator.MatPaginatorIntl, useValue: parentIntl}]});
const child = core.Injector.create({providers: paginatorMetadata.providers, parent});
const fallback = core.Injector.create({providers: paginatorMetadata.providers});
try {
  assert.equal(child.get(paginator.MatPaginatorIntl), parentIntl, 'owned-paginator-intl-reuses-parent');
  const created = fallback.get(paginator.MatPaginatorIntl);
  assert.ok(created instanceof paginator.MatPaginatorIntl);
  assert.notEqual(created, parentIntl);
  assert.equal(created.getRangeLabel(0, 10, 100), '1 – 10 of 100');
  observations.paginatorIntlProvider = {parentIdentity: true, fallbackGenuineClass: true,
    fallbackRange: created.getRangeLabel(0, 10, 100)};
  cases.push('owned-paginator-evaluated-parent-and-fallback-provider');
} finally {child.destroy(); fallback.destroy(); parent.destroy();}

for (const [file, name, token] of [
  ['legacy-select/select', 'MatLegacySelectTrigger', selection.MAT_SELECT_TRIGGER],
  ['legacy-radio/radio', 'MatLegacyRadioGroup', radio.MAT_RADIO_GROUP],
  ['legacy-list/list', 'MatLegacyList', list.MAT_LIST],
  ['legacy-list/list', 'MatLegacyNavList', list.MAT_NAV_LIST],
]) {
  const type = (await owned(file))[name], metadata = capturedDecorators.get(type);
  assert.ok(metadata);
  const providers = (metadata.Component ?? metadata.Directive).providers;
  const ownerPayload = {ownerPayload: name};
  const instance = core.Injector.create({providers: [{provide: type, useValue: ownerPayload}, ...providers]});
  try {
    assert.equal(instance.get(token), ownerPayload, 'owned-provider-alias-' + name);
    cases.push('owned-evaluated-public-token-provider-' + name);
  } finally {instance.destroy();}
}
observations.componentProviderAliases = ['MatLegacySelectTrigger', 'MatLegacyRadioGroup', 'MatLegacyList', 'MatLegacyNavList'];

const {configurationConstructorCases} = await import('./constructor-cases.mjs');
const {MatLegacyPaginator} = await owned('legacy-paginator/paginator');
const {MatLegacyProgressBar} = await owned('legacy-progress-bar/progress-bar');
const {MatLegacyProgressSpinner} = await owned('legacy-progress-spinner/progress-spinner');
const constructors = configurationConstructorCases({core, port, classes: {Paginator: MatLegacyPaginator,
  SnackConfig: MatLegacySnackBarConfig, ProgressBar: MatLegacyProgressBar, ProgressSpinner: MatLegacyProgressSpinner},
  PaginatorIntl: paginator.MatPaginatorIntl});
observations.constructors = constructors.observations;
cases.push(...constructors.cases);
console.log(JSON.stringify({line, mode, cases, observations, SDK_source_rewrites: false,
  actual_owned_semantically_emitted_classes_and_factories: true,
  decorator_metadata_capture_and_owner_payloads_are_explicit_protocols: true,
  generated_Angular_module_factory_template_or_query_execution: false,
  actual_native_packed_AOT_or_full_floor_qualified: false}));
