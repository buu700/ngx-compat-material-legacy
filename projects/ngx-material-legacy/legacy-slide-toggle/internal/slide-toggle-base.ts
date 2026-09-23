/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatSlideToggleBase` (removed from Angular Material 22).
 */

import {FocusMonitor, FocusOrigin} from '@angular/cdk/a11y';
import {BooleanInput, coerceBooleanProperty} from '@angular/cdk/coercion';
import {
  AfterContentInit,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {ControlValueAccessor} from '@angular/forms';
import {ThemePalette} from '@angular/material/core';
import {
  CanColor,
  CanDisable,
  CanDisableRipple,
  HasTabIndex,
  mixinColor,
  mixinDisabled,
  mixinDisableRipple,
  mixinTabIndex,
} from './common-behaviors';

/** Defaults accepted by the owned slide-toggle base. */
export interface MatSlideToggleDefaultOptions {
  disableToggleValue?: boolean;
  color?: ThemePalette;
  hideIcon?: boolean;
}

let nextUniqueId = 0;

// Boilerplate for applying mixins to MatSlideToggle.
/** @docs-private */
const _MatSlideToggleMixinBase = mixinTabIndex(
  mixinColor(
    mixinDisableRipple(
      mixinDisabled(
        class {
          constructor(public _elementRef: ElementRef) {}
        },
      ),
    ),
  ),
);

@Directive({standalone: false})
export abstract class _MatSlideToggleBase<T>
  extends _MatSlideToggleMixinBase
  implements
    OnDestroy,
    AfterContentInit,
    ControlValueAccessor,
    CanDisable,
    CanColor,
    HasTabIndex,
    CanDisableRipple
{
  protected _onChange = (_: any) => {};
  private _onTouched = () => {};

  protected _uniqueId: string;
  private _required: boolean = false;
  private _checked: boolean = false;

  protected abstract _createChangeEvent(isChecked: boolean): T;

  abstract focus(options?: FocusOptions, origin?: FocusOrigin): void;

  /** Whether noop animations are enabled. */
  _noopAnimations: boolean;

  /** Whether the slide toggle is currently focused. */
  _focused: boolean;

  /** Name value will be applied to the input element if present. */
  @Input() name: string | null = null;

  /** A unique id for the slide-toggle input. If none is supplied, it will be auto-generated. */
  @Input() id: string;

  /** Whether the label should appear after or before the slide-toggle. Defaults to 'after'. */
  @Input() labelPosition: 'before' | 'after' = 'after';

  /** Used to set the aria-label attribute on the underlying input element. */
  @Input('aria-label') ariaLabel: string | null = null;

  /** Used to set the aria-labelledby attribute on the underlying input element. */
  @Input('aria-labelledby') ariaLabelledby: string | null = null;

  /** Used to set the aria-describedby attribute on the underlying input element. */
  @Input('aria-describedby') ariaDescribedby: string;

  /** Whether the slide-toggle is required. */
  @Input()
  get required(): boolean {
    return this._required;
  }

  set required(value: BooleanInput) {
    this._required = coerceBooleanProperty(value);
  }

  /** Whether the slide-toggle element is checked or not. */
  @Input()
  get checked(): boolean {
    return this._checked;
  }

  set checked(value: BooleanInput) {
    this._checked = coerceBooleanProperty(value);
    this._changeDetectorRef.markForCheck();
  }

  /** Whether to hide the icon inside of the slide toggle. */
  @Input()
  get hideIcon(): boolean {
    return this._hideIcon;
  }
  set hideIcon(value: BooleanInput) {
    this._hideIcon = coerceBooleanProperty(value);
  }
  private _hideIcon = false;

  /** An event will be dispatched each time the slide-toggle changes its value. */
  @Output() readonly change: EventEmitter<T> = new EventEmitter<T>();

  /**
   * An event will be dispatched each time the slide-toggle input is toggled.
   * This event is always emitted when the user toggles the slide toggle, but this does not mean
   * the slide toggle's value has changed.
   */
  @Output() readonly toggleChange: EventEmitter<void> = new EventEmitter<void>();

  /** Returns the unique id for the visual hidden input. */
  get inputId(): string {
    return `${this.id || this._uniqueId}-input`;
  }

  constructor(
    elementRef: ElementRef,
    protected _focusMonitor: FocusMonitor,
    protected _changeDetectorRef: ChangeDetectorRef,
    tabIndex: string,
    public defaults: MatSlideToggleDefaultOptions,
    animationMode: string | undefined,
    idPrefix: string,
  ) {
    super(elementRef);
    this.tabIndex = parseInt(tabIndex) || 0;
    this.color = this.defaultColor = defaults.color || 'accent';
    this._noopAnimations = animationMode === 'NoopAnimations';
    this.id = this._uniqueId = `${idPrefix}${++nextUniqueId}`;
    this._hideIcon = defaults.hideIcon ?? false;
  }

  ngAfterContentInit() {
    this._focusMonitor.monitor(this._elementRef, true).subscribe(focusOrigin => {
      if (focusOrigin === 'keyboard' || focusOrigin === 'program') {
        this._focused = true;
        this._changeDetectorRef.markForCheck();
      } else if (!focusOrigin) {
        // When a focused element becomes disabled, the browser *immediately* fires a blur event.
        // Angular does not expect events to be raised during change detection, so any state
        // change (such as a form control's ng-touched) will cause a changed-after-checked error.
        // See https://github.com/angular/angular/issues/17793. To work around this, we defer
        // telling the form control it has been touched until the next tick.
        Promise.resolve().then(() => {
          this._focused = false;
          this._onTouched();
          this._changeDetectorRef.markForCheck();
        });
      }
    });
  }

  ngOnDestroy() {
    this._focusMonitor.stopMonitoring(this._elementRef);
  }

  /** Implemented as part of ControlValueAccessor. */
  writeValue(value: any): void {
    this.checked = !!value;
  }

  /** Implemented as part of ControlValueAccessor. */
  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  /** Implemented as part of ControlValueAccessor. */
  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  /** Implemented as a part of ControlValueAccessor. */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this._changeDetectorRef.markForCheck();
  }

  /** Toggles the checked state of the slide-toggle. */
  toggle(): void {
    this.checked = !this.checked;
    this._onChange(this.checked);
  }

  /**
   * Emits a change event on the `change` output. Also notifies the FormControl about the change.
   */
  protected _emitChangeEvent() {
    this._onChange(this.checked);
    this.change.emit(this._createChangeEvent(this.checked));
  }
}

