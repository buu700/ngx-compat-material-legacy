/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ObserversModule} from '@angular/cdk/observers';
import {NgModule} from '@angular/core';
import {MatRippleModule} from '@angular/material/core';
import {MatLegacyCommonModule as MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacySlideToggle} from './slide-toggle';
import {_MatSlideToggleRequiredValidatorModule} from './internal/slide-toggle-required-validator';


@NgModule({
  imports: [
    _MatSlideToggleRequiredValidatorModule,
    MatRippleModule,
    MatCommonModule,
    ObserversModule,
  ],
  exports: [_MatSlideToggleRequiredValidatorModule, MatLegacySlideToggle, MatCommonModule],
  declarations: [MatLegacySlideToggle],
})
export class MatLegacySlideToggleModule {}
