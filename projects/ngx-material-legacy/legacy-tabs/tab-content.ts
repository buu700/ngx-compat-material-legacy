/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, TemplateRef} from '@angular/core';
import {constructWithPublicDependencies} from './internal/public-constructor-context';
import {MAT_TAB_CONTENT, MatTabContent as MatNonLegacyTabContent} from '@angular/material/tabs';

/**
 * Decorates the `ng-template` tags and reads out the template from it.
 * @deprecated Use `MatTabContent` from `@angular/material/tabs` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Directive({
  standalone: false,
  selector: '[matTabContent]',
  providers: [{provide: MAT_TAB_CONTENT, useExisting: MatLegacyTabContent}],
})
export class MatLegacyTabContent extends MatNonLegacyTabContent {
  // @ts-expect-error TS2377: valid derived object return preserves manual arguments.
  constructor(template: TemplateRef<any>) {
    return constructWithPublicDependencies(MatNonLegacyTabContent, new.target, [
      {provide: TemplateRef, useValue: template},
    ]);
  }
}
