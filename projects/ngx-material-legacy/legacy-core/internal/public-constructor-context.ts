/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Injector, runInInjectionContext} from '@angular/core';

/**
 * Construct the public parent with exactly the original supplied dependencies.
 * Only use for owned subclasses with no emitted instance fields/parameter
 * properties: returning this object skips their own instance initializers.
 */
export function constructWithPublicDependencies<T>(parent: new () => T, target: Function, providers: {provide: unknown; useValue: unknown}[]): T {
  const context = Injector.create({providers});
  try {
    return runInInjectionContext(context, () => Reflect.construct(parent, [], target));
  } finally {
    context.destroy();
  }
}

