/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Native wiring negatives and real minimum template parsers; no browser execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runInNewContext} from 'node:vm';
import {dialogTitleLifetimeFixture,legacyDialogTitleLifetimeNativeOkay as okay} from '../scripts/dialog-title-lifetime-fixture.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const worksheet=JSON.parse(readFileSync(join(root,'compatibility/rc/dialog-title-native-binding-worksheet.json')));
const names=['initial','first-removed','all-removed','second-returned','first-appended','second-removed','empty-again'];
const visible=[[true,true],[false,true],[false,false],[false,true],[true,true],[true,false],[false,false]];
const active=['first','second',null,'second','second','first',null];
const witness={scenarios:['component','template'].flatMap(mode=>['titles','labelledby','label'].map(priority=>({mode,priority,
 steps:names.map((step,i)=>{const first=visible[i][0]?'legacy-title-lifetime-first':null,second=visible[i][1]?'mat-dialog-title-'+(i===0||i===1?1:2):null;
  return {step,first,second,labelledby:priority==='label'?null:priority==='labelledby'?'legacy-title-configured':active[i]==='first'?first:active[i]==='second'?second:null,label:priority==='label'?'Explicit title label':null};})}))) };
assert.equal(okay(witness),true);let rejected=0;
for(const mutate of [
 value=>value.scenarios.pop(),value=>value.scenarios.push(value.scenarios[0]),value=>value.scenarios[1]=value.scenarios[0],
 value=>value.scenarios[0].mode='manual',value=>value.scenarios[0].priority='unknown',value=>value.scenarios[0].steps.pop(),
 value=>value.scenarios[0].steps[0].step='first-removed',value=>value.scenarios[0].steps[2].first='removed-but-present',
 value=>value.scenarios[0].steps[0].first='',value=>value.scenarios[0].steps[0].second='wrong-generated-id',
 value=>value.scenarios[0].steps[3].second=value.scenarios[0].steps[0].second,
 value=>value.scenarios[0].steps[4].second='mat-dialog-title-99',
 value=>value.scenarios[0].steps[4].labelledby=value.scenarios[0].steps[4].first,
 value=>value.scenarios[0].steps[2].labelledby='stale-title',value=>value.scenarios[1].steps[0].labelledby='legacy-title-lifetime-first',
 value=>value.scenarios[2].steps[0].labelledby='legacy-title-configured',value=>value.scenarios[2].steps[0].label=null,
]) {const value=structuredClone(witness);mutate(value);assert.equal(okay(value),false);rejected++;}
for(const value of [null,{},true,{ok:true},{scenarios:[]}]) {assert.equal(okay(value),false);rejected++;}
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
const lines=[];let templates=0;
for(const [line,directory] of [['21.x',root],['main',resolve(root,'../../codex-closeout-main/ngx-compat-material-legacy')]]) {
 const require=createRequire(join(directory,'package.json')),ts=require('typescript');
 const angular=await import(pathToFileURL(require.resolve('@angular/compiler')));
 const browser=await import(pathToFileURL(join(directory,'scripts/browser-required-cells.mjs')));
 const parent=worksheet.lines[line].source_parent;
 const git=path=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:directory,env,maxBuffer:8*1024*1024});
 const read=path=>readFileSync(join(directory,path));
 for(const path of ['tests/dialog_container_public_runtime_probe.mjs','tests/dialog_initial_focus_runtime_probe.mjs',
  'compatibility/rc/matrices/browser-matrix.json','compatibility/rc/matrices/full-verify.json','compatibility/f10/disposition-ledger/ledger.json'])assert.equal(read(path).equals(git(path)),true,path);
 const probe=read('scripts/browser-required-probe.js').toString(),before=git('scripts/browser-required-probe.js').toString();
 const parse=(text,name)=>ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const branch=text=>{
  const source=parse(text,'probe.ts');let found;
  function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='runDefault') {
   found=n.body.statements.find(s=>ts.isIfStatement(s)&&s.expression.getText(source)==="family === 'dialog'");
  }ts.forEachChild(n,visit);}visit(source);assert.ok(found);return found.getText(source);
 };
 assert.equal(probe.replace(branch(probe),'<dialog-default>'),before.replace(branch(before),'<dialog-default>'));
 const slice=read('scripts/run-browser-matrix-slice.mjs').toString();
 assert.equal(slice.replace("import {legacyDialogTitleLifetimeNativeOkay} from './dialog-title-lifetime-fixture.mjs';\n",'')
  .replaceAll('      && legacyDialogTitleLifetimeNativeOkay(report.dialog_title_lifetime)\n',''),git('scripts/run-browser-matrix-slice.mjs').toString());
 const legacy=read('scripts/browser-dialog-escape.mjs').toString(),legacyAst=parse(legacy,'runner.ts');
 let appExpression;
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(legacyAst)==='writeFileSync'&&n.arguments[0]?.getText(legacyAst)==="join(consumer, 'src/main.ts')")appExpression=n.arguments[1].getText(legacyAst);ts.forEachChild(n,visit);}visit(legacyAst);assert.ok(appExpression);
 for(const zoneless of [false,true]) {
  const spec=browser.candidateInstallSpec({core:line==='21.x'?'21.2.23':'22.1.7',cdk:line==='21.x'?'21.2.14':'22.1.7',material:line==='21.x'?'21.2.14':'22.1.7',typescript:ts.version,rxjs:'7.8.2',zone:'0.16.3',sass:'1.104.1',tslib:'2.8.1'},zoneless);
  const mini=runInNewContext('('+appExpression+')',{zoneless,dialogTitleLifetimeFixture});
  for(const [kind,text]of [['required',spec.labSource],['slice',mini]]) {
   assert.ok(text.includes(dialogTitleLifetimeFixture));assert.equal(/\.detectChanges\s*\(/.test(text),false);
   const parsed=parse(text,kind+'.ts');assert.equal(parsed.parseDiagnostics.length,0);assert.equal(ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true},reportDiagnostics:true}).diagnostics.length,0);
   const fixtureAst=parse(dialogTitleLifetimeFixture,'fixture.ts'),declaration=fixtureAst.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations[0].name.getText(fixtureAst)==='dialogTitleLifetimeTemplate');
   const titleTemplate=declaration.declarationList.declarations[0].initializer.text;
   for(const template of [titleTemplate,'<ng-template #titleTemplate>'+titleTemplate+'</ng-template>']) {
    const result=angular.parseTemplate(template,'title-native.html');assert.equal(result.errors,null,JSON.stringify(result.errors));templates++;
   }
  }
 }
 // Execute the actual default-dialog branch. These synthetic controls test gating only.
 async function gate(observation,missing=false) {
  let open=false;
  const window={};const surface={className:'',setAttribute(){}};
  const lab={closeTransient(){open=false;},...(missing?{}:{runDialogTitleLifetime:async()=>observation})};window.__lab=lab;
  const query=selector=>selector==='#wrap-dialog'?{}:selector==='#p-dialog-open'?{click(){open=true;}}:
    selector.includes('mat-dialog-container')?(open?{}:null):null;
  const context={window,document:{getElementById:()=>surface,querySelector:query},setTimeout,clearTimeout,console};
  runInNewContext(browser.requiredProbeSource(),context);window.__begin({family:'dialog',state:'default'});
  const deadline=Date.now()+1000;while(!window.__status.done&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(window.__status.done,true);return window.__status.ok;
 }
 assert.equal(await gate(witness),true);assert.equal(await gate({ok:true}),false);assert.equal(await gate(witness,true),false);
 const bad=structuredClone(witness);bad.scenarios[0].steps[4].labelledby='legacy-title-lifetime-first';assert.equal(await gate(bad),false);
 lines.push({line,typescript:ts.version,framework:angular.VERSION.full,generated_programs_syntax_checked:4,templates_parsed:8,actual_default_branch_positive:1,actual_default_branch_negatives:3,all_other_probe_branches_and_original_slice_assertions_unchanged:true,old_runtime_programs_and_matrix_rosters_and_ledger_unchanged:true});
}
const report={schema_version:1,source_code:['scripts/dialog-title-lifetime-fixture.mjs','scripts/browser-required-cells.mjs','scripts/browser-required-probe.js','scripts/browser-dialog-escape.mjs','scripts/run-browser-matrix-slice.mjs'].map(path=>{const raw=readFileSync(join(root,path));return {path,sha256:hash(raw),bytes:raw.length};}),lines,predicate_faults_rejected:rejected,templates_parsed:templates,scenario_observation_rows:42,forced_detect_changes:false,product_changes:0,canonical_decisions_changed:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
