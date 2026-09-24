/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned finite ripple renderer (S23/S26). Current RippleRenderer is @docs-private (S21).
 */

import {ElementRef, NgZone} from '@angular/core';
import {Platform, normalizePassiveListenerOptions} from '@angular/cdk/platform';
import {isFakeMousedownFromScreenReader, isFakeTouchstartFromScreenReader} from '@angular/cdk/a11y';
import {coerceElement} from '@angular/cdk/coercion';
import {
  LegacyRippleConfig,
  LegacyRippleRef,
  LegacyRippleState,
} from './ripple-ref';
import {LegacyRippleEventManager} from './ripple-event-manager';

/** Target contract for launching ripples. */
export interface LegacyRippleTarget {
  rippleConfig: LegacyRippleConfig;
  rippleDisabled: boolean;
}

/** Default enter/exit durations (historical defaultRippleAnimationConfig). */
export const legacyDefaultRippleAnimationConfig = {
  enterDuration: 225,
  exitDuration: 150,
};

const ignoreMouseEventsTimeout = 800;

const passiveCapturingEventOptions = normalizePassiveListenerOptions({
  passive: true,
  capture: true,
});

const pointerDownEvents = ['mousedown', 'touchstart'];
const pointerUpEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];

interface RippleEventListeners {
  onTransitionEnd: EventListener;
  onTransitionCancel: EventListener;
}

/**
 * Finite DOM ripple renderer used by legacy chips and tab links.
 * Constructor and public methods match the historical 4-arg form used by those consumers.
 */
export class LegacyRippleRenderer implements EventListenerObject {
  private _containerElement!: HTMLElement;
  private _triggerElement: HTMLElement | null = null;
  private _isPointerDown = false;
  private _activeRipples = new Map<LegacyRippleRef, RippleEventListeners | null>();
  private _mostRecentTransientRipple: LegacyRippleRef | null = null;
  private _lastTouchStartEvent!: number;
  private _pointerUpEventsRegistered = false;
  private _containerRect: DOMRect | null = null;
  private static _eventManager = new LegacyRippleEventManager();

  constructor(
    private _target: LegacyRippleTarget,
    private _ngZone: NgZone,
    elementOrElementRef: HTMLElement | ElementRef<HTMLElement>,
    private _platform: Platform,
  ) {
    if (_platform.isBrowser) {
      this._containerElement = coerceElement(elementOrElementRef);
    }
  }

  fadeInRipple(x: number, y: number, config: LegacyRippleConfig = {}): LegacyRippleRef {
    const containerRect = (this._containerRect =
      this._containerRect || this._containerElement.getBoundingClientRect());
    const animationConfig = {...legacyDefaultRippleAnimationConfig, ...config.animation};

    if (config.centered) {
      x = containerRect.left + containerRect.width / 2;
      y = containerRect.top + containerRect.height / 2;
    }

    const radius = config.radius || distanceToFurthestCorner(x, y, containerRect);
    const offsetX = x - containerRect.left;
    const offsetY = y - containerRect.top;
    const enterDuration = animationConfig.enterDuration;

    const ripple = document.createElement('div');
    ripple.classList.add('mat-ripple-element');
    ripple.style.left = `${offsetX - radius}px`;
    ripple.style.top = `${offsetY - radius}px`;
    ripple.style.height = `${radius * 2}px`;
    ripple.style.width = `${radius * 2}px`;

    if (config.color != null) {
      ripple.style.backgroundColor = config.color;
    }

    ripple.style.transitionDuration = `${enterDuration}ms`;
    this._containerElement.appendChild(ripple);

    const computedStyles = window.getComputedStyle(ripple);
    const userTransitionProperty = computedStyles.transitionProperty;
    const userTransitionDuration = computedStyles.transitionDuration;
    const animationForciblyDisabledThroughCss =
      userTransitionProperty === 'none' ||
      userTransitionDuration === '0s' ||
      userTransitionDuration === '0s, 0s' ||
      (containerRect.width === 0 && containerRect.height === 0);

    const rippleRef = new LegacyRippleRef(
      this,
      ripple,
      config,
      animationForciblyDisabledThroughCss,
    );

    ripple.style.transform = 'scale3d(1, 1, 1)';
    rippleRef.state = LegacyRippleState.FADING_IN;

    if (!config.persistent) {
      this._mostRecentTransientRipple = rippleRef;
    }

    let eventListeners: RippleEventListeners | null = null;

    if (!animationForciblyDisabledThroughCss && (enterDuration || animationConfig.exitDuration)) {
      this._ngZone.runOutsideAngular(() => {
        const onTransitionEnd = () => this._finishRippleTransition(rippleRef);
        const onTransitionCancel = () => this._destroyRipple(rippleRef);
        ripple.addEventListener('transitionend', onTransitionEnd);
        ripple.addEventListener('transitioncancel', onTransitionCancel);
        eventListeners = {onTransitionEnd, onTransitionCancel};
      });
    }

    this._activeRipples.set(rippleRef, eventListeners);

    if (animationForciblyDisabledThroughCss || !enterDuration) {
      this._finishRippleTransition(rippleRef);
    }

    return rippleRef;
  }

  fadeOutRipple(rippleRef: LegacyRippleRef) {
    if (rippleRef.state === LegacyRippleState.FADING_OUT || rippleRef.state === LegacyRippleState.HIDDEN) {
      return;
    }

    const rippleEl = rippleRef.element;
    const animationConfig = {...legacyDefaultRippleAnimationConfig, ...rippleRef.config.animation};

    rippleEl.style.transitionDuration = `${animationConfig.exitDuration}ms`;
    rippleEl.style.opacity = '0';
    rippleRef.state = LegacyRippleState.FADING_OUT;

    if (rippleRef._animationForciblyDisabledThroughCss || !animationConfig.exitDuration) {
      this._finishRippleTransition(rippleRef);
    }
  }

