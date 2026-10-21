/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Untouched tagged constructors; current owned sources never load here. */
import assert from 'node:assert/strict';
await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core');
if (process.argv[2] === 'production') core.enableProdMode();
const {MatDialogConfig} = await import('@angular/material/dialog');
const {MatLegacyDialogConfig} = await import('@angular/material/legacy-dialog');
const value = new MatLegacyDialogConfig();
assert.ok(value instanceof MatDialogConfig);
const properties = Object.fromEntries(Reflect.ownKeys(value).map(key => {
  const d = Object.getOwnPropertyDescriptor(value, key); assert.ok(Object.hasOwn(d, 'value'));
  return [String(key), {value: d.value === undefined ? {kind: 'undefined'} : typeof d.value === 'function' ?
    {kind: 'function', source: String(d.value)} : {kind: typeof d.value, value: d.value},
  writable: d.writable, enumerable: d.enumerable, configurable: d.configurable}];
}));
console.log(JSON.stringify({line: 'original', mode: process.argv[2],
  cases: ['untouched-tagged-config-constructor-and-descriptors'],
  observations: {defaults: {keys: Reflect.ownKeys(value).map(String), properties}, peerSubtype: true},
  current_owned_source_loaded: false, actual_native_packed_AOT_or_full_floor_qualified: false}));
