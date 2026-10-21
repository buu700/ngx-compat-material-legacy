/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine tagged/minimum semantic type boundary and complete emitted-JS invariance. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),ts=createRequire(join(root,'package.json'))('typescript'),hash=s=>createHash('sha256').update(s).digest('hex');
const {menuCallerSource}=await import(pathToFileURL(join(root,'scripts/menu-caller-contracts.mjs'))),{prepareMenuCallerPublicSubjects}=await import(pathToFileURL(join(root,'scripts/menu-caller-public-subjects.mjs')));
const loaded=prepareMenuCallerPublicSubjects(root),after=menuCallerSource(),before={...after,sources:new Map(after.sources)},results=[],mutants=[],unstable=new Set(['docs-private','deprecated','breaking-change','experimental','developerPreview']);
assert.equal(after.applied,true,'apply the exact finite type-only source edit before producing current proof');assert.equal(after.proposed_view,false);
before.sources.set('projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts',after.proposal.before);
for(const[path,text]of before.sources){const original=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',after.prior.source_parent+':'+path],{cwd:root,maxBuffer:4*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(original),hash(text),'unqualified current menu closure '+path);}
function program(model,source,assignment=false){
 const fixture=join(model.root,'public-menu.ts');writeFileSync(fixture,"import * as peer from '@angular/material/menu';\n"+(model.line==='original'?"import * as historical from '@angular/material/legacy-menu';declare const content:historical.MatLegacyMenuContent;const accepted:NonNullable<historical.MatLegacyMenuPanel['lazyContent']>=content;\n":assignment?"import {MatLegacyMenuContent,MatLegacyMenuPanel} from './projects/ngx-material-legacy/legacy-menu/public-api';declare const content:MatLegacyMenuContent;const accepted:NonNullable<MatLegacyMenuPanel['lazyContent']>=content;\n":''));
 const roots=[fixture];if(source)for(const[path,text]of source.sources){const p=join(model.root,path);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,text);roots.push(p);}
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,strict:true,strictPropertyInitialization:false,noImplicitOverride:true,skipLibCheck:false,types:[],rootDir:model.root,outDir:model.root,paths:source?Object.fromEntries([...source.routes].map(([spec,path])=>[spec,[join(model.root,path)]])):{}};
 return {program:ts.createProgram(roots,options),roots,options,fixture};
}
function inspect(model,p,source){
 const ds=ts.getPreEmitDiagnostics(p.program),checker=p.program.getTypeChecker(),sf=p.program.getSourceFile(p.fixture),ns=checker.getSymbolAtLocation(sf.statements[0].moduleSpecifier),exports=new Map(checker.getExportsOfModule(ns).map(s=>[s.name,s]));
 const symbols=[];for(const name of ['MAT_MENU_PANEL','MAT_MENU_CONTENT','MAT_MENU_DEFAULT_OPTIONS','MAT_MENU_SCROLL_STRATEGY','MatMenuItem','MatMenuContent','MatMenuDefaultOptions']){let s=exports.get(name);assert.ok(s);if(s.flags&ts.SymbolFlags.Alias)s=checker.getAliasedSymbol(s);symbols.push({name,tags:s.getJsDocTags(checker).map(t=>t.name)});}
 const members=[],gaps=[];if(source)for(const path of source.sources.keys()){
  const sf=p.program.getSourceFile(join(model.root,path));function visit(n){if(ts.isPropertyAccessExpression(n)){const symbol=checker.getSymbolAtLocation(n.name),declarations=symbol?.getDeclarations()?.filter(d=>d.getSourceFile().fileName.includes('/node_modules/@angular/material/')&&d.getSourceFile().fileName.includes('menu'))??[];if(declarations.length){const tags=symbol.getJsDocTags(checker).map(t=>t.name),m={file:path,expression:n.getText(sf),tags};members.push(m);if(tags.some(t=>unstable.has(t))||declarations.some(d=>d.modifiers?.some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind))))gaps.push(m);}}ts.forEachChild(n,visit);}visit(sf);
 }
 let owner=null;if(source){const path='projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts',sf=p.program.getSourceFile(join(model.root,path)),node=sf.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='MatMenuPanel'),type=checker.getTypeAtLocation(node.name),property=type.getProperty('lazyContent'),content=checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(property,property.valueDeclaration)),symbol=content.getSymbol();assert.ok(symbol);owner={symbol:symbol.name,declarations:symbol.getDeclarations().map(d=>d.getSourceFile().fileName.slice(model.root.length+1))};}
 return {diagnostics:ds.map(d=>({code:d.code,file:d.file?.fileName.slice(model.root.length+1),message:ts.flattenDiagnosticMessageText(d.messageText,'\n')})),symbols,members,gaps,lazy_content_type:owner};
}
function emission(model,p){const files=new Map();const r=p.program.emit(undefined,(filename,text,bom,error,sources)=>{if(!filename.endsWith('.js'))return;assert.equal(sources.length,1);const path=sources[0].fileName.slice(model.root.length+1);if(path==='public-menu.ts')return;files.set(path,hash(text));});assert.equal(r.emitSkipped,false);return [...files].sort(([a],[b])=>a.localeCompare(b));}
try{
 for(const model of loaded.models){
  if(model.line!==before.prior.line){const p=program(model,null),r=inspect(model,p,null);assert.equal(r.diagnostics.length,0,JSON.stringify(r.diagnostics));results.push({line:model.line,...r});continue;}
  const a=program(model,before),left=inspect(model,a,before);assert.equal(left.diagnostics.length,0,JSON.stringify(left.diagnostics));assert.equal(left.gaps.length,2,JSON.stringify(left.gaps));assert.ok(left.gaps.every(g=>g.tags.includes('docs-private')));
  const baselineAssign=program(model,before,true),baselineDs=ts.getPreEmitDiagnostics(baselineAssign.program);assert.equal(baselineDs.length,1,ts.formatDiagnostics(baselineDs,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));assert.equal(baselineDs[0].code,2322);
  const b=program(model,after,true),right=inspect(model,b,after);assert.equal(right.diagnostics.length,0,JSON.stringify(right.diagnostics));assert.deepEqual(right.gaps,[]);assert.equal(right.lazy_content_type.symbol,'MatLegacyMenuContent');assert.ok(right.lazy_content_type.declarations.every(p=>p==='projects/ngx-material-legacy/legacy-menu/menu-content.ts'));
  const ea=emission(model,a),eb=emission(model,b);assert.equal(ea.length,53);assert.deepEqual(ea,eb,'semantic full-closure emit changed');
  results.push({line:model.line,current_source_files:53,before:left,after:right,baseline_owned_content_assignment_rejected:{code:2322,message:ts.flattenDiagnosticMessageText(baselineDs[0].messageText,'\n')},candidate_owned_content_assignment_accepted:true,semantic_emitted_JS_files_identical:ea});
  for(const[id,from,to]of [
   ['widened-content-any','lazyContent?: MatMenuContent;','lazyContent?: any;'],
   ['wrong-owned-content-class',"import type {MatLegacyMenuContent as MatMenuContent} from '../menu-content';","import type {MatLegacyMenu as MatMenuContent} from '../menu';"],
   ['changed-position-type','xPosition: MenuPositionX;','xPosition: number;'],
  ]){
   const path='projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts',original=after.sources.get(path);assert.equal(original.split(from).length,2);const source={...after,sources:new Map(after.sources)};source.sources.set(path,original.replace(from,to));
   const p=program(model,source,true),diagnostics=ts.getPreEmitDiagnostics(p.program);let rejection;
   if(diagnostics.length)rejection='semantic-type-diagnostics';else{assert.throws(()=>inspect(model,p,source),e=>e?.code==='ERR_ASSERTION');rejection='owned-content-class-identity';}
   const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText;
   assert.equal(emit(original),emit(source.sources.get(path)),'interface mutant should still erase;JS identity alone is insufficient');
   mutants.push({line:model.line,id,rejected:true,rejection,diagnostics:diagnostics.map(d=>d.code),mutant_also_erases_to_identical_JS:true});
  }

 }
 const caps=['compatibility/rc/material-public-subjects.json','compatibility/rc/element-ref-public-subjects.json','compatibility/rc/cdk-module-type-public-subjects.json','compatibility/rc/overlay-caller-public-subjects.json','compatibility/rc/overlay-caller-contract-sdk.json','compatibility/rc/menu-caller-public-subjects.json'];
 const paths=new Set([...caps,'compatibility/rc/menu-caller-prior.json.gz','compatibility/rc/menu-panel-content-type-proposal.json','scripts/menu-caller-contracts.mjs','scripts/menu-caller-public-subjects.mjs','scripts/material-public-subjects.mjs','scripts/cdk-module-type-public-subjects.mjs','scripts/overlay-caller-public-subjects.mjs','scripts/overlay-caller-contracts.mjs','tests/menu_panel_content_type_probe.mjs','compatibility/rc/api/export-name-allowlist.json',...after.sources.keys(),...after.metadata.map(m=>m.path),...after.prior.support.map(m=>m.path)]);
 for(const cap of caps){const body=JSON.parse(read(cap));for(const subject of body.subjects)for(const member of subject.members??subject.additions??[])paths.add(member.path);if(body.tagged_original_mixin)paths.add(body.tagged_original_mixin.path);}
 const report={schema_version:1,line:before.prior.line,typescript:ts.version,node:process.version,proposal_only:false,raw_product_applied:true,actual_product_changes:1,source_parent:after.prior.source_parent,
  target:{path:'projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts',before_sha256:hash(after.proposal.before),sha256:hash(after.proposal.after)},
  current_source_files:[...after.sources].map(([path,text])=>({path,sha256:hash(text)})),subjects:results,source_mutants:mutants,SDK_rewrites:false,
  inputs:[...paths].sort().map(path=>({path,sha256:hash(read(path))})),scope:'One owned panel type boundary only. Genuine16 accepts its own legacy content class;both exact current minima reject the pre-repair owned class assignment and mark the two current peer attach/detach calls docs-private. The applied finite import edit restores the owned class identity and zero private current-menu member uses. Real semantic programs cover the entire53-file owned closure;all53 emitted JS files are identical before/after on each selected minimum. Three independent interface mutants also erase but fail semantic/type-owner checks. This is no full constructor/lifecycle/template/query/native/packed/AOT/consumer/toolchain/floor or G01-G13 qualification.',
  HTML_CSS_SCSS_consumer_map_or_alias_allowlist_changes:0,full_runtime_native_packed_AOT_or_floor_qualified:false,g11_claim:'not-passed'};
 assert.equal(mutants.length,3);assert.ok(process.argv[2]);writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:report.line,SDK_models:results.length,current_source_files:53,private_current_method_uses_before:2,after:0,owned_content_assignment_restored:true,semantic_JS_files_identical:53,interface_mutants_rejected:mutants.length,actual_product_changes:1}));
}finally{loaded.dispose();}
