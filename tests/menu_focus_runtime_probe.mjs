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
const originalPath = 'reference/material-16.2.14/menu-focus-sources/menu.ts';
const candidatePath = 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts';
const helperPath = 'projects/ngx-material-legacy/legacy-core/internal/motion-event.ts';
const read = path => readFileSync(join(root, path), 'utf8');
const original = read(originalPath), candidate = read(candidatePath), helper = read(helperPath);
assert.equal(hash(original), '6331b83ef79611313f58650d4813eb0de44c2710deec830a292674328afc2bef');
const emit = text => ts.transpileModule(text, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true}}).outputText;
const parse = text => {const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;};
const printer = ts.createPrinter({removeComments: true});
function helperProgram(text) {
  const source = parse(text); return emit(source.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getFullText(source)).join('\n'));
}
function owner(text, name = '_MatMenuBase') {
  const source = parse(text), cls = source.statements.find(node => ts.isClassDeclaration(node) &&
    node.name?.text === name); assert.ok(cls); return {source, cls};
}
function bodyProgram(text, name = '_MatMenuBase', parent = null) {
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
const baselineMode=process.argv.includes('--baseline');
const baseline=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show','ae08317bb:'+candidatePath],{cwd:root,encoding:'utf8'});
const constructorText=text=>{const {source,cls}=owner(text);return cls.members.filter(ts.isConstructorDeclaration).map(node=>printer.printNode(ts.EmitHint.Unspecified,node,source));};
assert.deepEqual(constructorText(candidate),constructorText(original));
assert.deepEqual(constructorText(candidate),constructorText(baseline));
function abi(text){const {source,cls}=owner(text);return cls.members.filter(node=>!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword))
 .map(node=>[node.kind,node.name?.getText(source),node.type?.getText(source),node.parameters?.map(p=>[p.name.getText(source),p.type?.getText(source),!!p.questionToken])]);}
assert.deepEqual(abi(candidate),abi(baseline));
const changed=(text,from,to)=>{const value=text.replace(from,to);assert.notEqual(value,text);return value;};
const mutations=baselineMode?{}:{
 prior:bodyProgram(baseline),
 noClosedGuard:bodyProgram(changed(candidate,'request.closed || this._motionDestroyed','this._motionDestroyed')),
 noEntryGuard:bodyProgram(changed(candidate,"focusFirstItem(origin: FocusOrigin = 'program'): void {\n    if (this._motionDestroyed) return;","focusFirstItem(origin: FocusOrigin = 'program'): void {")),
 noClearActive:bodyProgram(changed(candidate,'    this._keyManager?.updateActiveItem(-1);','')),
 noContinuationGuard:bodyProgram(changed(candidate,'manager.setFocusOrigin(origin).setFirstItemActive();\n      if (this._motionDestroyed) return;','manager.setFocusOrigin(origin).setFirstItemActive();')),
 noCloseCancel:bodyProgram(changed(candidate,'    this._firstItemFocusSubscription?.unsubscribe();\n    const sequence = ++this._motionSequence;','    const sequence = ++this._motionSequence;')),
};
const loaded=prepareMaterialPublicSubjects(root),results=[];
try{
 const compilerPath=process.env.CLOSEOUT_TYPESCRIPT_ROOT?join(process.env.CLOSEOUT_TYPESCRIPT_ROOT,'lib/typescript.js'):require.resolve('typescript');
 const compiler=require(compilerPath),types=[];
 if(!baselineMode)for(const model of loaded.models.filter(model=>model.line!=='original')){
  const {source,cls}=owner(candidate),method=cls.members.find(node=>node.name?.getText(source)==='focusFirstItem');
  const fixture=`import{NgZone}from'@angular/core';import{FocusOrigin}from'@angular/cdk/a11y';
import{Subscription}from'rxjs';import{take}from'rxjs/operators';
export class Receipt{private _motionDestroyed=false;private _firstItemFocusSubscription?:Subscription;
constructor(private _ngZone:NgZone){}private _applyFirstItemFocus(origin:FocusOrigin){}
${printer.printNode(ts.EmitHint.Unspecified,method,source)}}
declare const zone:NgZone;new Receipt(zone).focusFirstItem('touch');
// @ts-expect-error A genuine public zone is required.
new Receipt({});
// @ts-expect-error Focus origin retains the public finite literals.
new Receipt(zone).focusFirstItem('foreign');
// @ts-expect-error Public stability is readonly.
zone.isStable=true;
// @ts-expect-error The request lifetime stays private.
new Receipt(zone)._firstItemFocusSubscription;
`;
  const path=join(model.root,'menu-focus-type-receipt.ts');writeFileSync(path,fixture);
  const program=compiler.createProgram([path],{target:compiler.ScriptTarget.ES2022,module:compiler.ModuleKind.ESNext,
   moduleResolution:compiler.ModuleResolutionKind.Bundler,strict:true,noEmit:true,skipLibCheck:false,lib:['lib.es2022.d.ts','lib.dom.d.ts']});
  const diagnostics=compiler.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,compiler.formatDiagnostics(diagnostics,{getCanonicalFileName:path=>path,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  types.push({line:model.line,fixture_sha256:hash(fixture),negative_checks:4});
 }
 const subjectPath='tests/menu_focus_runtime_subject.mjs',subjectScript=read(subjectPath);
 for(const model of loaded.models){const zoneSubject=installNgZonePublicSubject(model,root);
  writeFileSync(join(model.root,'menu-focus-payload.json'),JSON.stringify({original:bodyProgram(original),candidate:bodyProgram(candidate),mutations}));
  const path=join(model.root,'menu-focus-runtime-subject.mjs');writeFileSync(path,subjectScript);
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){
   const value=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path,model.line,mode,String(production),String(baselineMode)],{cwd:model.root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
   results.push({line:model.line,mode,production,zone_subject:zoneSubject,...value});
  }
 }
 const report={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',
  sources:[candidatePath,subjectPath].map(path=>({path,sha256:hash(read(path))})),reference:{path:originalPath,sha256:hash(original)},
  node:process.version,binding_parser:ts.version,namespace_capsule_sha256:loaded.capsule_hash,results,
  existing_constructor_and_public_declarations_unchanged:true,baseline_mode:baselineMode,
  type_compilation:{compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),subjects:types},
  scope:'Whole original/owned menu constructors and members replayed without Angular decorators. Genuine public NgZone, QueryList, EventEmitter and FocusKeyManager, with current public-provider application. Host/panel/document geometry, item focus/label/hover protocol, default options/CDR and animation-policy result are protocols. No actual legacy Angular node DI/menu item implementations, DOM focus/styles/native motion, packed/AOT/consumer build or Rx/Node floors.',
  native_or_actual_legacy_instances_qualified:false,g11_claim:'not-passed'};
 assert.equal(results.length,10);
 const reportPath=process.argv.slice(2).find(arg=>arg!=='--baseline');
 if(reportPath)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:report.line,subjects:10,mutation_rejections:results.flatMap(row=>row.mutations).length,
  baseline_failures:results.flatMap(row=>row.cases).filter(row=>row.result==='fail').length,
  compiler:compiler.version,native_executed:false,actual_legacy_instances_qualified:false}));
}finally{loaded.dispose();}
