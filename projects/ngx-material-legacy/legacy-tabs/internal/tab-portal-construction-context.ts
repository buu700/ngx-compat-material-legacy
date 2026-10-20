/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {DOCUMENT} from '@angular/common';
import {CdkPortalOutlet} from '@angular/cdk/portal';
import {
  Injector,
  ViewContainerRef,
  runInInjectionContext,
  type InjectOptions,
  type ProviderToken,
} from '@angular/core';

/** Borrow the caller node; only the historical explicit inputs override it. */
class LegacyTabPortalConstructorInjector extends Injector {
  constructor(
    private readonly container: ViewContainerRef,
    private readonly document: any,
    private readonly parent: Injector,
  ) {
    super();
  }

  override get(token: ProviderToken<unknown>, notFoundValue?: any, options?: InjectOptions): any {
    if (token === ViewContainerRef) return this.container;
    if (token === DOCUMENT) return this.document;
    return this.parent.get(token, notFoundValue, options);
  }
}

/** Construct the genuine public parent without taking ownership of caller dependencies. */
export function constructLegacyTabBodyPortal(
  target: Function,
  container: ViewContainerRef,
  document: any,
): CdkPortalOutlet {
  const context = new LegacyTabPortalConstructorInjector(container, document, container.injector);
  return runInInjectionContext(context, () => Reflect.construct(CdkPortalOutlet, [], target));
}
