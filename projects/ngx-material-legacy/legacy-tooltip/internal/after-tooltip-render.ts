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

/** Preserve the historical zone event and wait for a stable zoneless view to render. */
export function afterTooltipRender(zone: NgZone, injector: Injector): Observable<void> {
  return new Observable<void>(subscriber => {
    const empty = zone.onMicrotaskEmpty.subscribe(() => subscriber.next());
    // Manual construction without an application retains the original zone-only path.
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
      empty.unsubscribe();
      throw error;
    }

    return () => {
      empty.unsubscribe();
      rendered?.destroy();
    };
  }).pipe(take(1));
}
