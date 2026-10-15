/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Injector, inject, runInInjectionContext, type InjectOptions, type ProviderToken} from '@angular/core';
import {CdkTable} from '@angular/cdk/table';
import {CDK_VIRTUAL_SCROLL_VIEWPORT} from '@angular/cdk/scrolling';

/** Borrow the node injector without enabling the current table's automatic virtualization. */
class LegacyTableConstructorInjector extends Injector {
  constructor(private readonly parent: Injector) { super(); }

  override get(token: ProviderToken<unknown>, notFoundValue?: any, options?: InjectOptions): any {
    return token === CDK_VIRTUAL_SCROLL_VIEWPORT ? null : this.parent.get(token, notFoundValue, options);
  }
}

/**
 * Material 16 tables rendered their complete data inside an ancestor viewport.
 * Hide the public viewport token only while constructing the current CDK parent.
 * A node/view provider would also hide it from consumer cell templates.
 *
 * Wrap the constructor's `super` target, keeping the instance prototype, public
 * parent and Angular metadata intact. Reflect.construct preserves new.target and
 * normal derived field initialization. The original injector remains available
 * to the table, its descendants and consumer subclasses after super() returns.
 */
export function preserveLegacyTableViewport(table: typeof CdkTable): void {
  Object.setPrototypeOf(table, new Proxy(CdkTable, {
    construct(parent, args, newTarget) {
      const injector = new LegacyTableConstructorInjector(inject(Injector));
      return runInInjectionContext(injector, () => Reflect.construct(parent, args, newTarget));
    },
  }));
}
