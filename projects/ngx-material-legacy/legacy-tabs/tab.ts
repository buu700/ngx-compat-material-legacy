/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  TemplateRef,
  ViewEncapsulation,
} from '@angular/core';
import {MatTabLabel, MAT_TAB_LABEL, MAT_TAB_CONTENT, MAT_TAB} from '@angular/material/tabs';
import {_MatTabBase} from './internal/tab-base';

/**
 * @deprecated Use `MatTab` from `@angular/material/tabs` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Component({
  standalone: false,
  selector: 'mat-tab',
  templateUrl: 'tab.html',
  inputs: ['disabled'],
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'matTab',
  providers: [{provide: MAT_TAB, useExisting: MatLegacyTab}],
  host: {
    // This binding is used to ensure that the component ID doesn't clash with the `MatTab`.
    '[attr.mat-id-collision]': 'null',
  },
})
export class MatLegacyTab extends _MatTabBase {
  /** Content for the tab label given by `<ng-template mat-tab-label>`. */
  @ContentChild(MAT_TAB_LABEL)
  override get templateLabel(): MatTabLabel {
    return this._templateLabel;
  }
  override set templateLabel(value: MatTabLabel) {
    this._setTemplateLabelInput(value);
  }

  /**
   * Template provided in the tab content that will be used if present, used to enable lazy-loading
   */
  @ContentChild(MAT_TAB_CONTENT, {read: TemplateRef, static: true})
  // We need an initializer here to avoid a TS error. The value will be set in `ngAfterViewInit`.
  override _explicitContent: TemplateRef<any> = undefined!;
}
