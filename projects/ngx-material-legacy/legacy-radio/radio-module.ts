/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule} from '@angular/core';
import {MatRippleModule} from '@angular/material/core';
import {MatLegacyCommonModule as MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyRadioButton, MatLegacyRadioGroup} from './radio';


@NgModule({
  imports: [MatRippleModule, MatCommonModule],
  exports: [MatLegacyRadioGroup, MatLegacyRadioButton, MatCommonModule],
  declarations: [MatLegacyRadioGroup, MatLegacyRadioButton],
})
export class MatLegacyRadioModule {}
