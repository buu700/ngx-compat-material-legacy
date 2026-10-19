#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {runPackedCollectorHistory} from './packed-collector-history.mjs';
const args=process.argv.slice(2);
if(args.length&&(args.length!==2||args[0]!=='--report'||!args[1])){console.error('Usage: run-packed-collector-history.mjs [--report <new-file>]');process.exit(2);}
try{
 const report=await runPackedCollectorHistory({reportPath:args[1]});console.error('Complete original collector/source cohort; no actual packed/native/floor qualification.');
 console.log(JSON.stringify({line:report.line,id:report.id,case_ids:report.receipt.passed,inputs_sha256:report.inputs_sha256,current_guard_passed_before_and_after:report.current_guard_passed_before_and_after,current_collector_writer_probe_and_contract_identity_count:report.current_collector_writer_probe_and_contract_identity_count,packed_check_unchanged:report.packed_check_unchanged,original_programs_unchanged:report.original_programs_unchanged,historical_post_execution_clean:report.historical_post_execution_clean,temporary_graph_removed:report.temporary_graph_removed,node_observations:report.receipt.node_observations.map(({probe,summary})=>({probe,summary})),actual_current_source_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
