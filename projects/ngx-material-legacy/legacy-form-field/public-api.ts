/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyFormFieldModule} from './form-field-module';
export {MatLegacyError} from './error';
export {
  MatLegacyFormFieldAppearance,
  LegacyFloatLabelType,
  MatLegacyFormFieldDefaultOptions,
  MAT_LEGACY_FORM_FIELD_DEFAULT_OPTIONS,
  MatLegacyFormField,
} from './form-field';
export {_MAT_LEGACY_HINT, MatLegacyHint} from './hint';
export {MatLegacyPlaceholder} from './placeholder';
export {MatLegacyPrefix} from './prefix';
export {MatLegacySuffix} from './suffix';
export {MatLegacyLabel} from './label';

export {

  MatFormFieldControl as MatLegacyFormFieldControl,
} from '@angular/material/form-field';
export {MAT_LEGACY_FORM_FIELD, MAT_LEGACY_SUFFIX, MAT_LEGACY_ERROR, MAT_LEGACY_PREFIX} from './owned-tokens';

// Historical `/animations` recipe secondary removed (F04); use CSS/Web Animations via MATERIAL_ANIMATIONS.


export {

  getMatFormFieldDuplicatedHintError as getMatLegacyFormFieldDuplicatedHintError,

  getMatFormFieldMissingControlError as getMatLegacyFormFieldMissingControlError,

  getMatFormFieldPlaceholderConflictError as getMatLegacyFormFieldPlaceholderConflictError,
} from './owned-errors';
