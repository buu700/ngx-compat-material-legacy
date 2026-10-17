/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Browser TestBed bootstrap for historical legacy specs.
 * Uses public Angular testing APIs only (no Bazel).
 *
 * JIT test classes keep constructor parameter types through TypeScript's
 * design:paramtypes. Angular reads those via Reflect.getOwnMetadata.
 */
const reflect = Reflect as any;
if (typeof reflect.metadata !== 'function') {
  const stored = new WeakMap<object, Map<string, unknown>>();
  const metaFor = (target: object) => {
    let meta = stored.get(target);
    if (!meta) {
      meta = new Map();
      stored.set(target, meta);
    }
    return meta;
  };
  reflect.defineMetadata = (key: string, value: unknown, target: object) => {
    metaFor(target).set(key, value);
  };
  reflect.getOwnMetadata = (key: string, target: object) => metaFor(target).get(key);
  reflect.metadata = (key: string, value: unknown) => (target: object) => {
    reflect.defineMetadata(key, value, target);
  };
}

import '@angular/compiler';
import 'zone.js';
import 'zone.js/testing';

import {CommonModule} from '@angular/common';
import {NgModule, provideZoneChangeDetection} from '@angular/core';
import {getTestBed} from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

// Angular 21+ test platforms are zoneless unless zone change detection is
// provided. Historical specs mutate plain fields and call detectChanges().
@NgModule({
  imports: [BrowserTestingModule],
  providers: [provideZoneChangeDetection()],
})
class LegacyZoneTestingModule {}

getTestBed().initTestEnvironment(LegacyZoneTestingModule, platformBrowserTesting());

// Historical specs use *ngIf and *ngFor without importing CommonModule.
// The Material 16 test modules did not re-export it, and current JIT reports
// the missing directive instead of rendering the element.
// TestBed.configureTestingModule is static and forwards to the TestBed instance.
// resetTestingModule() returns that instance, so chained configureTestingModule
// calls never hit a static wrapper. Patch the instance method once.
const testingModule = getTestBed() as unknown as {
  configureTestingModule: (moduleDef?: object) => unknown;
};
const configureTestingModule = testingModule.configureTestingModule.bind(testingModule);
testingModule.configureTestingModule = (moduleDef: {imports?: unknown[]} = {}) => {
  const imports = Array.isArray(moduleDef.imports) ? moduleDef.imports : [];
  if (!imports.includes(CommonModule)) {
    moduleDef = {...moduleDef, imports: [CommonModule, ...imports]};
  }
  return configureTestingModule(moduleDef);
};
