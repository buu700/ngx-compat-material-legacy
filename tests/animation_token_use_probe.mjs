/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {animationTokenSubjects,exerciseAnimationToken,exerciseOwnedAnimationPolicy,reviewAnimationTokenUses} from '../scripts/animation-token-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p),'utf8'),options={};const args=process.argv.slice(2);for(let i=0;i<args.length;i+=2){assert.ok(['--report','--compiler-root'].includes(args[i])&&args[i+1]);options[args[i]]=args[i+1];}
const subjects=await animationTokenSubjects(root);
try{
 const report=await reviewAnimationTokenUses({root,subjects,compilerRoot:options['--compiler-root']??process.env.CLOSEOUT_TYPESCRIPT_ROOT});assert.equal(report.frozen_uses,22);assert.equal(report.current_uses,24);assert.equal(report.current_delta_uses,2);assert.equal(report.source_override_used,false);assert.equal(report.cases.flatMap(c=>c.references).length,28);assert.deepEqual(report.behaviors.map(c=>c.cases.length),[8,8,8]);assert.deepEqual(report.owned_policy.map(c=>c.cases.length),[13,13,13]);assert.deepEqual(report.authored_context.map(c=>[c.constructor_annotations,c.test_providers,c.policy_inject]),[[25,2,1],[25,2,1],[25,2,1]]);
 const mutations=[];
 for(const m of subjects.models.filter(m=>m.subject.line!=='original')){const core=m.runtime;assert.throws(()=>exerciseAnimationToken(core,new core.InjectionToken('AnimationModuleType')),assert.AssertionError);mutations.push({id:m.subject.line+':equal-description-token-substitution',rejected:true});assert.throws(()=>exerciseOwnedAnimationPolicy(root,core,undefined,{token:new core.InjectionToken('AnimationModuleType')}),assert.AssertionError);mutations.push({id:m.subject.line+':policy-token-substitution',rejected:true});}
 const file='projects/ngx-material-legacy/legacy-tabs/tab-group.ts',text=read(file);
 for(const[id,changed,pattern]of[
  ['duplicate-import',text+"\nimport {ANIMATION_MODULE_TYPE as Duplicate} from '@angular/core';\n",/missing\/ambiguous animation token import/],
  ['runtime-alias',text+'\nconst Alias=ANIMATION_MODULE_TYPE;\n',/unreviewed animation token role/],
  ['type-only-runtime',text.replace('  ANIMATION_MODULE_TYPE,','  type ANIMATION_MODULE_TYPE,'),/runtime animation token imported type only/],
  ['optional-mode-lost',text.replace('@Optional() @Inject(ANIMATION_MODULE_TYPE)','@Inject(ANIMATION_MODULE_TYPE)'),/mode injection must remain optional/],
  ['new-token-instead-of-constant',text+'\nconst token=new ANIMATION_MODULE_TYPE();\n',/unreviewed animation token role/],
 ]){assert.notEqual(changed,text);await assert.rejects(reviewAnimationTokenUses({root,subjects,skipDiagnostics:true,readSource:p=>p===file?changed:read(p)}),pattern);mutations.push({id,rejected:true});}
 const policyFile='projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts',policy=read(policyFile);
 for(const[id,changed]of[
  ['Noop-predicate-inverted',policy.replace("=== 'NoopAnimations'","!== 'NoopAnimations'")],
  ['missing-context-default-inverted',policy.replace('return false;','return true;')],
  ['media-failure-default-disabled',policy.replace("return 'enabled';","return 'di-disabled';")],
  ['material-disable-ignored',policy.replace('if (materialConfig?.animationsDisabled)','if (false)')],
  ['override-ignored',policy.replace('if (testOverride)','if (false)')],
 ]){assert.notEqual(changed,policy);assert.throws(()=>exerciseOwnedAnimationPolicy(root,subjects.models[1].runtime,p=>p===policyFile?changed:read(p)),assert.AssertionError);mutations.push({id,rejected:true});}
 const providersFile='projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts',providers=read(providersFile),unsupported=providers.replace("useValue: 'NoopAnimations'","useValue: 'OtherAnimations'");assert.notEqual(unsupported,providers);await assert.rejects(reviewAnimationTokenUses({root,subjects,skipDiagnostics:true,readSource:p=>p===providersFile?unsupported:read(p)}),assert.AssertionError);mutations.push({id:'unsupported-test-provider-mode',rejected:true});
 const alias=text.replace('  ANIMATION_MODULE_TYPE,','  ANIMATION_MODULE_TYPE as ModeToken,').replaceAll('Inject(ANIMATION_MODULE_TYPE)','Inject(ModeToken)');const aliased=await reviewAnimationTokenUses({root,subjects,skipDiagnostics:true,readSource:p=>p===file?alias:read(p)});assert.equal(aliased.cases.find(c=>c.file==='legacy-tabs/tab-group.ts').local_name,'ModeToken');report.alias_positive=true;report.mutations=mutations;assert.equal(mutations.length,15);
 report.production=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512','tests/animation_token_production_probe.mjs'],{cwd:root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));assert.equal(report.production.subjects.length,3);assert.deepEqual(report.production.subjects.map(c=>c.token_controls),[8,8,8]);
 if(options['--report']){assert.equal(existsSync(options['--report']),false);writeFileSync(options['--report'],JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({line:report.line,frozen_uses:22,current_uses:24,current_delta_uses:2,references:28,constructor_annotations:25,test_providers:2,policy_inject:1,subjects:3,token_controls_per_subject:8,owned_policy_controls_per_subject:13,mutations:15,compiler:report.type_compilation.compiler,production_modules:3,native_executed:false}));
}finally{subjects.dispose();}
