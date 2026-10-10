/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {afterEveryRender, ApplicationRef, type AfterRenderRef, type Injector, type NgZone}
  from '@angular/core';
import {Observable} from 'rxjs';

/** Keep continuous zoneful stability checks and allow stable zoneless views to render. */
export function afterFormFieldRender(zone: NgZone, injector?: Injector | null): Observable<void> {
  return new Observable<void>(subscriber => {
    const stable = zone.onStable.subscribe(() => subscriber.next());
    // A manually constructed field without an application retains its original zone path.
    let rendered: AfterRenderRef | null = null;
    try {
      if (injector?.get(ApplicationRef, null)) {
        rendered = afterEveryRender(() => {
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
  });
}
