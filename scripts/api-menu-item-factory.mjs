/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';

/** Execute actual owned factories and manual overloads with public token objects.
 * Services/DOM are borrowed protocols; native/AOT/packed qualification is separate.
 */
export async function observeMenuItemFactory(Item, loaded, importModule = spec => import(spec)) {
  const core = await importModule('@angular/core');
  const {FocusMonitor} = await importModule('@angular/cdk/a11y');
  const {MatMenuItem} = await importModule('@angular/material/menu');
  const requests = [], rootRequests = [], behaviorProblems = [];
  const counts = {marks: 0, adds: 0, removes: 0, monitor: 0, stop: 0, focus: 0,
    borrowedDestroyed: 0, requiredProviderControls: 0, optionalPanelControls: 0,
    manualOverloads: 0, subclassControls: 0};
  const document = {activeElement: null};
  const host = {focus() {document.activeElement = this;},
    cloneNode() {let icon = true; return {get textContent() {return icon ? 'Icon Legacy label' : '  Legacy label  ';},
      querySelectorAll(selector) {assert.equal(selector, 'mat-icon, .material-icons'); return [{remove() {icon = false;}}];}};}};
  const elementRef = new core.ElementRef(host);
  const parent = {addItem(item) {assert.equal(item._getHostElement(), host); counts.adds++;},
    removeItem(item) {assert.equal(item._getHostElement(), host); counts.removes++;}};
  const monitor = {monitor(ref, children) {assert.equal(ref, elementRef); assert.equal(children, false); counts.monitor++;},
    stopMonitoring(ref) {assert.equal(ref, elementRef); counts.stop++;},
    focusVia(target, origin, options) {assert.equal(target, host); assert.equal(origin, 'keyboard');
      assert.equal(options.preventScroll, true); counts.focus++; target.focus();},
    ngOnDestroy() {counts.borrowedDestroyed++;}};
  const detector = {markForCheck() {counts.marks++;}, ngOnDestroy() {counts.borrowedDestroyed++;}};
  const values = new Map([[core.ElementRef, elementRef], [core.DOCUMENT, document],
    [FocusMonitor, monitor], [loaded.MAT_LEGACY_MENU_PANEL, parent], [core.ChangeDetectorRef, detector]]);
  class NodeContext extends core.Injector {
    constructor(values, trace) {super(); this.values = values; this.trace = trace;}
    get(token, notFoundValue, options) {
      const flags = typeof options === 'number' ? {optional: Boolean(options & 8), self: Boolean(options & 2),
        skipSelf: Boolean(options & 4), host: Boolean(options & 1)} : options || {};
      const optional = notFoundValue === null || Boolean(flags.optional);
      this.trace.push({token, label: typeof token === 'function' ? token.name : String(token).replace(/^InjectionToken /, ''),
        optional, self: Boolean(flags.self), skipSelf: Boolean(flags.skipSelf), host: Boolean(flags.host)});
      if (this.values.has(token)) return this.values.get(token);
      if (optional) return null;
      throw new Error('Required node provider absent');
    }
  }
  function check(label, run) {try {run();} catch (caught) {behaviorProblems.push(label + ': ' + String(caught.message));}}
  const context = new NodeContext(values, requests);
  let item, outcome = 'returned', error = null;
  try {item = core.runInInjectionContext(context, () => Item.ɵfac());}
  catch (caught) {outcome = 'threw'; error = String(caught?.message || caught);}
  if (outcome === 'returned') {
    check('owned identity, host and historical panel', () => {
      assert.ok(item instanceof Item); assert.equal(item instanceof MatMenuItem, false);
      assert.equal(Object.getPrototypeOf(item), Item.prototype); assert.equal(item._getHostElement(), host);
      assert.ok(loaded.MAT_LEGACY_MENU_PANEL instanceof core.InjectionToken);
      assert.equal(item._parentMenu, parent); assert.equal(counts.adds, 1); assert.equal(item.role, 'menuitem');
    });
    check('focus, hover, label and state behavior', () => {
      let focused = 0, hovered = 0;
      item._focused.subscribe(value => {assert.equal(value, item); focused++;});
      item._hovered.subscribe(value => {assert.equal(value, item); hovered++;});
      item.ngAfterViewInit(); item.focus('keyboard', {preventScroll: true}); item._handleMouseEnter();
      assert.equal(item._hasFocus(), true); assert.equal(focused, 1); assert.equal(hovered, 1);
      assert.equal(item.getLabel(), 'Legacy label'); item._setHighlighted(true); item._setTriggersSubmenu(true);
      assert.equal(item._highlighted, true); assert.equal(item._triggersSubmenu, true);
      assert.equal(counts.monitor, 1); assert.equal(counts.focus, 1); assert.equal(counts.marks, 2);
      assert.equal(item._getTabIndex(), '0'); item.disabled = 'false'; assert.equal(item.disabled, false);
      item.disableRipple = ''; assert.equal(item.disableRipple, true); item.disableRipple = 'false'; assert.equal(item.disableRipple, false);
      let prevents = 0, stops = 0; const event = {preventDefault() {prevents++;}, stopPropagation() {stops++;}};
      item._checkDisabled(event); assert.equal(prevents, 0); assert.equal(stops, 0);
      item.disabled = true; assert.equal(item._getTabIndex(), '-1'); item._checkDisabled(event);
      assert.equal(prevents, 1); assert.equal(stops, 1);
    });
    check('owned teardown preserves borrowed services', () => {
      let complete = 0; item._hovered.subscribe({complete() {complete++;}}); item._focused.subscribe({complete() {complete++;}});
      item.ngOnDestroy(); item = null; assert.equal(complete, 2);
      assert.equal(counts.removes, 1); assert.equal(counts.stop, 1); assert.equal(counts.borrowedDestroyed, 0);
    });
    check('original one/five-argument manual overloads outside DI', () => {
      for (const args of [[elementRef], [elementRef, document, monitor, parent, detector]]) {
        const manual = new Item(...args);
        try {assert.ok(manual instanceof Item); assert.equal(manual._getHostElement(), host);
          assert.equal(manual._parentMenu, args.length === 1 ? undefined : parent); manual.focus();
          assert.equal(manual.getLabel(), 'Legacy label'); counts.manualOverloads++;}
        finally {manual.ngOnDestroy();}
      }
    });
    check('inherited subclass construction', () => {
      class Child extends Item {}
      const child = core.runInInjectionContext(new NodeContext(values, []), () => Item.ɵfac(Child));
      try {assert.ok(child instanceof Child); assert.equal(child._getHostElement(), host); counts.subclassControls++;}
      finally {child.ngOnDestroy();}
    });
    check('only the owned panel is optional', () => {
      const withoutPanel = new Map(values); withoutPanel.delete(loaded.MAT_LEGACY_MENU_PANEL);
      const trace = []; const optional = core.runInInjectionContext(new NodeContext(withoutPanel, trace), () => Item.ɵfac());
      try {assert.equal(optional._parentMenu, null); assert.equal(optional._getHostElement(), host);
        assert.equal(trace.find(row => row.token === loaded.MAT_LEGACY_MENU_PANEL)?.optional, true); counts.optionalPanelControls++;}
      finally {optional.ngOnDestroy();}
      for (const token of [core.ElementRef, core.DOCUMENT, FocusMonitor, core.ChangeDetectorRef]) {
        const missing = new Map(values); missing.delete(token);
        assert.throws(() => core.runInInjectionContext(new NodeContext(missing, []), () => Item.ɵfac()), /Required node provider absent/);
        counts.requiredProviderControls++;
      }
    });
  }
  check('remaining item cleanup', () => {item?.ngOnDestroy();});
  check('borrowed services remain unowned', () => assert.equal(counts.borrowedDestroyed, 0));
  return {requests, rootRequests, outcome, error, behaviorProblems, counts,
    context: 'actual inherited historical factory/manual overloads with public node tokens and borrowed services; no application; native/AOT gates separate'};
}
