/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independent untouched tagged16 constructors; no current owned implementation is loaded. */
import assert from 'node:assert/strict';
await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core');
if (process.argv[2] === 'production') core.enableProdMode();
const {documentProtocol} = await import('./a11y-node-protocol.mjs');
const {configurationConstructorCases} = await import('./constructor-cases.mjs');
const port = documentProtocol(core);
globalThis.document = port.document;
globalThis.window = port.window;
globalThis.getComputedStyle = port.window.getComputedStyle;
const {MatLegacyPaginator} = await import('@angular/material/legacy-paginator');
const {MatLegacySnackBarConfig} = await import('@angular/material/legacy-snack-bar');
const {MatLegacyProgressBar} = await import('@angular/material/legacy-progress-bar');
const {MatLegacyProgressSpinner} = await import('@angular/material/legacy-progress-spinner');
const {MatPaginatorIntl} = await import('@angular/material/paginator');
for (const type of [MatLegacyPaginator, MatLegacySnackBarConfig, MatLegacyProgressBar, MatLegacyProgressSpinner]) {
  assert.equal(typeof type, 'function');
}
const result = configurationConstructorCases({core, port, classes: {Paginator: MatLegacyPaginator,
  SnackConfig: MatLegacySnackBarConfig, ProgressBar: MatLegacyProgressBar, ProgressSpinner: MatLegacyProgressSpinner},
  PaginatorIntl: MatPaginatorIntl});
console.log(JSON.stringify({line: 'original', mode: process.argv[2], ...result,
  untouched_tagged_constructors: true, current_owned_source_loaded: false,
  generated_Angular_factory_template_or_query_execution: false,
  actual_native_packed_AOT_or_full_floor_qualified: false}));
