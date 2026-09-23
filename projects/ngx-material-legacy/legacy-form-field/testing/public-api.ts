/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {LegacyFormFieldControlHarness, MatLegacyFormFieldHarness} from './form-field-harness';
export {MatLegacyErrorHarness} from './error-harness';

export {
  /**
   * @deprecated Use `MatFormFieldControlHarness` from `@angular/material/form-field/testing` instead.
   * @breaking-change 17.0.0
   */
  MatFormFieldControlHarness as MatLegacyFormFieldControlHarness,
} from '@angular/material/form-field/testing/control';

export {
  /**
   * @deprecated Use `FormFieldHarnessFilters` from `@angular/material/form-field/testing` instead.
   * @breaking-change 17.0.0
   */
  FormFieldHarnessFilters as LegacyFormFieldHarnessFilters,
  /**
   * @deprecated Use `ErrorHarnessFilters` from `@angular/material/form-field/testing` instead.
   * @breaking-change 17.0.0
   */
  ErrorHarnessFilters as LegacyErrorHarnessFilters,
} from '@angular/material/form-field/testing';
