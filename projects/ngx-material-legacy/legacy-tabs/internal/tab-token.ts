/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {InjectionToken} from '@angular/core';

/** Reference to the nearest legacy tab without a circular class dependency. */
export const MAT_TAB = new InjectionToken<any>('MAT_TAB');
