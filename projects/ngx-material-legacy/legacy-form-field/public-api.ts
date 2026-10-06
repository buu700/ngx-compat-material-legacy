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
  /**
   * @deprecated Use `MatFormFieldControl` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatFormFieldControl as MatLegacyFormFieldControl,
} from '@angular/material/form-field';
export {MAT_LEGACY_FORM_FIELD, MAT_LEGACY_SUFFIX, MAT_LEGACY_ERROR, MAT_LEGACY_PREFIX} from './owned-tokens';

// Historical `/animations` recipe secondary removed (F04); use CSS/Web Animations via MATERIAL_ANIMATIONS.

export {MatCommonModule} from './internal/common-module';

export {
  /**
   * @deprecated Use `getMatFormFieldDuplicatedHintError` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  getMatFormFieldDuplicatedHintError as getMatLegacyFormFieldDuplicatedHintError,
  /**
   * @deprecated Use `getMatFormFieldMissingControlError` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  getMatFormFieldMissingControlError as getMatLegacyFormFieldMissingControlError,
  /**
   * @deprecated Use `getMatFormFieldPlaceholderConflictError` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  getMatFormFieldPlaceholderConflictError as getMatLegacyFormFieldPlaceholderConflictError,
} from './owned-errors';
