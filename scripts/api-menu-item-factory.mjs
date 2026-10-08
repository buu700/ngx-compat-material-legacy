/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';

/**
 * Execute the actual packed factory with borrowed node services and a real public
 * application root. DOM is synthetic: native/AOT/browser qualification is separate.
 * No peer private token or provider is imported, overridden, or matched by name.
 */
export async function observeMenuItemFactory(Item, loaded, importModule = spec => import(spec)) {
  const core = await importModule('@angular/core');
  const {BrowserModule, platformBrowser} = await importModule('@angular/platform-browser');
  const {FocusMonitor} = await importModule('@angular/cdk/a11y');
  const {MatMenuItem} = await importModule('@angular/material/menu');
  const requests = [], rootRequests = [], behaviorProblems = [];
  const counts = {marks: 0, adds: 0, removes: 0, monitor: 0, stop: 0, focus: 0,
    foreignAdds: 0, foreignRemoves: 0, borrowedDestroyed: 0, styles: 0};
  const priorDocument = globalThis.document, hadDocument = Object.hasOwn(globalThis, 'document');
  function element(name, document) {
    return {nodeType: 1, nodeName: 'DIV', name, attributes: {}, childNodes: [], parentNode: null,
      setAttribute(key, value) {this.attributes[key] = value;},
      getAttribute(key) {return this.attributes[key] ?? null;}, removeAttribute(key) {delete this.attributes[key];},
      appendChild(child) {this.childNodes.push(child); child.parentNode = this; return child;},
      removeChild(child) {this.childNodes.splice(this.childNodes.indexOf(child), 1); child.parentNode = null; return child;},
      remove() {this.parentNode?.removeChild(this);}, addEventListener() {}, removeEventListener() {},
      querySelectorAll() {return [];}, querySelector() {return null;},
      classList: {add() {}, remove() {}}, style: {setProperty() {}, removeProperty() {}},
      focus() {document.activeElement = this;}, cloneNode() {return {textContent: 'Legacy label', querySelectorAll() {return [];}}},
    };
  }
  const document = {activeElement: null,
    createElement(name) {if (name === 'style') counts.styles++; return element(name, document);},
    createTextNode(text) {return {nodeType: 3, textContent: text};}, querySelectorAll() {return [];}, querySelector() {return null;}};
  document.head = element('head', document); document.body = element('body', document);
  const elementRef = new core.ElementRef(element('item', document));
  const parent = {addItem() {counts.adds++;}, removeItem() {counts.removes++;}};
  const foreign = {addItem() {counts.foreignAdds++;}, removeItem() {counts.foreignRemoves++;}};
  const monitor = {monitor(ref, children) {assert.equal(ref, elementRef); assert.equal(children, false); counts.monitor++;},
    stopMonitoring(ref) {assert.equal(ref, elementRef); counts.stop++;},
    focusVia(target, origin, options) {assert.equal(target, elementRef.nativeElement);
      assert.equal(origin, 'keyboard'); assert.equal(options.preventScroll, true); counts.focus++; target.focus(options);},
    ngOnDestroy() {counts.borrowedDestroyed++;}};
  const detector = {markForCheck() {counts.marks++;}, ngOnDestroy() {counts.borrowedDestroyed++;}};
  const values = new Map([[core.ElementRef, elementRef], [core.DOCUMENT, document],
    [FocusMonitor, monitor], [core.ChangeDetectorRef, detector], [loaded.MAT_LEGACY_MENU_PANEL, parent]]);
  let environment, platform, item, outcome = 'returned', error = null;
  class NodeContext extends core.Injector {
    get(token, notFoundValue, options) {
      const optional = notFoundValue === null || Boolean(typeof options === 'object' && options?.optional);
      if (token === core.Injector || values.has(token) || optional) {
        requests.push({token, label: typeof token === 'function' ? token.name : String(token).replace(/^InjectionToken /, ''), optional});
        if (token === core.Injector) return this;
        if (values.has(token)) return values.get(token);
        return foreign;
      }
      const request = {token, optional, unresolved: false}; rootRequests.push(request);
      try {return environment.get(token, notFoundValue, options);}
      catch (caught) {request.unresolved = true; throw caught;}
    }
  }
  function check(label, run) {try {run();} catch (caught) {behaviorProblems.push(label + ': ' + String(caught.message));}}
  globalThis.document = document;
  try {
    platform = platformBrowser([{provide: core.DOCUMENT, useValue: document}]);
    environment = core.createEnvironmentInjector([core.importProvidersFrom(BrowserModule),
      core.provideZonelessChangeDetection(), {provide: core.DOCUMENT, useValue: document},
      {provide: core.PLATFORM_ID, useValue: 'browser'}], core.Injector.NULL);
    const context = new NodeContext();
    try {item = core.runInInjectionContext(context, () => Item.ɵfac());}
    catch (caught) {outcome = 'threw'; error = String(caught?.message || caught);}
    if (outcome === 'returned') {
      check('real parent/leaf/node identity', () => {
        assert.ok(item instanceof Item); assert.ok(item instanceof MatMenuItem);
        assert.equal(Object.getPrototypeOf(item), Item.prototype);
        assert.equal(item._getHostElement(), elementRef.nativeElement);
      });
      check('owned panel and isolated peer panel', () => {
        assert.ok(loaded.MAT_LEGACY_MENU_PANEL instanceof core.InjectionToken);
        assert.equal(String(loaded.MAT_LEGACY_MENU_PANEL), 'InjectionToken MAT_MENU_PANEL');
        assert.equal(item._parentMenu, parent); assert.equal(counts.adds, 1); assert.equal(counts.foreignAdds, 0);
      });
      check('real caller root structural styles', () => {
        assert.equal(rootRequests.length, 1); assert.equal(rootRequests[0].unresolved, false); assert.ok(counts.styles > 0);
      });
      check('borrowed monitor/document/detector behavior', () => {
        item.ngAfterViewInit(); item.focus('keyboard', {preventScroll: true});
        assert.equal(item._hasFocus(), true); item._setHighlighted(true); item._setTriggersSubmenu(true);
        assert.equal(counts.monitor, 1); assert.equal(counts.focus, 1); assert.equal(counts.marks, 2);
      });
      check('manual dependency arguments explicitly reject', () => {
        const before = requests.length;
        for (const args of [[elementRef], [elementRef, document, monitor, parent, detector]])
          assert.throws(() => core.runInInjectionContext(context, () => new Item(...args)), /manual dependency arguments are not supported/);
        assert.equal(requests.length, before);
      });
      check('outside Angular DI explicitly rejects', () => assert.throws(() => new Item(), /NG0203|injection context/));
      check('owned teardown does not destroy borrowed services', () => {
        let complete = 0; item._hovered.subscribe({complete: () => complete++});
        item._focused.subscribe({complete: () => complete++});
        item.ngOnDestroy(); item = null;
        assert.equal(complete, 2); assert.equal(counts.removes, 1); assert.equal(counts.stop, 1);
        assert.equal(counts.foreignRemoves, 0); assert.equal(counts.borrowedDestroyed, 0);
      });
    }
  } finally {
    check('remaining item cleanup', () => {if (typeof item?.ngOnDestroy === 'function') item.ngOnDestroy();});
    check('application root cleanup', () => environment?.destroy());
    check('platform cleanup', () => platform?.destroy());
    if (hadDocument) globalThis.document = priorDocument; else delete globalThis.document;
  }
  check('borrowed services remain unowned after fixture root teardown', () => assert.equal(counts.borrowedDestroyed, 0));
  return {requests, rootRequests, outcome, error, behaviorProblems, counts,
    context: 'actual factory/public application root with borrowed node services and synthetic DOM; native/AOT gates separate'};
}
