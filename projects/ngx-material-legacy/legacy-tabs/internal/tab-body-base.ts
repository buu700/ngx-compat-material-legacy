/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 tab body portal/base (CFR removed for CDK 22).
 * Motion uses CSS transitions (Material 22-style); no `@angular/animations` on primary.
 */

import {
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
@Directive()
export abstract class _MatTabBodyBase implements OnInit, OnDestroy {
  private _positionIndex: number;
  private _dirChangeSubscription = Subscription.EMPTY;
  private _fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  private _initialized = false;
  private readonly _ngZone = inject(NgZone, {optional: true});

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
    if (_dir) {
      this._dirChangeSubscription = _dir.change.subscribe((dir: Direction) => {
        this._computePositionAnimationState(dir);
        changeDetectorRef.markForCheck();
      });
    }

    this._translateTabComplete
      .pipe(
        distinctUntilChanged((x, y) => {
          return x.fromState === y.fromState && x.toState === y.toState;
        }),
      )
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
      // Seed previous side so CSS can animate into center on first paint.
      const originState = this._computePositionFromOrigin(this.origin);
      this._previousPosition =
        originState === 'left-origin-center' ? 'left' : 'right';
      this._position = 'center';
      this._setActiveClass(true);
      this._transitionStarted('center');
      this._scheduleTransitionDone('center');
    } else if (this._position === 'center') {
      this._setActiveClass(true);
      this._onCentering.emit(this._elementRef.nativeElement.clientHeight);
    }
    this._initialized = true;
  }

  ngOnDestroy() {
    if (this._fallbackTimer !== undefined) {
      clearTimeout(this._fallbackTimer);
    }
    this._dirChangeSubscription.unsubscribe();
    this._translateTabComplete.complete();
  }

  _onContentTransitionStart(event: TransitionEvent): void {
    if (event.target !== this._contentElement?.nativeElement) {
      return;
    }
    if (event.propertyName && event.propertyName !== 'transform') {
      return;
    }
    this._elementRef.nativeElement.classList.add('mat-tab-body-animating');
    this._transitionStarted(this._position);
  }

  _onContentTransitionEnd(event: TransitionEvent): void {
    if (event.target !== this._contentElement?.nativeElement) {
      return;
    }
    if (event.propertyName && event.propertyName !== 'transform') {
      return;
    }
    this._elementRef.nativeElement.classList.remove('mat-tab-body-animating');
    this._finishTransition(this._position);
  }

  private _transitionStarted(toState: string): void {
    const isCentering = this._isCenterPosition(toState);
    this._beforeCentering.emit(isCentering);
    if (isCentering) {
      this._onCentering.emit(this._elementRef.nativeElement.clientHeight);
    }
  }

  private _finishTransition(toState: string): void {
    if (this._fallbackTimer !== undefined) {
      clearTimeout(this._fallbackTimer);
      this._fallbackTimer = undefined;
    }
    const fromState = this._previousPosition || 'void';
    this._translateTabComplete.next({fromState, toState});
  }

  private _scheduleTransitionDone(toState: string): void {
    if (this._fallbackTimer !== undefined) {
      clearTimeout(this._fallbackTimer);
    }
    const delay = this._cssAnimationsDisabled() ? 0 : 100;
    const run = () => this._finishTransition(toState);
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
    this._previousPosition = this._position;
    if (this._positionIndex < 0) {
      this._position = dir == 'ltr' ? 'left' : 'right';
    } else if (this._positionIndex > 0) {
      this._position = dir == 'ltr' ? 'right' : 'left';
    } else {
      this._position = 'center';
    }

    if (this._position === 'center') {
      this._setActiveClass(true);
    } else if (this._initialized) {
      this._setActiveClass(false);
    }

    if (this._cssAnimationsDisabled()) {
      this._transitionStarted(this._position);
      this._scheduleTransitionDone(this._position);
    } else if (
      this._initialized &&
      (this._position === 'center' || this._previousPosition === 'center')
    ) {
      this._scheduleTransitionDone(this._position);
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
