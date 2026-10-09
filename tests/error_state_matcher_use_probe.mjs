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
import {reviewErrorMatcherUses,scanErrorMatcherUses} from '../scripts/error-state-matcher-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p),'utf8'),options={};const args=process.argv.slice(2);for(let i=0;i<args.length;i+=2){assert.ok(['--report','--compiler-root'].includes(args[i])&&args[i+1]);options[args[i]]=args[i+1];}
const subjects=prepareMaterialPublicSubjects(root);
try{
 const report=reviewErrorMatcherUses({root,subjects,compilerRoot:options['--compiler-root']??process.env.CLOSEOUT_TYPESCRIPT_ROOT});assert.equal(report.frozen_uses,26);assert.equal(report.current_imports,26);assert.equal(report.mixins.length,22);assert.equal(report.supplementary_public_exports,1);assert.deepEqual(report.runtime.map(c=>c.cases.length),[9,9,9]);assert.deepEqual(report.runtime.map(c=>c.observations.length),[32,32,32]);assert.equal(report.source_override_used,false);
 const mutations=[];const file='projects/ngx-material-legacy/legacy-input/input-module.ts',text=read(file);
 for(const[id,changed,pattern]of[
  ['duplicate-import',text+"\nimport {ErrorStateMatcher as Duplicate} from '@angular/material/core';\n",/missing\/ambiguous matcher import/],
  ['runtime-alias',text+'\nconst Alias=ErrorStateMatcher;\n',/unreviewed matcher role/],
  ['type-only-provider',text.replace('{ErrorStateMatcher}','{type ErrorStateMatcher}'),/runtime matcher imported type only/],
  ['unreviewed-construction',text+'\nconst matcher=new ErrorStateMatcher();\n',/unreviewed matcher role/],
 ]){assert.notEqual(changed,text);assert.throws(()=>scanErrorMatcherUses({root,readSource:p=>p===file?changed:read(p)}),pattern);mutations.push({id,rejected:true});}
 const alias=text.replace('{ErrorStateMatcher}','{ErrorStateMatcher as Matcher}').replace('[ErrorStateMatcher]','[Matcher]');const renamed=scanErrorMatcherUses({root,readSource:p=>p===file?alias:read(p)});assert.equal(renamed.cases.find(c=>c.file==='legacy-input/input-module.ts').local_name,'Matcher');report.alias_positive=true;
 const mixinFile='projects/ngx-material-legacy/internal/common-behaviors/error-state.ts',mixin=read(mixinFile),missingNext=mixin.replace('this.stateChanges.next();','');assert.notEqual(missingNext,mixin);assert.throws(()=>reviewErrorMatcherUses({root,subjects,skipDiagnostics:true,readSource:p=>p===mixinFile?missingNext:read(p)}),/owned historical helper differs/);mutations.push({id:'mixin-emission-source-drift',rejected:true});
 const exportFile='projects/ngx-material-legacy/legacy-core/public-api.ts',publicText=read(exportFile),renamedExport=publicText.replace('ErrorStateMatcher as LegacyErrorStateMatcher','ErrorStateMatcher as DifferentMatcher');assert.notEqual(renamedExport,publicText);assert.throws(()=>scanErrorMatcherUses({root,readSource:p=>p===exportFile?renamedExport:read(p)}),assert.AssertionError);mutations.push({id:'legacy-public-export-name-drift',rejected:true});
 for(const m of subjects.models.filter(m=>m.line!=='original')){
  const script=`import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {exerciseErrorMatcherRuntime} from ${JSON.stringify(join(root,'scripts/error-state-matcher-use-review.mjs'))};const core=await import('@angular/core');await import('@angular/compiler');const material=await import('@angular/material/core');const forms=await import('@angular/forms');const rxjs=await import('rxjs');const api={core,material,forms,rxjs},payload=JSON.parse(readFileSync(new URL('./matcher-payload.json',import.meta.url))),baseline=exerciseErrorMatcherRuntime(api,payload),mutations=[];
for(const [id,body]of[['always-false',()=>false],['always-true',()=>true],['dirty-instead-of-touched',(c,f)=>!!(c&&c.invalid&&(c.dirty||f?.submitted))],['invalid-check-lost',(c,f)=>!!(c&&(c.touched||f?.submitted))]]){class Defective extends material.ErrorStateMatcher{isErrorState(c,f){return body(c,f);}}const result=exerciseErrorMatcherRuntime(api,payload,{Matcher:Defective});assert.notDeepEqual(result.observations,baseline.observations);mutations.push({id,rejected:true});}
for(const[id,change]of[['state-emission-lost',body=>body.replace('this.stateChanges.next();','')],['parent-priority-inverted',body=>body.replace('this._parentFormGroup || this._parentForm','this._parentForm || this._parentFormGroup')],['custom-matcher-priority-inverted',body=>body.replace('this.errorStateMatcher || this._defaultErrorStateMatcher','this._defaultErrorStateMatcher || this.errorStateMatcher')]]){const mutated=JSON.parse(JSON.stringify(payload));mutated.mixins[0].body=change(mutated.mixins[0].body);assert.notEqual(mutated.mixins[0].body,payload.mixins[0].body);assert.throws(()=>exerciseErrorMatcherRuntime(api,mutated),assert.AssertionError);mutations.push({id,rejected:true});}console.log(JSON.stringify(mutations));`;
  writeFileSync(join(m.root,'matcher-mutations.mjs'),script);const results=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',join(m.root,'matcher-mutations.mjs')],{cwd:m.root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));for(const r of results)mutations.push({id:m.line+':'+r.id,rejected:r.rejected});
 }
 assert.equal(mutations.length,20);report.mutations=mutations;
 if(options['--report']){assert.equal(existsSync(options['--report']),false);writeFileSync(options['--report'],JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({line:report.line,frozen_uses:26,current_imports:26,supplementary_exports:1,type_references:72,module_providers:2,owned_mixins:22,subjects:3,controls_per_subject:9,observations_per_subject:32,mixin_transition_cases_per_subject:230,mutations:20,compiler:report.type_compilation.compiler,native_executed:false}));
}finally{subjects.dispose();}
