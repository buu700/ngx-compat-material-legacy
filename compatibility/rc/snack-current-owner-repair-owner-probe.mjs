/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Execute the complete public source owner once after the current-reader repair. */
import {writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {snackDomSourceContext} from '../../scripts/snack-dom-source-context.mjs';
const prefix='compatibility/rc/snack-current-owner-repair-',out=process.argv[2],start=performance.now();assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);Error.stackTraceLimit=30;
const report={schema_version:1,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{const result=snackDomSourceContext();Object.assign(report,{status:'pass',line:result.line,actual_full_source_owner_executed:true,projected_historical_members:result.members,packed_repair_epoch_members:result.packed_repair_epoch_members,current_successors:result.current_successors,native_test_before_image_exposed:result.native_test_before_image_exposed});assert.equal(result.native_test_before_image_exposed,false);}
catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,error:report.error}));
