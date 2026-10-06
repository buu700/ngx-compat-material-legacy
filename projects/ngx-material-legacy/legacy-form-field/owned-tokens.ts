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

/**
 * @deprecated Use `MAT_FORM_FIELD` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export const MAT_LEGACY_FORM_FIELD = new InjectionToken<MatFormField>('MatFormField');

/**
 * @deprecated Use `MAT_SUFFIX` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export const MAT_LEGACY_SUFFIX = new InjectionToken<MatSuffix>('MatSuffix');

/**
 * @deprecated Use `MAT_ERROR` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export const MAT_LEGACY_ERROR = new InjectionToken<MatError>('MatError');

/**
 * @deprecated Use `MAT_PREFIX` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export const MAT_LEGACY_PREFIX = new InjectionToken<MatPrefix>('MatPrefix');

