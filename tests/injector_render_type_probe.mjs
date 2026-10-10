/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual helper source and nondeprecated resolved public Injector signatures. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {renderInjectorRecipes,reviewRenderInjectorUses} from '../scripts/injector-render-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=path=>readFileSync(join(root,path),'utf8');
const review=reviewRenderInjectorUses({root});
let controls=0;
for(const recipe of renderInjectorRecipes) {
  const path='projects/ngx-material-legacy/'+recipe.file,text=read(path);
  const wrong=text.replace('get(ApplicationRef, null)','get(ApplicationRef, null, 8)');assert.notEqual(wrong,text);
  assert.throws(()=>reviewRenderInjectorUses({root,readSource:p=>p===path?wrong:read(p)}));controls++;
  const owning=text.replace('rendered?.destroy();','injector?.destroy();');assert.notEqual(owning,text);
  assert.throws(()=>reviewRenderInjectorUses({root,readSource:p=>p===path?owning:read(p)}));controls++;
}
for(const file of ['legacy-form-field/form-field.ts','legacy-select/internal/select-base.ts']) {
  const path='projects/ngx-material-legacy/'+file,text=read(path),changed=text.replace('_injector?: Injector','_injector: Injector');
  assert.notEqual(changed,text);assert.throws(()=>reviewRenderInjectorUses({root,readSource:p=>p===path?changed:read(p)}));controls++;
}
const loaded=prepareMaterialPublicSubjects(root),types=[];
try {for(const model of loaded.models.filter(m=>m.line!=='original')) {
  const directory=join(model.root,'injector-render-helpers');mkdirSync(directory);
  const paths=[];
  for(const [index,recipe] of renderInjectorRecipes.entries()) {
    const path=join(directory,'helper-'+index+'.ts');writeFileSync(path,read('projects/ngx-material-legacy/'+recipe.file));paths.push(path);
  }
  const fixture=join(directory,'consumer.ts');const fixtureText=`import {Injector,NgZone} from '@angular/core';
import {afterLegacyRender} from './helper-0';
import {afterFormFieldRender} from './helper-1';
import {afterSelectRender} from './helper-2';
import {afterTabHeaderRender,tabHeaderRenderInjector} from './helper-3';
import {afterTooltipRender} from './helper-4';
declare const zone:NgZone,injector:Injector;
afterLegacyRender(zone,injector);afterTooltipRender(zone,injector);
afterFormFieldRender(zone);afterFormFieldRender(zone,null);
afterSelectRender(zone);afterSelectRender(zone,null);
afterTabHeaderRender(zone,null);const captured:Injector|null=tabHeaderRenderInjector();
// @ts-expect-error A helper cannot accept an arbitrary object in place of the public Injector.
afterLegacyRender(zone,{});
// @ts-expect-error The required tooltip argument preserves its Injector domain.
afterTooltipRender(zone,{});
// @ts-expect-error A manual tab header may have no captured context.
const definite:Injector=tabHeaderRenderInjector();
`;
  writeFileSync(fixture,fixtureText);const program=ts.createProgram([...paths,fixture],{target:ts.ScriptTarget.ES2022,
    module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,noEmit:true,
    skipLibCheck:false,types:[],lib:['lib.es2022.d.ts','lib.dom.d.ts']});
  const diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  const checker=program.getTypeChecker(),gets=[];
  for(const path of paths) {
    const source=program.getSourceFile(path);const visit=n=>{
      if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='get') {
        const signature=checker.getResolvedSignature(n);assert.ok(signature);assert.ok(!signature.getJsDocTags().some(t=>t.name==='deprecated'));
        const declaration=signature.getDeclaration();assert.ok(declaration);assert.equal(declaration.parent.name.text,'Injector');
        gets.push({helper:path.slice(directory.length+1),call:n.getText(source),signature:declaration.getText(declaration.getSourceFile()),declaration_sha256:hash(declaration.getSourceFile().text)});
      }ts.forEachChild(n,visit);
    };visit(source);
  }
  assert.equal(gets.length,5);types.push({line:model.line,strict:true,skipLibCheck:false,diagnostics:0,negative_types:3,fixture_sha256:hash(fixtureText),resolved_nondeprecated_gets:gets});
}
const result={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',node:process.version,compiler:ts.version,source_review:review,source_negative_controls:controls,types,namespace_capsule_sha256:loaded.capsule_hash,limits:['Actual helper source compiles against whole authenticated current minimum declarations with borrowed RxJS/tslib and host compiler. Source controls reject numeric get flags, destroying borrowed contexts and required trailing constructor arguments.','No actual legacy component/factory/node DI, native/packed/AOT or complete supported compiler/runtime/RxJS floor execution. Five family render runtime replays are recorded separately.'],g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({uses:review.cases.length,source_negative_controls:controls,strict_minimum_declaration_subjects:types.length,resolved_nondeprecated_gets:types.flatMap(t=>t.resolved_nondeprecated_gets).length,negative_types_per_subject:3,g11_claim:'not-passed'}));
} finally {loaded.dispose();}
