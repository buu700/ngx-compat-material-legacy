/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned leaf/base/flag code; deterministic clocks and synthetic DOM only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {fixture, load as loadBase} from './dialog-initial-focus-source-test.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), ts = require('typescript');
const url = name => pathToFileURL(require.resolve(name)).href;
const core = await import(url('@angular/core'));
const leafPath = 'projects/ngx-material-legacy/legacy-dialog/dialog-container.ts';
const flagPath = 'projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts';
const paramsPath = 'projects/ngx-material-legacy/legacy-dialog/dialog-animation-params.ts';
const original = readFileSync(resolve(root, leafPath), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function emit(raw) {
  return ts.transpileModule(raw, {compilerOptions: {target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true}}).outputText
    .replace(/(['"])(@angular\/[^'"]+|rxjs)\1/g, (_, quote, name) => JSON.stringify(url(name)));
}
const data = raw => 'data:text/javascript;base64,' + Buffer.from(raw).toString('base64');
const flagsUrl = data(emit(readFileSync(resolve(root, flagPath), 'utf8')));
const flags = await import(flagsUrl);
export const motionOverrideToken = flags.LEGACY_ANIMATIONS_TEST_OVERRIDE;
const paramsUrl = data(emit(readFileSync(resolve(root, paramsPath), 'utf8')));
export async function loadConfig() {
  const raw = readFileSync(resolve(root, 'projects/ngx-material-legacy/legacy-dialog/dialog-config.ts'), 'utf8');
  return (await import(data(emit(raw).replaceAll("'./dialog-animation-params'", JSON.stringify(paramsUrl))))).MatLegacyDialogConfig;
}
export const baseUrl = await loadBase(undefined, undefined, true);
export async function load(raw = original) {
  const js = emit(raw).replaceAll("'./internal/dialog-container-base'", JSON.stringify(baseUrl))
    .replaceAll("'./dialog-animation-params'", JSON.stringify(paramsUrl))
    .replaceAll("'@ngx-compat/material-legacy/legacy-core'", JSON.stringify(flagsUrl));
  return (await import(data(js))).MatLegacyDialogContainer;
}

function clock(options = {}) {
  const names = ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const saved = names.map(name => [name, Object.hasOwn(globalThis, name), globalThis[name]]);
  const timers = new Map(), frames = new Map(), cancelled = [];
  let next = 1, time = 0;
  globalThis.setTimeout = (callback, duration) => {const id = next++;
    timers.set(id, {callback, due: time + duration, duration});return id;};
  globalThis.clearTimeout = id => {cancelled.push(['timer', id]);timers.delete(id);};
  if (options.noFrame) delete globalThis.requestAnimationFrame;
  else globalThis.requestAnimationFrame = callback => {const id = next++;frames.set(id, callback);return id;};
  if (options.noCancel) delete globalThis.cancelAnimationFrame;
  else globalThis.cancelAnimationFrame = id => {cancelled.push(['frame', id]);frames.delete(id);};
  return {timers, frames, cancelled, time: () => time,
    frame() {const entry = frames.entries().next().value;assert.ok(entry);frames.delete(entry[0]);entry[1]();},
    timer() {const entry = [...timers].sort((a,b) => a[1].due - b[1].due)[0];assert.ok(entry);
      timers.delete(entry[0]);time = entry[1].due;entry[1].callback();},
    restore() {for(const [name, existed, value] of saved) {
      if(existed) globalThis[name] = value;else delete globalThis[name];
    }},
  };
}
export function make(Leaf, mode = 'enabled', options = {}) {
  const c = clock(options);
  let f;
  try { f = fixture(Leaf, 'dialog', !!options.browser, {manual: !!options.manual, noMonitor: !!options.noMonitor,
    config: {delayFocusTrap: true, ...options.config}, configFactory: options.configFactory,
    providers: [{provide: flags.LEGACY_ANIMATIONS_TEST_OVERRIDE, useValue: mode}, ...(options.providers || [])],
    mapArguments: (args, injector) => options.beforeConstructor ? args
      : [...args.slice(0, 7), options.changeDetector || injector.get(core.ChangeDetectorRef), ...args.slice(7)]});
  } catch (error) {c.restore();throw error;}
  const classes = new Set(), styles = new Map(), writes = [], events = [];
  f.host.classList = {add(...names) {names.forEach(name => classes.add(name));writes.push(['add', ...names]);},
    remove(...names) {names.forEach(name => classes.delete(name));writes.push(['remove', ...names]);}};
  f.host.style = {setProperty(name, value) {styles.set(name, value);writes.push(['style', name, value]);}};
  f.instance._animationStateChanged.subscribe(e => events.push(e));
  let destroyed = false;
  return {...f, c, classes, styles, writes, events,
    destroy() {if(!destroyed) {destroyed = true;f.destroy();}},
    close() {try {this.destroy();} finally {c.restore();}},
  };
}
const open = 'mat-legacy-dialog-container-open', opening = 'mat-legacy-dialog-container-opening';
const closing = 'mat-legacy-dialog-container-closing';
const phases = f => f.events.map(e => e.state);
async function observations(Leaf, beforeConstructor = false) {
  const create = (mode, options = {}) => make(Leaf, mode, {...options, beforeConstructor});
  const cases = [];
  async function check(id, run) {
    try {await run();cases.push({id, result: 'pass'});}
    catch(error) {cases.push({id, result: 'fail', error: error.message.slice(0, 450)});}
  }
  await check('enabled-open-close-order-duration-and-css-state', async () => {
    const f = create();
    try {f.instance._startOpenAnimation();assert.deepEqual(phases(f), ['opening']);
      assert.equal(f.c.timers.size, 1);assert.equal(f.c.frames.size, 1);assert.equal(f.classes.has(open), false);
      f.c.frame();assert.equal(f.classes.has(opening), true);assert.equal(f.classes.has(open), true);
      f.c.timer();await Promise.resolve();assert.deepEqual(phases(f), ['opening', 'opened']);
      assert.equal(f.classes.has(open), true);assert.equal(f.classes.has(opening), false);
      assert.equal(f.styles.get('--mat-legacy-dialog-enter-duration'), '150ms');
      f.instance._startExitAnimation();assert.equal(f.classes.has(open), false);f.c.frame();
      assert.equal(f.classes.has(closing), true);f.c.timer();
      assert.deepEqual(phases(f), ['opening', 'opened', 'closing', 'closed']);
      assert.deepEqual(f.events.map(e => e.totalTime), [150, 150, 75, 75]);
      assert.equal(f.c.time(), 225);assert.equal(f.classes.has(closing), false);
      assert.equal(f.c.timers.size, 0);assert.equal(f.c.frames.size, 0);
    } finally {f.close();}
  });
  for(const mode of ['di-disabled', 'reduced-motion']) {
    await check(mode + '-keeps-deferred-single-open-and-close', async () => {
      const f = create(mode);
      try {f.instance._startOpenAnimation();assert.deepEqual(phases(f), ['opening']);
        assert.equal(f.c.timers.size, 0);assert.equal(f.c.frames.size, 0);
        await Promise.resolve();assert.deepEqual(phases(f), ['opening', 'opened']);
        f.instance._startExitAnimation();assert.deepEqual(phases(f), ['opening', 'opened', 'closing']);
        await Promise.resolve();assert.deepEqual(phases(f), ['opening', 'opened', 'closing', 'closed']);
        assert.ok(f.events.every(e => e.totalTime === 0));assert.equal(f.classes.has('_mat-animation-noopable'), true);
      } finally {f.close();}
    });
  }
  await check('noop-close-before-open-never-emits-opened', async () => {
    const f = create('di-disabled');
    try {f.instance._startOpenAnimation();f.instance._startExitAnimation();await Promise.resolve();
      assert.deepEqual(phases(f), ['opening', 'closing', 'closed']);assert.equal(f.notifications(), 0);
    } finally {f.close();}
  });
  await check('noop-destroy-before-open-leaves-no-event-or-dom-work', async () => {
    const f = create('di-disabled');f.instance._startOpenAnimation();const writes = f.writes.length;
    try {f.destroy();await Promise.resolve();assert.deepEqual(phases(f), ['opening']);
      assert.equal(f.writes.length, writes);assert.equal(f.notifications(), 0);assert.equal(f.completed(), 1);
    } finally {f.close();}
  });
  await check('noop-destroy-before-close-never-emits-closed', async () => {
    const f = create('di-disabled');
    try {f.instance._startExitAnimation();f.destroy();await Promise.resolve();
      assert.deepEqual(phases(f), ['closing']);assert.equal(f.completed(), 1);
    } finally {f.close();}
  });
  await check('noop-old-phase-cannot-complete-reopened-phase-early', async () => {
    const f = create('di-disabled'), order = [];
    f.instance._animationStateChanged.subscribe(e => {if(e.state === 'closed') order.push('closed');});
    try {f.instance._startOpenAnimation();f.instance._startExitAnimation();
      Promise.resolve().then(() => order.push('between-phases'));
      f.instance._startOpenAnimation();f.instance._startExitAnimation();await Promise.resolve();
      assert.deepEqual(order, ['between-phases', 'closed']);assert.equal(phases(f).includes('opened'), false);
    } finally {f.close();}
  });
  await check('exit-cancels-pending-initial-focus-before-closing-event', async () => {
    const f = create(); let cancelled = 0;
    f.instance._cancelPendingInitialFocus = () => {cancelled++;};
    f.instance._animationStateChanged.subscribe(e => {if (e.state === 'closing') assert.equal(cancelled, 1);});
    try {f.instance._startExitAnimation();assert.equal(cancelled, 1);f.instance._startExitAnimation();assert.equal(cancelled, 1);}
    finally {f.close();}
  });
  for (const delayFocusTrap of [false, true]) {
    await check('unstable-zone-initial-focus-cancelled-on-exit:' + delayFocusTrap, async () => {
      const f = create('enabled', {browser: true,
        config: {autoFocus: 'first-tabbable', delayFocusTrap}});
      try {
        f.zone.isStable = false;
        if (!delayFocusTrap) f.instance._captureInitialFocus();
        f.instance._startOpenAnimation();
        if (delayFocusTrap) f.c.timer();
        assert.equal(f.stable.observers.length, 1);
        assert.equal(f.document.activeElement, null);
        f.instance._startExitAnimation();
        assert.equal(f.stable.observers.length, 0);
        f.zone.isStable = true;
        f.stable.next();
        assert.equal(f.document.activeElement, null);
        assert.equal(f.notifications(), 0);
        f.c.timer();
        assert.equal(phases(f).at(-1), 'closed');
      } finally {f.close();}
    });
  }
  await check('unstable-zone-recapture-cancelled-on-exit', async () => {
    const f = create('enabled', {browser: true,
      config: {autoFocus: 'first-tabbable', delayFocusTrap: false, disableClose: true}});
    try {
      f.zone.isStable = false;
      f.instance._legacyInitialFocusPending = true;
      let cleaned = 0;
      f.instance._legacyPendingFocusListenerCleanup = () => {cleaned++;};
      f.instance._recaptureFocus();
      assert.equal(f.stable.observers.length, 1);
      f.instance._startExitAnimation();
      assert.equal(f.stable.observers.length, 0);
      assert.equal(cleaned, 1);
      f.zone.isStable = true;
      f.stable.next();
      assert.equal(f.document.activeElement, null);
      assert.equal(f.notifications(), 0);
      f.instance._startExitAnimation();
      assert.equal(cleaned, 1);
    } finally {f.close();}
  });
  await check('enabled-destroy-cancels-timer-and-frame', async () => {
    const f = create();f.instance._startOpenAnimation();const frame = [...f.c.frames.values()][0];
    const timer = [...f.c.timers.values()][0].callback, writes = f.writes.length;
    try {f.destroy();assert.equal(f.c.frames.size, 0);assert.equal(f.c.timers.size, 0);
      frame();timer();await Promise.resolve();assert.deepEqual(phases(f), ['opening']);
      assert.equal(f.writes.length, writes);assert.equal(f.notifications(), 0);
    } finally {f.close();}
  });
  await check('uncancellable-old-frame-cannot-reopen-closing-dialog', async () => {
    const f = create('enabled', {noCancel: true});
    try {f.instance._startOpenAnimation();const old = [...f.c.frames.values()][0];
      f.instance._startExitAnimation();old();assert.equal(f.classes.has(open), false);
      assert.equal(f.classes.has(opening), false);f.c.timer();await Promise.resolve();
      assert.deepEqual(phases(f), ['opening', 'closing', 'closed']);
      for(const frame of f.c.frames.values()) frame();assert.equal(f.classes.has(closing), false);
    } finally {f.close();}
  });
  await check('close-during-opening-observer-keeps-only-exit-work', async () => {
    const f = create();
    f.instance._animationStateChanged.subscribe(e => {if(e.state === 'opening') f.instance._startExitAnimation();});
    try {f.instance._startOpenAnimation();assert.equal(f.c.timers.size, 1);
      assert.equal([...f.c.timers.values()][0].duration, 75);assert.equal(f.c.frames.size, 1);
      f.c.frame();f.c.timer();assert.deepEqual(phases(f), ['opening', 'closing', 'closed']);
      assert.equal(f.classes.has(open), false);
    } finally {f.close();}
  });
  await check('destroy-during-opening-observer-schedules-nothing', async () => {
    const f = create();
    f.instance._animationStateChanged.subscribe(e => {if(e.state === 'opening') f.destroy();});
    try {f.instance._startOpenAnimation();await Promise.resolve();
      assert.equal(f.c.timers.size, 0);assert.equal(f.c.frames.size, 0);assert.equal(f.writes.length, 0);
      assert.deepEqual(phases(f), ['opening']);
    } finally {f.close();}
  });
  await check('parent-restoration-failure-cannot-leak-animation-work', async () => {
    const f = create('enabled', {browser: true});f.instance._startOpenAnimation();
    f.config.restoreFocus = '.bad';f.document.querySelector = () => {throw Error('restore failed');};
    try {assert.throws(() => f.destroy(), /restore failed/);
      assert.equal(f.c.timers.size, 0);assert.equal(f.c.frames.size, 0);assert.equal(f.completed(), 1);
    } finally {f.close();}
  });
  await check('zero-duration-before-first-frame-settles-visible-without-opening-class', async () => {
    const f = create('enabled', {config: {enterAnimationDuration: '0ms'}});
    try {f.instance._startOpenAnimation();f.c.timer();await Promise.resolve();
      assert.equal(f.classes.has(open), true);assert.equal(f.classes.has(opening), false);
      assert.equal(f.c.frames.size, 0);assert.deepEqual(phases(f), ['opening', 'opened']);
    } finally {f.close();}
  });
  await check('repeated-exit-request-does-not-duplicate-events-or-jobs', async () => {
    const f = create();
    try {f.instance._startExitAnimation();f.instance._startExitAnimation();
      assert.equal(f.c.timers.size, 1);assert.equal(f.c.frames.size, 1);f.c.frame();f.c.timer();
      f.instance._startExitAnimation();assert.deepEqual(phases(f), ['closing', 'closed']);
      assert.equal(f.c.timers.size, 0);assert.equal(f.c.frames.size, 0);
    } finally {f.close();}
  });
  await check('missing-raf-preserves-immediate-class-and-duration-completion', async () => {
    const f = create('enabled', {noFrame: true, config: {enterAnimationDuration: '0.2s', exitAnimationDuration: '25ms'}});
    try {f.instance._startOpenAnimation();assert.equal(f.classes.has(open), true);
      assert.equal(f.c.frames.size, 0);f.c.timer();f.instance._startExitAnimation();
      assert.equal(f.classes.has(closing), true);f.c.timer();
      assert.deepEqual(f.events.map(e => e.totalTime), [200, 200, 25, 25]);
    } finally {f.close();}
  });
  await check('phase-request-after-destruction-is-inert', async () => {
    const f = create();f.destroy();
    try {f.instance._startOpenAnimation();f.instance._startExitAnimation();await Promise.resolve();
      assert.equal(f.events.length, 0);assert.equal(f.writes.length, 0);assert.equal(f.c.timers.size, 0);
    } finally {f.close();}
  });
  return cases;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const cases = await observations(await load());
assert.ok(cases.every(c => c.result === 'pass'), JSON.stringify(cases.filter(c => c.result !== 'pass')));
const mutations = [];
for(const [id, transform, rejectedBy] of [
  ['exit-focus-cancellation-removed', raw => raw.replace('    this._cancelPendingInitialFocus();\n', ''),
    'exit-cancels-pending-initial-focus-before-closing-event'],
  ['destroy-cancellation-removed', raw => raw.replace('this._animationDestroyed = true;', '/* no destruction flag */')
    .replace('this._cancelAnimationWork();\n    super.ngOnDestroy();', 'super.ngOnDestroy();'), 'enabled-destroy-cancels-timer-and-frame'],
  ['callback-phase-guard-removed', raw => raw.replaceAll(' && revision === this._animationRevision', ''), 'uncancellable-old-frame-cannot-reopen-closing-dialog'],
  ['noop-phase-identity-removed', raw => raw.replaceAll('revision !== this._animationRevision || ', ''), 'noop-old-phase-cannot-complete-reopened-phase-early'],
  ['settled-visible-class-removed', raw => raw.replace('this._hostElement.classList.add(OPEN_CLASS);', '/* missing settled open class */'), 'zero-duration-before-first-frame-settles-visible-without-opening-class'],
  ['reentrant-event-check-removed', raw => raw.replaceAll('if (this._animationDestroyed || revision !== this._animationRevision)', 'if (false)'), 'close-during-opening-observer-keeps-only-exit-work'],
]) {
  const changed = transform(original);assert.notEqual(changed, original, id);
  const actual = await observations(await load(changed));
  assert.equal(actual.find(c => c.id === rejectedBy).result, 'fail', id);mutations.push({id, rejected_by: rejectedBy});
}
const sources = [leafPath, flagPath, paramsPath, 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts',
  'projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts', 'scripts/dialog-initial-focus-source-test.mjs', 'scripts/dialog-motion-source-test.mjs'];
const report = {schema_version: 1, role: 'Owned dialog motion state/cancellation source diagnostic;not native/AOT/packed/minimum qualification',
  node: process.version, compiler: ts.version, runtime_peer: core.VERSION.full,
  sources: sources.map(path => {const bytes = readFileSync(resolve(root, path));return {path, sha256: sha(bytes), bytes: bytes.length};}),
  cases, mutations, limits: ['Actual owned leaf/base/focus helper/defaults and motion flag code execute;only the flag override provider is selected for these controlled states.',
    'Deterministic timer/frame fixtures and synthetic class/style DOM are not native rendered transitions,SSR engine qualification or real browser scheduling.',
    'Source fixture mostly disables browser focus to isolate motion;the separate focus/restoration source tests and native keyboard/focus/style suites remain required.',
    'Read-only installed22.1.7/hostNode22.23.3/TS6.0.3 does not qualify actual21 minimum,canonical toolchain,AOT,packed artifacts or consumer floors.']};
const args = process.argv.slice(2);
if(args.length) {
  assert.ok(args.length === 2 || args.length === 4);assert.equal(args[0], '--report');
  if(args.length === 4) {
    assert.equal(args[2], '--before');assert.match(args[3], /^[0-9a-f]{40}$/);
    const before = execFileSync('git', ['show', args[3] + ':' + leafPath], {cwd: root, encoding: 'utf8'});
    const actual = await observations(await load(before), true);
    for(const id of ['noop-close-before-open-never-emits-opened', 'noop-destroy-before-open-leaves-no-event-or-dom-work',
      'enabled-destroy-cancels-timer-and-frame', 'parent-restoration-failure-cannot-leak-animation-work'])
      assert.equal(actual.find(c => c.id === id).result, 'fail', 'pre-fix source must demonstrate ' + id);
    report.pre_fix_source_observation = {commit: args[3], path: leafPath, sha256: sha(before), cases: actual,
      role: 'Actual prior owned leaf with unchanged base/flag/default modules;synthetic diagnostic,not native reproduction'};
  }
  assert.equal(existsSync(args[1]), false);writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({cases: cases.length, mutants_rejected: mutations.length,node: report.node,compiler: report.compiler,runtime_peer: report.runtime_peer}));

}
