/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ChangeDetectorRef} from '@angular/core';
import {DialogContainer} from '@angular/cdk/dialog';
import {Observable} from 'rxjs';

interface LegacyDialogTitleContainer {
  _ariaLabelledByQueue?: string[];
}

interface LegacyDialogContainerState {
  focusTrapped: Observable<void>;
  changeDetector: ChangeDetectorRef | null;
  destroyed: boolean;
}

const states = new WeakMap<LegacyDialogTitleContainer, LegacyDialogContainerState>();

export function registerLegacyDialogContainerState(
  container: DialogContainer & LegacyDialogTitleContainer,
  focusTrapped: Observable<void>,
  changeDetector: ChangeDetectorRef | null,
): void {
  // The public peer hook is optional. Keep its runtime bridge out of the frozen
  // legacy declaration surface, without private fields that narrow assignability.
  Object.defineProperty(container, '_focusTrapped', {value: focusTrapped});
  states.set(container, {focusTrapped, changeDetector, destroyed: false});
}

export function destroyLegacyDialogContainerState(container: LegacyDialogTitleContainer): void {
  const state = states.get(container);
  if (state) {
    state.destroyed = true;
    state.changeDetector = null;
  }
}

/** Internal access to the owned stream, without expanding the legacy class API. */
export function legacyDialogFocusNotifications(container: LegacyDialogTitleContainer): Observable<void> {
  const state = states.get(container);
  if (!state) {
    throw Error('Focus notifications require an owned legacy dialog container');
  }
  return state.focusTrapped;
}

export function addLegacyDialogTitle(container: LegacyDialogTitleContainer, id: string): void {
  const state = states.get(container);
  if (!state?.destroyed && container._ariaLabelledByQueue) {
    container._ariaLabelledByQueue.push(id);
    state?.changeDetector?.markForCheck();
  }
}

export function removeLegacyDialogTitle(container: LegacyDialogTitleContainer, id: string): void {
  const state = states.get(container);
  const queue = container._ariaLabelledByQueue;
  if (!state?.destroyed && queue) {
    const index = queue.indexOf(id);
    if (index > -1) {
      queue.splice(index, 1);
      state?.changeDetector?.markForCheck();
    }
  }
}
