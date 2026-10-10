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
const originalPath = 'reference/material-16.2.14/snack-exit-sources/snack-bar-container.ts';
const candidatePath = 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts';
const helperPath = 'projects/ngx-material-legacy/legacy-core/internal/motion-event.ts';
const read = path => readFileSync(join(root, path), 'utf8');
const original = read(originalPath), candidate = read(candidatePath), helper = read(helperPath);
assert.equal(hash(original), 'b05c4729015b916f7cb654809d86f9ba3e51e9a9a14b68ad34a47dce1602ff47');
const emit = text => ts.transpileModule(text, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true}}).outputText;
const parse = text => {const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;};
const printer = ts.createPrinter({removeComments: true});
function helperProgram(text) {
  const source = parse(text); return emit(source.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getFullText(source)).join('\n'));
}
function owner(text, name = '_MatSnackBarContainerBase') {
  const source = parse(text), cls = source.statements.find(node => ts.isClassDeclaration(node) &&
    node.name?.text === name); assert.ok(cls); return {source, cls};
}
function bodyProgram(text, name = '_MatSnackBarContainerBase', parent = 'PortalProtocol') {
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
const refPath='projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-ref.ts';
const originalRefPath='reference/material-16.2.14/snack-exit-sources/snack-bar-ref.ts';
const leafPath='projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts';
const originalRef=read(originalRefPath),reference=read(refPath),leaf=read(leafPath);
assert.equal(hash(originalRef),'dd0c31f1907650bf197f97b75de8eaac94d4cb203e9ed01c4b872cb5bfba8f66');
assert.equal(bodyProgram(reference,'MatSnackBarRef',null),bodyProgram(originalRef,'MatSnackBarRef',null));
const baseline=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show','ba7d09b6c:'+candidatePath],{cwd:root,encoding:'utf8'});
const constructorText=text=>{const {source,cls}=owner(text);return printer.printNode(ts.EmitHint.Unspecified,cls.members.find(ts.isConstructorDeclaration),source);};
assert.equal(constructorText(candidate),constructorText(original));
assert.equal(constructorText(candidate),constructorText(baseline));
function abi(text){const {source,cls}=owner(text);return cls.members.filter(node=>!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword))
 .map(node=>[node.kind,node.name?.getText(source),node.type?.getText(source),node.parameters?.map(p=>[p.name.getText(source),p.type?.getText(source),!!p.questionToken])]);}
assert.deepEqual(abi(candidate),abi(baseline));
const changed=(text,from,to)=>{const value=text.replace(from,to);assert.notEqual(value,text);return value;};
const mutations={
 priorWait:bodyProgram(baseline),
 synchronous:bodyProgram(changed(candidate,'queueMicrotask(finish);','finish();')),
 noGuard:bodyProgram(changed(candidate,'    if (this._exitCompletionPending) {\n      return;\n    }','')),
 alwaysStable:bodyProgram(changed(candidate,'if (zone.isStable)','if (true)')),
 noOnce:bodyProgram(changed(candidate,'zone.onMicrotaskEmpty.pipe(take(1)).subscribe(finish)','zone.onMicrotaskEmpty.subscribe(finish)')),
 noRun:bodyProgram(changed(candidate,'zone.run(() => {\n        onExit.next();\n        onExit.complete();\n      });','onExit.next();\n      onExit.complete();')),
};
const loaded=prepareMaterialPublicSubjects(root),results=[];
try {
 const compilerPath=process.env.CLOSEOUT_TYPESCRIPT_ROOT?join(process.env.CLOSEOUT_TYPESCRIPT_ROOT,'lib/typescript.js'):require.resolve('typescript');
 const compiler=require(compilerPath),types=[];
 const {source,cls}=owner(candidate),completion=cls.members.find(node=>node.name?.getText(source)==='_completeExit');
 const completionText=printer.printNode(ts.EmitHint.Unspecified,completion,source);
 for(const model of loaded.models.filter(model=>model.line!=='original')){
  const fixture=`import{NgZone}from'@angular/core';import{Subject}from'rxjs';import{take}from'rxjs/operators';
export class Receipt{private _exitCompletionPending=false;readonly _onExit=new Subject<void>();
constructor(private _ngZone:NgZone){}${completionText}}
declare const zone:NgZone;
new Receipt(zone);
// @ts-expect-error A genuine public zone is required.
new Receipt({});
// @ts-expect-error Public zone stability is readonly.
zone.isStable=true;
// @ts-expect-error Exit payload stays void.
new Receipt(zone)._onExit.next(true);
// @ts-expect-error Completion is privately owned.
new Receipt(zone)._completeExit();
`;
  const path=join(model.root,'snack-exit-type-receipt.ts');writeFileSync(path,fixture);
  const program=compiler.createProgram([path],{target:compiler.ScriptTarget.ES2022,module:compiler.ModuleKind.ESNext,
   moduleResolution:compiler.ModuleResolutionKind.Bundler,strict:true,noEmit:true,skipLibCheck:false,lib:['lib.es2022.d.ts','lib.dom.d.ts']});
  const diagnostics=compiler.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,compiler.formatDiagnostics(diagnostics,{getCanonicalFileName:path=>path,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  types.push({line:model.line,fixture_sha256:hash(fixture),negative_checks:4});
 }
 const subjectPath='tests/snack_exit_runtime_subject.mjs',subjectScript=read(subjectPath);
 for(const model of loaded.models){
  const zoneSubject=installNgZonePublicSubject(model,root);
  writeFileSync(join(model.root,'snack-exit-payload.json'),JSON.stringify({original:bodyProgram(original),candidate:bodyProgram(candidate),
   leaf:bodyProgram(leaf,'MatLegacySnackBarContainer','OwnedBase'),ref:bodyProgram(reference,'MatSnackBarRef',null),motion:helperProgram(helper),mutations}));
  const path=join(model.root,'snack-exit-runtime-subject.mjs');writeFileSync(path,subjectScript);
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){
   const value=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path,model.line,mode,String(production)],{cwd:model.root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
   results.push({line:model.line,mode,production,zone_subject:zoneSubject,...value});
  }
 }
 const report={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',
  sources:[candidatePath,refPath,leafPath,helperPath,subjectPath].map(path=>({path,sha256:hash(read(path))})),
  references:[originalPath,originalRefPath].map(path=>({path,sha256:hash(read(path))})),node:process.version,binding_parser:ts.version,
  namespace_capsule_sha256:loaded.capsule_hash,results,existing_constructor_and_public_declarations_unchanged:true,
  reference_class_body_identical:true,type_compilation:{compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),subjects:types},
  scope:'Whole original/owned base constructors/members, actual owned CSS-motion subclass, owned motion-event helper and complete historical reference class replayed without Angular decorators. Genuine public NgZone, Injector/runInInjectionContext/DOCUMENT and current public-provider application. Portal parent, host DOM, CDR, platform/config, animation-policy return and timeout clock are protocols. Historical pending subscriptions are explicitly canceled only by fixture cleanup. No actual legacy Angular node DI, native CSS frames/event/overlay, packed/AOT/consumer build or Rx/Node floors.',
  native_or_actual_legacy_instances_qualified:false,g11_claim:'not-passed'};
 assert.equal(results.length,10);
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:report.line,subjects:10,mutation_rejections:results.flatMap(row=>row.mutations).length,
  compiler:compiler.version,native_executed:false,actual_legacy_instances_qualified:false}));
}finally{loaded.dispose();}
