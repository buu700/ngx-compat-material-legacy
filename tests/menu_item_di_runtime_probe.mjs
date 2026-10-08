/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Accepted DI policy: actual owned leaf/public parent and root; synthetic DOM only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), ts = require('typescript');
const url = name => pathToFileURL(require.resolve(name)).href;
await import(url('@angular/compiler'));
const core = await import(url('@angular/core'));
const {BrowserModule, platformBrowser} = await import(url('@angular/platform-browser'));
const {FocusMonitor} = await import(url('@angular/cdk/a11y'));
const {MatMenuItem} = await import(url('@angular/material/menu'));
const base = 'projects/ngx-material-legacy/legacy-menu/';
const paths = [base + 'menu-item.ts', base + 'internal/menu-item-context.ts',
  base + 'internal/menu-panel-token.ts'];
const sources = new Map(paths.map(path => [path, readFileSync(resolve(root, path), 'utf8')]));
const leafAst = ts.createSourceFile(paths[0], sources.get(paths[0]), ts.ScriptTarget.Latest, true);
const leafDeclaration = leafAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'MatLegacyMenuItem');
assert.ok(leafDeclaration);
assert.equal(leafDeclaration.members.filter(ts.isPropertyDeclaration).length, 0,
  'The object-returning legacy constructor must not skip owned instance initializers.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const data = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, experimentalDecorators: true}}).outputText
  .replace(/(['"])(@angular\/[^'"]+)\1/g, (_, quote, name) => JSON.stringify(url(name)));
const tokenUrl = data(emit(sources.get(paths[2])));
const {MAT_MENU_PANEL} = await import(tokenUrl);
async function load(helper = sources.get(paths[1]), leaf = sources.get(paths[0])) {
  const helperUrl = data(emit(helper).replaceAll("'./menu-panel-token'", JSON.stringify(tokenUrl)));
  return (await import(data(emit(leaf).replaceAll("'./internal/menu-item-context'", JSON.stringify(helperUrl)))))
    .MatLegacyMenuItem;
}

const hadDocument = Object.hasOwn(globalThis, 'document'), priorDocument = globalThis.document;
const operations = [];
function element(name, document) {
  return {name, nodeName: 'DIV', nodeType: 1, childNodes: [], attributes: {}, parentNode: null,
    setAttribute(key, value) {this.attributes[key] = value;},
    getAttribute(key) {return this.attributes[key] ?? null;}, removeAttribute(key) {delete this.attributes[key];},
    appendChild(child) {this.childNodes.push(child); child.parentNode = this; return child;},
    removeChild(child) {this.childNodes.splice(this.childNodes.indexOf(child), 1); child.parentNode = null; return child;},
    remove() {this.parentNode?.removeChild(this);}, addEventListener() {}, removeEventListener() {},
    querySelectorAll() {return [];}, querySelector() {return null;},
    classList: {add() {}, remove() {}}, style: {setProperty() {}, removeProperty() {}},
    focus(options) {document.activeElement = this; operations.push({kind: 'focus', name, options});},
    cloneNode() {const icon = {removed: false, remove() {this.removed = true;}};
      return {get textContent() {return icon.removed ? '  Legacy label  ' : 'Icon Legacy label';},
        querySelectorAll(selector) {assert.equal(selector, 'mat-icon, .material-icons'); return [icon];}};},
  };
}
const document = {activeElement: null,
  createElement(tag) {operations.push({kind: 'create-element', tag}); return element(tag, document);},
  createTextNode(text) {return {nodeType: 3, textContent: text};}, querySelectorAll() {return [];},
  querySelector() {return null;}};
document.head = element('head', document); document.body = element('body', document);
globalThis.document = document;
let platform, environment;
function fixture(Item, parent = {items: [], addItem(item) {this.items.push(item);},
  removeItem(item) {this.items.splice(this.items.indexOf(item), 1);}}) {
  const counts = {marks: 0, borrowedDestroyed: 0, foreignAdds: 0, foreignRemoves: 0, required: 0};
  const ref = new core.ElementRef(element('item', document)), monitorCalls = [];
  const monitor = {monitor(value, children) {monitorCalls.push(['monitor', value, children]);},
    stopMonitoring(value) {monitorCalls.push(['stop', value]);},
    focusVia(value, origin, options) {monitorCalls.push(['focus', value, origin, options]); value.focus(options);},
    ngOnDestroy() {counts.borrowedDestroyed++;}};
  const detector = {markForCheck() {counts.marks++;}, ngOnDestroy() {counts.borrowedDestroyed++;}};
  const foreignPanel = {addItem() {counts.foreignAdds++;}, removeItem() {counts.foreignRemoves++;}};
  class NodeContext extends core.Injector {
    get(token, notFoundValue, options) {
      if (token === core.Injector) return this;
      if (token === core.ElementRef) return ref;
      if (token === core.DOCUMENT) return document;
      if (token === FocusMonitor) return monitor;
      if (token === core.ChangeDetectorRef) return detector;
      if (token === MAT_MENU_PANEL) return parent;
      // Deliberately provide a different object for an unknown optional lookup.
      // This detects peer-panel leakage without importing or mocking a private token.
      if (notFoundValue === null) return foreignPanel;
      counts.required++;
      return environment.get(token, notFoundValue, options);
    }
  }
  const context = new NodeContext();
  const item = core.runInInjectionContext(context, () => new Item());
  return {item, ref, monitor, detector, monitorCalls, parent, counts, context,
    close() {item.ngOnDestroy();}};
}

async function observations(Item) {
  const cases = [];
  async function check(id, run) {
    try {await run(); cases.push({id, result: 'pass'});}
    catch (error) {cases.push({id, result: 'fail', error: String(error.message).slice(0, 500)});}
  }
  await check('outside-di-construction-is-explicitly-rejected', () => {
    assert.throws(() => new Item(), /NG0203|injection context/);
  });
  for (const args of [[{}], [{}, {}, {}, {}, {}]]) {
    await check('manual-' + args.length + '-argument-construction-is-explicitly-rejected', () => {
      assert.throws(() => core.runInInjectionContext(environment, () => new Item(...args)),
        /manual dependency arguments are not supported/);
    });
  }
  await check('genuine-parent-leaf-and-caller-element-identity', () => {
    const f = fixture(Item); try {
      assert.ok(f.item instanceof Item); assert.ok(f.item instanceof MatMenuItem);
      assert.equal(Object.getPrototypeOf(f.item), Item.prototype);
      assert.equal(f.item._getHostElement(), f.ref.nativeElement);
      assert.ok(f.counts.required > 0, 'real root services must remain owned by the caller');
    } finally {f.close();}
  });
  await check('owned-panel-registers-once-and-peer-panel-does-not-leak', () => {
    const f = fixture(Item); try {
      assert.equal(f.item._parentMenu, f.parent); assert.deepEqual(f.parent.items, [f.item]);
      assert.equal(f.counts.foreignAdds, 0);
    } finally {f.close();}
    assert.deepEqual(f.parent.items, []); assert.equal(f.counts.foreignRemoves, 0);
  });
  for (const parent of [null, {custom: true}]) await check(parent ? 'custom-panel-without-registration-hooks' :
    'missing-legacy-panel-is-optional-and-peer-panel-stays-isolated', () => {
    const f = fixture(Item, parent); try {
      assert.equal(f.item._parentMenu, parent); assert.equal(f.counts.foreignAdds, 0);
    } finally {f.close();}
    assert.equal(f.counts.foreignRemoves, 0);
  });
  await check('monitor-and-focus-origin-options-use-caller-services', () => {
    const f = fixture(Item); try {
      const options = {preventScroll: true}; f.item.ngAfterViewInit(); f.item.focus('keyboard', options);
      assert.deepEqual(f.monitorCalls, [['monitor', f.ref, false], ['focus', f.ref.nativeElement, 'keyboard', options]]);
      assert.equal(f.item._hasFocus(), true);
    } finally {f.close();}
    assert.deepEqual(f.monitorCalls.at(-1), ['stop', f.ref]);
  });
  await check('native-focus-and-document-identity-remain-historical', () => {
    const f = fixture(Item); try {
      const options = {preventScroll: true}; f.item.focus(undefined, options);
      assert.equal(document.activeElement, f.ref.nativeElement);
      assert.equal(f.item._hasFocus(), true); document.activeElement = null;
      assert.equal(f.item._hasFocus(), false); assert.deepEqual(f.monitorCalls, []);
    } finally {f.close();}
  });
  await check('public-state-setters-mark-the-caller-detector', () => {
    const f = fixture(Item); try {
      f.item._setHighlighted(true); f.item._setTriggersSubmenu(true);
      assert.equal(f.item._highlighted, true); assert.equal(f.item._triggersSubmenu, true);
      assert.equal(f.counts.marks, 2);
    } finally {f.close();}
  });
  await check('hover-focus-and-completion-streams-remain-real-parent-streams', () => {
    const f = fixture(Item), hover = [], focus = []; let completed = 0;
    f.item._hovered.subscribe({next: item => hover.push(item), complete: () => completed++});
    f.item._focused.subscribe({next: item => focus.push(item), complete: () => completed++});
    try {
      f.item._handleMouseEnter(); f.item.focus();
      assert.deepEqual(hover, [f.item]); assert.deepEqual(focus, [f.item]);
    } finally {f.close();}
    assert.equal(completed, 2); assert.equal(f.counts.borrowedDestroyed, 0);
  });
  await check('historical-disabled-tabindex-click-and-icon-free-label', () => {
    const f = fixture(Item); try {
      assert.equal(f.item.role, 'menuitem'); assert.equal(f.item.disabled, false);
      assert.equal(f.item.disableRipple, false); assert.equal(f.item._getTabIndex(), '0');
      f.item.disabled = true; assert.equal(f.item._getTabIndex(), '-1');
      let prevented = 0, stopped = 0;
      f.item._checkDisabled({preventDefault() {prevented++;}, stopPropagation() {stopped++;}});
      assert.equal(prevented, 1); assert.equal(stopped, 1); assert.equal(f.item.getLabel(), 'Legacy label');
    } finally {f.close();}
  });
  await check('derived-construction-preserves-real-new-target-and-initializers', () => {
    class ConsumerItem extends Item {value = 'consumer';}
    const f = fixture(ConsumerItem); try {
      assert.ok(f.item instanceof ConsumerItem); assert.ok(f.item instanceof Item);
      assert.ok(f.item instanceof MatMenuItem); assert.equal(f.item.value, 'consumer');
      assert.equal(Object.getPrototypeOf(f.item), ConsumerItem.prototype);
    } finally {f.close();}
  });
  return cases;
}

let cases, mutations;
try {
  platform = platformBrowser([{provide: core.DOCUMENT, useValue: document}]);
  environment = core.createEnvironmentInjector([core.importProvidersFrom(BrowserModule),
    core.provideZonelessChangeDetection(), {provide: core.DOCUMENT, useValue: document},
    {provide: core.PLATFORM_ID, useValue: 'browser'}], core.Injector.NULL);
  cases = await observations(await load());
  assert.ok(cases.every(c => c.result === 'pass'), JSON.stringify(cases.filter(c => c.result === 'fail')));
  const helper = sources.get(paths[1]);
  const edits = [
    ['optional-null-fallback-is-ignored', helper.replace('notFoundValue === null || options?.optional', 'options?.optional')],
    ['owned-panel-is-not-assigned', helper.replace('item._parentMenu = parent;', 'item._parentMenu = null;')],
    ['owned-panel-is-not-registered', helper.replace('parent?.addItem?.(item);', '')],
    ['required-root-services-are-not-delegated', helper.replace('return this.application.get(token, notFoundValue, options);', 'return null;')],
    ['subclass-new-target-is-discarded', helper.replace('Reflect.construct(MatMenuItem, [], target)', 'Reflect.construct(MatMenuItem, [], MatMenuItem)')],
  ];
  mutations = [];
  for (const [id, changed] of edits) {
    assert.notEqual(changed, helper, id + ': mutation did not apply');
    const observed = await observations(await load(changed));
    const failed = observed.filter(c => c.result === 'fail').map(c => c.id);
    assert.ok(failed.length > 0, id + ': mutation escaped');
    mutations.push({id, rejected: true, failed_cases: failed});
  }
} finally {
  environment?.destroy(); platform?.destroy();
  if (hadDocument) globalThis.document = priorDocument; else delete globalThis.document;
}
const report = {schema_version: 1,
  role: 'Accepted DI-construction source diagnostic; original manual-constructor parity remains deliberately absent',
  node: process.version, compiler: ts.version, runtime_peer: core.VERSION.full,
  sources: [...sources].map(([path, bytes]) => ({path, sha256: sha(bytes)})), cases, mutations,
  limits: ['Actual owned leaf and genuine public parent/root execute with synthetic DOM and borrowed node services.',
    'No private token or provider is imported or mocked; caller framework services own structural-style loading.',
    'The original seven-case manual-constructor defect evidence is preserved separately and is not relabeled as passing.',
    'No native input-transform/query/provider, AOT, packed, SSR/CSP, canonical toolchain, actual21 or consumer-floor qualification.']};
const argv = process.argv.slice(2), at = argv.indexOf('--report');
if (at !== -1) {assert.equal(existsSync(argv[at + 1]), false); writeFileSync(argv[at + 1], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({cases: cases.length, failed: cases.filter(c => c.result === 'fail').length,
  mutations_rejected: mutations.length, node: process.version, compiler: ts.version, runtime_peer: core.VERSION.full}));
