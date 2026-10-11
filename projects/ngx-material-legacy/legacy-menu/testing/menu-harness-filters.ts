/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {BaseHarnessFilters} from '@angular/cdk/testing';

/** Criteria supported by the historical legacy menu harness. */
export interface LegacyMenuHarnessFilters extends BaseHarnessFilters {
  /** Filters based on the text of the trigger. */
  triggerText?: string | RegExp;
}
