#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {runDialogCallerHistory} from './chip-recent-history.mjs';
const args = process.argv.slice(2), requested = []; let reportPath;
while (args.length) {
  const option = args.shift(), value = args.shift();
  if (!value || !['--module', '--report'].includes(option) || (option === '--report' && reportPath)) {
    console.error('Usage: run-dialog-caller-history.mjs [--module <registered-module>] [--report <new-file>]'); process.exit(2);
  }
  if (option === '--module') requested.push(value); else reportPath = value;
}
try {
  const result = await runDialogCallerHistory({requested, reportPath});
  console.log(JSON.stringify({line: result.line, id: result.id, case_ids: result.receipt.passed,
    selected_modules: result.selected_modules, complete_registered_module_set: result.complete_registered_module_set,
    current_guard_passed_before_and_after: result.current_guard_passed_before_and_after,
    original_program_unchanged: result.original_program_unchanged,
    historical_post_execution_clean: result.historical_post_execution_clean, temporary_graph_removed: result.temporary_graph_removed,
    actual_current_source_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'}));
} catch (error) {console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;}
