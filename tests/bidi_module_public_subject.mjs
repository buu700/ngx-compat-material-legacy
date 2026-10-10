/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
globalThis.ngDevMode = process.argv[3] !== 'true';
await import('@angular/compiler');
const core = await import('@angular/core');
const bidi = await import('@angular/cdk/bidi');
const cases = [];
const check = (id, action) => {action(); cases.push(id);};
check('initial-raw-direction-default', () => {
  const dir=new bidi.Dir();assert.equal(dir.value,'ltr');
  assert.equal(dir._rawDir,process.argv[2]==='original'?undefined:'');dir.ngOnDestroy();
});
check('public-module-dir-export-and-owning-scope', () => {
  // Inspect actual peer metadata only; no private peer symbol enters product source.
  const metadata = bidi.BidiModule.ɵmod;
  const members = value => typeof value === 'function' ? value() : value;
  assert.deepEqual(members(metadata.exports), [bidi.Dir]);
  const owning = process.argv[2] === 'original' ? metadata.declarations : metadata.imports;
  assert.deepEqual(members(owning), [bidi.Dir]);
  assert.equal(core.reflectComponentType(bidi.Dir), null);
});
check('directive-selector-input-output-host-and-identity', () => {
  const def = bidi.Dir.ɵdir;
  assert.deepEqual(def.selectors, [['', 'dir', '']]);
  assert.ok(Object.hasOwn(def.inputs, 'dir'));
  assert.equal(def.outputs.dirChange, 'change');
  const providers = bidi.Dir.decorators.find(d => d.type === core.Directive).args[0];
  assert.deepEqual(providers.providers, [{provide: bidi.Directionality, useExisting: bidi.Dir}]);
  assert.equal(providers.host['[attr.dir]'], '_rawDir');
  const scoped = new bidi.Dir();
  const parent = core.Injector.create({providers: [{provide: bidi.Directionality, useValue: {value: 'rtl'}}]});
  const child = core.Injector.create({providers: [{provide: bidi.Dir, useValue: scoped}, ...providers.providers], parent});
  assert.equal(child.get(bidi.Directionality), scoped);
  assert.equal(parent.get(bidi.Directionality).value, 'rtl');
  child.destroy(); parent.destroy();
});
function directionTrace(initial, updates) {
  const dir = new bidi.Dir(), events = [];
  dir.change.subscribe({next: value => events.push(value), complete: () => events.push('complete')});
  dir.dir = initial;
  const before = [...events];
  dir.ngAfterContentInit();
  const values = [];
  for (const update of updates) {dir.dir = update; values.push([dir.value, dir.dir, dir._rawDir]);}
  dir.ngOnDestroy();
  return {before, events, values};
}
check('ltr-rtl-initialization-repeat-and-completion', () => {
  assert.deepEqual(directionTrace('rtl', ['rtl', 'ltr', 'ltr', 'rtl']), {
    before: [], events: ['ltr', 'rtl', 'complete'],
    values: [['rtl','rtl','rtl'], ['ltr','ltr','ltr'], ['ltr','ltr','ltr'], ['rtl','rtl','rtl']],
  });
});
check('case-normalization-invalid-empty-and-raw-host-value', () => {
  assert.deepEqual(directionTrace('RTL', ['bad', '', 'RTL']), {
    before: [], events: ['ltr','rtl','complete'],
    values: [['ltr','ltr','bad'], ['ltr','ltr',''], ['rtl','rtl','RTL']],
  });
});
check('auto-rtl-ltr-locale-and-latin-override', () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    for (const [language, expected] of [['ar','rtl'], ['en-US','ltr'], ['az-Arab','rtl'], ['ar-Latn','ltr']]) {
      Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {language}});
      const dir = new bidi.Dir(); dir.dir = 'auto';
      assert.equal(dir.value, expected); assert.equal(dir._rawDir, 'auto'); dir.ngOnDestroy();
    }
  } finally {if (old) Object.defineProperty(globalThis, 'navigator', old); else delete globalThis.navigator;}
});
console.log(JSON.stringify({line:process.argv[2], production:process.argv[3] === 'true', cases,
  genuine_entire_public_bidi_module_executed:true, native_or_packed_qualified:false}));
