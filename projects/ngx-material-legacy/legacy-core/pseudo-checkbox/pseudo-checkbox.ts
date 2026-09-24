/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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

  /** Resolved through public MATERIAL_ANIMATIONS / reduced-motion policy (F04). */
  protected _animationsDisabled = legacyAnimationsDisabled();
}
