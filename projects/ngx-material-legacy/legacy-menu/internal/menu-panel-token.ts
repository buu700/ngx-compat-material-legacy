/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {InjectionToken} from '@angular/core';
import type {MatMenuPanel} from './menu-panel';

/** The historical legacy panel identity is owned independently of current Material. */
export const MAT_MENU_PANEL = new InjectionToken<MatMenuPanel>('MAT_MENU_PANEL');
