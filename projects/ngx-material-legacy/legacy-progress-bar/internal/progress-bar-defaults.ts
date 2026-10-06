/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {InjectionToken} from '@angular/core';
import type {ThemePalette} from '@angular/material/core';
import type {ProgressBarMode} from '@angular/material/progress-bar';

/** Default `mat-progress-bar` options that can be overridden. */
export interface MatProgressBarDefaultOptions {
  /** Default color of the progress bar. */
  color?: ThemePalette;

  /** Default mode of the progress bar. */
  mode?: ProgressBarMode;
}

/** Injection token to be used to override the default options for `mat-progress-bar`. */
export const MAT_PROGRESS_BAR_DEFAULT_OPTIONS = new InjectionToken<MatProgressBarDefaultOptions>(
  'MAT_PROGRESS_BAR_DEFAULT_OPTIONS',
);
