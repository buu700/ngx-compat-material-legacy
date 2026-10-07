/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {BaseHarnessFilters} from '@angular/cdk/testing';


export interface LegacyOptionHarnessFilters extends BaseHarnessFilters {
  text?: string | RegExp;
  isSelected?: boolean;
}
