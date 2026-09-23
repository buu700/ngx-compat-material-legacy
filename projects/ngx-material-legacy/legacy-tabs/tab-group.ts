/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ANIMATION_MODULE_TYPE,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  Inject,
  Optional,
  QueryList,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {MatLegacyTab} from './tab';
import {MAT_TABS_CONFIG, MatTabsConfig} from '@angular/material/tabs';
import {
  _MatTabGroupBase,
  MatTabGroupBaseHeader,
} from './internal/tab-group-base';
import {MAT_TAB_GROUP} from './internal/tab-base';

/**
 * Material design tab-group component. Supports basic tab pairs (label + content) and includes
 * animated ink-bar, keyboard navigation, and screen reader.
 * See: https://material.io/design/components/tabs.html
 * @deprecated Use `MatTabGroup` from `@angular/material/tabs` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Component({
  standalone: false,
  selector: 'mat-tab-group',
  exportAs: 'matTabGroup',
  templateUrl: 'tab-group.html',
  styleUrls: ['tab-group.scss'],
  encapsulation: ViewEncapsulation.None,
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
  inputs: ['color', 'disableRipple'],
  providers: [
    {
      provide: MAT_TAB_GROUP,
      useExisting: MatLegacyTabGroup,
    },
  ],
  host: {
    'class': 'mat-tab-group',
    '[class.mat-tab-group-dynamic-height]': 'dynamicHeight',
    '[class.mat-tab-group-inverted-header]': 'headerPosition === "below"',
    'ngSkipHydration': '',
  },
})
export class MatLegacyTabGroup extends _MatTabGroupBase {
  @ContentChildren(MatLegacyTab, {descendants: true}) _allTabs: QueryList<MatLegacyTab>;
  @ViewChild('tabBodyWrapper') _tabBodyWrapper: ElementRef;
  @ViewChild('tabHeader') _tabHeader: MatTabGroupBaseHeader;

  constructor(
    elementRef: ElementRef,
    changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_TABS_CONFIG) @Optional() defaultConfig?: MatTabsConfig,
    @Optional() @Inject(ANIMATION_MODULE_TYPE) animationMode?: string,
  ) {
    super(elementRef, changeDetectorRef, defaultConfig, animationMode);
  }
}
