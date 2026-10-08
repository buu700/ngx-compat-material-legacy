/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  ChangeDetectorRef,
  DOCUMENT,
  ElementRef,
  inject,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import type {InjectOptions} from '@angular/core';
import {FocusMonitor} from '@angular/cdk/a11y';
import {MatMenuItem} from '@angular/material/menu';
import {MAT_MENU_PANEL} from './menu-panel-token';

/** Borrow node dependencies and let the caller's application own framework services. */
class MenuItemContext extends Injector {
  constructor(private readonly values: Map<unknown, unknown>, private readonly application: Injector) {
    super();
  }

  override get(token: any, notFoundValue?: any, options?: InjectOptions): any {
    if (this.values.has(token)) return this.values.get(token);
    // The finite public parent has one optional dependency: its current panel.
    // Keep that lookup isolated; the owned legacy panel is assigned below.
    // Angular may represent its injection options internally when calling get.
    // The public null fallback also identifies this optional parent lookup.
    if (notFoundValue === null || options?.optional) return null;
    return this.application.get(token, notFoundValue, options);
  }
}

/**
 * Construct the real public parent using the current node's public dependencies.
 * The legacy subclass has no emitted fields: Reflect.construct runs the parent
 * initializers once with the real new.target prototype. No application is created,
 * private token is imported, or borrowed dependency registered for destruction.
 */
export function constructLegacyMenuItem(target: Function): MatMenuItem {
  const application = inject(Injector);
  const parent = inject(MAT_MENU_PANEL, {optional: true});
  const context = new MenuItemContext(new Map<unknown, unknown>([
    [ElementRef, inject(ElementRef)],
    [DOCUMENT, inject(DOCUMENT)],
    [FocusMonitor, inject(FocusMonitor)],
    [ChangeDetectorRef, inject(ChangeDetectorRef)],
  ]), application);
  const item: MatMenuItem = runInInjectionContext(context, () => Reflect.construct(MatMenuItem, [], target));
  item._parentMenu = parent;
  parent?.addItem?.(item);
  return item;
}
