/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned line-count helper (S25). MatLine / MatLineModule remain public upstream aliases.
 */

import {ElementRef, QueryList} from '@angular/core';
import {startWith} from 'rxjs/operators';

/**
 * Helper that takes a query list of lines and sets the correct class on the host.
 * Historical `setLines` behavior: clear stale 2/3/multi classes, then apply based on length.
 */
export function legacySetLines(
  lines: QueryList<unknown>,
  element: ElementRef<HTMLElement>,
  prefix = 'mat',
): void {
  // Note: doesn't need to unsubscribe, because `changes`
  // gets completed by Angular when the view is destroyed.
  lines.changes.pipe(startWith(lines)).subscribe(({length}: {length: number}) => {
    setClass(element, `${prefix}-2-line`, false);
    setClass(element, `${prefix}-3-line`, false);
    setClass(element, `${prefix}-multi-line`, false);

    if (length === 2 || length === 3) {
      setClass(element, `${prefix}-${length}-line`, true);
    } else if (length > 3) {
      setClass(element, `${prefix}-multi-line`, true);
    }
  });
}

/** Adds or removes a class from an element. */
function setClass(element: ElementRef<HTMLElement>, className: string, isAdd: boolean): void {
  element.nativeElement.classList.toggle(className, isAdd);
}
