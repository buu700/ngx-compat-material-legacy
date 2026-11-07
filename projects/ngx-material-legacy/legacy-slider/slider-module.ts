/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatLegacyCommonModule as MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacySlider} from './slider';


@NgModule({
  imports: [CommonModule, MatCommonModule],
  exports: [MatLegacySlider, MatCommonModule],
  declarations: [MatLegacySlider],
})
export class MatLegacySliderModule {}
