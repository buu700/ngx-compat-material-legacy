#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {runHistoricalSourceProbe} from './historical-source-replay.mjs';
import {resolve} from 'node:path';
const args=process.argv.slice(2),id=args.shift();let reportPath,originalReportPath;
while(args.length){
 const option=args.shift(),path=args.shift();
 if(!path||!['--report','--original-report'].includes(option)||option==='--report'&&reportPath||option==='--original-report'&&originalReportPath){console.error('Usage: run-historical-source-probe.mjs <registered-probe> [--report <new-file>] [--original-report <new-file>]');process.exit(2);}
 if(option==='--report')reportPath=path;else originalReportPath=path;
}
if(reportPath&&originalReportPath&&resolve(reportPath)===resolve(originalReportPath)){console.error('Replay and original report destinations must differ.');process.exit(2);}
try{
 const report=await runHistoricalSourceProbe({id,reportPath,originalReportPath});
 console.error(`Historical source replay: ${report.line}/${report.probe_id} at ${report.frame.commit}; current coherence checked; no current/runtime qualification.`);
 process.stdout.write(report.original_stdout);
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
