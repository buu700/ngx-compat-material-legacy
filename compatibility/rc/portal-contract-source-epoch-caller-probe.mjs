/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Execute the complete public dialog-delta qualification at the last owner boundary. */
import assert from 'node:assert/strict';
import {writeFileSync,existsSync} from 'node:fs';
import {qualifyIndependentDialogProductDelta} from '../../scripts/snack-dom-source-context.mjs';
const out=process.argv[2],prefix='compatibility/rc/portal-contract-source-epoch-',start=performance.now();assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);Error.stackTraceLimit=30;
const report={schema_version:1,full_snack_owner_or_canonical_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{const q=qualifyIndependentDialogProductDelta();assert.equal(q.contract_source_successors.length,4);Object.assign(report,{status:'pass',line:q.line,actual_dialog_delta_qualifier_passed:true,delta:q.delta,qualification:q.qualification,current_contract_source_references:q.contract_source_successors});}
catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,error:report.error}));
