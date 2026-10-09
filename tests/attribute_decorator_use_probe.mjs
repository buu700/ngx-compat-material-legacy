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
import {attributeDecoratorSubjects,exerciseAttributeDecorator,reviewAttributeDecoratorUses} from '../scripts/attribute-decorator-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p),'utf8'),options={};const args=process.argv.slice(2);for(let i=0;i<args.length;i+=2){assert.ok(['--report','--compiler-root'].includes(args[i])&&args[i+1]);options[args[i]]=args[i+1];}
const subjects=await attributeDecoratorSubjects(root);
try{
 const report=await reviewAttributeDecoratorUses({root,subjects,compilerRoot:options['--compiler-root']??process.env.CLOSEOUT_TYPESCRIPT_ROOT});assert.equal(report.frozen_uses,9);assert.equal(report.current_uses,9);assert.equal(report.current_delta_uses,0);assert.equal(report.source_override_used,false);assert.deepEqual(report.behaviors.map(c=>c.cases.length),[9,9,9]);assert.deepEqual(report.authored_metadata.map(c=>c.annotation_registrations),[9,9,9]);
 const mutations=[];
 for(const m of subjects.models.filter(m=>m.subject.line!=='original')){
  const core=m.runtime;
  function registrationMutation(mode){return function Attribute(name){if(new.target)return new core.Attribute(name);const actual=core.Attribute(name);function changed(cls,key,index){const returned=actual(cls,key,mode==='shift'?index+1:index);return mode==='return'?undefined:returned;}changed.annotation=actual.annotation;return changed;};}
  for(const[id,api]of[
   ['attribute-name-lost',{...core,Attribute:class extends core.Attribute{constructor(name){super(name);this.attributeName=undefined;}}}],
   ['deferred-node-hook-lost',{...core,Attribute:class extends core.Attribute{constructor(name){super(name);delete this.__NG_ELEMENT_ID__;}}}],
   ['decorator-target-not-returned',{...core,Attribute:registrationMutation('return')}],
   ['parameter-index-shifted',{...core,Attribute:registrationMutation('shift')}],
  ]){assert.throws(()=>exerciseAttributeDecorator(core,api),assert.AssertionError);mutations.push({id:m.subject.line+':'+id,rejected:true});}
 }
 const file='projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts',text=read(file);
 for(const[id,changed,pattern]of[
  ['duplicate-import',text+"\nimport {Attribute as Duplicate} from '@angular/core';\n",/missing\/ambiguous Attribute import/],
  ['runtime-alias',text+'\nconst Alias=Attribute;\n',/unreviewed Attribute role/],
  ['type-only-runtime',text.replace('  Attribute,','  type Attribute,'),/runtime Attribute imported type only/],
  ['nonliteral-name',text.replace("Attribute('tabindex')","Attribute(attributeName)"),/Attribute name must remain literal/],
  ['unknown-name',text.replace("Attribute('tabindex')","Attribute('style')"),/unreviewed Attribute name/],
  ['unreviewed-runtime-constructor',text+"\nconst metadata=new Attribute('tabindex');\n",/unreviewed Attribute role/],
 ]){assert.notEqual(changed,text);await assert.rejects(reviewAttributeDecoratorUses({root,subjects,skipDiagnostics:true,readSource:p=>p===file?changed:read(p)}),pattern);mutations.push({id,rejected:true});}
 const alias=text.replace('  Attribute,','  Attribute as HostAttribute,').replaceAll('@Attribute(','@HostAttribute(');assert.notEqual(alias,text);const aliased=await reviewAttributeDecoratorUses({root,subjects,skipDiagnostics:true,readSource:p=>p===file?alias:read(p)});assert.equal(aliased.cases.find(c=>c.file==='legacy-tabs/tab-nav-bar/tab-nav-bar.ts').local_name,'HostAttribute');report.alias_positive=true;report.mutations=mutations;assert.equal(mutations.length,14);
 if(options['--report']){assert.equal(existsSync(options['--report']),false);writeFileSync(options['--report'],JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({line:report.line,frozen_uses:9,current_uses:9,current_delta_uses:0,references:9,annotation_registrations_per_subject:9,subjects:3,controls_per_subject:9,mutations:14,compiler:report.type_compilation.compiler,native_executed:false}));
}finally{subjects.dispose();}
