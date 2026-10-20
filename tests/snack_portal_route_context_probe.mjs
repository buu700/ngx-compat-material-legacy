/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {routeCurrentTaskContext,routeCurrentTaskReader,routePreviousTaskContext,routePreviousTaskReader,priorSnackProbeProgram} from '../scripts/snack-portal-route-context.mjs';
import {routePrior} from '../scripts/snack-portal-route-recovery.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),c=routePreviousTaskContext({root}),prior=routePrior(root),source=prior.members[0],program=prior.members.find(m=>m.path==='tests/snack_dom_public_dispatch_probe.mjs');
assert.equal(hash(c.read(source.path)),source.sha256);assert.equal(hash(c.raw(source.path)),c.current_source_sha256);assert.equal(c.historical_product_members,2);const current=read(program.path).toString();assert.equal(current,priorSnackProbeProgram(program.text));assert.deepEqual(current.match(/\bassert\.[A-Za-z]+/g),program.text.match(/\bassert\.[A-Za-z]+/g));
const currentContext=routeCurrentTaskContext({root});assert.equal(currentContext.historical_product_members,1);assert.equal(hash(currentContext.read(source.path)),c.current_source_sha256);assert.equal(hash(currentContext.raw(source.path)),c.current_source_sha256);
const suffix=prior.line==='main'?'main':'21',paths=[source.path,program.path,'scripts/snack-portal-route-recovery.mjs','compatibility/rc/snack-portal-route-recovery-public-'+suffix+'.json','compatibility/rc/snack-portal-route-recovery-prior.json.gz','compatibility/rc/snack-dom-public-dispatch-prior.json.gz','projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.scss','projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts','compatibility/rc/dialog-portal-failure-recovery-public-'+suffix+'.json','compatibility/rc/dialog-portal-failure-recovery-prior.json.gz'];
for(const path of paths){const changed=Buffer.concat([read(path),Buffer.from('\n')]);if(path!==program.path)assert.throws(()=>routeCurrentTaskContext({root,read:p=>p===path?changed:read(p)}),e=>e?.code==='ERR_ASSERTION',path);assert.throws(()=>routePreviousTaskContext({root,read:p=>p===path?changed:read(p)}),e=>e?.code==='ERR_ASSERTION',path);}
const currentProgram='tests/snack_portal_route_recovery_probe.mjs',badProgram=Buffer.concat([read(currentProgram),Buffer.from('\n')]);assert.throws(()=>routeCurrentTaskContext({root,read:p=>p===currentProgram?badProgram:read(p)}),e=>e?.code==='ERR_ASSERTION');
let changed=false;const late=p=>changed&&p===source.path?Buffer.concat([read(p),Buffer.from('\n')]):read(p),early=routePreviousTaskReader({root,read:late});changed=true;assert.throws(()=>routePreviousTaskReader({root,read:early}),e=>e?.code==='ERR_ASSERTION');
changed=false;const earlyCurrent=routeCurrentTaskReader({root,read:late});changed=true;assert.throws(()=>routeCurrentTaskReader({root,read:earlyCurrent}),e=>e?.code==='ERR_ASSERTION');
const report={schema_version:1,line:prior.line,qualified_current_cases:115,qualified_current_faults:40,historical_product_members:2,original105_program_assertions_and_entire_unselected_bytes_preserved:true,original115_program_assertions_and_entire_unselected_bytes_preserved:true,raw_current_fingerprints_preserved:true,corruptions_rejected:paths.length,late_mutation_rejected:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
