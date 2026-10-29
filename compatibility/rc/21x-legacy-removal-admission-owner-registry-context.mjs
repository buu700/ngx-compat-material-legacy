/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
// Focus the actual old source metadata stage before another whole-owner run.
import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import {legacyRemovalOwnerContext} from '../../scripts/legacy-removal-canonical-stage.mjs';
import {inventoryReferenceOwnerContext} from '../../scripts/inventory-reference-owner.mjs';
const root=process.cwd(),prefix='compatibility/rc/21x-legacy-removal-admission-',read=path=>fs.readFileSync(root+'/'+path),hash=raw=>createHash('sha256').update(raw).digest('hex');
const packet=JSON.parse(read(prefix+'canonical-proposal.json')),before=read(packet.before.path),registryBefore=read(packet.registry_before.path),after=gunzipSync(read(prefix+'ledger-after.json.gz')),registryAfter=gunzipSync(read(prefix+'registry-after.mjs.gz'));
assert.equal(hash(before),packet.before.sha256);assert.equal(hash(registryBefore),packet.registry_before.sha256);
let result;
try{
 fs.writeFileSync(root+'/'+packet.registry_before.path,registryAfter);fs.writeFileSync(root+'/'+packet.before.path,after);
 const legacy=legacyRemovalOwnerContext({root,read}),context=inventoryReferenceOwnerContext({root,read:legacy.metadataRead});
 assert.ok(legacy.metadataRead(packet.registry_before.path).equals(registryAfter));assert.ok(context.metadataRead(packet.registry_before.path).equals(registryAfter));
 assert.ok(context.browser.applied);context.assertCurrent();legacy.assertCurrent();result={schema_version:1,result:'pass',physical_current_registry_used_for_fresh_sources:true,current_registry_reaches_base_metadata_reader:true,previous_browser_stage_verified:true,full_owner_executed:false,g11_claim:'not-passed'};
}finally{assert.ok(read(packet.before.path).equals(after));assert.ok(read(packet.registry_before.path).equals(registryAfter));fs.writeFileSync(root+'/'+packet.before.path,before);fs.writeFileSync(root+'/'+packet.registry_before.path,registryBefore);}
if(process.argv[2])fs.writeFileSync(root+'/'+process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
