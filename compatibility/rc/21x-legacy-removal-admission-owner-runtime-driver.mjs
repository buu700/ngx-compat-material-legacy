/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
// Apply only the exact qualified proposal, then test the actual composite owner.
// A failed child restores only this driver's exact ledger/registry writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
const root=process.cwd(),prefix='compatibility/rc/21x-legacy-removal-admission-',hash=raw=>createHash('sha256').update(raw).digest('hex');
const packet=JSON.parse(fs.readFileSync(root+'/'+prefix+'canonical-proposal.json'));
const ledger=root+'/'+packet.before.path,registry=root+'/'+packet.registry_before.path,before=fs.readFileSync(ledger),registryBefore=fs.readFileSync(registry),after=gunzipSync(fs.readFileSync(root+'/'+prefix+'ledger-after.json.gz')),registryAfter=gunzipSync(fs.readFileSync(root+'/'+prefix+'registry-after.mjs.gz'));
assert.equal(hash(before),packet.before.sha256);assert.equal(hash(registryBefore),packet.registry_before.sha256);assert.equal(hash(after),packet.after.sha256);assert.equal(hash(registryAfter),packet.registry_after.sha256);
const stamp=process.argv[2];assert.ok(/^[a-z0-9-]+$/.test(stamp));const report=prefix+'owner-runtime-'+stamp+'.json',log=prefix+'owner-runtime-'+stamp+'.txt',receipt=prefix+'owner-runtime-'+stamp+'-execution.json';
const fd=fs.openSync(root+'/'+log,'wx'),start=performance.now();let child,restored=false;
try{
 fs.writeFileSync(registry,registryAfter);fs.writeFileSync(ledger,after);
 child=spawnSync(process.execPath,['tests/browser_reference_owner_probe.mjs','--runtime',report],{cwd:root,env:process.env,stdio:['ignore',fd,fd],timeout:1800000});
}finally{
 fs.closeSync(fd);
 if(!child||child.error||child.signal||child.status!==0){
  assert.ok(fs.readFileSync(ledger).equals(after),'ledger changed outside this exact write;refusing to overwrite');assert.ok(fs.readFileSync(registry).equals(registryAfter),'registry changed outside this exact write;refusing to overwrite');
  fs.writeFileSync(ledger,before);fs.writeFileSync(registry,registryBefore);restored=true;
 }
}
const passed=Boolean(child&&!child.error&&!child.signal&&child.status===0),result={schema_version:1,result:passed?'pass':'fail',elapsed_seconds:Number(((performance.now()-start)/1000).toFixed(3)),child_exit:child?.status??null,child_signal:child?.signal??null,child_error:child?.error?.message??null,owner_report:report,output_log:log,canonical_ledger_applied:passed,registry_applied:passed,failed_exact_writes_restored:restored,current_ledger_sha256:hash(fs.readFileSync(ledger)),current_registry_sha256:hash(fs.readFileSync(registry)),actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
fs.writeFileSync(root+'/'+receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));if(!passed)process.exit(1);
