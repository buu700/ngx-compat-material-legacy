/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, Inject, Optional, TemplateRef, ViewContainerRef} from '@angular/core';
import {MAT_TAB} from './internal/tab-token';
import {constructWithPublicDependencies} from './internal/public-constructor-context';
import {MAT_TAB_LABEL, MatTabLabel as MatNonLegacyTabLabel} from '@angular/material/tabs';

/**
 * Used to flag tab labels for use with the portal directive
 */
@Directive({
  standalone: false,
  selector: '[mat-tab-label], [matTabLabel]',
  providers: [{provide: MAT_TAB_LABEL, useExisting: MatLegacyTabLabel}],
})
export class MatLegacyTabLabel extends MatNonLegacyTabLabel {
  /** Original public nearest-tab identity, initialized on the returned parent. */
  declare _closestTab: any;

  // @ts-expect-error TS2377: derived constructor deliberately returns its object.
  constructor(@Inject(TemplateRef) templateRef: TemplateRef<any>,
      @Inject(ViewContainerRef) viewContainerRef: ViewContainerRef,
      @Optional() @Inject(MAT_TAB) closestTab: any) {
    const label = constructWithPublicDependencies(MatNonLegacyTabLabel, new.target, [
      {provide: TemplateRef, useValue: templateRef},
      {provide: ViewContainerRef, useValue: viewContainerRef},
    ]);
    label._closestTab = closestTab;
    return label;
  }
}
