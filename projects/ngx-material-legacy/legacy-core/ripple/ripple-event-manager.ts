/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgZone} from '@angular/core';

/**
 * Handles the event registration for ripples. Delegates events so each renderer
 * does not need its own capturing listeners on every trigger.
 */
export class LegacyRippleEventManager {
  private _events = new Map<string, Map<HTMLElement, Set<EventListenerObject>>>();

  addHandler(ngZone: NgZone, type: string, element: HTMLElement, handler: EventListenerObject) {
    const handlersForEvent = this._events.get(type) || new Map<HTMLElement, Set<EventListenerObject>>();
    const handlersOnElement = handlersForEvent.get(element) || new Set<EventListenerObject>();

    if (!this._events.has(type)) {
      this._events.set(type, handlersForEvent);
      ngZone.runOutsideAngular(() => {
        document.addEventListener(type, this, {capture: true, passive: true});
      });
    }

    if (!handlersForEvent.has(element)) {
      handlersForEvent.set(element, handlersOnElement);
    }

    handlersOnElement.add(handler);
  }

  removeHandler(type: string, element: HTMLElement, handler: EventListenerObject) {
    const handlersForEvent = this._events.get(type);
    const handlersOnElement = handlersForEvent?.get(element);

    if (!handlersOnElement) {
      return;
    }

    handlersOnElement.delete(handler);

    if (handlersOnElement.size === 0) {
      handlersForEvent!.delete(element);
    }

    if (handlersForEvent!.size === 0) {
      this._events.delete(type);
      document.removeEventListener(type, this, true);
    }
  }

  handleEvent(event: Event) {
    const targets = this._events.get(event.type);
    if (!targets) {
      return;
    }
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }
      const handlers = targets.get(node);
      if (handlers) {
        handlers.forEach(handler => handler.handleEvent(event));
      }
    }
  }
}
