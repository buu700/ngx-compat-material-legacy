/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
const [line, production] = process.argv.slice(2);
globalThis.ngDevMode = production !== 'true';
await import('@angular/compiler');
const core = await import('@angular/core');
const platform = await import('@angular/cdk/platform');
const fields = ['isBrowser', 'EDGE', 'TRIDENT', 'BLINK', 'WEBKIT', 'IOS', 'FIREFOX', 'ANDROID', 'SAFARI'];
const cases = [];
const check = (id, action) => {action(); cases.push(id);};
const setBrowser = ({ua = '', chrome = false, css = false, msStream = false} = {}) => {
  globalThis.document = {};
  globalThis.window = {...chrome && {chrome: {}}, ...msStream && {MSStream: {}}};
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {userAgent: ua}});
  if (css) globalThis.CSS = {}; else delete globalThis.CSS;
};
const injector = id => core.Injector.create({providers: [platform.Platform,
  {provide: core.PLATFORM_ID, useValue: id}]});
const snapshot = service => Object.fromEntries(fields.map(f => {
  assert.equal(typeof service[f], 'boolean', f); return [f, service[f]];
}));
const expected = enabled => Object.fromEntries(fields.map(f => [f, enabled.includes(f)]));
for (const [id, browser, enabled] of [
  ['generic', {}, ['isBrowser']],
  ['chromium', {ua: 'Chrome Safari AppleWebKit', chrome: true, css: true}, ['isBrowser', 'BLINK']],
  ['chromium-without-css', {ua: 'Chrome Safari AppleWebKit', chrome: true}, ['isBrowser', 'WEBKIT', 'SAFARI']],
  ['safari', {ua: 'AppleWebKit Safari'}, ['isBrowser', 'WEBKIT', 'SAFARI']],
  ['ios-safari', {ua: 'iPhone AppleWebKit Safari'}, ['isBrowser', 'WEBKIT', 'IOS', 'SAFARI']],
  ['msstream-excludes-ios', {ua: 'iPhone AppleWebKit Safari', msStream: true}, ['isBrowser', 'WEBKIT', 'SAFARI']],
  ['firefox', {ua: 'Firefox'}, ['isBrowser', 'FIREFOX']],
  ['android-chromium', {ua: 'Android Chrome AppleWebKit Safari', chrome: true, css: true}, ['isBrowser', 'BLINK', 'ANDROID']],
  ['edgehtml-excludes-blink-webkit', {ua: 'Edge AppleWebKit Safari', chrome: true, css: true}, ['isBrowser', 'EDGE']],
  ['trident-excludes-android-blink-webkit', {ua: 'Trident Android AppleWebKit Safari', chrome: true, css: true}, ['isBrowser', 'TRIDENT']],
]) check('user-agent-protocol/' + id, () => {
  setBrowser(browser);
  const owner = injector('browser');
  try {assert.deepEqual(snapshot(owner.get(platform.Platform)), expected(enabled));}
  finally {owner.destroy();}
});
check('server-with-no-browser-globals', () => {
  delete globalThis.document; delete globalThis.window; delete globalThis.navigator; delete globalThis.CSS;
  const owner = injector('server');
  try {assert.deepEqual(snapshot(owner.get(platform.Platform)), expected([]));}
  finally {owner.destroy();}
});
check('server-does-not-read-hostile-navigator', () => {
  setBrowser();
  Object.defineProperty(globalThis, 'navigator', {configurable: true, get() {throw Error('server touched navigator');}});
  const owner = injector('server');
  try {assert.deepEqual(snapshot(owner.get(platform.Platform)), expected([]));}
  finally {owner.destroy(); delete globalThis.navigator;}
});
check('provider-identity-child-inheritance-and-server-shadow', () => {
  setBrowser({ua: 'AppleWebKit Safari'});
  const parent = injector('browser'), child = core.Injector.create({providers: [], parent});
  const scoped = core.Injector.create({providers: [platform.Platform, {provide: core.PLATFORM_ID, useValue: 'server'}], parent});
  try {
    const service = parent.get(platform.Platform);
    assert.equal(parent.get(platform.Platform), service);
    assert.equal(child.get(platform.Platform), service);
    assert.notEqual(scoped.get(platform.Platform), service);
    assert.deepEqual(snapshot(scoped.get(platform.Platform)), expected([]));
    child.destroy(); assert.equal(parent.get(platform.Platform), service);
  } finally {scoped.destroy(); parent.destroy();}
});
check('flags-are-construction-time-booleans', () => {
  setBrowser({ua: 'Firefox'});
  const owner = injector('browser'), nextOwner = injector('browser');
  try {
    const service = owner.get(platform.Platform), before = snapshot(service);
    setBrowser({ua: 'AppleWebKit Safari'});
    assert.deepEqual(snapshot(service), before);
    assert.deepEqual(snapshot(nextOwner.get(platform.Platform)), expected(['isBrowser', 'WEBKIT', 'SAFARI']));
  } finally {nextOwner.destroy(); owner.destroy();}
});
check('supplied-instance-manual-constructor-peer-difference', () => {
  setBrowser({ua: 'Firefox'});
  if (line === 'original') assert.deepEqual(snapshot(new platform.Platform('browser')), expected(['isBrowser', 'FIREFOX']));
  else assert.throws(() => new platform.Platform(), error => error.code === -203);
});
check('current-construction-uses-context-platform-id', () => {
  setBrowser({ua: 'Firefox'});
  const owner = injector('server');
  try {
    const service = line === 'original' ? new platform.Platform('server')
      : core.runInInjectionContext(owner, () => new platform.Platform());
    assert.deepEqual(snapshot(service), expected([]));
  } finally {owner.destroy();}
});
console.log(JSON.stringify({line, production: production === 'true', cases,
  actual_public_platform_and_core_factory_executed: true, user_agent_and_globals_are_protocols: true,
  browser_engine_support_or_component_runtime_qualified: false, native_or_packed_qualified: false}));
