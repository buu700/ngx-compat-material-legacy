/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole owned constructors/methods; genuine Core/RxJS, protocol overlay/views. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
const ts = require('typescript'), rx = require('rxjs'), ops = require('rxjs/operators');
await import(require.resolve('@angular/compiler'));
const core = await import(require.resolve('@angular/core'));
const coercion = await import(require.resolve('@angular/cdk/coercion'));
const paths = {trigger: 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
  menu: 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts', helper: 'projects/ngx-material-legacy/legacy-core/internal/motion-event.ts'};
const raw = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(resolve(root, path), 'utf8')]));
const hash = value => createHash('sha256').update(value).digest('hex');
const emit = source => ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true}}).outputText;
const motion = {}; new Function('exports', emit(raw.helper))(motion);
function loadClass(source, name, bindings) {
  const file = ts.createSourceFile(name + '.ts', source, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0);
  const declaration = file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  const transformed = ts.transform(declaration, [context => node => {
    const visit = node => ts.isDecorator(node) ? undefined : ts.visitEachChild(node, visit, context);
    return ts.visitNode(node, visit);
  }]);
  const printer = ts.createPrinter(), text = printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], file);
  transformed.dispose();
  // Keep the actual module owner map when present; each fixture gets its own
  // module instance, shared by all of that fixture's real trigger instances.
  const owners = file.statements.find(node => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(d => d.name.getText(file) === 'MENU_PANEL_OWNERS'));
  const exports = {};
  new Function('exports', ...Object.keys(bindings), emit((owners ? owners.getText(file) : '') + '\n' + text))(exports, ...Object.values(bindings));
  return exports[name];
}
function clock() {
  const previous = [globalThis.setTimeout, globalThis.clearTimeout], timers = new Map(); let id = 0, now = 0;
  globalThis.setTimeout = (run, delay = 0) => { timers.set(++id, {run, at: now + delay}); return id; };
  globalThis.clearTimeout = key => timers.delete(key);
  return {timers, advance(ms) { const end = now + ms, errors = []; for (;;) {
    const next = [...timers].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
    if (!next) break; timers.delete(next[0]); now = next[1].at;
    try { next[1].run(); } catch (error) { errors.push(error); }
  } now = end; if (errors.length) throw new AggregateError(errors, errors.map(error => error.message).join('; ')); }, restore() { [globalThis.setTimeout, globalThis.clearTimeout] = previous; }};
}
function fixture({enabled = true, lazy = true, source = raw.trigger} = {}) {
  const timer = clock(), events = [], changeDetector = {markForCheck() {}};
  const Menu = loadClass(raw.menu, '_MatMenuBase', {...core, ...rx, ...ops, ...coercion, ...motion,
    legacyAnimationsDisabled: () => !enabled, menuPanelUid: 0, ENTER_ANIMATION: 'mat-legacy-menu-enter', EXIT_ANIMATION: 'mat-legacy-menu-exit'});
  const Trigger = loadClass(source, '_MatMenuTriggerBase', {...core, ...rx, ...ops,
    _MatMenuBase: Menu, passiveEventListenerOptions: {passive: true}});
  const menus = [], triggers = [], envs = [];
  function menu() {
    const host = new EventTarget(); host.className = '';
    const instance = new Menu(new core.ElementRef(host), {onStable: new rx.Subject()},
      {xPosition: 'after', yPosition: 'below', overlapTrigger: false}, changeDetector);
    instance.focusFirstItem = () => events.push('focus-item');
    instance.setElevation = () => {};
    const state = {created: 0, destroyed: 0, attached: false};
    if (lazy) instance.lazyContent = {
      _attached: new rx.Subject(), attach() { this.detach(); state.attached = true; state.created += 2; this._attached.next(); },
      detach() { if (state.attached) { state.attached = false; state.destroyed += 2; events.push('lazy-detach'); } },
    };
    menus.push(instance); return {instance, state};
  }
  function trigger(menu) {
    const env = core.createEnvironmentInjector([{provide: core.ChangeDetectorRef, useValue: changeDetector}]); envs.push(env);
    const host = new EventTarget(); host.focus = () => events.push('focus-trigger');
    const position = {withLockedPosition() { return this; }, reapplyLastPosition() { return this; }};
    const overlay = {attached: false, attachCount: 0, detachCount: 0, backdropDetached: 0, disposed: false,
      attach() { assert.equal(this.attached, false, 'overlay already attached'); this.attached = true; this.overlayElement.style.pointerEvents = 'auto'; this.attachCount++; events.push('overlay-attach'); },
      detach() { if (this.attached) { this.attached = false; this.detachCount++; events.push('overlay-detach'); this.afterDetach?.(); } },
      dispose() { this.detach(); this.disposed = true; }, hasAttached() { return this.attached; },
      overlayElement: {style: {pointerEvents: 'auto'}}, keydowns: new rx.Subject(), keydownEvents() { return this.keydowns.asObservable(); },
      detachBackdrop() { this.backdropDetached++; }, getConfig() { return {positionStrategy: position}; },
    };
    const instance = core.runInInjectionContext(env, () => new Trigger({create: () => overlay}, new core.ElementRef(host), {}, () => {}, null, null, null, null));
    instance.menu = menu; instance._getOverlayConfig = () => overlay.getConfig(); instance._subscribeToPositions = () => {};
    instance._setPosition = () => {}; instance._getPortal = () => ({});
    const closing = new rx.Subject(); instance._menuClosingActions = () => closing;
    instance.menuOpened.subscribe(() => events.push('opened')); instance.menuClosed.subscribe(() => events.push('closed'));
    triggers.push(instance); return {instance, overlay, closing};
  }
  const panel = menu(), owner = trigger(panel.instance);
  return {timer, events, menu, trigger, panel, owner, cleanup() {
    try { triggers.forEach(t => t.ngOnDestroy()); menus.forEach(m => m.ngOnDestroy()); envs.forEach(e => e.destroy()); timer.advance(0); }
    finally { timer.restore(); }
  }};
}
const args = process.argv.slice(2), baseline = args.includes('--baseline'), cases = [], mutations = [];
async function observe(source = raw.trigger, only = null) {
  const result = [];
  async function check(id, operation, options = {}) {
    if (only && only !== id) return;
    const f = fixture({...options, source});
    try { await operation(f); f.timer.advance(0); result.push({id, result: 'pass'}); }
    catch (error) { result.push({id, result: 'fail', error: error.message}); }
    finally { try { f.cleanup(); } catch (error) { const row = result.at(-1); row.result = 'fail'; row.cleanup_error = error.message; } }
  }
  await check('owned-exit-retains-overlay-and-lazy-until-void', f => {
    const t = f.owner.instance, m = f.panel.instance; t.openMenu(); t.closeMenu();
    assert.equal(t.menuOpen, false); assert.equal(f.owner.overlay.hasAttached(), true, 'overlay detached before CSS exit');
    assert.equal(f.panel.state.destroyed, 0); assert.equal(m._panelAnimationState, 'void');
    m._onCssAnimationDone('mat-legacy-menu-enter'); assert.equal(f.owner.overlay.hasAttached(), true);
    m._animationDone.next({toState: 'enter'}); assert.equal(f.owner.overlay.hasAttached(), true);
    const descendant = new Event('animationend'); Object.defineProperties(descendant, {target: {value: new EventTarget()}, currentTarget: {value: new EventTarget()}, animationName: {value: 'mat-legacy-menu-exit'}});
    m._onCssAnimationDone(descendant); assert.equal(f.owner.overlay.hasAttached(), true);
    m._onCssAnimationDone('mat-legacy-menu-exit');
    assert.equal(f.owner.overlay.hasAttached(), false); assert.equal(f.panel.state.destroyed, 2);
    m._onCssAnimationDone('mat-legacy-menu-exit'); assert.equal(f.owner.overlay.detachCount, 1);
    assert.equal(f.events.filter(e => e === 'closed').length, 1);
    assert.equal(m._animationDone.observers.length, 0, 'completed removal subscription retained');
  });
  if (baseline) return result;
  await check('closed-overlay-releases-keyboard-and-pointer-input', f => {
    const t = f.owner.instance, overlay = f.owner.overlay; let delivered = 0;
    f.panel.instance._handleKeydown = () => delivered++;
    t.openMenu(); overlay.keydowns.next({keyCode: 40}); assert.equal(delivered, 1);
    t.closeMenu(); overlay.keydowns.next({keyCode: 40}); assert.equal(delivered, 1);
    assert.equal(overlay.keydowns.observers.length, 0); assert.equal(overlay.overlayElement.style.pointerEvents, 'none');
    t.openMenu(); overlay.keydowns.next({keyCode: 40}); assert.equal(delivered, 2);
    assert.equal(overlay.keydowns.observers.length, 1); assert.equal(overlay.overlayElement.style.pointerEvents, 'auto');
  });
  await check('fallback-detaches-once', f => {
    f.owner.instance.openMenu(); f.owner.instance.closeMenu(); f.timer.advance(199);
    assert.equal(f.owner.overlay.hasAttached(), true); f.timer.advance(1);
    assert.equal(f.owner.overlay.hasAttached(), false); assert.equal(f.panel.state.destroyed, 2);
  });
  await check('disabled-exit-completes-in-microtask', async f => {
    f.owner.instance.openMenu(); f.owner.instance.closeMenu(); assert.equal(f.owner.overlay.hasAttached(), true);
    await Promise.resolve(); assert.equal(f.owner.overlay.hasAttached(), false); assert.equal(f.panel.state.destroyed, 2);
  }, {enabled: false});
  await check('reopen-cancels-old-removal', f => {
    const t = f.owner.instance, m = f.panel.instance; t.openMenu(); t.closeMenu();
    const stale = [...f.timer.timers.values()].map(t => t.run); t.openMenu(); stale.forEach(run => run());
    m._onCssAnimationDone('mat-legacy-menu-enter'); assert.equal(t.menuOpen, true);
    assert.equal(f.owner.overlay.hasAttached(), true); assert.equal(f.panel.state.created, 4); assert.equal(f.panel.state.destroyed, 2);
    assert.equal(m._animationDone.observers.length, 0, 'old removal subscription retained');
  });
  await check('shared-menu-transfers-owner', f => {
    const first = f.owner, second = f.trigger(f.panel.instance);
    first.instance.openMenu(); second.instance.openMenu();
    assert.equal(first.instance.menuOpen, false); assert.equal(first.overlay.hasAttached(), false);
    assert.equal(second.instance.menuOpen, true); assert.equal(second.overlay.hasAttached(), true);
    first.instance.ngOnDestroy(); assert.equal(f.panel.state.destroyed, 2);
    second.instance.closeMenu(); f.panel.instance._onCssAnimationDone('mat-legacy-menu-exit'); assert.equal(f.panel.state.destroyed, 4);
  });
  await check('close-listener-reopens-before-exit-start', f => {
    const t = f.owner.instance; t.openMenu(); const sub = t.menuClosed.subscribe(() => t.openMenu());
    t.closeMenu(); sub.unsubscribe();
    assert.equal(t.menuOpen, true); assert.equal(f.owner.overlay.hasAttached(), true); assert.equal(f.panel.instance._panelAnimationState, 'enter');
    f.timer.advance(300); assert.equal(f.owner.overlay.hasAttached(), true);
  });
  await check('reentrant-submenu-close-retains-latest-highlight', f => {
    const t = f.owner.instance; let highlighted = false;
    t.triggersSubmenu = () => true; t._menuItemInstance = {_setHighlighted(value) { highlighted = value; }};
    t.openMenu(); const sub = t.menuClosed.subscribe(() => t.openMenu()); t.closeMenu(); sub.unsubscribe();
    assert.equal(t.menuOpen, true); assert.equal(highlighted, true);
  });
  await check('focus-listener-reopens-before-exit-start', f => {
    const t = f.owner.instance; t.openMenu(); t.focus = () => t.openMenu(); t.closeMenu();
    assert.equal(t.menuOpen, true); assert.equal(f.owner.overlay.hasAttached(), true);
    assert.equal(f.panel.instance._panelAnimationState, 'enter');
  });
  await check('destroy-cancels-removal-and-prevents-reopen', f => {
    const t = f.owner.instance; t.openMenu(); t.closeMenu(); const stale = [...f.timer.timers.values()].map(t => t.run);
    t.ngOnDestroy(); const detaches = f.owner.overlay.detachCount; stale.forEach(run => run()); t.openMenu();
    assert.equal(f.owner.overlay.disposed, true); assert.equal(f.owner.overlay.hasAttached(), false);
    assert.equal(f.panel.state.destroyed, 2); assert.equal(f.owner.overlay.detachCount, detaches);
    assert.equal(t.menuOpen, false);
  });
  await check('panel-destroyed-during-exit-releases-overlay', f => {
    const t = f.owner.instance; t.openMenu(); t.closeMenu(); f.panel.instance._animationDone.complete();
    assert.equal(f.owner.overlay.hasAttached(), false); f.panel.instance.ngOnDestroy(); assert.equal(f.panel.state.destroyed, 2);
    assert.equal(f.timer.timers.size, 0);
  });
  await check('panel-destroyed-while-open-releases-trigger', f => {
    const t = f.owner.instance; t.openMenu(); f.panel.instance.ngOnDestroy();
    assert.equal(t.menuOpen, false); assert.equal(f.owner.overlay.hasAttached(), false); assert.equal(f.panel.state.destroyed, 2);
  });
  await check('panel-completion-observer-cannot-reopen-destroyed-panel', f => {
    const t = f.owner.instance; t.openMenu(); t.menuClosed.subscribe(() => t.openMenu()); f.panel.instance.ngOnDestroy();
    assert.equal(t.menuOpen, false); assert.equal(f.owner.overlay.hasAttached(), false);
    t.openMenu(); assert.equal(f.owner.overlay.hasAttached(), false);
  });
  await check('input-replacement-does-not-borrow-new-lazy-content', f => {
    const t = f.owner.instance, old = f.panel.instance; t.openMenu(); t.closeMenu();
    const next = f.menu(); t.menu = next.instance; old._onCssAnimationDone('mat-legacy-menu-exit');
    assert.equal(f.panel.state.destroyed, 2); assert.equal(next.state.destroyed, 0);
    t.openMenu(); assert.equal(t.menuOpen, true); assert.equal(next.state.created, 2);
  });
  await check('detach-callback-opens-new-owner-without-destroying-new-content', f => {
    const second = f.trigger(f.panel.instance); f.owner.instance.openMenu(); f.owner.instance.closeMenu();
    f.owner.overlay.afterDetach = () => second.instance.openMenu();
    f.panel.instance._onCssAnimationDone('mat-legacy-menu-exit');
    assert.equal(second.instance.menuOpen, true); assert.equal(second.overlay.hasAttached(), true);
    assert.equal(f.panel.state.created, 4); assert.equal(f.panel.state.destroyed, 2); assert.equal(f.panel.state.attached, true);
  });
  await check('close-listener-destroys-trigger-without-late-motion', f => {
    const t = f.owner.instance; t.openMenu(); t.menuClosed.subscribe(() => t.ngOnDestroy()); t.closeMenu();
    assert.equal(f.owner.overlay.disposed, true); assert.equal(f.panel.state.destroyed, 2);
    assert.equal(f.timer.timers.size, 0); assert.equal(f.panel.instance._animationDone.observers.length, 0);
  });
  await check('open-listener-closes-before-enter-start', f => {
    const t = f.owner.instance; t.menuOpened.subscribe(() => t.closeMenu()); t.openMenu();
    assert.equal(t.menuOpen, false); assert.equal(f.panel.instance._panelAnimationState, 'void');
    f.timer.advance(200); assert.equal(f.owner.overlay.hasAttached(), false); assert.equal(f.panel.state.destroyed, 2);
  });
  await check('generic-panel-detaches-immediately', f => {
    const menu = {close: new core.EventEmitter(), focusFirstItem() {}, lazyContent: {attach() {}, detach() { this.detached = true; }}};
    const {instance: t, overlay} = f.trigger(menu); t.openMenu(); t.closeMenu();
    assert.equal(t.menuOpen, false); assert.equal(overlay.hasAttached(), false); assert.equal(menu.lazyContent.detached, true);
  });
  return result;
}
cases.push(...await observe());
if (!baseline && cases.every(row => row.result === 'pass')) {
  const file = ts.createSourceFile('trigger.ts', raw.trigger, ts.ScriptTarget.Latest, true);
  const cls = file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === '_MatMenuTriggerBase');
  for (const [id, method, before, after, intended] of [
    ['early-overlay-detach', '_destroyMenu', '    overlayRef.detachBackdrop();', '    overlayRef.detach();', 'owned-exit-retains-overlay-and-lazy-until-void'],
    ['early-lazy-detach', '_destroyMenu', '    overlayRef.detachBackdrop();', '    overlayRef.detachBackdrop(); menu?.lazyContent?.detach();', 'owned-exit-retains-overlay-and-lazy-until-void'],
    ['retain-reopen-subscription', 'openMenu', '    this._pendingRemoval.unsubscribe();', '', 'reopen-cancels-old-removal'],
    ['old-close-clobbers-new-open', '_destroyMenu', /    if \(this\._destroyed \|\| generation !== this\._menuGeneration\) \{\n      return;\n    \}/g, '', 'close-listener-reopens-before-exit-start'],
    ['old-owner-detaches-new-lazy', '_detachMenu', 'if (owned && !MENU_PANEL_OWNERS.has(menu))', 'if (owned)', 'detach-callback-opens-new-owner-without-destroying-new-content'],
    ['missing-owner-transfer', 'openMenu', 'const previousOwner = MENU_PANEL_OWNERS.get(menu);', 'const previousOwner = undefined;', 'shared-menu-transfers-owner'],
    ['enter-removes-exiting-panel', '_destroyMenu', "event.toState === 'void'", 'true', 'owned-exit-retains-overlay-and-lazy-until-void'],
    ['retain-completed-subscription', '_destroyMenu', '          removal.unsubscribe();', '', 'owned-exit-retains-overlay-and-lazy-until-void'],
    ['late-submenu-highlight-write', '_setIsMenuOpen', '      if (this._destroyed || this._menuOpen !== isOpen) {\n        return;\n      }', '', 'reentrant-submenu-close-retains-latest-highlight'],
    ['lost-animation-source-completion', '_destroyMenu', 'complete: remove,', 'complete: () => {},', 'panel-destroyed-during-exit-releases-overlay'],
    ['reopen-destroyed-panel', 'openMenu', ' || this._closedMenus.has(menu)', '', 'panel-completion-observer-cannot-reopen-destroyed-panel'],
    ['closed-menu-keeps-keyboard', '_destroyMenu', '    this._keydownSubscription.unsubscribe();', '', 'closed-overlay-releases-keyboard-and-pointer-input'],
    ['closed-menu-keeps-pointer-input', '_destroyMenu', "    overlayRef.overlayElement.style.pointerEvents = 'none';", '', 'closed-overlay-releases-keyboard-and-pointer-input'],
    ['late-enter-after-open-observer-closes', 'openMenu', '    if (this._destroyed || generation !== this._menuGeneration || !this.menuOpen) {\n      return;\n    }', '', 'open-listener-closes-before-enter-start'],
  ]) {
    const node = cls.members.find(node => node.name?.getText(file) === method), text = node.getText(file);
    const changed = text.replace(before, after); assert.notEqual(changed, text, id);
    const source = raw.trigger.slice(0, node.getStart(file)) + changed + raw.trigger.slice(node.end);
    const result = await observe(source, intended);
    assert.equal(result.length, 1); assert.equal(result[0].result, 'fail', 'mutant survived: ' + id);
    mutations.push({id, intended_case: intended, rejected: true, error: result[0].error});
  }
}
const failures = cases.filter(row => row.result !== 'pass');
const report = {schema_version: 1, line: JSON.parse(readFileSync(resolve(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main',
  baseline, cases, failures, mutations, node: process.version, typescript: ts.version, borrowed_core: core.VERSION.full, borrowed_rxjs: JSON.parse(readFileSync(require.resolve('rxjs/package.json'))).version,
  source_members: Object.entries(paths).map(([key, path]) => ({path, sha256: hash(raw[key])})),
  scope: 'Complete actual owned menu and trigger constructors/methods with genuine public Core environment injection, EventEmitter/QueryList and RxJS; protocol overlays/lazy views/layout/focus/animation policy and deterministic timers. No Angular view, browser/CSS paint, artifact or floor qualification.',
  producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), native_or_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
const out = args.indexOf('--report'); if (out >= 0) writeFileSync(args[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, cases: cases.length, mutants_rejected: mutations.length, failures, baseline, native_or_packed_or_floor_qualified: false}));
if (failures.length && !baseline) process.exitCode = 1;
