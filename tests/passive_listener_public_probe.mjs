/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {reviewPassiveListenerUses,inspectPassiveListenerDeclarations} from '../scripts/passive-listener-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const review=reviewPassiveListenerUses(),read=p=>readFileSync(join(root,p),'utf8'),source_mutations=[];
const slider='projects/ngx-material-legacy/legacy-slider/slider.ts',tabs='projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts';
for(const[id,path,change]of [
 ['normalizer-value-escape',slider,s=>s+'\nconsole.log(normalizePassiveListenerOptions);\n'],
 ['duplicate-public-import',slider,s=>s+"\nimport {normalizePassiveListenerOptions as Other} from '@angular/cdk/platform';\n"],
 ['type-only-public-import',slider,s=>s.replace('import {normalizePassiveListenerOptions}','import type {normalizePassiveListenerOptions}')],
 ['private-public-import',slider,s=>s.replace("from '@angular/cdk/platform'","from '@angular/cdk/platform/_passive-listeners'")],
 ['changed-historical-passivity',slider,s=>s.replace('normalizePassiveListenerOptions({passive: false})','normalizePassiveListenerOptions({passive: true})')],
 ['mutable-options-alias',slider,s=>s.replace('const activeEventOptions','let activeEventOptions')],
 ['options-value-escape',slider,s=>s+'\nconsole.log(activeEventOptions);\n'],
 ['options-property-write',slider,s=>s+'\nactiveEventOptions.capture = true;\n'],
 ['wrong-listener-argument',slider,s=>s.replace("element.addEventListener('mousedown', this._pointerDown, activeEventOptions)","element.addEventListener('mousedown', activeEventOptions, this._pointerDown)")],
 ['unknown-listener-receiver',slider,s=>s.replace("element.addEventListener('mousedown'","element.dispatchEvent('mousedown'")],
 ['wrong-from-event-import',tabs,s=>s.replace("from 'rxjs'","from 'rxjs/operators'")],
 ['nonliteral-option-input',slider,s=>s.replace('normalizePassiveListenerOptions({passive: false})','normalizePassiveListenerOptions(otherOptions)')],
 ['lost-remove-event-route',slider,s=>s.replace("element.removeEventListener('mousedown'","element.addEventListener('mousedown'")],
]){const before=read(path),after=change(before);assert.notEqual(after,before,id);assert.throws(()=>reviewPassiveListenerUses({readSource:p=>p===path?after:read(p)}),undefined,id);source_mutations.push(id);}
const loaded=prepareMaterialPublicSubjects(root),declarations=[],results=[],runtime_mutations=[],strict_types=[];
const worker=read('tests/passive_listener_public_subject.mjs');
try{
 for(const model of loaded.models){
  const declaration=inspectPassiveListenerDeclarations(model);declarations.push(declaration);
  if(declarations.length>1){assert.deepEqual(declaration.bodies,declarations[0].bodies);assert.equal(declaration.declaration,declarations[0].declaration);}
  const fixture=`import {normalizePassiveListenerOptions} from '@angular/cdk/platform';export const options=[${review.cases.map(r=>r.call_expression).join(',')}];`;
  writeFileSync(join(model.root,'passive_listener_options.mjs'),ts.transpileModule(fixture,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
  const path=join(model.root,'passive_listener_public_subject.mjs');writeFileSync(path,worker);
  for(const mode of ['supported','unsupported','ssr','throwing']){
   const result=JSON.parse(execFileSync(process.execPath,[path,model.line,mode],{cwd:model.root,encoding:'utf8',timeout:10000}));
   const runtime=declaration.runtime_sources.find(r=>r.name==='normalizePassiveListenerOptions');assert.equal(hash(result.public_function_source),runtime.function_source_sha256,'public export does not identify the authenticated function');delete result.public_function_source;
   const original=results.find(r=>r.line==='original'&&r.mode===mode);if(original)assert.deepEqual({...result,line:'original'},original);results.push(result);
  }
  const runtime=declaration.runtime_sources.find(r=>r.name==='normalizePassiveListenerOptions'),raw=model.sources.get(runtime.path),runtimePath=join(model.root,'node_modules',runtime.path);
  for(const[id,from,to,mode]of [
   ['lost-supported-object-identity','? options :','? {...options} :','supported'],
   ['lost-capture-boolean','!!options.capture','options.capture','unsupported'],
   ['wrong-capture-fallback','!!options.capture','!!options.passive','unsupported'],
   ['lost-feature-detection-cache','supportsPassiveEvents == null && ','','supported'],
  ]){
   assert.equal(raw.split(from).length,2,id);writeFileSync(runtimePath,raw.replace(from,to));
   const result=spawnSync(process.execPath,[path,model.line,mode],{cwd:model.root,encoding:'utf8',timeout:10000});assert.notEqual(result.status,0,id+' escaped');assert.match(result.stderr,/AssertionError/,id+' failed outside the assertion');runtime_mutations.push({line:model.line,id});
  }
  writeFileSync(runtimePath,raw);
  const code=fixture+`\nconst input:Readonly<AddEventListenerOptions>={passive:true,capture:true};const output:AddEventListenerOptions|boolean=normalizePassiveListenerOptions(input);
// @ts-expect-error Input options remain an object.
normalizePassiveListenerOptions('invalid');
// @ts-expect-error Passive remains boolean.
normalizePassiveListenerOptions({passive:'yes'});
// @ts-expect-error Capture remains boolean.
normalizePassiveListenerOptions({capture:1});
// @ts-expect-error Unknown options are rejected.
normalizePassiveListenerOptions({unrecognized:true});
// @ts-expect-error Unsupported environments can return a boolean.
const objectOnly:AddEventListenerOptions=normalizePassiveListenerOptions(input);
// @ts-expect-error An options argument remains required.
normalizePassiveListenerOptions();`;
  const entry=join(model.root,'consumer.ts');writeFileSync(entry,code);
  const options={strict:true,skipLibCheck:false,noEmit:true,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,lib:['lib.es2022.d.ts','lib.dom.d.ts']};
  const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([entry],options));assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  strict_types.push({line:model.line,compiler:ts.version,strict:true,skip_lib_check:false,negative_controls:6,exact_owned_option_calls:4,fixture_sha256:hash(code),scope:'Complete genuine public platform/Core declarations and DOM library; exact option calls only, not whole owned component/AOT/packed/floor compilation'});
 }
 console.log(JSON.stringify({schema_version:1,line:review.line,source_review:review,declarations,results,strict_types,source_mutations,runtime_mutations,public_subject_capsule_sha256:loaded.capsule_hash,node:process.version,compiler:ts.version,borrowed:loaded.models.map(m=>({line:m.line,packages:m.borrowed})),native_execution:false,full_packed_consumer_build_executed:false,g11_claim:'not-passed'},null,2));
}finally{loaded.dispose();}
