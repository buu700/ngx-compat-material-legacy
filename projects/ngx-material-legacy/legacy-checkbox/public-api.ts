/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {
  MatLegacyCheckboxChange,
  MAT_LEGACY_CHECKBOX_CONTROL_VALUE_ACCESSOR,
  MatLegacyCheckbox,
} from './checkbox';
export {MatLegacyCheckboxModule} from './checkbox-module';

export {
  /**
   * @deprecated Use `MatCheckboxClickAction` from `@angular/material/checkbox` instead.
   * @breaking-change 17.0.0
   */
  MatCheckboxClickAction as MatLegacyCheckboxClickAction,

  /**
   * @deprecated Use `TransitionCheckState` from `@angular/material/checkbox` instead.
   * @breaking-change 17.0.0
   */
  TransitionCheckState as LegacyTransitionCheckState,

  /**
   * @deprecated Use `MatCheckboxDefaultOptions` from `@angular/material/checkbox` instead.
   * @breaking-change 17.0.0
   */
  MatCheckboxDefaultOptions as MatLegacyCheckboxDefaultOptions,

  /**
   * @deprecated Use `MAT_CHECKBOX_DEFAULT_OPTIONS` from `@angular/material/checkbox` instead.
   * @breaking-change 17.0.0
   */
  MAT_CHECKBOX_DEFAULT_OPTIONS as MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS,
} from '@angular/material/checkbox';

export {
  MAT_CHECKBOX_REQUIRED_VALIDATOR as MAT_LEGACY_CHECKBOX_REQUIRED_VALIDATOR,
  MatCheckboxRequiredValidator as MatLegacyCheckboxRequiredValidator,
  _MatCheckboxRequiredValidatorModule as _MatLegacyCheckboxRequiredValidatorModule,
} from './internal/checkbox-required-validator';

export {MAT_CHECKBOX_DEFAULT_OPTIONS_FACTORY as MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS_FACTORY} from './internal/checkbox-base';
export {_MatCheckboxBase as _MatLegacyCheckboxBase} from './internal/checkbox-base';
export {MatCommonModule} from './internal/common-module';
