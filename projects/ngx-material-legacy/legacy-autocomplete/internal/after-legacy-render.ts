/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {afterNextRender, ApplicationRef, type AfterRenderRef, type Injector, type NgZone}
  from '@angular/core';
import {Observable} from 'rxjs';
import {take} from 'rxjs/operators';

/** Notify on zone stability or a stable completed render, whichever arrives first. */
export function afterLegacyRender(zone: NgZone, injector: Injector): Observable<void> {
  return new Observable<void>(subscriber => {
    const stable = zone.onStable.subscribe(() => subscriber.next());
    // The supplied view injector also preserves the historical manual constructor.
    // A manual injector without an application keeps the original zone-only path.
    let rendered: AfterRenderRef | null = null;
    try {
      if (injector.get(ApplicationRef, null)) {
        rendered = afterNextRender(() => {
          if (zone.isStable) {
            subscriber.next();
          }
        }, {injector});
      }
    } catch (error) {
      stable.unsubscribe();
      throw error;
    }

    return () => {
      stable.unsubscribe();
      rendered?.destroy();
    };
  }).pipe(take(1));
}
