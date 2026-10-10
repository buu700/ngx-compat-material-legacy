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
const core = await import('@angular/core'), bidi = await import('@angular/cdk/bidi');
const cases = [];
const check = (id, action) => {action(); cases.push(id);};
const create = document => core.Injector.create({providers: [bidi.Directionality,
  {provide: bidi.DIR_DOCUMENT, useValue: document}]});
for (const [id, document, expected] of [
  ['null-document', null, 'ltr'],
  ['empty-document', {}, 'ltr'],
  ['body-before-html', {body: {dir: 'rtl'}, documentElement: {dir: 'ltr'}}, 'rtl'],
  ['empty-body-falls-back-to-html', {body: {dir: ''}, documentElement: {dir: 'rtl'}}, 'rtl'],
  ['invalid-body-does-not-fall-back-to-html', {body: {dir: 'invalid'}, documentElement: {dir: 'rtl'}}, 'ltr'],
  ['case-normalization', {body: {dir: 'RTL'}}, 'rtl'],
]) check(id, () => {
  const injector = create(document);
  try {assert.equal(injector.get(bidi.Directionality).value, expected);}
  finally {injector.destroy();}
});
check('absent-optional-document', () => {
  const injector = core.Injector.create({providers: [bidi.Directionality]});
  try {
    let service;
    assert.doesNotThrow(() => {service = injector.get(bidi.Directionality);});
    assert.equal(service.value, 'ltr');
  }
  finally {injector.destroy();}
});
check('synchronous-public-change-and-injector-owned-completion', () => {
  const injector = create({body: {dir: 'rtl'}}), service = injector.get(bidi.Directionality), events = [];
  service.change.subscribe({next: value => events.push(value), complete: () => events.push('complete')});
  assert.deepEqual(events, []);
  service.change.emit('ltr'); assert.deepEqual(events, ['ltr']);
  // Emitting an event is not a value setter on either original or current service.
  assert.equal(service.value, 'rtl');
  injector.destroy(); assert.deepEqual(events, ['ltr', 'complete']);
  service.change.emit('rtl'); assert.deepEqual(events, ['ltr', 'complete']);
});
check('stable-provider-identity-child-inheritance-and-dir-override', () => {
  const parent = create({body: {dir: 'rtl'}}), child = core.Injector.create({providers: [], parent});
  const dir = new bidi.Dir(); dir.dir = 'ltr';
  const scoped = core.Injector.create({providers: [{provide: bidi.Dir, useValue: dir},
    {provide: bidi.Directionality, useExisting: bidi.Dir}], parent});
  try {
    const service = parent.get(bidi.Directionality);
    assert.equal(parent.get(bidi.Directionality), service);
    assert.equal(child.get(bidi.Directionality), service);
    assert.equal(scoped.get(bidi.Directionality), dir);
    assert.equal(scoped.get(bidi.Directionality).value, 'ltr');
    assert.equal(service.value, 'rtl');
    child.destroy(); assert.equal(parent.get(bidi.Directionality), service);
  } finally {scoped.destroy(); parent.destroy();}
});
check('manual-constructor-contract-is-an-explicit-peer-difference', () => {
  if (line === 'original') {
    const service = new bidi.Directionality({body: {dir: 'rtl'}});
    assert.equal(service.value, 'rtl'); service.ngOnDestroy();
  } else assert.throws(() => new bidi.Directionality(), error => error.code === -203);
});
check('auto-locale-normalization', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    for (const [language, expected] of [['ar', 'rtl'], ['ar-Latn', 'ltr']]) {
      Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {language}});
      const injector = create({documentElement: {dir: 'auto'}});
      try {assert.equal(injector.get(bidi.Directionality).value, expected);}
      finally {injector.destroy();}
    }
  } finally {if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator;}
});
console.log(JSON.stringify({line, production: production === 'true', cases,
  actual_public_service_factory_and_injector_executed: true, actual_legacy_components_executed: false,
  native_or_packed_qualified: false}));
