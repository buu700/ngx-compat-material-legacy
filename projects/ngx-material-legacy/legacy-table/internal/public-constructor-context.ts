/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Injector, runInInjectionContext} from '@angular/core';

/** A bounded context borrows supplied objects without registering destroy hooks. */
class BorrowedDependencyInjector extends Injector {
  constructor(private readonly values: Map<unknown, unknown>) {
    super();
  }

  override get(token: any, notFoundValue?: any): any {
    if (this.values.has(token)) return this.values.get(token);
    return Injector.NULL.get(token, notFoundValue);
  }
}

/**
 * Construct the public parent with exactly the original supplied dependencies.
 * Only use for owned subclasses with no emitted instance fields/parameter
 * properties: returning this object skips their own instance initializers.
 * Supplied objects belong to the caller; this context must never destroy them.
 */
export function constructWithPublicDependencies<T>(parent: new () => T, target: Function, providers: {provide: unknown; useValue: unknown}[]): T {
  const context = new BorrowedDependencyInjector(new Map(providers.map(({provide, useValue}) => [provide, useValue])));
  return runInInjectionContext(context, () => Reflect.construct(parent, [], target));
}
