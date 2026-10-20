/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
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
import {constructLegacyTabBodyPortal} from './internal/tab-portal-construction-context';
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
 */
@Directive({
  standalone: false,
  selector: '[matTabBodyHost]',
})
export class MatLegacyTabBodyPortal extends CdkPortalOutlet {
  // The public parent is constructed with the original caller's dependencies.
  // Initialize every own field explicitly on that returned derived object.
  declare private _centeringSub: Subscription;
  declare private _leavingSub: Subscription;
  declare private _host: MatLegacyTabBody;

  // @ts-expect-error TS2377: derived constructor deliberately returns its object.
  constructor(
    @Inject(ViewContainerRef) viewContainerRef: ViewContainerRef,
    @Inject(forwardRef(() => MatLegacyTabBody)) _host: MatLegacyTabBody,
    @Inject(DOCUMENT) _document: any,
  ) {
    const outlet = constructLegacyTabBodyPortal(
      new.target, viewContainerRef, _document,
    ) as MatLegacyTabBodyPortal;
    outlet._host = _host;
    outlet._centeringSub = Subscription.EMPTY;
    outlet._leavingSub = Subscription.EMPTY;
    return outlet;
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
 */
@Component({
  standalone: false,
  selector: 'mat-tab-body',
  templateUrl: 'tab-body.html',
  styleUrls: ['tab-body.scss'],
  encapsulation: ViewEncapsulation.None,
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Eager,
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
