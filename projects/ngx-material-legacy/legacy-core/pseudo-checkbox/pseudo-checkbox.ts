/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned legacy pseudo-checkbox (S22). Current MatPseudoCheckbox is @docs-private (S20).
 */

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
  booleanAttribute,
  ANIMATION_MODULE_TYPE,
  Inject,
  Optional,
  assertInInjectionContext,
} from '@angular/core';
import {legacyAnimationsDisabled} from '../internal/legacy-animations';

/** Possible states for a pseudo checkbox. */
export type MatLegacyPseudoCheckboxState = 'unchecked' | 'checked' | 'indeterminate';

/**
 * Decorative checkbox without form control semantics. Parent components own ARIA.
 * Selector/classes match historical mat-pseudo-checkbox for legacy list/option rendering.
 */
@Component({
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mat-pseudo-checkbox',
  styleUrl: 'pseudo-checkbox.scss',
  template: '',
  host: {
    'class': 'mat-pseudo-checkbox',
    '[class.mat-pseudo-checkbox-indeterminate]': 'state === "indeterminate"',
    '[class.mat-pseudo-checkbox-checked]': 'state === "checked"',
    '[class.mat-pseudo-checkbox-disabled]': 'disabled',
    '[class.mat-pseudo-checkbox-minimal]': 'appearance === "minimal"',
    '[class.mat-pseudo-checkbox-full]': 'appearance === "full"',
    '[class._mat-animation-noopable]': '_animationsDisabled',
  },
})
export class MatLegacyPseudoCheckbox {
  /** Display state of the checkbox. */
  @Input() state: MatLegacyPseudoCheckboxState = 'unchecked';

  /** Whether the checkbox is disabled. */
  @Input({transform: booleanAttribute}) disabled: boolean = false;

  /**
   * Appearance of the pseudo checkbox. Default appearance of 'full' renders a checkmark/mixedmark
   * indicator inside a square box. 'minimal' appearance only renders the checkmark/mixedmark.
   */
  @Input() appearance: 'minimal' | 'full' = 'full';

  private _diAnimationsDisabled = false;

  constructor(@Optional() @Inject(ANIMATION_MODULE_TYPE) public _animationMode?: string) {
    // Historical callers can construct this decorative control outside Angular.
    let inContext = true;
    try {
      assertInInjectionContext(MatLegacyPseudoCheckbox);
    } catch {
      inContext = false;
    }
    this._diAnimationsDisabled = inContext ? legacyAnimationsDisabled() : false;
  }

  /** Keep the original mutable animation mode and the owned motion policy. */
  protected get _animationsDisabled(): boolean {
    return this._diAnimationsDisabled || this._animationMode === 'NoopAnimations';
  }
}
