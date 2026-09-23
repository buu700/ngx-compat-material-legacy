/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatTabLabelWrapperBase`.
 */

import {Directive, ElementRef} from '@angular/core';
import {MatInkBarItem, mixinInkBarItem} from './ink-bar-shared';
import {CanDisable, mixinDisabled} from './common-behaviors';

// Boilerplate for applying mixins to MatTabLabelWrapper.
/** @docs-private */
const _MatTabLabelWrapperMixinBase = mixinDisabled(class {});

/**
 * Used in the `mat-tab-group` view to display tab labels.
 * @docs-private
 */
@Directive()
export class _MatTabLabelWrapperBase extends _MatTabLabelWrapperMixinBase implements CanDisable {
  constructor(public elementRef: ElementRef) {
    super();
  }

  /** Sets focus on the wrapper element */
  focus(): void {
    this.elementRef.nativeElement.focus();
  }

  getOffsetLeft(): number {
    return this.elementRef.nativeElement.offsetLeft;
  }

  getOffsetWidth(): number {
    return this.elementRef.nativeElement.offsetWidth;
  }
}

const _MatTabLabelWrapperBaseWithInkBarItem = mixinInkBarItem(_MatTabLabelWrapperBase);

/**
 * Used in the `mat-tab-group` view to display tab labels.
 * @docs-private
 */