  fadeOutAll() {
    this._getActiveRipples().forEach(ripple => ripple.fadeOut());
  }

  fadeOutAllNonPersistent() {
    this._getActiveRipples().forEach(ripple => {
      if (!ripple.config.persistent) {
        ripple.fadeOut();
      }
    });
  }

  setupTriggerEvents(elementOrElementRef: HTMLElement | ElementRef<HTMLElement>) {
    const element = coerceElement(elementOrElementRef);

    if (!this._platform.isBrowser || !element || element === this._triggerElement) {
      return;
    }

    this._removeTriggerEvents();
    this._triggerElement = element;

    pointerDownEvents.forEach(type => {
      LegacyRippleRenderer._eventManager.addHandler(this._ngZone, type, element, this);
    });
  }

  handleEvent(event: Event) {
    if (event.type === 'mousedown') {
      this._onMousedown(event as MouseEvent);
    } else if (event.type === 'touchstart') {
      this._onTouchStart(event as TouchEvent);
    } else {
      this._onPointerUp();
    }

    if (!this._pointerUpEventsRegistered) {
      this._ngZone.runOutsideAngular(() => {
        pointerUpEvents.forEach(type => {
          this._triggerElement!.addEventListener(type, this, passiveCapturingEventOptions);
        });
      });
      this._pointerUpEventsRegistered = true;
    }
  }

  private _finishRippleTransition(rippleRef: LegacyRippleRef) {
    if (rippleRef.state === LegacyRippleState.FADING_IN) {
      this._startFadeOutTransition(rippleRef);
    } else if (rippleRef.state === LegacyRippleState.FADING_OUT) {
      this._destroyRipple(rippleRef);
    }
  }

  private _startFadeOutTransition(rippleRef: LegacyRippleRef) {
    const isMostRecentTransientRipple = rippleRef === this._mostRecentTransientRipple;
    const {persistent} = rippleRef.config;

    rippleRef.state = LegacyRippleState.VISIBLE;

    if (!persistent && (!isMostRecentTransientRipple || !this._isPointerDown)) {
      rippleRef.fadeOut();
    }
  }

  private _destroyRipple(rippleRef: LegacyRippleRef) {
    const eventListeners = this._activeRipples.get(rippleRef) ?? null;
    this._activeRipples.delete(rippleRef);

    if (!this._activeRipples.size) {
      this._containerRect = null;
    }

    if (rippleRef === this._mostRecentTransientRipple) {
      this._mostRecentTransientRipple = null;
    }

    rippleRef.state = LegacyRippleState.HIDDEN;
    if (eventListeners !== null) {
      rippleRef.element.removeEventListener('transitionend', eventListeners.onTransitionEnd);
      rippleRef.element.removeEventListener('transitioncancel', eventListeners.onTransitionCancel);
    }
    rippleRef.element.remove();
  }

  private _onMousedown(event: MouseEvent) {
    const isFakeMousedown = isFakeMousedownFromScreenReader(event);
    const isSyntheticEvent =
      this._lastTouchStartEvent && Date.now() < this._lastTouchStartEvent + ignoreMouseEventsTimeout;

    if (!this._target.rippleDisabled && !isFakeMousedown && !isSyntheticEvent) {
      this._isPointerDown = true;
      this.fadeInRipple(event.clientX, event.clientY, this._target.rippleConfig);
    }
  }

  private _onTouchStart(event: TouchEvent) {
    if (!this._target.rippleDisabled && !isFakeTouchstartFromScreenReader(event)) {
      this._lastTouchStartEvent = Date.now();
      this._isPointerDown = true;
      const touches = event.changedTouches as TouchList | undefined;
      if (touches) {
        for (let i = 0; i < touches.length; i++) {
          this.fadeInRipple(touches[i].clientX, touches[i].clientY, this._target.rippleConfig);
        }
      }
    }
  }

  private _onPointerUp() {
    if (!this._isPointerDown) {
      return;
    }
    this._isPointerDown = false;
    this._getActiveRipples().forEach(ripple => {
      const isVisible =
        ripple.state === LegacyRippleState.VISIBLE ||
        (ripple.config.terminateOnPointerUp && ripple.state === LegacyRippleState.FADING_IN);
      if (!ripple.config.persistent && isVisible) {
        ripple.fadeOut();
      }
    });
  }

  private _getActiveRipples(): LegacyRippleRef[] {
    return Array.from(this._activeRipples.keys());
  }

  _removeTriggerEvents() {
    const trigger = this._triggerElement;
    if (trigger) {
      pointerDownEvents.forEach(type =>
        LegacyRippleRenderer._eventManager.removeHandler(type, trigger, this),
      );
      if (this._pointerUpEventsRegistered) {
        pointerUpEvents.forEach(type =>
          trigger.removeEventListener(type, this, passiveCapturingEventOptions),
        );
      }
    }
  }
}

function distanceToFurthestCorner(x: number, y: number, rect: DOMRect) {
  const distX = Math.max(Math.abs(x - rect.left), Math.abs(x - rect.right));
  const distY = Math.max(Math.abs(y - rect.top), Math.abs(y - rect.bottom));
  return Math.sqrt(distX * distX + distY * distY);
}
