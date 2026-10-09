/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite authored public-helper boundary; no component or full floor audit claim. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {reviewPureCoercionUses,coercionBehavior} from '../scripts/coercion-pure-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p),'utf8'),subjects=JSON.parse(read('compatibility/rc/coercion-public-subjects.json'));
const report=await reviewPureCoercionUses({root});assert.equal(report.uses,111);assert.equal(report.files,103);assert.equal(report.source_override_used,false);assert.equal(report.runtime_override_used,false);
const original=await import(pathToFileURL(join(subjects.subjects.find(s=>s.line==='original').runtime_root,'fesm2022/coercion.mjs'))),mutations=[];
for(const [id,changes]of [
 ['boolean-truthiness',{coerceBooleanProperty: v=>Boolean(v)}],
 ['boolean-loose-false',{coerceBooleanProperty: v=>v!=null&&v!='false'}],
 ['boolean-wrong-hint',{coerceBooleanProperty: v=>v!=null&&String(v)!=='false'}],
 ['number-convert-without-validating',{coerceNumberProperty:(v,f=0)=>isNaN(Number(v))?f:Number(v)}],
 ['number-parsefloat-only',{coerceNumberProperty:(v,f=0)=>isNaN(parseFloat(v))?f:parseFloat(v)}],
 ['number-undefined-fallback',{coerceNumberProperty:(v,f)=>original._isNumberValue(v)?Number(v):f}],
 ['number-loses-negative-zero',{coerceNumberProperty:(v,f=0)=>original._isNumberValue(v)?Math.abs(Number(v)):f}],
 ['number-wrong-conversion-order',{coerceNumberProperty:(v,f=0)=>!isNaN(Number(v))&&!isNaN(parseFloat(v))?Number(v):f}],
]){assert.throws(()=>coercionBehavior({...original,...changes},original),/coercion result|coercion thrown|coercion conversion/);mutations.push({id,rejected:true});}
for(const line of ['main','21.x'])for(const [id,change]of [
 ['version',s=>s.version='99.0.0'],['archive',s=>s.archive_sha256='0'.repeat(64)],['empty-runtime-roster',s=>s.members=[]],['member-hash',s=>s.members[0].sha256='0'.repeat(64)],['declaration-hash',s=>s.declarations[0].sha256='0'.repeat(64)],
]){const bad=structuredClone(subjects);change(bad.subjects.find(s=>s.line===line));await assert.rejects(reviewPureCoercionUses({root,subjectData:bad}),/subject identity changed/);mutations.push({id:line+':'+id,rejected:true});}
const file='projects/ngx-material-legacy/legacy-slider/slider.ts',text=read(file),call='coerceNumberProperty(v, this._max)';assert.ok(text.includes(call));
for(const [id,changed,pattern]of [
 ['three-arguments',text.replace(call,'coerceNumberProperty(v, this._max, undefined)'),/unsupported coercion argument count/],
 ['spread-arguments',text.replace(call,'coerceNumberProperty(...[v, this._max])'),/spread coercion argument/],
 ['no-arguments',text.replace(call,'coerceNumberProperty()'),/unsupported coercion argument count/],
 ['helper-alias',text+'\nconst borrowed=coerceNumberProperty;\n',/non-call coercion reference/],
 ['duplicate-binding',text+"\nimport {coerceNumberProperty as Duplicate} from '@angular/cdk/coercion';\n",/missing\/ambiguous coercion import/],
]){assert.notEqual(changed,text);await assert.rejects(reviewPureCoercionUses({root,readSource:p=>p===file?changed:read(p)}),pattern);mutations.push({id,rejected:true});}
// The unsupported JS third-argument route differs. Every reviewed authored binding rejects it.
for(const subject of subjects.subjects.filter(s=>s.line!=='original')){const runtime=await import(pathToFileURL(join(subject.runtime_root,subject.public_entry)));assert.equal(original.coerceNumberProperty('invalid',7,'third'),7);assert.equal(runtime.coerceNumberProperty('invalid',7,'third'),0);}
assert.equal(mutations.length,23);report.mutations=mutations;report.unsupported_third_argument_difference_observed_both_peers=true;
const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({uses:111,files:103,boolean_cases:report.behaviors[0].boolean_cases,number_cases:report.behaviors[0].number_cases,mutations:mutations.length}));
