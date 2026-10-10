/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole constructors/members, excluding Angular decorators; genuine hooks, explicit protocols. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = text => createHash('sha256').update(text).digest('hex');
const originalPath = 'reference/material-16.2.14/chips-keyboard-sources/chip.ts';
const candidatePath = 'projects/ngx-material-legacy/legacy-chips/chip.ts';
const helperPath = 'projects/ngx-material-legacy/legacy-core/internal/motion-event.ts';
const read = path => readFileSync(join(root, path), 'utf8');
const original = read(originalPath), candidate = read(candidatePath), helper = read(helperPath);
assert.equal(hash(original), 'a3809031dbb69a835b3766f2af6052073939bab62a70161fe57e39260377fe5a');
const emit = text => ts.transpileModule(text, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true}}).outputText;
const parse = text => {const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;};
const printer = ts.createPrinter({removeComments: true});
function helperProgram(text) {
  const source = parse(text); return emit(source.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getFullText(source)).join('\n'));
}
function owner(text, name = 'MatLegacyChip') {
  const source = parse(text), cls = source.statements.find(node => ts.isClassDeclaration(node) &&
    node.name?.text === name); assert.ok(cls); return {source, cls};
}
function bodyProgram(text, name = 'MatLegacyChip', parent = 'TraitsProtocol') {
  const {source, cls} = owner(text,name);
  const replay = ts.factory.updateClassDeclaration(cls, [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('Replay'), undefined, parent ? [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword,
      [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(parent),undefined)])] : undefined, cls.members);
  const transformed = ts.transform(replay, [context => node => {
    const visit = node => ts.isDecorator(node) ? undefined : ts.visitEachChild(node, visit, context);
    return ts.visitNode(node, visit);
  }]);
  try {return emit(printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], source));}
  finally {transformed.dispose();}
}
const listPath='projects/ngx-material-legacy/legacy-chips/chip-list.ts',originalListPath='reference/material-16.2.14/chip-blur-sources/chip-list.ts';
const list=read(listPath),originalList=read(originalListPath);assert.equal(hash(originalList),'83c17cd61f9ecb8cc4dcc7947a493a78a93a6b880d3c69f9284eb39106662414');
function listProgram(text){const {source,cls}=owner(text,'MatLegacyChipList');
 const names=['focused','chipFocusChanges','chipBlurChanges','_listenToChipsFocus','_hasFocusedChip','_blur','_markAsTouched','_isValidIndex'];
 const members=cls.members.filter(node=>names.includes(node.name?.getText(source)));assert.equal(members.length,names.length);
 const value=ts.factory.updateClassDeclaration(cls,[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],ts.factory.createIdentifier('ListReplay'),undefined,undefined,members);
 return emit(printer.printNode(ts.EmitHint.Unspecified,value,source));}
assert.equal(listProgram(list),listProgram(originalList));
const baselineMode=process.argv.includes('--baseline');
const baseline=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show','a4a73580a:'+candidatePath],{cwd:root,encoding:'utf8'});
const constructorText=text=>{const {source,cls}=owner(text);return cls.members.filter(ts.isConstructorDeclaration).map(node=>printer.printNode(ts.EmitHint.Unspecified,node,source));};
assert.deepEqual(constructorText(candidate),constructorText(original));assert.deepEqual(constructorText(candidate),constructorText(baseline));
function abi(text){const {source,cls}=owner(text);return cls.members.filter(node=>!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword))
 .map(node=>[node.kind,node.name?.getText(source),node.type?.getText(source),node.parameters?.map(p=>[p.name.getText(source),p.type?.getText(source),!!p.questionToken])]);}
