/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {_MatTabLabelWrapperBase} from './internal/tab-label-wrapper-base';
import {Directive} from '@angular/core';


@Directive({
  standalone: false,
  selector: '[matTabLabelWrapper]',
  inputs: ['disabled'],
  host: {
    '[class.mat-tab-disabled]': 'disabled',
    '[attr.aria-disabled]': '!!disabled',
  },
})
export class MatLegacyTabLabelWrapper extends _MatTabLabelWrapperBase {}
