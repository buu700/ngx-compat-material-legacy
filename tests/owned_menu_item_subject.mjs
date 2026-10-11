/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line, production] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode = false;
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const a11y = await import('@angular/cdk/a11y'), coercion = await import('@angular/cdk/coercion'), rx = await import('rxjs');
const metadata = new WeakMap();
Reflect.metadata = (key, value) => target => {const values = metadata.get(target) || new Map(); values.set(key, value); metadata.set(target, values);};
Reflect.getOwnMetadata = (key, target) => metadata.get(target)?.get(key);
const payload = JSON.parse(readFileSync(new URL('./owned-menu-item-payload.json', import.meta.url)));
const panelToken = new core.InjectionToken('MAT_MENU_PANEL');
function load(baseSource, leafSource, original = false) {
  const mixins = {}, base = {}, leaf = {};
  for (const source of payload.mixins) new Function('exports', 'require', source)(mixins, spec => {assert.equal(spec, '@angular/cdk/coercion'); return coercion;});
  const modules = {'@angular/core': {...core, DOCUMENT: core.DOCUMENT || common.DOCUMENT}, '@angular/common': common,
    '@angular/cdk/a11y': a11y, rxjs: rx, '@angular/material/core': mixins, './common-behaviors': mixins,
    './common-behaviors/disabled': mixins, './common-behaviors/disable-ripple': mixins,
    './menu-panel': {MAT_MENU_PANEL: panelToken}, './menu-panel-token': {MAT_MENU_PANEL: panelToken}};
  new Function('exports', 'require', baseSource)(base, spec => {assert.ok(modules[spec], spec); return modules[spec];});
  const parent = original ? base.MatMenuItem : base._LegacyMenuItemBase;
  new Function('exports', 'require', leafSource)(leaf, spec => {
    if (spec === '@angular/core') return core;
    if (spec === './internal/menu-item-base') return base;
    assert.equal(spec, '@angular/material/menu'); return {MatMenuItem: parent};
  });
  return leaf.MatLegacyMenuItem;
}
const Original = load(payload.originalBase, payload.originalLeaf, true), Current = load(payload.currentBase, payload.currentLeaf);
function fixture(Class, minimal = false) {
  const calls = [], host = {focus: options => calls.push(['native-focus', options]),
    cloneNode: () => ({textContent: '  label  ', querySelectorAll: () => [{remove: () => calls.push(['icon-remove'])}]})};
  const ref = new core.ElementRef(host), document = {activeElement: host};
  const monitor = {focusVia: (...args) => calls.push(['focus-via', ...args]), monitor: (...args) => calls.push(['monitor', ...args]),
    stopMonitoring: (...args) => calls.push(['stop-monitor', ...args])};
  const panel = {addItem: item => calls.push(['add', item]), removeItem: item => calls.push(['remove', item])};
  const detector = {markForCheck: () => calls.push(['mark'])};
  const args = minimal ? [ref] : [ref, document, monitor, panel, detector];
  const item = new Class(...args);
  assert.equal(item._getHostElement(), host); assert.equal(item.role, 'menuitem');
  if (!minimal) {assert.equal(item._parentMenu, panel); assert.equal(calls.filter(r => r[0] === 'add').length, 1);}
  let focused = 0, hovered = 0, completed = 0;
  item._focused.subscribe({next: value => {assert.equal(value, item); focused++;}, complete: () => completed++});
  item._hovered.subscribe({next: value => {assert.equal(value, item); hovered++;}, complete: () => completed++});
  item.ngAfterViewInit(); item.focus('keyboard', {preventScroll: true}); assert.equal(focused, 1);
  item.focus(); assert.equal(focused, 2); item._handleMouseEnter(); assert.equal(hovered, 1);
  assert.equal(item.getLabel(), 'label'); assert.equal(item._getTabIndex(), '0');
  item.disabled = 'false'; assert.equal(item.disabled, false); item.disabled = true; assert.equal(item._getTabIndex(), '-1');
  const event = {preventDefault: () => calls.push(['prevent']), stopPropagation: () => calls.push(['stop'])};
  item._checkDisabled(event); assert.equal(calls.filter(r => r[0] === 'prevent').length, 1); assert.equal(calls.filter(r => r[0] === 'stop').length, 1);
  item._setHighlighted(true); item._setTriggersSubmenu(true); assert.equal(item._highlighted, true); assert.equal(item._triggersSubmenu, true);
  assert.equal(!!item._hasFocus(), !minimal);
  item.ngOnDestroy(); assert.equal(completed, 2);
  assert.equal(calls.filter(r => r[0] === 'stop-monitor').length, minimal ? 0 : 1);
  assert.equal(calls.filter(r => r[0] === 'remove').length, minimal ? 0 : 1);
  return {item, calls, ref, document, monitor, panel, detector};
}
const cases = [];
for (const minimal of [false, true]) {
  const old = fixture(Original, minimal), current = fixture(Current, minimal);
  assert.deepEqual(current.calls.map(r => r[0]), old.calls.map(r => r[0]));
  cases.push(minimal ? 'original-one-argument-manual-construction' : 'original-five-argument-manual-construction');
}
if (line !== 'original') {
  const protocols = fixture(Current), providers = [
    {provide: core.ElementRef, useValue: protocols.ref}, {provide: core.DOCUMENT, useValue: protocols.document},
    {provide: a11y.FocusMonitor, useValue: protocols.monitor}, {provide: panelToken, useValue: protocols.panel},
    {provide: core.ChangeDetectorRef, useValue: protocols.detector},
  ];
  const injector = core.Injector.create({providers});
  try {
    const item = core.runInInjectionContext(injector, () => Current.ɵfac());
    assert.ok(item instanceof Current); assert.equal(item._getHostElement(), protocols.ref.nativeElement);
    assert.equal(item._parentMenu, protocols.panel); item.ngOnDestroy(); cases.push('actual-inherited-Angular-JIT-five-service-factory');
  } finally {injector.destroy();}
}
console.log(JSON.stringify({line, production: production === 'true', cases, manual_contract_restored: true,
  application_created: false, native_or_packed_qualified: false}));
