/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {NgModule} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MAT_NATIVE_DATE_FORMATS} from '@angular/material/core';
import {LegacyNativeDateAdapter} from './native-date-adapter';

/** Historical native date provider using the owned locale constructor. */
@NgModule({providers: [{provide: DateAdapter, useClass: LegacyNativeDateAdapter}]})
export class LegacyNativeDateModule {}

/** Historical native provider and the public native date formats. */
@NgModule({imports: [LegacyNativeDateModule], providers: [{provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS}]})
export class MatLegacyNativeDateModule {}
