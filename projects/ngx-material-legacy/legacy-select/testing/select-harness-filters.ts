/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {BaseHarnessFilters} from '@angular/cdk/testing';

/**
 * A set of criteria that can be used to filter a list of `MatSelectHarness` instances.
 */
export interface LegacySelectHarnessFilters extends BaseHarnessFilters {
  /** Only find instances which match the given disabled state. */
  disabled?: boolean;
}
