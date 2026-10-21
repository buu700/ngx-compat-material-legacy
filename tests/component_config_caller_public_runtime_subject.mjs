/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual SDK tokens/defaults/services; public dispatcher/overlay-owner overrides are disclosed payloads. */
import assert from 'node:assert/strict';

const [line, mode] = process.argv.slice(2);
await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const browser = await import('@angular/platform-browser');
const {documentProtocol} = await import('./a11y-node-protocol.mjs');
if (mode === 'production') core.enableProdMode();
const port = documentProtocol(core);
globalThis.document = port.document;
globalThis.window = port.window;
globalThis.getComputedStyle = port.window.getComputedStyle;
const namespaces = new Map();
for (const name of ['autocomplete', 'checkbox', 'list', 'paginator', 'progress-bar',
  'progress-spinner', 'radio', 'select', 'snack-bar', 'tooltip']) {
  namespaces.set(name, await import('@angular/material/' + name));
}
const scrolling = await import('@angular/cdk/scrolling'), rx = await import('rxjs');
const calls = [], scrollEvents = new rx.Subject();
const dispatcher = {scrolled(throttle) {calls.push(throttle ?? null); return scrollEvents.asObservable();}};
const application = await browser.createApplication({providers: [
  core.importProvidersFrom(namespaces.get('tooltip').MatTooltipModule,
    namespaces.get('autocomplete').MatAutocompleteModule),
  core.provideZoneChangeDetection({eventCoalescing: false, runCoalescing: false}),
  {provide: core.PLATFORM_ID, useValue: 'browser'},
  {provide: common.DOCUMENT, useValue: port.document},
  {provide: core.CSP_NONCE, useValue: null},
  {provide: core.RendererFactory2, useValue: {createRenderer: port.renderer}},
  {provide: scrolling.ScrollDispatcher, useValue: dispatcher},
]});
const cases = [], observations = {tokens: [], defaults: {}, scroll: {}, paginator: {}, dataClasses: {}};
const payload = value => value === undefined ? {kind: 'undefined'} : value === null ? null :
  ['string', 'number', 'boolean'].includes(typeof value) ? value :
    typeof value === 'function' ? {kind: 'function'} : Array.isArray(value) ? value.map(payload) :
      Object.fromEntries(Object.keys(value).sort().map(key => [key, payload(value[key])]));
