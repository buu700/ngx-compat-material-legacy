/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic predicate controls only; never packed or Angular execution. */
export function nativeDatePackedSample() {
  return {
    constructor: {
      execution: 'packed-angular-testbed', error: null,
      phase: 'before-provider-configuration', outside_injection_context: true,
      direct: {
        owned_adapter: true, public_base: true, locale_format: '01/02/2024',
        small_year: [7, 1, 28], month_clamp: [2023, 1, 28], leap_year_clamp: [2025, 1, 28],
        first_weekday: 0, leap_month_days: 29, invalid_valid: false, deserialized_utc: [2024, 1, 29],
        clone: {distinct: true, same_time: true, source_unchanged: true},
      },
      subclass: {
        owned_adapter: true, consumer_subclass: true, public_base: true,
        locale_format: '02/01/2024', leap_date: [2024, 1, 29],
      },
    },
    provider: {
      execution: 'packed-angular-testbed', error: null, reset_count: 3, isolated_adapters_distinct: true,
      token_identity: {date_adapter: true, locale: true, formats: true, native_formats: true},
      scopes: [
        ['legacy-only', 'en-US', '01/02/2024', 'absent'],
        ['legacy-formats', 'en-GB', '02/01/2024', 'native'],
        ['formats-override', 'en-GB', '02/01/2024', 'custom'],
      ].map(([scope, requested_locale, formatted, formats]) => ({
        scope, requested_locale, formatted, formats,
        owned_adapter: true, public_base: true, singleton: true, distinct_from_manual: true,
        locale_reads: 1, platform_reads: 1, leap_date: [2024, 1, 29],
      })),
    },
  };
}
