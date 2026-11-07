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
import {MatLegacyAnchor, MatLegacyButton} from './button';


@NgModule({
  imports: [MatRippleModule, MatCommonModule],
  exports: [MatLegacyButton, MatLegacyAnchor, MatCommonModule],
  declarations: [MatLegacyButton, MatLegacyAnchor],
})
export class MatLegacyButtonModule {}
