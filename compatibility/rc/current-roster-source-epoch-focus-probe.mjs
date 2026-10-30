/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Real next focus-metadata owner composed with the roster epoch; no broad source traversal. */
import assert from 'node:assert/strict';
import {writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {currentAuthoredRosterSourceSubject} from '../../scripts/current-authored-roster-source.mjs';
import {packedUpstreamFocusMetadataEpoch} from '../../scripts/packed-upstream-source-requalification.mjs';
const prefix='compatibility/rc/current-roster-source-epoch-',out=process.argv[2],start=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);
const report={schema_version:1,full_snack_owner_or_shipped_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{const roster=currentAuthoredRosterSourceSubject(),focus=packedUpstreamFocusMetadataEpoch({read:roster.metadataRead}),frozen=roster.before[0].path;focus.assertCurrent();assert.equal(focus.line,roster.line);const previous=JSON.parse(focus.read(frozen)),raw=JSON.parse(roster.raw(roster.after[1].path));assert.equal(previous.symbol_uses.length,1736);assert.equal(raw.symbol_uses.length,317);assert.equal(hash(roster.raw(frozen)),roster.after[0].sha256);assert.equal(hash(roster.metadataRead(frozen)),roster.before[0].sha256);roster.assertCurrent();Object.assign(report,{status:'pass',line:roster.line,real_focus_owner_composed:true,current_additional_obligations:317,historical_focus_frozen_obligations:1736,projected_focus_metadata_paths:focus.projected_metadata_paths,source_judgments_changed:focus.source_judgments_changed,current_raw_rosters_preserved:true});}
catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,error:report.error}));
