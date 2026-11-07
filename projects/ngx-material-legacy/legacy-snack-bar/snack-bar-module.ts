/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {OverlayModule} from '@angular/cdk/overlay';
import {PortalModule} from '@angular/cdk/portal';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {LegacySimpleSnackBar} from './simple-snack-bar';
import {MatLegacySnackBarContainer} from './snack-bar-container';
import {MatLegacySnackBar} from './snack-bar';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS_FACTORY} from './internal/snack-bar-base';


@NgModule({
  imports: [OverlayModule, PortalModule, CommonModule, MatLegacyButtonModule, MatCommonModule],
  exports: [MatLegacySnackBarContainer, MatCommonModule],
  declarations: [MatLegacySnackBarContainer, LegacySimpleSnackBar],
  providers: [
    MatLegacySnackBar,
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useFactory: MAT_SNACK_BAR_DEFAULT_OPTIONS_FACTORY,
    },
  ],
})
export class MatLegacySnackBarModule {}
