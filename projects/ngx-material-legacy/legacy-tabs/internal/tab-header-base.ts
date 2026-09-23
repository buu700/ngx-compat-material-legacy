/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatTabHeaderBase`.
 */

import {
  AfterContentChecked,
  AfterContentInit,
  AfterViewInit,
  ANIMATION_MODULE_TYPE,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  Optional,
} from '@angular/core';
import {ViewportRuler} from '@angular/cdk/scrolling';
import {Platform} from '@angular/cdk/platform';
import {Directionality} from '@angular/cdk/bidi';
import {BooleanInput, coerceBooleanProperty} from '@angular/cdk/coercion';
import {MatPaginatedTabHeader} from './paginated-tab-header';

@Directive()
export abstract class _MatTabHeaderBase
  extends MatPaginatedTabHeader
  implements AfterContentChecked, AfterContentInit, AfterViewInit, OnDestroy
{
  /** Whether the ripple effect is disabled or not. */
  @Input()
  get disableRipple(): boolean {
    return this._disableRipple;
  }

  set disableRipple(value: BooleanInput) {
    this._disableRipple = coerceBooleanProperty(value);
  }

  private _disableRipple: boolean = false;

  constructor(
    elementRef: ElementRef,
    changeDetectorRef: ChangeDetectorRef,
    viewportRuler: ViewportRuler,
    @Optional() dir: Directionality,
    ngZone: NgZone,
    platform: Platform,
    @Optional() @Inject(ANIMATION_MODULE_TYPE) animationMode?: string,
  ) {
    super(elementRef, changeDetectorRef, viewportRuler, dir, ngZone, platform, animationMode);
  }

  protected _itemSelected(event: KeyboardEvent) {
    event.preventDefault();
  }
}
