/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {reviewNgControlUses,scanNgControlUses} from '../scripts/ng-control-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p),'utf8'),options={};const args=process.argv.slice(2);for(let i=0;i<args.length;i+=2){assert.ok(['--report','--compiler-root'].includes(args[i])&&args[i+1]);options[args[i]]=args[i+1];}
const subjects=prepareMaterialPublicSubjects(root);
try{
 const report=reviewNgControlUses({root,subjects,compilerRoot:options['--compiler-root']??process.env.CLOSEOUT_TYPESCRIPT_ROOT});assert.equal(report.frozen_uses,24);assert.equal(report.current_uses,24);assert.equal(report.cases.flatMap(c=>c.references).length,26);assert.equal(report.instance_access.length,14);assert.deepEqual(report.runtime.map(c=>c.cases.length),[7,7,7]);assert.deepEqual(report.runtime.map(c=>c.observations.length),[6,6,6]);assert.equal(report.source_override_used,false);
 const mutations=[],file='projects/ngx-material-legacy/legacy-chips/chip-list.ts',text=read(file);
 for(const[id,changed,pattern]of[
  ['duplicate-import',text+"\nimport {NgControl as Duplicate} from '@angular/forms';\n",/missing\/ambiguous NgControl import/],
  ['unreviewed-runtime-alias',text+'\nconst Alias=NgControl;\n',/unreviewed NgControl role/],
  ['decorated-token-type-only',text.replace('  NgControl,','  type NgControl,'),/decorated NgControl token imported type only/],
  ['self-flag-lost',text.replace('@Optional() @Self() ngControl','@Optional() ngControl'),/NgControl constructor flags changed/],
  ['consumed-property-drift',text.replace('this.ngControl.disabled','this.ngControl.unknown'),/unreviewed consumed NgControl property/],
  ['accessor-assignment-lost',text.replace('this.ngControl.valueAccessor = this;','this.ngControl.valueAccessor = undefined;'),/legacy accessor assignment changed/],
  ['unreviewed-construction',text+'\nconst control=new NgControl();\n',/unreviewed NgControl role/],
 ]){assert.notEqual(changed,text);assert.throws(()=>scanNgControlUses({root,readSource:p=>p===file?changed:read(p)}),pattern);mutations.push({id,rejected:true});}
 const alias=text.replace('  NgControl,','  NgControl as BoundControl,').replaceAll(': NgControl',': BoundControl');const renamed=scanNgControlUses({root,readSource:p=>p===file?alias:read(p)});assert.equal(renamed.cases.find(c=>c.file==='legacy-chips/chip-list.ts').local_name,'BoundControl');report.alias_positive=true;
 for(const m of subjects.models.filter(m=>m.line!=='original')){
  const script=`import assert from 'node:assert/strict';import {exerciseNgControlRuntime} from ${JSON.stringify(join(root,'scripts/ng-control-use-review.mjs'))};const core=await import('@angular/core');await import('@angular/compiler');const forms=await import('@angular/forms');const baseline=exerciseNgControlRuntime({core,forms}),mutations=[];
class WrongName extends forms.NgControl{constructor(){super();this.name='wrong';}}
assert.throws(()=>exerciseNgControlRuntime({core,forms},{Parent:WrongName}),assert.AssertionError);mutations.push({id:'constructor-name-default-changed',rejected:true});
class LostAccessor extends forms.NgControl{constructor(){super();return new Proxy(this,{set(target,key,value,receiver){if(key==='valueAccessor')return true;return Reflect.set(target,key,value,receiver);}});}}
assert.throws(()=>exerciseNgControlRuntime({core,forms},{Parent:LostAccessor}),assert.AssertionError);mutations.push({id:'legacy-accessor-write-dropped',rejected:true});
for(const[id,Parent]of[['disabled-getter-changed',class extends forms.NgControl{get disabled(){return true;}}],['value-getter-changed',class extends forms.NgControl{get value(){return 'wrong';}}]]){if(id==='value-getter-changed')assert.throws(()=>exerciseNgControlRuntime({core,forms},{Parent}),assert.AssertionError);else{const changed=exerciseNgControlRuntime({core,forms},{Parent});assert.notDeepEqual(changed.observations,baseline.observations);}mutations.push({id,rejected:true});}
console.log(JSON.stringify(mutations));`;
  writeFileSync(join(m.root,'ng-control-mutations.mjs'),script);for(const r of JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',join(m.root,'ng-control-mutations.mjs')],{cwd:m.root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024})))mutations.push({id:m.line+':'+r.id,rejected:r.rejected});
 }
 assert.equal(mutations.length,15);report.mutations=mutations;
 if(options['--report']){assert.equal(existsSync(options['--report']),false);writeFileSync(options['--report'],JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({line:report.line,frozen_uses:24,current_uses:24,type_references:26,decorated_optional_self_constructors:2,consumed_member_accesses:14,accessor_writes:2,subjects:3,controls_per_subject:7,observations_per_subject:6,mutations:15,compiler:report.type_compilation.compiler,native_executed:false}));
}finally{subjects.dispose();}