assert.deepEqual(abi(candidate),abi(baseline));
const changed=(text,from,to)=>{const value=text.replace(from,to);assert.notEqual(value,text);return value;};
const mutations=baselineMode?{}:{
 prior:bodyProgram(baseline),
 noDestroyCancel:bodyProgram(changed(candidate,'    this._isDestroyed = true;\n    this._blurSubscription?.unsubscribe();','    this._isDestroyed = true;')),
 noFocusCancel:bodyProgram(changed(candidate,'focus(): void {\n    if (this._isDestroyed) return;\n    this._blurSubscription?.unsubscribe();','focus(): void {\n    if (this._isDestroyed) return;')),
 noReplaceCancel:bodyProgram(changed(candidate,'_blur(): void {\n    if (this._isDestroyed) return;\n    this._blurSubscription?.unsubscribe();','_blur(): void {\n    if (this._isDestroyed) return;')),
 noEntryGuard:bodyProgram(changed(candidate,'_blur(): void {\n    if (this._isDestroyed) return;','_blur(): void {')),
};
const loaded=prepareMaterialPublicSubjects(root),results=[];
try{
 const compilerPath=process.env.CLOSEOUT_TYPESCRIPT_ROOT?join(process.env.CLOSEOUT_TYPESCRIPT_ROOT,'lib/typescript.js'):require.resolve('typescript');
 const compiler=require(compilerPath),types=[];
 if(!baselineMode)for(const model of loaded.models.filter(model=>model.line!=='original')){
  const {source,cls}=owner(candidate),method=cls.members.find(node=>node.name?.getText(source)==='_blur');
  const fixture=`import{NgZone}from'@angular/core';import{Subscription,Subject}from'rxjs';import{take}from'rxjs/operators';
export class Receipt{private _isDestroyed=false;private _blurSubscription?:Subscription;_hasFocus=true;
readonly _onBlur=new Subject<{chip:Receipt}>();constructor(private _ngZone:NgZone){}
${printer.printNode(ts.EmitHint.Unspecified,method,source)}}
declare const zone:NgZone;new Receipt(zone)._blur();
// @ts-expect-error A genuine public zone is required.
new Receipt({});
// @ts-expect-error Public stability is readonly.
zone.isStable=true;
// @ts-expect-error Chip payload identity remains typed.
new Receipt(zone)._onBlur.next({chip:1});
// @ts-expect-error The request lifetime stays private.
new Receipt(zone)._blurSubscription;
`;
  const path=join(model.root,'chip-blur-type-receipt.ts');writeFileSync(path,fixture);
  const program=compiler.createProgram([path],{target:compiler.ScriptTarget.ES2022,module:compiler.ModuleKind.ESNext,
   moduleResolution:compiler.ModuleResolutionKind.Bundler,strict:true,noEmit:true,skipLibCheck:false,lib:['lib.es2022.d.ts','lib.dom.d.ts']});
  const diagnostics=compiler.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,compiler.formatDiagnostics(diagnostics,{getCanonicalFileName:path=>path,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  types.push({line:model.line,fixture_sha256:hash(fixture),negative_checks:4});
 }
 const subjectPath='tests/chip_blur_runtime_subject.mjs',subjectScript=read(subjectPath);
 for(const model of loaded.models){const zoneSubject=installNgZonePublicSubject(model,root);
  writeFileSync(join(model.root,'chip-blur-payload.json'),JSON.stringify({original:bodyProgram(original),candidate:bodyProgram(candidate),list:listProgram(list),originalList:listProgram(originalList),mutations}));
  const path=join(model.root,'chip-blur-runtime-subject.mjs');writeFileSync(path,subjectScript);
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){
   const value=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path,model.line,mode,String(production),String(baselineMode)],{cwd:model.root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
   results.push({line:model.line,mode,production,zone_subject:zoneSubject,...value});
  }
 }
 const report={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',
  sources:[candidatePath,listPath,subjectPath].map(path=>({path,sha256:hash(read(path))})),references:[originalPath,originalListPath].map(path=>({path,sha256:hash(read(path))})),
  node:process.version,binding_parser:ts.version,namespace_capsule_sha256:loaded.capsule_hash,results,
  existing_constructor_and_public_declarations_unchanged:true,selected_list_members_equal_untouched_tag:true,baseline_mode:baselineMode,
  type_compilation:{compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),subjects:types},
  scope:'Whole original/owned chip constructors/members replayed with trait/ripple/DOM/CDR/platform/document protocols and Angular decorators removed. Eight complete list focus/blur/query/form-state members match the untouched tag; list constructor and remaining members are not executed. Genuine public NgZone, QueryList, EventEmitter, FocusKeyManager, FormControl and current public-provider application. No actual Angular legacy chip/list node DI, ripple renderer, native DOM focus/styles, packed/AOT/consumer build or Rx/Node floors.',
  native_or_actual_legacy_instances_qualified:false,g11_claim:'not-passed'};
 assert.equal(results.length,10);const reportPath=process.argv.slice(2).find(arg=>arg!=='--baseline');
 if(reportPath)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:report.line,subjects:10,mutation_rejections:results.flatMap(row=>row.mutations).length,
  baseline_failures:results.flatMap(row=>row.cases).filter(row=>row.result==='fail').length,
  compiler:compiler.version,native_executed:false,actual_legacy_instances_qualified:false}));
}finally{loaded.dispose();}
