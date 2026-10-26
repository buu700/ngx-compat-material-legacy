/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine input parent/token/consumed extension protocols; separate SDK processes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const requested=process.argv.includes('--subject')?process.argv[process.argv.indexOf('--subject')+1]:null;
const reportPath=process.argv.includes('--report')?process.argv[process.argv.indexOf('--report')+1]:null;
const ledgers=['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json','compatibility/f10/disposition-ledger/ledger.json'];
const before=ledgers.map(path=>hash(readFileSync(join(root,path))));
const {prepareMaterialRemainingPublicSubjects}=await import(pathToFileURL(join(root,'scripts/material-remaining-caller-public-subjects.mjs')));
const {materialRemainingCallerSource}=await import(pathToFileURL(join(root,'scripts/material-remaining-caller-contracts.mjs')));
const {componentConfigGraph}=await import(pathToFileURL(join(root,'scripts/component-config-caller-contracts.mjs')));
const {cdkModuleTypePublicRoute:route}=await import(pathToFileURL(join(root,'scripts/cdk-module-type-public-subjects.mjs')));
const source=materialRemainingCallerSource({root}),subject=requested??source.prior.line;
const loaded=prepareMaterialRemainingPublicSubjects(root);
try {
 const model=loaded.models.find(m=>m.line===subject);assert.ok(model);
 const sdk=spec=>import(pathToFileURL(join(model.root,'node_modules',route(model,spec,'runtime').key)));
 await sdk('@angular/compiler');
 let sourceCount=0,emittedPath=null;
 if(subject!=='original'){
  const current=materialRemainingCallerSource(),graph=componentConfigGraph({selected:current.prior.selected}),edges=new Map(graph.edges.map(e=>[JSON.stringify([e.from,e.specifier]),e.to]));
  const owned=join(model.root,'owned'),output=join(model.root,'compiled'),dest=p=>join(output,p.replace(/\.ts$/,'.mjs'));
  for(const[path,text]of current.sources){const file=join(owned,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,text,{flag:'wx'});}
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,strict:true,strictPropertyInitialization:false,noImplicitOverride:true,skipLibCheck:false,types:[],rootDir:owned,outDir:output,noEmitOnError:true,paths:Object.fromEntries([...graph.routes].map(([spec,path])=>[spec,[join(owned,path)]]))};
  const program=ts.createProgram(current.prior.sources.map(m=>join(owned,m.path)),options),diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=>String.fromCharCode(10)}));
  const emitted=program.emit(undefined,(file,text)=>{assert.ok(file.startsWith(output+'/'));const target=file.replace(/\.js$/,'.mjs');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,text,{flag:'wx'});},undefined,false,{after:[context=>file=>{
   const path=file.fileName.slice(owned.length+1);
   return ts.visitEachChild(file,node=>{
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
     const spec=node.moduleSpecifier.text,target=edges.get(JSON.stringify([path,spec]));
     if(target){const literal=ts.factory.createStringLiteral(pathToFileURL(dest(target)).href);return ts.isImportDeclaration(node)?ts.factory.updateImportDeclaration(node,node.modifiers,node.importClause,literal,node.attributes):ts.factory.updateExportDeclaration(node,node.modifiers,node.isTypeOnly,node.exportClause,literal,node.attributes);}
    }
    return node;
   },context);
  }]});
  assert.equal(emitted.emitSkipped,false);assert.equal(emitted.diagnostics.length,0);
  sourceCount=current.sources.size;emittedPath=dest;
 }
 const owned=subject==='original'?await sdk('@angular/material/legacy-input'):await import(pathToFileURL(join(model.root,'compiled/projects/ngx-material-legacy/legacy-input/public-api.mjs')));
 async function observe(Input,token,peer,core){
  const result=[{id:'genuine-public-parent',matched:Object.getPrototypeOf(Input)===peer.MatInput},
   {id:'shared-accessor-alias',matched:token===peer.MAT_INPUT_VALUE_ACCESSOR,injection_token:token instanceof core.InjectionToken}];
  for(const [id,placeholder,field]of [['absent-field','hint',null],['legacy-unlabelled','hint',{appearance:'legacy',_hasLabel:()=>false}],['legacy-labelled','hint',{appearance:'legacy',_hasLabel:()=>true}],['standard-unlabelled','hint',{appearance:'standard',_hasLabel:()=>false}],['legacy-empty','',{appearance:'legacy',_hasLabel:()=>false}],['standard-empty','',{appearance:'standard',_hasLabel:()=>false}],['legacy-optional-label-helper','hint',{appearance:'legacy'}]]){
   result.push({id,placeholder:Input.prototype._getPlaceholder.call({placeholder,_legacyFormField:field})});
  }
  for(const [native,multiple,size]of [[false,false,1],[false,true,4],[true,false,1],[true,true,1],[true,false,4]]){
   result.push({id:'inline-select-'+JSON.stringify([native,multiple,size]),inline:Input.prototype._isInlineSelect.call({_isNativeSelect:native,_elementRef:{nativeElement:{multiple,size}}})});
  }
  return result;
 }

 const peer=await sdk('@angular/material/input'),core=await sdk('@angular/core');
 const actual=await observe(owned.MatLegacyInput,owned.MAT_LEGACY_INPUT_VALUE_ACCESSOR,peer,core);
 const oraclePath='compatibility/rc/material-remaining-caller-input-tagged16.json',oracleBytes=readFileSync(join(root,oraclePath));
 assert.equal(hash(oracleBytes),'b5501ac15cc06b1b85c19db6ef97cf2b88e551ca5e2db9fa3e95e219a407e92b','tagged input observations changed');
 const oracle=JSON.parse(oracleBytes);assert.equal(oracle.subject,'original');assert.equal(oracle.observations.length,14);
 assert.deepEqual(actual,oracle.observations,'input public/consumed protocol differs from untouched16');
 const faults=[];
 if(emittedPath){
  const file=emittedPath('projects/ngx-material-legacy/legacy-input/input.ts'),text=readFileSync(file,'utf8');
  for(const [index,[id,from,to]]of [
   ['placeholder-promotion-noop','return formField &&','return false && formField &&'],
   ['ignore-existing-label','formField._hasLabel?.()','false'],
   ['require-optional-label-helper','formField._hasLabel?.()','formField._hasLabel()'],
  ].entries()){
   assert.equal(text.split(from).length,2,'fault target absent/ambiguous');
   const mutated=text.replace(from,to),dest=file.replace(/\.mjs$/,'.fault-'+index+'.mjs');writeFileSync(dest,mutated,{flag:'wx'});
   const {MatLegacyInput:Input}=await import(pathToFileURL(dest));
   let rejected=false;try{assert.deepEqual(await observe(Input,owned.MAT_LEGACY_INPUT_VALUE_ACCESSOR,peer,core),oracle.observations);}catch(error){assert.ok(error instanceof Error);rejected=true;}
   assert.equal(rejected,true,'input behavior fault escaped: '+id);faults.push({id,rejected:true,emitted_fault_sha256:hash(mutated)});
  }
  assert.notDeepEqual(await observe(owned.MatLegacyInput,new core.InjectionToken('foreign fixture accessor'),peer,core),oracle.observations);
  faults.push({id:'different-genuine-accessor-token',rejected:true});
 }
 assert.deepEqual(ledgers.map(path=>hash(readFileSync(join(root,path)))),before);
 const report={schema_version:1,subject,node:process.version,typescript:ts.version,source:source.ref,SDK:loaded.material_remaining_capsule,
  tagged_oracle:{path:oraclePath,sha256:hash(oracleBytes)},source_files:sourceCount,genuine_public_SDKs:true,
  explicit_receiver_protocol:true,actual_Angular_node:false,observations:actual,behavior_faults:faults,
  canonical_ledgers_unchanged:true,product_changes:0,source_closures:0,native_or_packed:false,
  actual_Angular_view_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};
 if(reportPath)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({subject,cases:actual.length,source_files:sourceCount,behavior_faults_rejected:faults.length,source_closures:0}));
}finally{loaded.dispose();}
