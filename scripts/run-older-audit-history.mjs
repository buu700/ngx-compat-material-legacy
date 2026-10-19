#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {runOlderAuditHistory} from './chip-recent-history.mjs';
const args=process.argv.slice(2),requested=[];let reportPath;
while(args.length) {
  const option=args.shift(),value=args.shift();
  if(!value||!['--module','--report'].includes(option)||(option==='--report'&&reportPath)) {
    console.error('Usage: run-older-audit-history.mjs [--module <registered-module>] [--report <new-file>]');process.exit(2);
  }
  if(option==='--module')requested.push(value);else reportPath=value;
}
try {
  const r=await runOlderAuditHistory({requested,reportPath});
  console.error(`Historical audit source models: ${r.line}/${r.entry.frame.commit}; complete cohort: ${r.complete_registered_module_set}; no current/runtime qualification.`);
  console.log(JSON.stringify({line:r.line,id:r.id,case_ids:r.receipt.passed,
    selected_modules:r.selected_modules,complete_registered_module_set:r.complete_registered_module_set,
    current_guard_passed_before_and_after:r.current_guard_passed_before_and_after,
    original_program_unchanged:r.original_program_unchanged,historical_post_execution_clean:r.historical_post_execution_clean,
    temporary_graph_removed:r.temporary_graph_removed,actual_current_source_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
} catch(error) {console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
