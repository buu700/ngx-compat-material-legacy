/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, ElementRef, inject} from '@angular/core';
import {MatInput as BaseMatInput} from '@angular/material/input';
import {
  MatLegacyFormFieldControl,
  MatLegacyFormField,
  MAT_LEGACY_FORM_FIELD,
} from '@ngx-compat/material-legacy/legacy-form-field';

/**
 * Directive that allows a native input to work inside a `MatFormField`.
 */
@Directive({
  standalone: false,
  selector: `input[matInput], textarea[matInput], select[matNativeControl],
      input[matNativeControl], textarea[matNativeControl]`,
  exportAs: 'matInput',
  host: {
    /**
     * @breaking-change 8.0.0 remove .mat-form-field-autofill-control in favor of AutofillMonitor.
     */
    'class': 'mat-input-element mat-form-field-autofill-control',
    '[class.mat-input-server]': '_isServer',
    // These classes are inherited from the base input class and need to be cleared.
    '[class.mat-mdc-input-element]': 'false',
    '[class.mat-mdc-form-field-textarea-control]': 'false',
    '[class.mat-mdc-form-field-input-control]': 'false',
    '[class.mdc-text-field__input]': 'false',
    '[class.mat-mdc-native-select-inline]': 'false',
    '[class.mat-mdc-input-disabled-interactive]': 'false',
    // Preserve native disabled/readonly behavior even when the current peer enables
    // interactive-disabled controls globally.
    '[disabled]': 'disabled',
    '[attr.readonly]': '_legacyReadonlyAttribute()',
    '[attr.aria-disabled]': '_legacyAriaDisabled',
    // At the time of writing, we have a lot of customer tests that look up the input based on its
    // placeholder. Since we sometimes omit the placeholder attribute from the DOM to prevent screen
    // readers from reading it twice, we have to keep it somewhere in the DOM for the lookup.
    '[attr.data-placeholder]': 'placeholder',
    '[class.mat-native-select-inline]': '_isInlineSelect()',
  },
  providers: [{provide: MatLegacyFormFieldControl, useExisting: MatLegacyInput}],
})
export class MatLegacyInput extends BaseMatInput {
  private _legacyFormField = inject<MatLegacyFormField>(MAT_LEGACY_FORM_FIELD, {optional: true});
  private readonly _legacyElement = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>(ElementRef);
  private _legacyPlaceholderChecked = false;
  /** @docs-private Host binding preserves the consumer-supplied aria-disabled value. */
  protected _legacyAriaDisabled: string | null = null;

  override ngDoCheck() {
    // The frozen legacy control has always been natively disabled.
    this.disabledInteractive = false;
    super.ngDoCheck();
    // The peer initializes its placeholder cache to null. The historical peer's
    // first check also removed an authored placeholder promoted to a label.
    if (!this._legacyPlaceholderChecked) {
      this._legacyPlaceholderChecked = true;
      if (this._legacyFormField?.appearance === 'legacy' && !this._legacyFormField._hasLabel?.()) {
        this._legacyElement.nativeElement.removeAttribute('placeholder');
      }
    }
    this._legacyAriaDisabled = this._legacyElement.nativeElement.getAttribute('aria-disabled');
  }

  /** @docs-private Host binding preserves the historical native readonly behavior. */
  protected _legacyReadonlyAttribute(): string | null {
    return this.readonly && this._legacyElement.nativeElement.nodeName.toLowerCase() !== 'select'
      ? 'true' : null;
  }

  /** Construct through Angular node DI; retired dependency arguments must not be ignored. */
  constructor() {
    if (arguments.length) {
      throw new Error('MatLegacyInput manual dependency arguments are not supported.');
    }
    super();
    this.disabledInteractive = false;
  }

  protected override _getPlaceholder() {
    // If we're hiding the native placeholder, it should also be cleared from the DOM, otherwise
    // screen readers will read it out twice: once from the label and once from the attribute.
    // TODO: can be removed once we get rid of the `legacy` style for the form field, because it's
    // the only one that supports promoting the placeholder to a label.
    const formField = this._legacyFormField;
    return formField && formField.appearance === 'legacy' && !formField._hasLabel?.()
      ? null
      : this.placeholder;
  }
}
