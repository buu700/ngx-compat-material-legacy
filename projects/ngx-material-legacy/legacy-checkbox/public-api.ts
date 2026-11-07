/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
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

  MatCheckboxClickAction as MatLegacyCheckboxClickAction,



  MatCheckboxDefaultOptions as MatLegacyCheckboxDefaultOptions,


  MAT_CHECKBOX_DEFAULT_OPTIONS as MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS,
} from '@angular/material/checkbox';

export {
  MAT_CHECKBOX_REQUIRED_VALIDATOR as MAT_LEGACY_CHECKBOX_REQUIRED_VALIDATOR,
  MatCheckboxRequiredValidator as MatLegacyCheckboxRequiredValidator,
  _MatCheckboxRequiredValidatorModule as _MatLegacyCheckboxRequiredValidatorModule,
} from './internal/checkbox-required-validator';

export {MAT_CHECKBOX_DEFAULT_OPTIONS_FACTORY as MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS_FACTORY} from './internal/checkbox-base';
export {_MatCheckboxBase as _MatLegacyCheckboxBase} from './internal/checkbox-base';
export {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';

export {

  TransitionCheckState as LegacyTransitionCheckState,
} from './owned-transition-state';
