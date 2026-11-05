/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two finite real button pairs; no complete C04 producer or admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createCurrentSassSource} from '../scripts/current-sass-source.mjs';
import {verifyButtonReferenceData,measureButtonContracts} from '../scripts/upstream-button-tokenization-source-review.mjs';
const root=process.argv[2],source=createCurrentSassSource({root}),hash=raw=>createHash('sha256').update(raw).digest('hex');assert.equal(source.line,'21.x');
const pinned=(path,sha256)=>{const raw=readFileSync(join(root,path));assert.equal(hash(raw),sha256);return JSON.parse(path.endsWith('.gz')?gunzipSync(raw):raw);};
const capsule=pinned('compatibility/rc/21x-c04-button-tokenization-tagged-sass-inputs.json.gz','90a3d95d32230a9ba838be4f5e7c9067452fe8f646f5c0db289f064b92f12481');
const identity=pinned('compatibility/rc/original16-sass-source-diagnostic-identity.json','324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe');
const original=pinned('compatibility/rc/21x-c04-button-tokenization-originals.json.gz','0c63465fed015d93af03cded959e871d448a0c555a6be19b5d88ff1ef8c1ba39');
const catalog=pinned('fixtures/sass/mixin-argument-contracts.json','c1d1151a8c1fa02cea0c6fac5618bbefe11dd018bbfff1d30f5c3f35f8fc8770');
const scope=pinned('compatibility/rc/upstream-sass-inspection-current-scope.json.gz','b0a8f0d0d2ce8cb41943a0585ccdcc25fd6bb0d30c9339f80501ef86c65726f4').actual;
const reference=verifyButtonReferenceData(capsule,identity,original),owned={},peers={};
const bound=new Map(source.bound.map(ref=>[ref.path,ref]));
for(const ref of source.bound){
 const prefix='projects/ngx-material-legacy/styles/';if(ref.path.startsWith(prefix)&&ref.path.endsWith('.scss')){
  const raw=readFileSync(join(root,ref.path));assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);owned['/owned/material/'+ref.path.slice(prefix.length)]=raw.toString();
 }
}
for(const ref of scope.current.loaded_sources){
 const name=ref.root===0?'material':'cdk',path='node_modules/@angular/'+name+'/'+ref.path,raw=readFileSync(join(root,path));
 assert.deepEqual({path,sha256:hash(raw),bytes:raw.length},bound.get(path));peers['/current/@angular/'+name+'/'+ref.path]=raw.toString();
}
const selected=['mixin-argument/button-theme/custom-full-theme','mixin-argument/legacy-button-theme/custom-dark-theme'].map(id=>{const row=catalog.cases.find(row=>row.case_id===id);assert.ok(row);return row;});
const result=measureButtonContracts({reference,owned,peers,catalog,selected});assert.equal(result.case_count,2);
assert.ok(result.cases.every(row=>row.complete_css_matches_finite_current_model===true));source.assertCurrent();
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify({line:source.line,compiler_calls:4,case_count:2,source_final_guard_passed:true,result},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:source.line,cases:result.cases.map(row=>({case_id:row.case_id,expected_sha256:row.expected.css_sha256,actual_sha256:row.actual.css_sha256,actual_bytes:row.actual.css_bytes})),compiler_calls:4,full14case_producer_or_artifact_qualified:false}));
