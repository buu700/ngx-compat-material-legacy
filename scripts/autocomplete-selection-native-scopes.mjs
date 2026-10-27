/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite per-patch native requirements. Source diagnostics grant no run credit. */
export function autocompleteSelectionHistoricalScopes(commonMembers, nativeCase) {
  const members = [...commonMembers,
    'scripts/autocomplete-selection-native-scopes.mjs',
    'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
    'projects/ngx-material-legacy/legacy-autocomplete/autocomplete-trigger.ts',
    'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts',
    'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.html',
    'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.scss',
  ];
  const spec = 'legacy-autocomplete/autocomplete.spec.ts';
  return [
    ['d5d468a29a2db4c0676c57d60bc8431ed4fd6e18', {
      patch: '21cd67ad7117fab8354ea5be9c4deec2026586fa72fceb048ab894af1efdeb1d',
      kind: 'autocomplete-reactive-selection-reset', members: [...members],
      cases: [nativeCase(spec, 46,
        'MatAutocomplete > forms integration > should clear the text field if value is reset programmatically')],
    }],
    ['13629b0cd814ccc5fa01cf670b8b3001bc0021ff', {
      patch: '425bee27fa61de150f47945e20e09faa7d117b0e61578377edabe7832fd6dd07',
      kind: 'autocomplete-actual-attachment-selection-value', members: [...members],
      cases: [
        nativeCase(spec, 37, 'MatAutocomplete > forms integration > should retain the selected model while typing when selection is required'),
        nativeCase(spec, 38, 'MatAutocomplete > forms integration > should publish the chosen option once after required-selection typing'),
        nativeCase(spec, 39, 'MatAutocomplete > forms integration > should reset unmatched required-selection text once on outside click'),
        nativeCase(spec, 172, 'MatAutocomplete > should not throw errors when closing without options'),
      ],
    }],
    ['cf868a5089a4c9eaddd4a55fd18b952fb96d5c19', {
      patch: '3c5ce22fc1cc25cf290cbacd0b1a9a1ddde5eef5d0ce5b1c7183563df30432b3',
      kind: 'autocomplete-optional-typing-and-null-only-selection-reset', members: [...members],
      cases: [
        nativeCase(spec, 37, 'MatAutocomplete > forms integration > should retain the selected model while typing when selection is required'),
        nativeCase(spec, 39, 'MatAutocomplete > forms integration > should reset unmatched required-selection text once on outside click'),
        nativeCase(spec, 42, 'MatAutocomplete > forms integration > should update the control back to a string if user types after an option is selected'),
        nativeCase(spec, 46, 'MatAutocomplete > forms integration > should clear the text field if value is reset programmatically'),
      ],
    }],
  ];
}
