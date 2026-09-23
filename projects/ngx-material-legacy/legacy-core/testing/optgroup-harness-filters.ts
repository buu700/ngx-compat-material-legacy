/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {BaseHarnessFilters} from '@angular/cdk/testing';

/**
 * @deprecated Use `OptgroupHarnessFilters` from `@angular/material/core/testing` instead.
 * @breaking-change 17.0.0
 */
export interface LegacyOptgroupHarnessFilters extends BaseHarnessFilters {
  labelText?: string | RegExp;
}
