/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned prototype methods, deterministic timers and Node EventTarget; no constructor/Angular/native qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url), ts = require('typescript');
const {Subject} = require('rxjs'), {take, takeUntil} = require('rxjs/operators');
const sha = text => createHash('sha256').update(text).digest('hex');
const paths = {menu: 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts', select: 'projects/ngx-material-legacy/legacy-select/internal/select-base.ts'};
const raw = Object.fromEntries(Object.entries(paths).map(([family, path]) => [family, readFileSync(resolve(root, path), 'utf8')]));
const helperSource = readFileSync(resolve(root, 'projects/ngx-material-legacy/legacy-core/internal/motion-event.ts'), 'utf8');
const emit = source => ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true}}).outputText;
const helperExports = {};
new Function('exports', emit(helperSource))(helperExports);

// Preserve every method body. Remove decorator evaluation and the inherited
// constructor boundary solely to expose a prototype; no product constructor runs.
export function ownedPrototype(family, source = raw[family]) {
  const file = ts.createSourceFile(paths[family], source, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0);
  const name = family === 'menu' ? '_MatMenuBase' : '_MatSelectBase';
  const declaration = file.statements.find(node => ts.isClassDeclaration(node) && node.name.text === name);
  assert.ok(declaration);
  const transformed = ts.transform(declaration, [context => node => {
    const visit = node => ts.isDecorator(node) ? undefined : ts.visitEachChild(node, visit, context);
    return ts.visitNode(node, visit);
  }]);
  const stripped = transformed.transformed[0], printed = ts.createPrinter().printNode(ts.EmitHint.Unspecified, stripped, file);
  transformed.dispose();
  const exports = {}, definitions = family === 'menu' ? "const ENTER_ANIMATION='mat-legacy-menu-enter',EXIT_ANIMATION='mat-legacy-menu-exit';" : 'class _MatSelectMixinBase {}';
  new Function('exports', 'legacyHostMotionEvent', 'legacyNextMotionCompletion', 'take', 'takeUntil', emit(definitions + '\n' + printed))(exports, helperExports.legacyHostMotionEvent, helperExports.legacyNextMotionCompletion, take, takeUntil);
  return exports[name].prototype;
}
function clock() {
  const previous = [globalThis.setTimeout, globalThis.clearTimeout], timers = new Map(); let next = 0, now = 0;
  globalThis.setTimeout = (run, delay = 0) => {const id = ++next; timers.set(id, {run, due: now + delay}); return id;};
  globalThis.clearTimeout = id => timers.delete(id);
  return {timers, advance(delta) {const end = now + delta; let calls = 0; for (;;) {const pending = [...timers].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0]; if (!pending) break; assert.ok(++calls < 100); timers.delete(pending[0]); now = pending[1].due; pending[1].run();} now = end;}, restore() {[globalThis.setTimeout, globalThis.clearTimeout] = previous;}};
}
function panel() {
  const target = new EventTarget(), callbacks = new Set(), add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
  target.addEventListener = (type, fn, options) => {if (type === 'animationend') callbacks.add(fn); add(type, fn, options);};
  target.removeEventListener = (type, fn, options) => {if (type === 'animationend') callbacks.delete(fn); remove(type, fn, options);};
  return {target, callbacks, end(name = 'mat-legacy-select-exit') {const event = new Event('animationend'); Object.defineProperty(event, 'animationName', {value: name}); target.dispatchEvent(event);}};
}
function fixture(family, prototype, enabled = true) {
  const c = clock(), instance = Object.create(prototype), events = [], order = [], dom = panel();
  const stream = new Subject(), destroyed = new Subject(), position = new Subject();
  let marks = 0, detects = 0, settled = 0, completed = 0;
  stream.subscribe({next(value) {events.push(typeof value === 'string' ? value : value.toState); order.push('event:' + events.at(-1));}, complete() {completed++;}});
  Object.assign(instance, {_motionSequence: 0, _motionDestroyed: false, _completedEnterAnimation: false, _animationsEnabled: enabled, _isAnimating: false,
    _panelAnimationState: 'void', _panelOpen: false, _overlayAttached: false, _panelExiting: false,
    _animationDone: stream, _panelDoneAnimatingStream: stream, _destroy: destroyed, stateChanges: new Subject(), closed: new Subject(),
    _directDescendantItems: {length: 0, destroy() {}}, _keyManager: {activeItemIndex: -1, destroy() {}, withHorizontalOrientation() {}},
    _changeDetectorRef: {markForCheck() {marks++; order.push('mark:' + (instance._panelOpen ? 'open' : 'closed'));}, detectChanges() {detects++;}},
    panel: {nativeElement: dom.target}, _overlayDir: {positionChange: position}, _applyModalPanelOwnership() {}, _clearFromModal() {},
    _selectAnimationsEnabled: () => enabled, _canOpen: () => !instance._panelOpen, _isRtl: () => false, _highlightCorrectOption() {},
    _positioningSettled() {settled++;}, _onTouched() {}, _multiple: false,
  });
  return {instance, c, events, order, dom, position, enabled, marks: () => marks, detects: () => detects, settled: () => settled, completed: () => completed,
    open() {family === 'menu' ? instance._startAnimation() : instance.open();},
    start(name = 'mat-legacy-menu-enter') {instance._onCssAnimationStart(name);},
    end(name = 'mat-legacy-menu-enter') {family === 'menu' ? instance._onCssAnimationDone(name) : instance._onPanelAnimationEnd(name);},
    closePanel() {family === 'menu' ? instance._resetAnimation() : instance.close();},
    destroy() {instance.ngOnDestroy();},
    cleanup() {try {instance.ngOnDestroy();} finally {c.restore();}},
  };
}
export async function observations(family, prototype) {
  const cases = [];
  async function check(id, enabled, run) {const f = fixture(family, prototype, enabled); try {await run(f); cases.push({id, result: 'pass'});} catch (error) {cases.push({id, result: 'fail', error: String(error.message).slice(0, 450)});} finally {f.cleanup();}}
  if (family === 'menu') {
    await check('enter-completes-once', true, f => {f.open(); f.start(); f.end(); f.end(); assert.deepEqual(f.events, ['enter']); assert.equal(f.instance._isAnimating, false);});
    await check('wrong-phase-enter-end-cannot-complete-exit', true, f => {f.open(); f.closePanel(); f.end(); assert.deepEqual(f.events, []); f.end('mat-legacy-menu-exit'); assert.deepEqual(f.events, ['void']);});
    await check('reopen-rejects-captured-old-exit-fallback', true, f => {f.open(); f.closePanel(); const stale = [...f.c.timers.values()][0].run; f.open(); stale(); assert.deepEqual(f.events, []); assert.equal(f.c.timers.size, 0);});
    await check('old-exit-cannot-complete-a-later-exit', true, f => {f.open(); f.closePanel(); const stale = [...f.c.timers.values()][0].run; f.open(); f.closePanel(); stale(); assert.deepEqual(f.events, []); assert.equal(f.c.timers.size, 1); f.c.advance(200); assert.deepEqual(f.events, ['void']);});
    await check('repeated-reset-replaces-fallback', true, f => {f.open(); f.closePanel(); f.closePanel(); assert.equal(f.c.timers.size, 1); f.c.advance(200); assert.deepEqual(f.events, ['void']);});
    await check('noop-close-before-open-completion', false, async f => {f.open(); f.closePanel(); await Promise.resolve(); assert.deepEqual(f.events, ['void']);});
    await check('noop-reopen-discards-earlier-phase-microtasks', false, async f => {f.open(); f.closePanel(); f.open(); await Promise.resolve(); assert.deepEqual(f.events, ['enter']);});
    await check('noop-latest-open-completes-after-between-phase-microtask', false, async f => {const order = []; f.instance._animationDone.subscribe(event => order.push(event.toState)); f.open(); f.closePanel(); Promise.resolve().then(() => order.push('between')); f.open(); await Promise.resolve(); assert.deepEqual(order, ['between', 'enter']);});
    await check('destroy-discards-noop-microtask', false, async f => {f.open(); f.destroy(); const marks = f.marks(); await Promise.resolve(); assert.deepEqual(f.events, []); assert.equal(f.marks(), marks); assert.equal(f.completed(), 1);});
    await check('destroy-rejects-captured-fallback-and-late-events', true, f => {f.open(); f.closePanel(); const stale = [...f.c.timers.values()][0].run; f.destroy(); const marks = f.marks(); stale(); f.start(); f.end('mat-legacy-menu-exit'); f.open(); f.closePanel(); assert.deepEqual(f.events, []); assert.equal(f.instance._isAnimating, false); assert.equal(f.c.timers.size, 0); assert.equal(f.marks(), marks); assert.equal(f.completed(), 1);});
    await check('completion-observer-restarts-without-old-phase-clobber', true, f => {f.open(); f.closePanel(); f.instance._animationDone.subscribe(event => {if (event.toState === 'void') {f.open(); f.start();}}); f.end('mat-legacy-menu-exit'); assert.deepEqual(f.events, ['void']); assert.equal(f.instance._isAnimating, true);});
    await check('animation-start-after-completion-is-inert', true, f => {f.open(); f.end(); f.start(); assert.equal(f.instance._isAnimating, false);});
    await check('nested-and-unknown-native-events-are-inert', true, f => {f.open(); const host = {}; f.instance._onCssAnimationDone({target: {}, currentTarget: host, animationName: 'mat-legacy-menu-enter'}); f.end('foreign-animation'); assert.deepEqual(f.events, []); f.instance._onCssAnimationDone({target: host, currentTarget: host, animationName: 'mat-legacy-menu-enter'}); assert.deepEqual(f.events, ['enter']);});
  } else {
    await check('enter-completes-once', true, f => {f.open(); f.end('mat-legacy-select-enter'); f.end('mat-legacy-select-enter'); assert.deepEqual(f.events, ['showing']);});
    for (const enabled of [true, false]) await check('close-before-panel-view-resolves-' + (enabled ? 'enabled' : 'disabled'), enabled, f => {
      f.instance.panel = undefined;
      f.open(); f.closePanel();
      assert.equal(f.instance._panelOpen, false);
      assert.equal(f.instance._overlayAttached, false);
      assert.deepEqual(f.events, ['void']);
      assert.equal(f.c.timers.size, 0);
      assert.equal(f.dom.callbacks.size, 0);
    });
    await check('exit-fallback-detaches-once', true, f => {f.open(); f.closePanel(); const stale = [...f.c.timers.values()][0].run; f.c.advance(199); assert.equal(f.instance._overlayAttached, true); f.c.advance(1); stale(); assert.deepEqual(f.events, ['void']); assert.equal(f.instance._overlayAttached, false); assert.equal(f.dom.callbacks.size, 0);});
    await check('real-host-exit-event-cancels-fallback', true, f => {f.open(); f.closePanel(); f.dom.end('foreign-animation'); assert.deepEqual(f.events, []); f.dom.end(); f.c.advance(500); assert.deepEqual(f.events, ['void']); assert.equal(f.dom.callbacks.size, 0); assert.equal(f.c.timers.size, 0);});
    await check('nested-exit-event-is-inert', true, f => {f.open(); f.closePanel(); const handler = [...f.dom.callbacks][0]; handler({target: {}, currentTarget: f.dom.target, animationName: 'mat-legacy-select-exit'}); assert.deepEqual(f.events, []); f.dom.end(); assert.deepEqual(f.events, ['void']);});
    await check('reopen-rejects-captured-old-exit-fallback', true, f => {f.open(); f.closePanel(); const stale = [...f.c.timers.values()][0].run; f.open(); stale(); assert.equal(f.instance._panelOpen, true); assert.equal(f.instance._overlayAttached, true); assert.deepEqual(f.events, []); assert.equal(f.c.timers.size, 0); assert.equal(f.dom.callbacks.size, 0);});
    await check('old-exit-cannot-complete-a-later-exit', true, f => {f.open(); f.closePanel(); const stale = [...f.c.timers.values()][0].run; f.open(); f.closePanel(); stale(); assert.deepEqual(f.events, []); assert.equal(f.instance._overlayAttached, true); f.c.advance(200); assert.deepEqual(f.events, ['void']);});
    await check('destroy-cancels-fallback-and-no-late-view-work', true, f => {f.open(); f.closePanel(); const stale = [...f.c.timers.values()][0].run; f.destroy(); const marks = f.marks(); stale(); f.end('mat-legacy-select-enter'); f.open(); f.closePanel(); assert.deepEqual(f.events, []); assert.equal(f.c.timers.size, 0); assert.equal(f.dom.callbacks.size, 0); assert.equal(f.marks(), marks);});
    await check('touched-callback-reopen-does-not-detach-new-panel', false, f => {f.open(); f.instance._onTouched = () => f.open(); f.closePanel(); assert.equal(f.instance._panelOpen, true); assert.equal(f.instance._overlayAttached, true); assert.deepEqual(f.events, []);});
    await check('touched-callback-reopen-leaves-no-exit-resources', true, f => {f.open(); f.instance._onTouched = () => f.open(); f.closePanel(); assert.equal(f.instance._panelOpen, true); assert.equal(f.instance._overlayAttached, true); assert.equal(f.c.timers.size, 0); assert.equal(f.dom.callbacks.size, 0);});
    await check('touched-callback-destroy-does-not-schedule-exit', true, f => {f.open(); f.instance._onTouched = () => f.destroy(); f.closePanel(); assert.equal(f.c.timers.size, 0); assert.equal(f.dom.callbacks.size, 0); assert.deepEqual(f.events, []);});
    await check('completion-is-last-old-phase-observable-work', true, f => {f.open(); f.closePanel(); f.order.length = 0; f.instance._panelDoneAnimatingStream.subscribe(state => {if (state === 'void') f.open();}); f.dom.end(); assert.deepEqual(f.order, ['mark:closed', 'event:void', 'mark:open']); assert.equal(f.instance._overlayAttached, true);});
    await check('stale-position-receipt-after-close-does-no-work', false, f => {f.open(); f.instance._onAttached(); f.closePanel(); f.position.next({}); assert.equal(f.detects(), 0); assert.equal(f.settled(), 0); assert.deepEqual(f.events, ['void']);});
    await check('only-latest-reopened-position-receipt-settles', false, f => {f.open(); f.instance._onAttached(); f.closePanel(); f.open(); f.instance._onAttached(); f.position.next({}); assert.equal(f.detects(), 1); assert.equal(f.settled(), 1); assert.deepEqual(f.events, ['void', 'showing']);});
    await check('destroy-before-position-receipt-cancels-work', false, f => {f.open(); f.instance._onAttached(); f.destroy(); f.position.next({}); assert.equal(f.detects(), 0); assert.equal(f.settled(), 0); assert.deepEqual(f.events, []);});
    await check('view-update-close-cancels-remaining-position-work', false, f => {f.open(); f.instance._changeDetectorRef.detectChanges = () => f.closePanel(); f.instance._onAttached(); f.position.next({}); assert.equal(f.settled(), 0); assert.deepEqual(f.events, ['void']);});
    await check('noop-and-native-enter-completion-share-one-boundary', false, f => {f.open(); f.instance._onAttached(); f.end('mat-legacy-select-enter'); f.position.next({}); assert.deepEqual(f.events, ['showing']);});
    await check('multiple-enter-retains-historical-state-name', true, f => {f.instance._multiple = true; f.open(); f.end('mat-legacy-select-enter'); assert.deepEqual(f.events, ['showing-multiple']);});
  }
  return cases;
}
const minimumUnresolvedPanelGuards = [];
for (const cap of JSON.parse(readFileSync(resolve(root, 'compatibility/rc/select-unresolved-panel-peer-sources/identities.json'), 'utf8'))) {
  const compressed = readFileSync(resolve(root, cap.retained.path)); assert.equal(sha(compressed), cap.retained.sha256);
  const bytes = gunzipSync(compressed); assert.equal(sha(bytes), cap.member_sha256); assert.equal(bytes.length, cap.member_bytes);
  const file = ts.createSourceFile('peer-select.mjs', bytes.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const owner = file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'MatSelect');
  const method = owner.members.find(node => node.name?.getText(file) === '_exitAndDetach'); assert.ok(method);
  const detach = owner.members.find(node => node.name?.getText(file) === '_detachOverlay'); assert.ok(detach);
  const exports = {}; new Function('exports', emit('export class Peer {' + method.getText(file) + detach.getText(file) + '}'))(exports);
  for (const disabled of [false, true]) {
    let detaches = 0, marks = 0; const instance = Object.create(exports.Peer.prototype);
    Object.assign(instance, {_animationsDisabled: disabled, panel: undefined, _overlayDir: {detachOverlay() { detaches++; }}, _changeDetectorRef: {markForCheck() { marks++; }}});
    instance._exitAndDetach(); assert.equal(detaches, 1); assert.equal(marks, 1);
    minimumUnresolvedPanelGuards.push({line: cap.line, version: cap.version, member_sha256: cap.member_sha256,
      complete_method_sha256: sha(method.getText(file)), complete_method: method.getText(file), animations_disabled: disabled,
      detaches, marks, detach_method_sha256: sha(detach.getText(file)), detach_method: detach.getText(file), scope: 'Complete exact minimum exit and detach methods on unresolved-panel synthetic receiver only; no constructor, DI, native or full minimum runtime qualification.'});
  }
}
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {assert.ok(['--report', '--allow-failures'].includes(args[i])); options[args[i]] = args[i + 1];}
const report = {minimum_unresolved_panel_guards: minimumUnresolvedPanelGuards, schema_version: 1, line: JSON.parse(readFileSync(resolve(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main', node: process.version, compiler: ts.version, source_sha256: Object.fromEntries(Object.entries(raw).map(([family, text]) => [family, sha(text)])), helper_sha256: sha(helperSource), families: {}, scope: 'Actual whole owned prototype method bodies, with constructor/decorator execution excluded. Deterministic timers, real Promise microtasks, Node EventTarget host events, borrowed RxJS7.8.2 streams, synthetic view/key/position services. No Angular constructor, public OverlayRef, browser, packed or full minimum runtime qualification.', g11_claim: 'not-passed'};
for (const family of ['menu', 'select']) report.families[family] = await observations(family, ownedPrototype(family));
report.failures = Object.values(report.families).flat().filter(row => row.result !== 'pass');
report.mutations = [];
if (!report.failures.length) {
  const mutateMethod = (source, method, edit) => {
    const file = ts.createSourceFile('subject.ts', source, ts.ScriptTarget.Latest, true);
    const owner = file.statements.find(node => ts.isClassDeclaration(node) && node.members.some(member => member.name?.getText(file) === method));
    const node = owner?.members.find(member => member.name?.getText(file) === method); assert.ok(node);
    const text = node.getText(file), changed = edit(text); assert.notEqual(changed, text);
    return source.slice(0, node.getStart(file)) + changed + source.slice(node.end);
  };
  const controls = [
    ['menu', 'remove-request-sequence', '_completeAnimation', text => text.replace('sequence !== this._motionSequence ||', ''), 'old-exit-cannot-complete-a-later-exit'],
    ['menu', 'remove-current-phase', '_completeAnimation', text => text.replace("animationName !== (this._panelAnimationState === 'enter' ? ENTER_ANIMATION : EXIT_ANIMATION)", 'false'), 'wrong-phase-enter-end-cannot-complete-exit'],
    ['menu', 'remove-start-destroy-guard', '_startAnimation', text => text.replace('if (this._motionDestroyed)', 'if (false)'), 'destroy-rejects-captured-fallback-and-late-events'],
    ['menu', 'remove-reset-destroy-guard', '_resetAnimation', text => text.replace('if (this._motionDestroyed)', 'if (false)'), 'destroy-rejects-captured-fallback-and-late-events'],
    ['menu', 'retain-old-exit-timer', '_startAnimation', text => text.replace('this._clearExitFallback();', ''), 'reopen-rejects-captured-old-exit-fallback'],
    ['menu', 'repeat-exit-timers', '_resetAnimation', text => text.replace('this._clearExitFallback();', ''), 'repeated-reset-replaces-fallback'],
    ['menu', 'do-not-complete-subject-on-destroy', 'ngOnDestroy', text => text.replace('this._animationDone.complete();', ''), 'destroy-discards-noop-microtask'],
    ['menu', 'late-state-write-after-notification', '_completeAnimation', text => text.replace("this._isAnimating = false;\n    this._animationDone.next({toState: isExit ? 'void' : 'enter'});", "this._animationDone.next({toState: isExit ? 'void' : 'enter'});\n    this._isAnimating = false;"), 'completion-observer-restarts-without-old-phase-clobber'],
    ['select', 'lose-unresolved-panel-exit-guard', '_exitAndDetach', text => text.replace('!animationsEnabled || !this.panel', '!animationsEnabled'), 'close-before-panel-view-resolves-enabled'],
    ['select', 'remove-enter-deduplication', '_completePanelEnter', text => text.replace('&& !this._completedEnterAnimation', ''), 'enter-completes-once'],
    ['select', 'remove-exit-sequence', '_completePanelExit', text => text.replace('sequence !== this._motionSequence ||', ''), 'old-exit-cannot-complete-a-later-exit'],
    ['select', 'repeat-detached-exit-completion', '_completePanelExit', text => text.replace('|| !this._overlayAttached', ''), 'exit-fallback-detaches-once'],
    ['select', 'remove-open-destroy-guard', 'open', text => text.replace('this._motionDestroyed || !this._canOpen()', '!this._canOpen()').replace('if (this._motionDestroyed || sequence !== this._motionSequence)', 'if (sequence !== this._motionSequence)').replace('if (!this._motionDestroyed && sequence === this._motionSequence)', 'if (sequence === this._motionSequence)'), 'destroy-cancels-fallback-and-no-late-view-work'],
    ['select', 'allow-exit-after-touched-reopen', '_exitAndDetach', text => text.replace('this._motionDestroyed || this._panelOpen', 'this._motionDestroyed').replace('this._motionDestroyed || sequence !== this._motionSequence || this._panelOpen', 'this._motionDestroyed || sequence !== this._motionSequence'), 'touched-callback-reopen-leaves-no-exit-resources'],
    ['select', 'restore-old-position-receipt', '_onAttached', text => text.replace(/    const sequence = this\._motionSequence;/, '    const sequence = this._motionSequence;').replace(/      if \(this\._motionDestroyed \|\| sequence !== this\._motionSequence \|\| !this\._panelOpen\) \{\n        return;\n      \}\n/g, ''), 'stale-position-receipt-after-close-does-no-work'],
  ];
  for (const [family, id, method, edit, expectedCase] of controls) {
    let changed = mutateMethod(raw[family], method, edit);
    if (id === 'allow-exit-after-touched-reopen') changed = mutateMethod(changed, 'close', text => text.replace('if (!this._motionDestroyed && sequence === this._motionSequence && !this._panelOpen)', 'if (!this._motionDestroyed)'));
    const results = await observations(family, ownedPrototype(family, changed));
    assert.equal(results.find(row => row.id === expectedCase)?.result, 'fail', 'mutation did not fail its intended case: ' + id);
    report.mutations.push({family, id, intended_case: expectedCase, rejected: true});
  }
}
if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({line: report.line, cases: Object.values(report.families).flat().length, mutants_rejected: report.mutations.length, failures: report.failures}));
if (report.failures.length && options['--allow-failures'] !== 'true') process.exitCode = 1;
