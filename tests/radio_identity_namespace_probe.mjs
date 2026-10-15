/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {prepareRadioIdentitySubjects,inspectRadioIdentityNamespace,radioIdentityPath,radioIdentityEdits} from '../scripts/radio-identity-namespace.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex');
const source=readFileSync(join(root,radioIdentityPath),'utf8'),identity=inspectRadioIdentityNamespace({root}),entry=join(root,radioIdentityPath);
function compile(source){
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true,useDefineForClassFields:false,noLib:true,noEmitOnError:false};
 const host=ts.createCompilerHost(options),read=host.readFile.bind(host);host.readFile=file=>file===entry?source:read(file);
 const program=ts.createProgram([entry],options,host),emitted=new Map(),result=[],seen=new Set();assert.equal(program.getSyntacticDiagnostics().length,0);program.emit(undefined,(file,text)=>emitted.set(file,text));
 function visit(file){if(seen.has(file))return;seen.add(file);assert.ok(file.startsWith(join(root,'projects/ngx-material-legacy')+'/'));let compiled=emitted.get(file.slice(0,-3)+'.js');assert.equal(typeof compiled,'string');const sf=ts.createSourceFile(file,compiled,ts.ScriptTarget.Latest,true),edits=[];
  for(const node of sf.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&node.moduleSpecifier.text.startsWith('.')){const spec=node.moduleSpecifier.text,base=resolve(dirname(file),spec),target=[base+'.ts',join(base,'index.ts')].find(existsSync);assert.ok(target,'missing owned dependency');visit(target);const path=relative(dirname(file),target).replace(/\.ts$/,'.mjs');edits.push([node.moduleSpecifier.getStart(sf),node.moduleSpecifier.end,JSON.stringify(path.startsWith('.')?path:'./'+path)]);}
  for(const [start,end,text] of edits.sort((a,b)=>b[0]-a[0]))compiled=compiled.slice(0,start)+text+compiled.slice(end);
  const raw=file===entry?Buffer.from(source):readFileSync(file);result.push({path:relative(root,file),sha256:hash(raw),bytes:raw.length,compiled});
 }
 visit(entry);return result.sort((a,b)=>a.path.localeCompare(b.path));
}
const variants=[{id:'after',source},...radioIdentityEdits.map(([before,after],i)=>({id:i?'old-button-id':'old-group-name',source:source.replace(after,before)})),{id:'before',source:radioIdentityEdits.reduce((text,[before,after])=>text.replace(after,before),source)}];
const sourceControls=[variants[1].source,variants[2].source,source+'\n// unreviewed byte change\n',source.replace('private _value: any = null;','private _value: any = 0;')];
for(const changed of sourceControls)assert.throws(()=>inspectRadioIdentityNamespace({root,readSource:p=>p===radioIdentityPath?changed:readFileSync(join(root,p))}));
const compiled=new Map(variants.map(v=>[v.id,compile(v.source)])),loaded=prepareRadioIdentitySubjects(root),worker=readFileSync(join(root,'tests/radio_identity_namespace_subject.mjs')),results=[];
try{for(const model of loaded.models){
 writeFileSync(join(model.root,'worker.mjs'),worker);
 for(const variant of model.line==='original'?[variants[0]]:variants){
  const modules=compiled.get(variant.id),folder=join(model.root,'owned',variant.id);
  for(const module of modules){const target=join(folder,module.path.replace(/\.ts$/,'.mjs'));mkdirSync(dirname(target),{recursive:true});writeFileSync(target,module.compiled);}
  const args=[join(model.root,'worker.mjs'),model.line,variant.id,join(folder,radioIdentityPath.replace(/\.ts$/,'.mjs'))];
  const result=JSON.parse(execFileSync(process.execPath,args,{cwd:model.root,encoding:'utf8',timeout:20000}));
  if(variant.id==='after')assert.deepEqual(result.failures,[]);else assert.ok(result.failures.includes(variant.id==='old-button-id'?'generated-button-identities':'default-group-independence'),'pre-repair mutant must fail its actual interaction/identity obligation');
  results.push(result);
 }
}}finally{loaded.dispose();}
const report={schema_version:1,line:JSON.parse(readFileSync(join(root,'compatibility/rc/radio-identity-namespace-worksheet.json'))).line,node:process.version,compiler:ts.version,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),helper_sha256:hash(readFileSync(join(root,'scripts/radio-identity-namespace.mjs'))),source:identity,compiled_owned_modules:compiled.get('after').map(({compiled,...m})=>m),source_requalification_negatives:sourceControls.length,runtime_capsule:loaded.radio_runtime_capsule,subjects:loaded.models.map(m=>({line:m.line,packages:m.radio_runtime_subject.packages,dispatcher_contract:m.contract,borrowed:m.borrowed,borrowed_zone:m.borrowed_zone})),results,limits:['Actual full owned base/common-behavior class module constructors and public peer constructors where stated; explicit document/renderer/element/focus/change detector protocols.','No full Angular owned component node/template/factory/AOT/packed/native browser or minimum compiler/Node/RxJS execution claim.'],g11_claim:'not-passed'};
const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({line:report.line,subjects:loaded.models.length,source_requalification_negatives:sourceControls.length,contexts:results.length,positive:results.filter(r=>r.variant==='after').length,negative:results.filter(r=>r.variant!=='after').length,owned_modules:report.compiled_owned_modules.length}));
