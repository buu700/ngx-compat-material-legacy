/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const require=createRequire(import.meta.url),root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=require('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p),'utf8');
const printer=ts.createPrinter({removeComments:true});
const basePath='projects/ngx-material-legacy/legacy-checkbox/internal/checkbox-base.ts';
const leafPath='projects/ngx-material-legacy/legacy-checkbox/checkbox.ts';
const capsulePath='compatibility/rc/checkbox-timer-original-subject.json',capsuleBytes=readFileSync(join(root,capsulePath));
assert.equal(hash(capsuleBytes),'5fd4014ac0c41c451308fef651a536131ae4bacd114548a4ef14e4e8824b9054');
const capsule=JSON.parse(capsuleBytes),original=gunzipSync(Buffer.from(capsule.gzip_base64,'base64')).toString();
assert.equal(hash(original),capsule.sha256);
const forwardBytes=readFileSync(join(root,'compatibility/rc/ng-zone-forwarding-original-subjects.json'));
assert.equal(hash(forwardBytes),'a134254a08ca621a5fef6b97c8b6da028d595f1120c8558d4d56f2d0d1740b92');
const member=JSON.parse(forwardBytes).members.find(m=>m.archive_member==='package/fesm2022/legacy-checkbox.mjs');
const originalLeaf=gunzipSync(Buffer.from(member.gzip_base64,'base64')).toString();assert.equal(hash(originalLeaf),member.sha256);
const base=read(basePath),leaf=read(leafPath);
function program(raw,name,parent) {
  const source=ts.createSourceFile('subject.ts',raw,ts.ScriptTarget.Latest,true);
  assert.equal(source.parseDiagnostics.length,0);
  const node=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.ok(node);
  const replay=ts.factory.updateClassDeclaration(node,[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier('Replay'),undefined,[ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword,
      [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(parent),undefined)])],
    node.members.filter(member=>{
      if(ts.isClassStaticBlockDeclaration(member)) {
        assert.ok(member.body.statements.every(statement=>ts.isExpressionStatement(statement)&&
          ts.isBinaryExpression(statement.expression)&&ts.isPropertyAccessExpression(statement.expression.left)&&
          ['ɵfac','ɵdir','ɵcmp'].includes(statement.expression.left.name.text)),
          'only compiled Angular metadata static blocks may be excluded');
        return false;
      }
      return !(member.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword)&&
        ['ɵfac','ɵdir','ɵcmp'].includes(member.name?.getText(source)));
    }));
  const transformed=ts.transform(replay,[context=>node=>ts.visitNode(node,function visit(n){
    return ts.isDecorator(n)?undefined:ts.visitEachChild(n,visit,context);
  })]);
  try{return ts.transpileModule(printer.printNode(ts.EmitHint.Unspecified,transformed.transformed[0],source),
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;}finally{transformed.dispose();}
}
const change=(raw,from,to)=>{assert.equal(raw.split(from).length-1,1,'mutation anchor');return raw.replace(from,to);};
const payload={original:program(original,'_MatCheckboxBase','TraitProtocol'),originalLeaf:program(originalLeaf,'MatLegacyCheckbox','Base'),
  base:program(base,'_MatCheckboxBase','TraitProtocol'),leaf:program(leaf,'MatLegacyCheckbox','Base'),mutations:{
    noReuse:program(change(base,'!this._checkboxDestroyed && !reused','!this._checkboxDestroyed'),'_MatCheckboxBase','TraitProtocol'),
    noCancel:program(change(base,'      clearTimeout(cleanup.timeout);\n',''),'_MatCheckboxBase','TraitProtocol'),
    noLateGuard:program(change(base,'!this._checkboxDestroyed && !reused','!reused'),'_MatCheckboxBase','TraitProtocol'),
    noClear:program(change(base,'    this._animationCleanups.clear();\n',''),'_MatCheckboxBase','TraitProtocol'),
    noDestroyCleanup:program(change(base,'      cleanup.element.classList.remove(cleanup.animationClass);\n',''),'_MatCheckboxBase','TraitProtocol'),
    noTransitionGuard:program(change(base,'    if (this._checkboxDestroyed) {\n      return;\n    }\n    let oldState','    let oldState'),'_MatCheckboxBase','TraitProtocol'),
    noLeafDestroy:program(change(leaf,'    super.ngOnDestroy();\n',''),'MatLegacyCheckbox','Base'),
  }};
