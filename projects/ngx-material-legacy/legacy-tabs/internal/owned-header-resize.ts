/**
 * Owned resize stream for the paginated tab header.
 * Replaces `@angular/cdk/observers/private` SharedResizeObserver at this call site.
 */
import {NgZone} from '@angular/core';
import {EMPTY, Observable, Observer} from 'rxjs';

export function ownedHeaderResize(
  element: Element,
  ngZone: NgZone,
): Observable<ResizeObserverEntry[]> {
  if (typeof ResizeObserver !== 'function') {
    return EMPTY;
  }
  return new Observable((observer: Observer<ResizeObserverEntry[]>) =>
    ngZone.runOutsideAngular(() => {
      const resizeObserver = new ResizeObserver(entries => observer.next(entries));
      resizeObserver.observe(element);
      return () => resizeObserver.disconnect();
    }),
  );
}
