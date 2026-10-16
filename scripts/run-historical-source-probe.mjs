#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {runHistoricalSourceProbe} from './historical-source-replay.mjs';
const args=process.argv.slice(2),id=args.shift();let reportPath;
if(args.length){if(args.length!==2||args[0]!=='--report'){console.error('Usage: run-historical-source-probe.mjs <registered-probe> [--report <new-file>]');process.exit(2);}reportPath=args[1];}
try{
 const report=await runHistoricalSourceProbe({id,reportPath});
 console.error(`Historical source replay: ${report.line}/${report.probe_id} at ${report.frame.commit}; current coherence checked; no current/runtime qualification.`);
 process.stdout.write(report.original_stdout);
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
