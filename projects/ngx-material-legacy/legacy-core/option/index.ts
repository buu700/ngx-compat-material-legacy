/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatRippleModule} from '@angular/material/core';
import {MatLegacyPseudoCheckboxModule as MatPseudoCheckboxModule} from '../pseudo-checkbox';
import {MatCommonModule} from '../internal/common-module';
import {MatLegacyOption} from './option';
import {MatLegacyOptgroup} from './optgroup';

/**
 * @deprecated Use `MatOptionModule` from `@angular/material/core` instead.
 * @breaking-change 17.0.0
 */
@NgModule({
  imports: [MatRippleModule, CommonModule, MatCommonModule, MatPseudoCheckboxModule],
  exports: [MatLegacyOption, MatLegacyOptgroup],
  declarations: [MatLegacyOption, MatLegacyOptgroup],
})
export class MatLegacyOptionModule {}

export * from './option';
export * from './optgroup';
export {_MatOptionBase, _MatOptionBase as _MatLegacyOptionBase} from './option-base';
export {_MatOptgroupBase, _MatOptgroupBase as _MatLegacyOptgroupBase, MAT_OPTGROUP as MAT_LEGACY_OPTGROUP} from './optgroup-base';
export {
  MatOptionParentComponent as MatLegacyOptionParentComponent,
  MAT_OPTION_PARENT_COMPONENT as MAT_LEGACY_OPTION_PARENT_COMPONENT,
} from './option-parent';
export {MatOptionSelectionChange as MatLegacyOptionSelectionChange} from './option-base';
export {
  _countGroupLabelsBeforeOption as _countGroupLabelsBeforeLegacyOption,
  _getOptionScrollPosition as _getLegacyOptionScrollPosition,
} from './option-helpers';
