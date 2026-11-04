/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual next CVA owner after restoring canonical peer aliases. */
import assert from 'node:assert/strict';
import {writeFileSync,existsSync} from 'node:fs';
import {currentAuthoredRosterSourceSubject} from '../../scripts/current-authored-roster-source.mjs';
import {packedUpstreamFocusMetadataEpoch} from '../../scripts/packed-upstream-source-requalification.mjs';
import {preparePackedCvaSourceRequalification} from '../../scripts/packed-cva-source-requalification.mjs';
const out=process.argv[2],prefix='compatibility/rc/compiler-peer-reader-repair-',start=performance.now();assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);Error.stackTraceLimit=30;
const report={schema_version:1,full_owner_or_shipped_current_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{const roster=currentAuthoredRosterSourceSubject(),focus=packedUpstreamFocusMetadataEpoch({read:roster.metadataRead}),cva=preparePackedCvaSourceRequalification({read:focus.read,historicalTitleMetadata:true});cva.assertCurrentNativeSpec();focus.assertCurrent();roster.assertCurrent();Object.assign(report,{status:'pass',line:roster.line,real_CVA_owner_composed:true,roles:cva.roles,historical_admission:cva.admission,reconstruction_context:cva.reconstruction_context,current_additional_obligations:317,generated_historical_writes:cva.writes.size});}
catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,error:report.error}));
