/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {DOCUMENT} from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectorRef,
  Directive,
  Inject,
  Injector,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import {MAT_MENU_CONTENT} from '@angular/material/menu';
import {_MatMenuContentBase} from './internal/menu-content-base';

/**
 * Menu content that will be rendered lazily once the menu is opened.
 */
@Directive({
  standalone: false,
  selector: 'ng-template[matMenuContent]',
  providers: [{provide: MAT_MENU_CONTENT, useExisting: MatLegacyMenuContent}],
})
export class MatLegacyMenuContent extends _MatMenuContentBase {
  constructor(
    template: TemplateRef<any>,
    appRef: ApplicationRef,
    injector: Injector,
    viewContainerRef: ViewContainerRef,
    @Inject(DOCUMENT) document: any,
    changeDetectorRef: ChangeDetectorRef,
  ) {
    super(template, appRef, injector, viewContainerRef, document, changeDetectorRef);
  }
}
