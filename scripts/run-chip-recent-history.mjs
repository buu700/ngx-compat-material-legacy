#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {runRecentHistory} from './chip-recent-history.mjs';
const args=process.argv.slice(2),id=args.shift();let reportPath;
if(args.length) {
  if(args.length!==2||args[0]!=='--report') {
    console.error('Usage: run-chip-recent-history.mjs <registered-stage> [--report <new-file>]');process.exit(2);
  }
  reportPath=args[1];
}
try {
  const r=await runRecentHistory({id,reportPath});
  console.error(`Historical chip source tests: ${r.line}/${id} at ${r.entry.frame.commit}; no current/runtime qualification.`);
  console.log(JSON.stringify({line:r.line,id,case_ids:r.receipt.passed,
    current_guard_passed_before_and_after:r.current_guard_passed_before_and_after,
    original_program_unchanged:r.original_program_unchanged,historical_post_execution_clean:r.historical_post_execution_clean,
    temporary_graph_removed:r.temporary_graph_removed,actual_current_source_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
} catch(error) {console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
