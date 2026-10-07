/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {InjectionToken} from '@angular/core';
// Preserve the historical public token type parameters; runtime identities are owned.
import type {MatError, MatFormField, MatPrefix, MatSuffix} from '@angular/material/form-field';


export const MAT_LEGACY_FORM_FIELD = new InjectionToken<MatFormField>('MatFormField');


export const MAT_LEGACY_SUFFIX = new InjectionToken<MatSuffix>('MatSuffix');


export const MAT_LEGACY_ERROR = new InjectionToken<MatError>('MatError');


export const MAT_LEGACY_PREFIX = new InjectionToken<MatPrefix>('MatPrefix');

