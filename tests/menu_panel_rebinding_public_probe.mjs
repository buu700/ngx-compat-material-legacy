/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public declarations for six unchanged type-only sibling bindings. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {prepareMenuCallerPublicSubjects} from '../scripts/menu-caller-public-subjects.mjs';
import {qualifiedMenuContentTypeBoundary} from '../scripts/menu-panel-content-boundary.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const line=JSON.parse(read('compatibility/rc/menu-caller-worksheet.json')).line,q=qualifiedMenuContentTypeBoundary({line,readMember:read}),loaded=prepareMenuCallerPublicSubjects(root),subjects=[];
const bindings=[['@angular/core','EventEmitter'],['@angular/core','TemplateRef'],['@angular/cdk/bidi','Direction'],['@angular/cdk/a11y','FocusOrigin'],['@angular/material/menu','MenuPositionX'],['@angular/material/menu','MenuPositionY']];
try{
 for(const model of loaded.models){
  const path=join(model.root,'sibling-types.ts'),text=bindings.map(([m,s])=>`import type {${s}} from '${m}';`).join('\n')+'\ndeclare const close:EventEmitter<void|"click"|"keydown"|"tab">;declare const template:TemplateRef<any>;declare const direction:Direction;declare const focus:FocusOrigin;declare const x:MenuPositionX;declare const y:MenuPositionY;\n';writeFileSync(path,text);
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,skipLibCheck:false,noEmit:true,types:[]},program=ts.createProgram([path],options),diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  const checker=program.getTypeChecker(),source=program.getSourceFile(path),symbols=[];
  for(const n of source.statements)if(ts.isImportDeclaration(n))for(const spec of n.importClause.namedBindings.elements){let symbol=checker.getSymbolAtLocation(spec.name);assert.ok(symbol);if(symbol.flags&ts.SymbolFlags.Alias)symbol=checker.getAliasedSymbol(symbol);const tags=symbol.getJsDocTags(checker).map(t=>t.name);assert.ok(tags.every(t=>!['deprecated','docs-private','breaking-change','experimental','developerPreview'].includes(t)));symbols.push({module:n.moduleSpecifier.text,symbol:spec.name.text,type_only:n.importClause.isTypeOnly,tags,declarations:symbol.getDeclarations().map(d=>({file:d.getSourceFile().fileName.slice(model.root.length+1),sha256:hash(d.getText(d.getSourceFile()))}))});}
  assert.equal(symbols.length,6);
  const negative=join(model.root,'invalid-sibling-types.ts');writeFileSync(negative,"import type {TemplateRef} from '@angular/core';import type {Direction} from '@angular/cdk/bidi';import type {MenuPositionX} from '@angular/material/menu';const t:TemplateRef<any>=23;const d:Direction='up';const x:MenuPositionX='center';\n");const invalid=ts.getPreEmitDiagnostics(ts.createProgram([negative],options));assert.equal(invalid.length,3);assert.ok(invalid.every(d=>d.file?.fileName===negative&&d.code===2322));
  subjects.push({line:model.line,Core:model.packages.get('@angular/core').version,CDK:model.packages.get('@angular/cdk').version,Material:model.packages.get('@angular/material').version,strict:true,skipLibCheck:false,diagnostics:0,symbols,invalid_type_controls:3});
 }
 const paths=new Set(q.body.inputs.map(m=>m.path));for(const p of ['tests/menu_panel_rebinding_public_probe.mjs','scripts/menu-panel-content-boundary.mjs',q.ref.path])paths.add(p);
 const result={schema_version:1,line,typescript:ts.version,node:process.version,typed_boundary:q.ref,subjects,inputs:[...paths].sort().map(path=>({path,sha256:hash(read(path))})),source_closures:0,source_rebindings_prepared:6,SDK_rewrites:false,actual_runtime_native_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};assert.ok(process.argv[2]);writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line,models:3,stable_type_bindings:18,invalid_controls:9,new_closures:0}));
}finally{loaded.dispose();}
