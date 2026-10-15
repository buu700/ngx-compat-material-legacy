/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const SNACK_MODAL_IDENTITY_PATH = 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts';
export const SNACK_MODAL_IDENTITY_BEFORE_SHA256 = '3e720f56482d083d89cf2307f6474866f67c115b31dcef6450aaa169155b551a';
export const SNACK_MODAL_IDENTITY_BEFORE = '`mat-snack-bar-container-live-${uniqueId++}-legacy`';
export const SNACK_MODAL_IDENTITY_AFTER = '`mat-legacy-snack-bar-container-live-${uniqueId++}`';

/** Recover the complete immutable suffix-only source, rejecting unrelated edits. */
export function reverseSnackModalIdentitySource(path, text) {
  assert.equal(path, SNACK_MODAL_IDENTITY_PATH);
  assert.equal(text.split(SNACK_MODAL_IDENTITY_AFTER).length, 2);
  assert.equal(text.includes(SNACK_MODAL_IDENTITY_BEFORE), false);
  const restored = text.replace(SNACK_MODAL_IDENTITY_AFTER, SNACK_MODAL_IDENTITY_BEFORE);
  assert.equal(createHash('sha256').update(restored).digest('hex'), SNACK_MODAL_IDENTITY_BEFORE_SHA256);
  return restored;
}

/** Existing individual pre-repair controls still replace the current exact literal. */
export function currentRemainingIdentityLiteral(path, previousAfter) {
  if (path !== SNACK_MODAL_IDENTITY_PATH) return previousAfter;
  assert.equal(previousAfter, SNACK_MODAL_IDENTITY_BEFORE);
  return SNACK_MODAL_IDENTITY_AFTER;
}
