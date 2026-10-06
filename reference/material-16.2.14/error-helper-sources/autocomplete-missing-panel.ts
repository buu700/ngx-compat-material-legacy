/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Creates an error to be thrown when attempting to use an autocomplete trigger without a panel.
 * @docs-private
 */
export function getMatAutocompleteMissingPanelError(): Error {
  return Error(
    'Attempting to open an undefined instance of `mat-autocomplete`. ' +
      'Make sure that the id passed to the `matAutocomplete` is correct and that ' +
      "you're attempting to open it after the ngAfterContentInit hook.",
  );
}
