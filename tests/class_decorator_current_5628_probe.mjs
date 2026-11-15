/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {classDecoratorSubjects,exerciseClassDecorators,reviewClassDecoratorUses} from '../scripts/class-decorator-current-5628.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p),'utf8'),options={};const args=process.argv.slice(2);for(let i=0;i<args.length;i+=2){assert.ok(['--report','--compiler-root'].includes(args[i])&&args[i+1]);options[args[i]]=args[i+1];}
const subjects=await classDecoratorSubjects(root);
try{
 const report=await reviewClassDecoratorUses({root,subjects,population:'current',compilerRoot:options['--compiler-root']??process.env.CLOSEOUT_TYPESCRIPT_ROOT});assert.equal(report.frozen_uses,144);assert.equal(report.current_uses,126);assert.equal(report.source_override_used,false);assert.equal(report.current_delta_uses,6);assert.equal(report.cases.flatMap(c=>c.references).length,161);assert.equal(report.cases.filter(c=>c.unused_import_erasure).length,5);assert.deepEqual(report.authored_metadata.map(c=>c.metadata_constructor_count),[161,161,161]);assert.deepEqual(report.behaviors.map(c=>c.cases.length),[13,13,13]);assert.equal(report.cases.flatMap(c=>c.references).filter(c=>c.historical_base_directive).length,23);

 const prior=JSON.parse(read('compatibility/rc/historical-menu-class-decorator-requalification-diagnostic.json'));
 const expected=JSON.parse(read('compatibility/rc/class-decorator-current-5628-expected-deltas.json'));
 const key=c=>JSON.stringify([c.file,c.module,c.symbol]),refs=c=>c.references.map(({line,...rest})=>JSON.stringify(rest)).sort(),deltas=[];
 for(const old of prior.cases){const matches=report.cases.filter(c=>key(c)===key(old));assert.ok(matches.length<=1);if(!matches.length){deltas.push({file:old.file,module:old.module,symbol:old.symbol,kind:'retained-frozen-obligation',before:refs(old).map(JSON.parse),after:[]});continue;}const a=refs(old),b=refs(matches[0]);if(JSON.stringify(a)!==JSON.stringify(b))deltas.push({file:old.file,module:old.module,symbol:old.symbol,kind:'changed-metadata',before:a.filter(x=>!b.includes(x)).map(JSON.parse),after:b.filter(x=>!a.includes(x)).map(JSON.parse)});}
 for(const c of report.cases)if(!prior.cases.some(old=>key(old)===key(c)))deltas.push({file:c.file,module:c.module,symbol:c.symbol,kind:'additional-use',before:[],after:refs(c).map(JSON.parse)});
 deltas.sort((a,b)=>key(a).localeCompare(key(b)));assert.deepEqual(deltas,expected.changes);assert.equal(deltas.filter(x=>x.kind==='retained-frozen-obligation').length,24);assert.equal(deltas.filter(x=>x.kind==='changed-metadata').length,5);assert.equal(deltas.filter(x=>x.kind==='additional-use').length,2);report.prior_roles_reconciled=true;
 assert.equal(report.population,'current');assert.equal(report.retired_frozen_uses.length,24);
 assert.ok(report.retired_frozen_uses.some(row=>row.file==='legacy-tabs/internal/tab-nav-bar-base.ts'&&row.symbol==='Component'));assert.equal(report.retired_frozen_uses.filter(row=>row.symbol==='NgModule').length,23);assert.ok(report.retired_frozen_uses.filter(row=>row.symbol==='NgModule').every(row=>row.scope.includes('no retirement admission')));
 assert.equal(report.frozen_uses-report.retired_frozen_uses.length+report.current_delta_uses,report.current_uses);
 const fixture=mkdtempSync(join(tmpdir(),'framework-class-retirement-'));
 try {const seedDir=join(fixture,'compatibility/f10');mkdirSync(seedDir,{recursive:true});copyFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'),join(seedDir,'authored-dependency-inventory-seed.json'));const file='legacy-list/internal/common-module.ts',target=join(fixture,'projects/ngx-material-legacy',file);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,"import {NgModule} from '@angular/core';\n@NgModule({}) export class Common {}\n");await assert.rejects(reviewClassDecoratorUses({root:fixture,subjects,population:'current',sourceFiles:[file],skipDiagnostics:true}),/retired source returned/);} finally {rmSync(fixture,{recursive:true,force:true});}
 const mutations=[{id:'restored-absent-module',rejected:true}];
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
 await assert.rejects(reviewClassDecoratorUses({root,subjects,skipDiagnostics:true}),/109 !== 130/);mutations.push({id:'captured-profile-cannot-claim-current',rejected:true});
 const outsidePath='projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts',outside=read(outsidePath)+"\nimport {Directive} from '@angular/core';\n";
 await assert.rejects(reviewClassDecoratorUses({root,subjects,population:'current',skipDiagnostics:true,readSource:p=>p===outsidePath?outside:read(p)}),/110 !== 109/);mutations.push({id:'outside-current-population',rejected:true});
 report.mutations=mutations;assert.equal(mutations.length,27);
 if(options['--report']){assert.equal(existsSync(options['--report']),false);writeFileSync(options['--report'],JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({line:report.line,frozen_uses:144,current_uses:126,current_delta_uses:6,retained_retired_obligations:24,retained_absent_modules:23,references:161,metadata_constructors_per_subject:161,historical_bases_repaired:23,unused_imports:5,subjects:3,controls_per_subject:13,mutations:27,compiler:report.type_compilation.compiler,native_executed:false}));
}finally{subjects.dispose();}
