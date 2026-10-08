/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {DOCUMENT, Inject, Injectable, NgZone, Optional} from '@angular/core';
import type {OnDestroy} from '@angular/core';
import {Platform} from '@angular/cdk/platform';
import {Observable, Subject} from 'rxjs';
import {auditTime} from 'rxjs/operators';

interface ViewportState {
  platform: Platform;
  document: Document;
  size: {width: number; height: number} | null;
  changes: Subject<Event>;
  listener: (event: Event) => void;
}

// Keep the instance structurally compatible with supplied historical rulers.
// Root-owned state and listeners belong to this helper, never its callers.
const states = new WeakMap<_LegacyViewport, ViewportState>();
const stateOf = (viewport: _LegacyViewport) => states.get(viewport)!;
const windowOf = (state: ViewportState): Window => state.document.defaultView || window;

/**
 * Owned viewport primitives for historical legacy controls. Shared through the
 * legacy-core entry so each application has one event/cache owner across families.
 * @docs-private
 */
@Injectable({providedIn: 'root'})
export class _LegacyViewport implements OnDestroy {
  constructor(platform: Platform, zone: NgZone, @Optional() @Inject(DOCUMENT) document: any) {
    const changes = new Subject<Event>();
    const state: ViewportState = {platform, document, size: null, changes,
      listener: event => changes.next(event)};
    states.set(this, state);
    zone.runOutsideAngular(() => {
      if (platform.isBrowser) {
        const target = windowOf(state);
        target.addEventListener('resize', state.listener);
        target.addEventListener('orientationchange', state.listener);
      }
      // Historical invalidation is audited at 20ms, before later change observers.
      this.change().subscribe(() => state.size = null);
    });
  }

  ngOnDestroy(): void {
    const state = stateOf(this);
    if (state.platform.isBrowser) {
      const target = windowOf(state);
      target.removeEventListener('resize', state.listener);
      target.removeEventListener('orientationchange', state.listener);
    }
    state.changes.complete();
  }

  getViewportSize(): Readonly<{width: number; height: number}> {
    const state = stateOf(this);
    if (!state.size) {
      const target = windowOf(state);
      state.size = state.platform.isBrowser
        ? {width: target.innerWidth, height: target.innerHeight} : {width: 0, height: 0};
    }
    const result = {...state.size};
    if (!state.platform.isBrowser) state.size = null;
    return result;
  }

  getViewportScrollPosition(): {top: number; left: number} {
    const state = stateOf(this);
    if (!state.platform.isBrowser) return {top: 0, left: 0};
    const document = state.document, target = windowOf(state), element = document.documentElement;
    const rect = element.getBoundingClientRect();
    return {
      top: -rect.top || document.body.scrollTop || target.scrollY || element.scrollTop || 0,
      left: -rect.left || document.body.scrollLeft || target.scrollX || element.scrollLeft || 0,
    };
  }

  getViewportRect(): {top: number; left: number; bottom: number; right: number; height: number; width: number} {
    const {top, left} = this.getViewportScrollPosition();
    const {width, height} = this.getViewportSize();
    return {top, left, bottom: top + height, right: left + width, height, width};
  }

  change(throttleTime: number = 20): Observable<Event> {
    const changes = stateOf(this).changes;
    return throttleTime > 0 ? changes.pipe(auditTime(throttleTime)) : changes;
  }
}
