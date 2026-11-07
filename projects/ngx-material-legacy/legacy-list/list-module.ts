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
import {MatRippleModule, MatLineModule} from '@angular/material/core';
import {MatLegacyPseudoCheckboxModule as MatPseudoCheckboxModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {
  MatLegacyList,
  MatLegacyNavList,
  MatLegacyListAvatarCssMatStyler,
  MatLegacyListIconCssMatStyler,
  MatLegacyListItem,
  MatLegacyListSubheaderCssMatStyler,
} from './list';
import {MatLegacyListOption, MatLegacySelectionList} from './selection-list';
import {MatDividerModule} from '@angular/material/divider';


@NgModule({
  imports: [MatLineModule, MatRippleModule, MatCommonModule, MatPseudoCheckboxModule, CommonModule],
  exports: [
    MatLegacyList,
    MatLegacyNavList,
    MatLegacyListItem,
    MatLegacyListAvatarCssMatStyler,
    MatLineModule,
    MatCommonModule,
    MatLegacyListIconCssMatStyler,
    MatLegacyListSubheaderCssMatStyler,
    MatPseudoCheckboxModule,
    MatLegacySelectionList,
    MatLegacyListOption,
    MatDividerModule,
  ],
  declarations: [
    MatLegacyList,
    MatLegacyNavList,
    MatLegacyListItem,
    MatLegacyListAvatarCssMatStyler,
    MatLegacyListIconCssMatStyler,
    MatLegacyListSubheaderCssMatStyler,
    MatLegacySelectionList,
    MatLegacyListOption,
  ],
})
export class MatLegacyListModule {}