const loaded=prepareMaterialPublicSubjects(root),results=[],types=[];
try{
  const compilerPath=process.env.CLOSEOUT_TYPESCRIPT_ROOT?join(process.env.CLOSEOUT_TYPESCRIPT_ROOT,'lib/typescript.js'):require.resolve('typescript');
  const compiler=require(compilerPath);
  const source=ts.createSourceFile('base.ts',base,ts.ScriptTarget.Latest,true);
  const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatCheckboxBase');
  const selected=['_checkboxDestroyed','_animationCleanups','_currentCheckState','_currentAnimationClass','_transitionCheckState','ngOnDestroy'];
  const fields=cls.members.filter(n=>selected.includes(n.name?.getText(source))).map(n=>printer.printNode(ts.EmitHint.Unspecified,n,source)).join('\n');
  assert.equal(cls.members.filter(n=>selected.includes(n.name?.getText(source))).length,selected.length);
  for(const model of loaded.models.filter(m=>m.line!=='original')){
    const fixture=`import{NgZone}from'@angular/core';
const enum TransitionCheckState{Init,Checked,Unchecked,Indeterminate}
class Receipt{constructor(private _ngZone:NgZone){}${fields}
private _getAnimationTargetElement():HTMLElement|null{return null;}
private _getAnimationClassForCheckStateTransition(_old:TransitionCheckState,_next:TransitionCheckState):string{return '';}}
declare const zone:NgZone;new Receipt(zone).ngOnDestroy();
// @ts-expect-error A genuine public zone is required.
new Receipt({});
// @ts-expect-error The owned destruction hook returns void.
const invalid:boolean=new Receipt(zone).ngOnDestroy();
// @ts-expect-error Browser timeout handles cannot be strings.
const timeout:ReturnType<typeof setTimeout>='invalid';
// @ts-expect-error The transition remains private.
new Receipt(zone)._transitionCheckState(TransitionCheckState.Checked);
`;
    const path=join(model.root,'checkbox-timer-types.ts');writeFileSync(path,fixture);
    const diagnostics=compiler.getPreEmitDiagnostics(compiler.createProgram([path],{strict:true,noEmit:true,skipLibCheck:false,types:[],
      target:compiler.ScriptTarget.ES2022,module:compiler.ModuleKind.ESNext,moduleResolution:compiler.ModuleResolutionKind.Bundler,
      lib:['lib.es2022.d.ts','lib.dom.d.ts']}));
    assert.equal(diagnostics.length,0,compiler.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
    types.push({line:model.line,compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),fixture_sha256:hash(fixture),negative_checks:4,actual_legacy_class_AOT_compiled:false});
  }
  const worker=read('tests/checkbox_timer_runtime_subject.mjs');
  for(const model of loaded.models){const zoneSubject=installNgZonePublicSubject(model,root);
    writeFileSync(join(model.root,'checkbox-timer-payload.json'),JSON.stringify(payload));
    const path=join(model.root,'checkbox-timer-subject.mjs');writeFileSync(path,worker);
    for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of[false,true]){
      const output=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path,model.line,mode,String(production)],
        {cwd:model.root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024}));
      results.push({line:model.line,mode,production,zone_subject:zoneSubject,borrowed:model.borrowed,...output});
    }
  }
  const report={schema_version:1,node:process.version,parser:ts.version,results,strict_types:types,
    sources:[basePath,leafPath,'tests/checkbox_timer_runtime_probe.mjs','tests/checkbox_timer_runtime_subject.mjs'].map(p=>({path:p,sha256:hash(read(p))})),
    original_subject:{path:capsulePath,sha256:hash(capsuleBytes)},public_namespace_capsule_sha256:loaded.capsule_hash,
    scope:'Whole original/current checkbox base and leaf constructors/business members with Angular decorators and compiled fac/dir/cmp metadata removed; genuine public Core NgZone/ElementRef/EventEmitter and CDK coercion. Parent traits, host/classList/input/focus-monitor/CDR/timer clock are protocols. Complete user-input handler drives transition states. No actual legacy Angular node DI, native CSS/clock, AOT/packed/consumer or Node/Rx floor qualification.'};
  assert.equal(results.length,10);
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({subjects:10,cases:results.reduce((n,r)=>n+r.cases.length,0),
    mutation_rejections:results.reduce((n,r)=>n+r.mutations.length,0),native_or_packed_qualified:false}));
}finally{loaded.dispose();}
