/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
    Directive,
  ElementRef,
  forwardRef,
  Inject,
  Optional,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import {CdkPortalOutlet} from '@angular/cdk/portal';
import {Directionality} from '@angular/cdk/bidi';
import {DOCUMENT} from '@angular/common';
import {Subscription} from 'rxjs';
import {startWith} from 'rxjs/operators';
import {
  _MatTabBodyBase,
} from './internal/tab-body-base';

/**
 * The portal host directive for the contents of the tab.
 * @docs-private
 * @deprecated Use `MatTabBodyPortal` from `@angular/material/tabs` instead.
 * @breaking-change 17.0.0
 */
@Directive({
  standalone: false,
  selector: '[matTabBodyHost]',
})
export class MatLegacyTabBodyPortal extends CdkPortalOutlet {
  private _centeringSub = Subscription.EMPTY;
  private _leavingSub = Subscription.EMPTY;

  constructor(
    viewContainerRef: ViewContainerRef,
    @Inject(forwardRef(() => MatLegacyTabBody)) private _host: MatLegacyTabBody,
    @Inject(DOCUMENT) _document: any,
  ) {
    super();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this._centeringSub = this._host._beforeCentering
      .pipe(startWith(this._host._isCenterPosition(this._host._position)))
      .subscribe((isCentering: boolean) => {
        if (isCentering && !this.hasAttached()) {
          this.attach(this._host._content);
        }
      });
    this._leavingSub = this._host._afterLeavingCenter.subscribe(() => {
      if (!this._host.preserveContent) {
        this.detach();
      }
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this._centeringSub.unsubscribe();
    this._leavingSub.unsubscribe();
  }
}

/**
 * Wrapper for the contents of a tab.
 * @docs-private
 * @deprecated Use `MatTabBody` from `@angular/material/tabs` instead.
 * @breaking-change 17.0.0
 */
@Component({
  standalone: false,
  selector: 'mat-tab-body',
  templateUrl: 'tab-body.html',
  styleUrls: ['tab-body.scss'],
  encapsulation: ViewEncapsulation.None,
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
  host: {
    'class': 'mat-tab-body',
  },
})
export class MatLegacyTabBody extends _MatTabBodyBase {
  @ViewChild(MatLegacyTabBodyPortal) _portalHost: MatLegacyTabBodyPortal;

  constructor(
    elementRef: ElementRef,
    @Optional() dir: Directionality,
    changeDetectorRef: ChangeDetectorRef,
  ) {
    super(elementRef, dir, changeDetectorRef);
  }
}