const tokens = [
  ['select', 'MAT_SELECT_TRIGGER'], ['select', 'MAT_SELECT_CONFIG'],
  ['snack-bar', 'MAT_SNACK_BAR_DATA'], ['snack-bar', 'MAT_SNACK_BAR_DEFAULT_OPTIONS'],
  ['radio', 'MAT_RADIO_GROUP'], ['radio', 'MAT_RADIO_DEFAULT_OPTIONS'],
  ['list', 'MAT_LIST'], ['list', 'MAT_NAV_LIST'],
  ['checkbox', 'MAT_CHECKBOX_DEFAULT_OPTIONS'],
  ['progress-spinner', 'MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS'],
  ['tooltip', 'MAT_TOOLTIP_DEFAULT_OPTIONS'], ['tooltip', 'MAT_TOOLTIP_SCROLL_STRATEGY'],
  ['autocomplete', 'MAT_AUTOCOMPLETE_DEFAULT_OPTIONS'], ['autocomplete', 'MAT_AUTOCOMPLETE_SCROLL_STRATEGY'],
];
try {
  const values = new Set();
  for (const [family, name] of tokens) {
    const token = namespaces.get(family)[name];
    assert.ok(token instanceof core.InjectionToken, 'public token identity ' + name);
    assert.equal(values.has(token), false, 'unexpected token alias ' + name);
    values.add(token);
    assert.equal((await import('@angular/material/' + family))[name], token);
    observations.tokens.push({family, name, genuineInjectionToken: true, repeatedImportIdentity: true,
      distinctFromOtherSelectedTokens: true});
    cases.push('genuine-public-token-' + name);
  }
  for (const [family, name] of tokens.filter(([, name]) => name.endsWith('_DEFAULT_OPTIONS'))) {
    const token = namespaces.get(family)[name], value = application.injector.get(token);
    assert.equal(application.injector.get(token), value, 'root default identity ' + name);
    observations.defaults[name] = payload(value);
    cases.push('genuine-root-default-' + name);
  }
  for (const [family, name] of tokens.filter(([, name]) => !name.endsWith('_DEFAULT_OPTIONS') &&
    !name.endsWith('_SCROLL_STRATEGY'))) {
    const token = namespaces.get(family)[name], missing = {};
    const value = application.injector.get(token, missing);
    observations.defaults[name] = value === missing ? {kind: 'no-root-default'} : payload(value);
    cases.push('genuine-optional-default-' + name);
  }
  for (const [family, name] of tokens.filter(([, name]) => name.endsWith('_SCROLL_STRATEGY'))) {
    const factory = application.injector.get(namespaces.get(family)[name]);
    assert.equal(typeof factory, 'function');
    assert.equal(application.injector.get(namespaces.get(family)[name]), factory);
    const strategy = factory(), second = factory();
    assert.notEqual(strategy, second, 'each factory call owns its strategy');
    let updates = 0;
    const owner = {updatePosition() {updates++;}, hasAttached() {return true;}};
    assert.equal(typeof strategy.attach, 'function');
    assert.equal(typeof strategy.enable, 'function');
    assert.equal(typeof strategy.disable, 'function');
    strategy.attach(owner);
    const count = calls.length;
    strategy.enable();
    assert.equal(calls.length, count + 1, 'actual strategy dispatcher subscription');
    scrollEvents.next();
    assert.equal(updates, 1, 'actual strategy updates the supplied overlay owner');
    strategy.disable();
    scrollEvents.next();
    assert.equal(updates, 1, 'disabled strategy stops position updates');
    observations.scroll[name] = {dispatcherSubscriptions: 1, throttle: payload(calls.at(-1)),
      singletonFactory: true, distinctStrategyInstances: true, actualStrategyUpdatesOwner: true,
      disablingStopsUpdates: true};
    cases.push('genuine-scroll-factory-strategy-and-public-dispatcher-payload-' + name);
  }
  const tooltip = namespaces.get('tooltip');
  assert.equal(typeof tooltip.SCROLL_THROTTLE_MS, 'number');
  observations.scroll.SCROLL_THROTTLE_MS = tooltip.SCROLL_THROTTLE_MS;
  cases.push('genuine-tooltip-scroll-throttle-value');

  const {MatPaginatorIntl, PageEvent} = namespaces.get('paginator');
  const intl = new MatPaginatorIntl();
  const rootIntl = application.injector.get(MatPaginatorIntl);
  assert.ok(rootIntl instanceof MatPaginatorIntl);
  assert.equal(application.injector.get(MatPaginatorIntl), rootIntl);
  const ranges = [[0, 0, 0], [0, 10, 100], [2, 10, 21], [0, 10, -2],
    [99, 10, 45], [0, 0, 5], [4, 2, -5], [0, 10, 5]];
  observations.paginator = {manualConstructorOutsideDI: true, rootServiceIdentity: true,
    labels: Object.fromEntries(['itemsPerPageLabel', 'nextPageLabel', 'previousPageLabel',
      'firstPageLabel', 'lastPageLabel'].map(key => [key, intl[key]])),
    ranges: ranges.map(args => ({args, value: intl.getRangeLabel(...args)}))};
  cases.push('genuine-paginator-manual-constructor-and-root-identity', 'genuine-paginator-label-and-range-matrix');
  let notifications = 0;
  const subscription = intl.changes.subscribe(() => notifications++);
  intl.itemsPerPageLabel = 'owner label';
  intl.getRangeLabel = () => 'owner range';
  intl.changes.next();
  assert.equal(notifications, 1);
  assert.equal(intl.itemsPerPageLabel, 'owner label');
  assert.equal(intl.getRangeLabel(1, 2, 3), 'owner range');
  subscription.unsubscribe();
  intl.changes.next();
  assert.equal(notifications, 1);
  observations.paginator.mutableLabelsAndRange = true;
  observations.paginator.realChangeSubjectAndUnsubscription = true;
  cases.push('genuine-paginator-customization-notification-and-unsubscription');
  assert.equal(typeof PageEvent, 'function');
  const event = new PageEvent();
  Object.assign(event, {previousPageIndex: 1, pageIndex: 2, pageSize: 10, length: 100});
  observations.dataClasses.PageEvent = payload(event);
  const {MatSnackBarConfig} = namespaces.get('snack-bar');
  assert.equal(typeof MatSnackBarConfig, 'function');
  observations.dataClasses.MatSnackBarConfig = payload(new MatSnackBarConfig());
  cases.push('genuine-page-event-manual-data-class', 'genuine-snack-config-manual-data-class');

  const token = namespaces.get('checkbox').MAT_CHECKBOX_DEFAULT_OPTIONS, supplied = {clickAction: 'noop'};
  const child = core.createEnvironmentInjector([{provide: token, useValue: supplied},
    {provide: MatPaginatorIntl, useValue: intl}], application.injector);
  try {
    assert.equal(child.get(token), supplied);
    assert.equal(child.get(MatPaginatorIntl), intl);
    assert.notEqual(application.injector.get(token), supplied);
    assert.notEqual(rootIntl, intl);
    observations.childProviderOverridesPreserveOwnerIdentity = true;
    cases.push('public-child-default-and-intl-owner-overrides');
  } finally {child.destroy();}
} finally {application.destroy();}
console.log(JSON.stringify({line, mode, cases, observations, SDK_source_rewrites: false,
  actual_public_application_and_injectors: true, actual_public_classes_and_factories: true,
  public_scroll_service_overrides_are_explicit_payload_protocols: true,
  DOM_visibility_renderer_and_borrowed_Zone_are_protocols: true, actual_owned_callers_executed: false,
  actual_native_packed_AOT_or_full_floor_qualified: false}));
