/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Execute the public menu qualifier at the exact last composed-owner rejection. */
import assert from 'node:assert/strict';
import {writeFileSync,existsSync} from 'node:fs';
import {qualifyIndependentMenuContentTypeDelta} from '../../scripts/snack-dom-source-context.mjs';
const out=process.argv[2],prefix='compatibility/rc/snack-current-owner-repair-',start=performance.now();assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);Error.stackTraceLimit=30;
const report={schema_version:1,full_source_owner_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{const q=qualifyIndependentMenuContentTypeDelta();Object.assign(report,{status:'pass',line:q.line,actual_menu_qualification_composed:true,delta:q.delta,qualification:q.qualification,original_overlay_bridge_affected_sources:q.bridge.affected_current_sources.length,original_overlay_source_files:q.bridge.current_overlay_source_files});}
catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,error:report.error}));
