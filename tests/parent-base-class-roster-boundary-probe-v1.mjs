/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Existing roster/physical resolver primitives only; no terminal helper or predecessor owner. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {currentAuthoredRosterSourceSubject,currentAuthoredRosterRawRead} from '../scripts/current-authored-roster-source.mjs';
import {canonicalSourcePhysicalBoundary} from '../scripts/current-sass-canonical-source-boundary.mjs';
import {packedUpstreamLedgerCurrentSourceLane} from '../scripts/packed-upstream-ledger-epoch.mjs';
const root=process.cwd(),out=process.argv[2];
assert.match(out||'',/^compatibility\/rc\/parent-base-class-roster-boundary-controls-v[0-9]+\.json$/);
const read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const refs=['scripts/packed-upstream-ledger-epoch.mjs','scripts/current-authored-roster-source.mjs','scripts/current-sass-canonical-source-boundary.mjs','compatibility/rc/current-roster-source-epoch-inputs.json'];
const before=refs.map(path=>({path,sha256:hash(read(path)),bytes:read(path).length})),start=performance.now(),checks=[];
assert.equal(currentAuthoredRosterRawRead({root,read}),read);checks.push('arbitrary-current-callback-retains-identity');
const roster=currentAuthoredRosterSourceSubject({root,read});
assert.equal(currentAuthoredRosterRawRead({root,read:roster.metadataRead}),read);checks.push('genuine-local-roster-brand-unwraps-to-exact-original-callback');
assert.throws(()=>currentAuthoredRosterRawRead({root:resolve(root,'..'),read:roster.metadataRead}));checks.push('genuine-roster-brand-rejects-foreign-root');
const paths=['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json'];
assert.deepEqual(roster.historical_metadata_paths,paths);
const physical=canonicalSourcePhysicalBoundary({root,read:currentAuthoredRosterRawRead({root,read:roster.metadataRead})});
const metadata=[];
for(let i=0;i<paths.length;i++){
 const path=paths[i],raw=read(path),prior=roster.metadataRead(path);
 assert.equal(hash(raw),roster.after[i].sha256);assert.equal(raw.length,roster.after[i].bytes);
 assert.equal(hash(prior),roster.before[i].sha256);assert.equal(prior.length,roster.before[i].bytes);assert.equal(raw.equals(prior),false);
 assert.ok(physical.read(path).equals(raw));checks.push('unwrapped-physical-boundary-reads-current-roster:'+path);
 assert.throws(()=>canonicalSourcePhysicalBoundary({root,read:roster.metadataRead}).read(path),/nonphysical canonical input/);
 checks.push('strict-physical-boundary-rejects-historical-roster-callback:'+path);
 metadata.push({path,current_sha256:hash(raw),current_bytes:raw.length,historical_sha256:hash(prior),historical_bytes:prior.length});
}
const tool='scripts/base-class-removal-owner-source.mjs';assert.ok(roster.metadataRead(tool).equals(read(tool)));assert.ok(physical.read(tool).equals(read(tool)));checks.push('roster-metadata-reader-keeps-program-bytes-current');
const spoof=path=>paths.includes(path)?roster.metadataRead(path):read(path);
Object.assign(spoof,{raw:read,metadataRead:roster.metadataRead,root});
assert.equal(currentAuthoredRosterRawRead({root,read:spoof}),spoof);checks.push('shape-spoof-callback-cannot-acquire-roster-brand');
for(const path of paths){assert.throws(()=>canonicalSourcePhysicalBoundary({root,read:spoof}).read(path),/nonphysical canonical input/);}checks.push('shape-spoof-callback-fails-both-physical-roster-comparisons');
for(const callback of [roster.metadataRead,spoof]){const lane=packedUpstreamLedgerCurrentSourceLane({root,read:callback});assert.equal(lane.registered_frames,0);assert.equal(lane.read,callback);lane.assertCurrent();}
checks.push('public-source-resolver-does-not-grant-roster-or-spoof-a-ledger-metadata-role');
physical.assertPhysical();roster.assertCurrent();physical.assertPhysical();checks.push('fresh-roster-and-callback-free-physical-final-guards-pass');
for(const ref of before){assert.equal(hash(read(ref.path)),ref.sha256);assert.equal(read(ref.path).length,ref.bytes);}
checks.push('source-inputs-stable-throughout-readonly-check');
const report={schema_version:1,status:'existing-genuine-roster-and-physical-resolver-controls-pass',node:process.version,checks_passed:checks.length,checks,seconds:(performance.now()-start)/1000,source_inputs:before,roster_metadata:metadata,roster_bound:roster.bound.length,terminal_private_helper_executed:false,full_predecessor_or_resulting_owner_executed:false,compiler_build_archive_network_executed:false,source_mutations:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(join(root,out),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,out}));
