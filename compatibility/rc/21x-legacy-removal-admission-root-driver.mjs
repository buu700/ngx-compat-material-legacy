/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
// Bounded reversible registry experiment. Never applies the canonical ledger.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
const root=process.cwd(),prefix='compatibility/rc/21x-legacy-removal-admission-',hash=raw=>createHash('sha256').update(raw).digest('hex');
const packet=JSON.parse(fs.readFileSync(root+'/'+prefix+'canonical-proposal.json'));
const registry=root+'/'+packet.registry_before.path,ledger=root+'/'+packet.before.path,before=fs.readFileSync(registry),ledgerBefore=fs.readFileSync(ledger),after=gunzipSync(fs.readFileSync(root+'/'+prefix+'registry-after.mjs.gz'));
assert.equal(hash(before),packet.registry_before.sha256);assert.equal(hash(after),packet.registry_after.sha256);assert.equal(hash(ledgerBefore),packet.before.sha256);
let child;
try{
 fs.writeFileSync(registry,after);
 child=spawnSync(process.execPath,['tests/legacy_removal_admission_probe.mjs',prefix+'root-controls.json','root'],{cwd:root,env:process.env,encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024});
 process.stdout.write(child.stdout??'');process.stderr.write(child.stderr??'');
}finally{
 assert.ok(fs.readFileSync(registry).equals(after),'registry changed outside the exact experiment;refusing to overwrite');
 fs.writeFileSync(registry,before);
 assert.ok(fs.readFileSync(registry).equals(before));assert.ok(fs.readFileSync(ledger).equals(ledgerBefore));
}
assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(child.status,0,'root dispatch experiment failed');
const report={schema_version:1,result:'pass',registry_before_sha256:hash(before),tested_registry_after_sha256:hash(after),registry_restored_sha256:hash(fs.readFileSync(registry)),canonical_ledger_unchanged:true,full_owner_integration_qualified:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
fs.writeFileSync(root+'/'+prefix+'root-experiment.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
