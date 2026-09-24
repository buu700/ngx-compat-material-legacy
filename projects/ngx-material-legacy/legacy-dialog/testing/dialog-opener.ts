/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentType} from '@angular/cdk/overlay';
import {ChangeDetectionStrategy, Component, NgModule, ViewEncapsulation} from '@angular/core';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {
  MatLegacyDialog,
  MatLegacyDialogConfig,
  MatLegacyDialogContainer,
  MatLegacyDialogModule,
} from '@ngx-compat/material-legacy/legacy-dialog';
import {_MatTestDialogOpenerBase} from './dialog-opener-base';

/**
 * Test component that immediately opens a dialog when created.
 * @deprecated Use `MatTestDialogOpener` from `@angular/material/dialog/testing` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Component({
  standalone: false,
  selector: 'mat-test-dialog-opener',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[attr.mat-id-collision]': 'null',
  },
})
export class MatTestLegacyDialogOpener<T = unknown, R = unknown> extends _MatTestDialogOpenerBase<
  MatLegacyDialogContainer,
  T,
  R
> {
  constructor(dialog: MatLegacyDialog) {
    super(dialog);
  }

  /** Static method that prepares this class to open the provided component. */
  static withComponent<T = unknown, R = unknown>(
    component: ComponentType<T>,
    config?: MatLegacyDialogConfig,
  ): typeof MatTestLegacyDialogOpener {
    _MatTestDialogOpenerBase.component = component;
    _MatTestDialogOpenerBase.config = config;
    return MatTestLegacyDialogOpener as typeof MatTestLegacyDialogOpener;
  }
}

/**
 * Testing module that opens a dialog immediately and disables Material motion via the
 * public MATERIAL_ANIMATIONS token (engine-free; no NoopAnimationsModule).
 */
@NgModule({
  declarations: [MatTestLegacyDialogOpener],
  imports: [MatLegacyDialogModule],
  providers: [{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
})
export class MatTestLegacyDialogOpenerModule {}
