/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {afterNextRender, ApplicationRef, assertInInjectionContext, inject, Injector,
  type AfterRenderRef, type NgZone} from '@angular/core';
import {Observable} from 'rxjs';
import {take} from 'rxjs/operators';

/** Capture the public view injector while preserving construction outside Angular DI. */
export function tabHeaderRenderInjector(): Injector | null {
  try {
    assertInInjectionContext(tabHeaderRenderInjector);
  } catch {
    return null;
  }
  return inject(Injector);
}

/** Preserve the original stability event and allow a stable zoneless header to render. */
export function afterTabHeaderRender(zone: NgZone, injector: Injector | null): Observable<void> {
  return new Observable<void>(subscriber => {
    const stable = zone.onStable.subscribe(() => subscriber.next());
    let rendered: AfterRenderRef | null = null;
    try {
      if (injector?.get(ApplicationRef, null)) {
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
