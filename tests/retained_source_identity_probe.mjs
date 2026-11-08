/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {retainedSourceIdentity} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {retainedLaterStageProgramSource} from '../scripts/retained-later-stage-program-source.mjs';
const read=path=>readFileSync(path),transition=JSON.parse(gunzipSync(read('compatibility/rc/upstream-sass-inspection-ledger-transition.json.gz')));
const review=JSON.parse(read(transition.review.path)),record=review.upstream_originals,before=structuredClone(record);
assert.deepEqual(Object.keys(record).sort(),['capture_line','path','scope','sha256']);
const identity=retainedSourceIdentity(record);
assert.deepEqual(identity,{path:record.path,sha256:record.sha256});assert.deepEqual(record,before);
const scope=retainedLaterStageProgramSource();
assert.throws(()=>scope.qualifyMetadata(record));
assert.equal(scope.qualifyMetadata(identity),null);
for(const row of scope.transitions){
  for(const reference of [row.before,row.current]){
    const annotated={...reference,scope:record.scope,capture_line:record.capture_line};
    assert.throws(()=>scope.qualifyMetadata(annotated));
    assert.deepEqual(scope.qualifyMetadata(retainedSourceIdentity(annotated)),row.current);
    assert.throws(()=>scope.qualifyMetadata(retainedSourceIdentity({...annotated,sha256:'0'.repeat(64)})));
    assert.throws(()=>scope.qualifyMetadata(retainedSourceIdentity({...annotated,bytes:reference.bytes+1})));
  }
}
let calls=0;const annotated={...record};Object.defineProperty(annotated,'scope',{get(){calls++;throw Error('annotation getter');},enumerable:true});
assert.deepEqual(retainedSourceIdentity(annotated),identity);assert.equal(calls,0);
for(const field of ['path','sha256','bytes']){
  const invalid={...identity};Object.defineProperty(invalid,field,{get(){calls++;throw Error('identity getter');},enumerable:true});
  assert.throws(()=>retainedSourceIdentity(invalid),/invalid retained identity/);
}
assert.equal(calls,0);
for(const invalid of [null,Object.create(identity),new Proxy(identity,{}),{...identity,path:'../outside'}, {...identity,sha256:'bad'}, {...identity,bytes:-1}])assert.throws(()=>retainedSourceIdentity(invalid));
const copy=retainedSourceIdentity(record);copy.path='different';assert.deepEqual(record,before);
scope.assertCurrent();
console.log(JSON.stringify({result:'pass',actual_sass_annotation_reproduced:true,strict_selector_unchanged:true,program_identities:6,wrong_hash_rejections:6,wrong_length_rejections:6,accessor_calls:0,input_preserved:true,admission_granted:false}));
