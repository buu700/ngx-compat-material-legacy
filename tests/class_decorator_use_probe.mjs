/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {classDecoratorSubjects,exerciseClassDecorators,reviewClassDecoratorUses} from '../scripts/class-decorator-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p),'utf8'),options={};const args=process.argv.slice(2);for(let i=0;i<args.length;i+=2){assert.ok(['--report','--compiler-root'].includes(args[i])&&args[i+1]);options[args[i]]=args[i+1];}
const subjects=await classDecoratorSubjects(root);
try{
 const report=await reviewClassDecoratorUses({root,subjects,population:'current',compilerRoot:options['--compiler-root']??process.env.CLOSEOUT_TYPESCRIPT_ROOT});assert.equal(report.frozen_uses,144);assert.equal(report.current_uses,149);assert.equal(report.source_override_used,false);assert.equal(report.current_delta_uses,6);assert.equal(report.cases.flatMap(c=>c.references).length,184);assert.equal(report.cases.filter(c=>c.unused_import_erasure).length,5);assert.deepEqual(report.authored_metadata.map(c=>c.metadata_constructor_count),[184,184,184]);assert.deepEqual(report.behaviors.map(c=>c.cases.length),[13,13,13]);assert.equal(report.cases.flatMap(c=>c.references).filter(c=>c.historical_base_directive).length,23);
 assert.equal(report.population,'current');assert.equal(report.retired_frozen_uses.length,1);
 assert.deepEqual(report.retired_frozen_uses.map(row=>row.file+'#'+row.symbol),['legacy-tabs/internal/tab-nav-bar-base.ts#Component']);
 assert.equal(report.frozen_uses-report.retired_frozen_uses.length+report.current_delta_uses,report.current_uses);
 const mutations=[];
 for(const model of subjects.models.filter(m=>m.subject.line!=='original')){
  const core=model.runtime;
  for(const[id,api]of[
   ['component-default-changed',{...core,Component:class extends core.Component{constructor(options){super(options);this.changeDetection=0;}}}],
   ['directive-selector-lost',{...core,Directive:class extends core.Directive{constructor(options){super(options);this.selector=undefined;}}}],
   ['module-arrays-cloned',{...core,NgModule:class extends core.NgModule{constructor(options){super(options);this.imports=[...options.imports];}}}],
   ['standalone-false-lost',{...core,Directive:class extends core.Directive{constructor(options){super(options);this.standalone=true;}}}],
  ]){assert.throws(()=>exerciseClassDecorators(core,api),assert.AssertionError);mutations.push({id:model.subject.line+':'+id,rejected:true});}
 }
 const file='projects/ngx-material-legacy/legacy-menu/menu-item.ts',text=read(file);
 for(const[id,changed,pattern]of[
  ['duplicate-import',text+"\nimport {Component as Duplicate} from '@angular/core';\n",/missing\/ambiguous class import/],
  ['runtime-alias',text+'\nconst Alias=Component;\n',/unreviewed class decorator role/],
  ['type-only-runtime',text.replace('  Component,','  type Component,'),/runtime class decorator imported type only/],
  ['deprecated-animations',text.replace('standalone: false,','standalone: false, animations: [],'),/removed\/deprecated\/unreviewed class option/],
  ['removed-interpolation',text.replace('standalone: false,',"standalone: false, interpolation: ['[[',']]'],"),/removed\/deprecated\/unreviewed class option/],
  ['unreviewed-standalone-true',text.replace('standalone: false,','standalone: true,'),/unreviewed standalone true target/],
 ]){assert.notEqual(changed,text);await assert.rejects(reviewClassDecoratorUses({root,subjects,population:'current',skipDiagnostics:true,readSource:p=>p===file?changed:read(p)}),pattern);mutations.push({id,rejected:true});}
 const baseFile='projects/ngx-material-legacy/legacy-core/option/option-base.ts',baseText=read(baseFile),implicit=baseText.replace('@Directive({standalone: false})','@Directive()');assert.notEqual(implicit,baseText);await assert.rejects(reviewClassDecoratorUses({root,subjects,population:'current',skipDiagnostics:true,readSource:p=>p===baseFile?implicit:read(p)}),/historical standalone mode must be explicit/);mutations.push({id:'historical-base-standalone-omitted',rejected:true});
 const ownedBase='projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts',ownedText=read(ownedBase);
 for(const[id,changed,pattern]of[
  ['owned-menu-base-standalone-omitted',ownedText.replace('@Directive({standalone: false})','@Directive()'),/historical standalone mode must be explicit/],
  ['owned-menu-base-decorator-type-only',ownedText.replace('  Directive,','  type Directive,'),/runtime class decorator imported type only/],
 ]){assert.notEqual(changed,ownedText);await assert.rejects(reviewClassDecoratorUses({root,subjects,population:'current',skipDiagnostics:true,readSource:p=>p===ownedBase?changed:read(p)}),pattern);mutations.push({id,rejected:true});}
 const alias=text.replace('  Component,','  Component as Declare,').replaceAll('@Component(','@Declare(');const aliased=await reviewClassDecoratorUses({root,subjects,population:'current',skipDiagnostics:true,readSource:p=>p===file?alias:read(p)});assert.equal(aliased.cases.find(c=>c.file==='legacy-menu/menu-item.ts'&&c.symbol==='Component').local_name,'Declare');report.alias_positive=true;
 for(const added of ['legacy-table/internal/column-classes.ts','legacy-paginator/internal/page-size-options.ts']){
  const path='projects/ngx-material-legacy/'+added,before=read(path),role=report.cases.find(row=>row.file===added&&row.symbol==='Directive');
  assert.equal(role.references.length,1);assert.equal(role.references[0].standalone,false);
  for(const[id,changed,pattern]of [
   ['standalone-omitted',before.replace('  standalone: false,',''),/historical standalone mode must be explicit/],
   ['deprecated-option',before.replace('  standalone: false,','  standalone: false, animations: [],'),/removed\/deprecated\/unreviewed class option/],
  ]){assert.notEqual(changed,before);await assert.rejects(reviewClassDecoratorUses({root,subjects,population:'current',skipDiagnostics:true,sourceFiles:[added],readSource:p=>p===path?changed:read(p)}),pattern);mutations.push({id:added+':'+id,rejected:true});}
 }
 const retiredPath='projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts',retired=read(retiredPath);
 for(const[id,changed]of [
  ['retired-import-returned',retired+"\nimport {Component} from '@angular/core';\n"],
  ['retired-panel-runtime-returned',retired+'\nexport class MatTabNavPanel {}\n'],
 ]){await assert.rejects(reviewClassDecoratorUses({root,subjects,population:'current',skipDiagnostics:true,readSource:p=>p===retiredPath?changed:read(p)}),/retired class import or panel returned/);mutations.push({id,rejected:true});}
 await assert.rejects(reviewClassDecoratorUses({root,subjects,population:'unknown',skipDiagnostics:true}),/unknown class population/);mutations.push({id:'unknown-population',rejected:true});
 await assert.rejects(reviewClassDecoratorUses({root,subjects,skipDiagnostics:true}),/132 !== 130/);mutations.push({id:'captured-profile-cannot-claim-current',rejected:true});
 const outsidePath='projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts',outside=read(outsidePath)+"\nimport {Directive} from '@angular/core';\n";
 await assert.rejects(reviewClassDecoratorUses({root,subjects,population:'current',skipDiagnostics:true,readSource:p=>p===outsidePath?outside:read(p)}),/133 !== 132/);mutations.push({id:'outside-current-population',rejected:true});
 report.mutations=mutations;assert.equal(mutations.length,26);
 if(options['--report']){assert.equal(existsSync(options['--report']),false);writeFileSync(options['--report'],JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({line:report.line,frozen_uses:144,current_uses:149,current_delta_uses:6,references:184,metadata_constructors_per_subject:184,historical_bases_repaired:23,unused_imports:5,subjects:3,controls_per_subject:13,mutations:26,compiler:report.type_compilation.compiler,native_executed:false}));
}finally{subjects.dispose();}
