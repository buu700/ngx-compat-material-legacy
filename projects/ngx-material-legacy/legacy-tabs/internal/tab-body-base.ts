/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 tab body portal/base (CFR removed for CDK 22).
 * Motion uses CSS transitions (Material 22-style); no `@angular/animations` on primary.
 */

import {
  assertInInjectionContext,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import {CdkPortalOutlet, TemplatePortal} from '@angular/cdk/portal';
import {Direction, Directionality} from '@angular/cdk/bidi';
import {Subject, Subscription} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';
import {legacyAnimationsDisabled} from '@ngx-compat/material-legacy/legacy-core';

/** The historical three-argument constructor also works outside Angular DI. */
function tabBodyNgZone(): NgZone | null {
  try {
    assertInInjectionContext(tabBodyNgZone);
  } catch {
    return null;
  }
  return inject(NgZone, {optional: true});
}

/**
 * These position states are used internally as animation states for the tab body.
 */
export type MatTabBodyPositionState =
  | 'left'
  | 'center'
  | 'right'
  | 'left-origin-center'
  | 'right-origin-center';

export type MatTabBodyOriginState = 'left' | 'right';

/** Minimal event shape replacing Angular `AnimationEvent` for tab translate completion. */
export interface LegacyTabTransitionEvent {
  fromState: string;
  toState: string;
}

/**
 * Base class with all of the `MatTabBody` functionality.
 * @docs-private
 */
@Directive({standalone: false})
export abstract class _MatTabBodyBase implements OnInit, OnDestroy {
  private _positionIndex: number;
  private _dirChangeSubscription = Subscription.EMPTY;
  private _fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  private _initialized = false;
  private _destroyed = false;
  private _pendingTransition: LegacyTabTransitionEvent | undefined;
  private _deferredCentering: LegacyTabTransitionEvent | undefined;
  private _originTransition: LegacyTabTransitionEvent | undefined;
  private readonly _ngZone = tabBodyNgZone();
  private readonly _changeDetectorRef: ChangeDetectorRef;

  /** Tab body position state. */
  _position: MatTabBodyPositionState;

  /** Prior position — drives whether CSS transitions run (Material 22). */
  _previousPosition: MatTabBodyPositionState | undefined;

  /** Emits when a tab position transition completes. */
  readonly _translateTabComplete = new Subject<LegacyTabTransitionEvent>();

  @Output() readonly _onCentering: EventEmitter<number> = new EventEmitter<number>();
  @Output() readonly _beforeCentering: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() readonly _afterLeavingCenter: EventEmitter<void> = new EventEmitter<void>();
  @Output() readonly _onCentered: EventEmitter<void> = new EventEmitter<void>(true);

  abstract _portalHost: CdkPortalOutlet;

  @ViewChild('content') _contentElement: ElementRef<HTMLElement>;

  @Input('content') _content: TemplatePortal;

  @Input() origin: number | null;

  @Input()
  get animationDuration(): string {
    return this._cssAnimationsDisabled() ? '0ms' : this._animationDurationInput;
  }
  set animationDuration(value: string) {
    this._animationDurationInput = value || '500ms';
  }
  private _animationDurationInput = '500ms';

  private readonly _legacyAnimationsDisabled = legacyAnimationsDisabled();

  @Input() preserveContent: boolean = false;

  @Input()
  set position(position: number) {
    this._positionIndex = position;
    this._computePositionAnimationState();
  }

  constructor(
    protected _elementRef: ElementRef<HTMLElement>,
    @Optional() private _dir: Directionality,
    changeDetectorRef: ChangeDetectorRef,
  ) {
    this._changeDetectorRef = changeDetectorRef;
    if (_dir) {
      this._dirChangeSubscription = _dir.change.subscribe((dir: Direction) => {
        this._computePositionAnimationState(dir);
        changeDetectorRef.markForCheck();
      });
    }

    this._translateTabComplete
      .pipe(distinctUntilChanged((a, b) => a.fromState === b.fromState && a.toState === b.toState))
      .subscribe(event => {
        if (this._isCenterPosition(event.toState) && this._isCenterPosition(this._position)) {
          this._onCentered.emit();
        }

        if (this._isCenterPosition(event.fromState) && !this._isCenterPosition(this._position)) {
          this._afterLeavingCenter.emit();
        }
      });
  }

  ngOnInit() {
    if (this._position == 'center' && this.origin != null) {
      // Preserve historical origin-center position names (animation states) while
      // seeding previous side so CSS can animate into the centered transform.
      this._position = this._computePositionFromOrigin(this.origin);
      this._previousPosition =
        this._position === 'left-origin-center' ? 'left' : 'right';
      this._setActiveClass(true);
      this._startTransition();
    } else if (this._position === 'center') {
      this._setActiveClass(true);
      if (!this._pendingTransition) {
        this._startTransition();
      }
    }
    this._initialized = true;
  }

  /** Initial origin content is not available through the view query in ngOnInit. */
  ngAfterViewInit(): void {
    const transition = this._pendingTransition;
    const content = this._contentElement?.nativeElement;
    if (this._destroyed || !transition || !content) {
      return;
    }
    if (transition.fromState === 'void' && this._originTransition !== transition &&
      (transition.toState === 'left-origin-center' || transition.toState === 'right-origin-center') &&
      !this._cssAnimationsDisabled() && typeof content.getBoundingClientRect === 'function') {
      this._originTransition = transition;
      const style = content.style;
      const properties = ['transition-duration', 'transform'];
      const previous = properties.map(name => ({
        name, value: style.getPropertyValue(name), priority: style.getPropertyPriority(name),
      }));
      style.setProperty('transition-duration', '0ms');
      style.setProperty('transform', transition.toState === 'left-origin-center'
        ? 'translate3d(-100%, 0, 0)' : 'translate3d(100%, 0, 0)');
      const temporary = properties.map(name => style.getPropertyValue(name));
      try {
        // Render the tagged origin transform before restoring the centered CSS state.
        content.getBoundingClientRect();
      } finally {
        previous.forEach(({name, value, priority}, index) => {
          // A layout callback may have replaced a phase or supplied its own style.
          if (style.getPropertyValue(name) === temporary[index] && !style.getPropertyPriority(name)) {
            if (value) {
              style.setProperty(name, value, priority);
            } else {
              style.removeProperty(name);
            }
          }
        });
      }
      if (this._pendingTransition !== transition || this._destroyed) {
        return;
      }
      // Start the missing-event deadline at the actual origin layout, not ngOnInit.
      this._scheduleTransitionDone(transition);
    }
    if (this._deferredCentering === transition && this._pendingTransition === transition &&
      !this._destroyed) {
      this._deferredCentering = undefined;
      this._onCentering.emit(this._elementRef.nativeElement.clientHeight);
    }
  }

  /** Keep a departing pane rendered until its transform completes. */
  get _contentIsVisible(): boolean {
    return this._isCenterPosition(this._position) || !!this._pendingTransition &&
      this._isCenterPosition(this._pendingTransition.fromState);
  }

  ngOnDestroy() {
    this._destroyed = true;
    this._pendingTransition = undefined;
    this._deferredCentering = undefined;
    this._originTransition = undefined;
    if (this._fallbackTimer !== undefined) {
      clearTimeout(this._fallbackTimer);
      this._fallbackTimer = undefined;
    }
    this._dirChangeSubscription.unsubscribe();
    this._translateTabComplete.complete();
  }

  _onContentTransitionStart(event: TransitionEvent): void {
    if (
      this._destroyed || !this._pendingTransition ||
      event.target !== this._contentElement?.nativeElement
    ) {
      return;
    }
    if (event.propertyName && event.propertyName !== 'transform') {
      return;
    }
    this._elementRef.nativeElement.classList.add('mat-tab-body-animating');
  }

  _onContentTransitionEnd(event: TransitionEvent): void {
    if (
      this._destroyed || !this._pendingTransition ||
      event.target !== this._contentElement?.nativeElement
    ) {
      return;
    }
    if (event.propertyName && event.propertyName !== 'transform') {
      return;
    }
    this._finishTransition(this._pendingTransition);
  }

  private _startTransition(): void {
    if (this._destroyed) {
      return;
    }
    if (this._fallbackTimer !== undefined) {
      clearTimeout(this._fallbackTimer);
      this._fallbackTimer = undefined;
    }
    const transition = this._pendingTransition = {
      fromState: this._initialized ? this._previousPosition || 'void' : 'void',
      toState: this._position,
    };
    this._deferredCentering = undefined;
    this._originTransition = undefined;
    // Keep the departing content visible with the existing historical selector
    // while its transform changes; completion removes this class.
    this._elementRef.nativeElement.classList.add('mat-tab-body-animating');
    const isCentering = this._isCenterPosition(transition.toState);
    this._beforeCentering.emit(isCentering);
    if (this._pendingTransition !== transition || this._destroyed) {
      return;
    }
    if (isCentering) {
      const content = this._contentElement?.nativeElement;
      if (content?.style.visibility === 'hidden') {
        // The historical hidden-style selector uses display:none. Reveal the
        // attached content at its old offscreen transform before Angular applies
        // the centered class; otherwise the browser cannot start a transition.
        content.style.removeProperty('visibility');
        content.getBoundingClientRect();
      }
      if (this._pendingTransition !== transition || this._destroyed) {
        return;
      }
      if (content) {
        this._onCentering.emit(this._elementRef.nativeElement.clientHeight);
      } else {
        this._deferredCentering = transition;
      }
    }
    if (this._pendingTransition === transition && !this._destroyed) {
      this._scheduleTransitionDone(transition);
    }
  }

  private _finishTransition(transition: LegacyTabTransitionEvent | undefined): void {
    if (this._destroyed || !transition || this._pendingTransition !== transition) {
      return;
    }
    if (this._fallbackTimer !== undefined) {
      clearTimeout(this._fallbackTimer);
      this._fallbackTimer = undefined;
    }
    this._pendingTransition = undefined;
    this._deferredCentering = undefined;
    this._originTransition = undefined;
    if (!this._isCenterPosition(transition.toState)) {
      this._contentElement?.nativeElement.style.setProperty('visibility', 'hidden');
    }
    this._elementRef.nativeElement.classList.remove('mat-tab-body-animating');
    this._changeDetectorRef.markForCheck();
    this._translateTabComplete.next(transition);
  }

  private _scheduleTransitionDone(transition: LegacyTabTransitionEvent): void {
    if (this._fallbackTimer !== undefined) {
      clearTimeout(this._fallbackTimer);
      this._fallbackTimer = undefined;
    }
    // A native transitionend normally completes the phase. Allow its configured
    // duration plus a small delivery buffer before the missing-event fallback.
    const duration = this._animationDurationInput.trim().match(/^(\d*\.?\d+)(ms|s)$/);
    const milliseconds = duration ? Number(duration[1]) * (duration[2] === 's' ? 1000 : 1) : 500;
    const initialCenter = transition.fromState === 'void' && transition.toState === 'center';
    const delay = this._cssAnimationsDisabled() || initialCenter ? 0 : milliseconds + 100;
    const run = () => {
      if (this._ngZone) {
        this._ngZone.run(() => this._finishTransition(transition));
      } else {
        this._finishTransition(transition);
      }
    };
    if (this._ngZone) {
      this._fallbackTimer = this._ngZone.runOutsideAngular(() => setTimeout(run, delay));
    } else {
      this._fallbackTimer = setTimeout(run, delay);
    }
  }

  private _setActiveClass(isActive: boolean): void {
    this._elementRef.nativeElement.classList.toggle('mat-tab-body-active', isActive);
  }

  private _cssAnimationsDisabled(): boolean {
    return (
      this._legacyAnimationsDisabled ||
      this._animationDurationInput === '0ms' ||
      this._animationDurationInput === '0s'
    );
  }

  _getLayoutDirection(): Direction {
    return this._dir && this._dir.value === 'rtl' ? 'rtl' : 'ltr';
  }

  _isCenterPosition(position: MatTabBodyPositionState | string): boolean {
    return (
      position == 'center' || position == 'left-origin-center' || position == 'right-origin-center'
    );
  }

  private _computePositionAnimationState(dir: Direction = this._getLayoutDirection()) {
    if (this._destroyed) {
      return;
    }
    const position = this._positionIndex < 0 ? (dir == 'ltr' ? 'left' : 'right')
      : this._positionIndex > 0 ? (dir == 'ltr' ? 'right' : 'left') : 'center';
    if (position === this._position) {
      return;
    }
    this._previousPosition = this._position;
    this._position = position;

    if (this._isCenterPosition(this._position)) {
      this._setActiveClass(true);
    } else if (this._initialized) {
      this._setActiveClass(false);
    }

    if (this._cssAnimationsDisabled() || this._initialized &&
      (this._isCenterPosition(this._position) || this._isCenterPosition(this._previousPosition || ''))) {
      // Attach before the content can animate. An off-center pane is hidden by
      // existing CSS, so relying on transitionstart can leave the active tab empty.
      this._startTransition();
    }
  }

  private _computePositionFromOrigin(origin: number): MatTabBodyPositionState {
    const dir = this._getLayoutDirection();
    if ((dir == 'ltr' && origin <= 0) || (dir == 'rtl' && origin > 0)) {
      return 'left-origin-center';
    }
    return 'right-origin-center';
  }
}
