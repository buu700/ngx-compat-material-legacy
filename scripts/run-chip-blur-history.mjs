#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {runChipBlurHistory} from './chip-recent-history.mjs';
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--report' || !args[1])) {
  console.error('Usage: run-chip-blur-history.mjs [--report <new-file>]'); process.exit(2);
}
try {
  const report = await runChipBlurHistory({reportPath: args[1]});
  console.error(`Original chip-blur source assertions: ${report.line}/${report.entry.frame.commit}; no current/runtime qualification.`);
  console.log(JSON.stringify({line: report.line, id: report.id, case_ids: report.receipt.passed,
    inputs_sha256: report.inputs_sha256, selected_modules: report.selected_modules,
    current_guard_passed_before_and_after: report.current_guard_passed_before_and_after,
    original_program_unchanged: report.original_program_unchanged,
    historical_post_execution_clean: report.historical_post_execution_clean,
    temporary_graph_removed: report.temporary_graph_removed,
    actual_current_source_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'}));
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
