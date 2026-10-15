/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const TABLE_ONPUSH_CASE_ID = 'packed-consumer/harness/table-no-data-row-on-push-rendering';

/** Actual Angular observations are required. A producer's summary boolean is insufficient. */
export function packedTableOnPushCase(observed) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const stages = ['initial', 'empty', 'restored', 'empty-again', 'repeated-empty'];
  const empty = ['empty', 'empty-again', 'repeated-empty'];
  const rows = observed?.transitions;
  const okay = observed?.execution === 'packed-angular-testbed-dom'
    && observed.error === null
    && observed.parent_detection_only === true
    && observed.identities?.owned_table === true
    && observed.identities?.public_table_provider === true
    && observed.identities?.owned_no_data === true
    && observed.identities?.public_no_data_provider === true
    && observed.identities?.child_on_push === true
    && Array.isArray(rows) && rows.length === stages.length
    && rows.every((row, index) => row?.stage === stages[index]
      && row.stable_source === true
      && (empty.includes(row.stage)
        ? row.data_rows === 0 && row.no_data_rows === 1
          && row.row_class === 'mat-no-data-row' && row.row_role === 'row'
          && row.cell_class === null && row.colspan === '3'
          && row.cell_text === 'Empty rows: 3'
        : row.data_rows === 1 && row.no_data_rows === 0
          && same(row.data_cells, row.stage === 'initial' ? ['A1', 'B1', 'C1'] : ['A2', 'B2', 'C2'])))
    && observed.destroy?.fixture_destroyed === true
    && observed.destroy?.source_rows_after === 1
    && typeof observed.destroy?.retained_before === 'string'
    && observed.destroy.retained_after === observed.destroy.retained_before;
  return {case_id: TABLE_ONPUSH_CASE_ID, result: okay ? 'pass' : 'fail',
    observation: observed ?? null,
    failure: okay ? null : 'Missing or failed actual packed Angular OnPush no-data-row observations'};
}
