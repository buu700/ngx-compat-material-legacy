/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Live source predicates and original writer/adapter assertions beside historical replays. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {adaptSpec} from '../testing/legacy-runner/adapt-spec.mjs';
import {reviewFrameworkEnumUses} from '../scripts/framework-enum-use-review.mjs';
import {historicalConsumerSubject} from '../scripts/run-historical-consumer-probe.mjs';
import {historicalChipCurrentSubject} from '../scripts/historical-chip-current-subject.mjs';
import {readEvidenceMember} from '../scripts/upstream-packed-run-evidence.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {deriveHistoricalRoster,rejectionReasons,discoveryNegativeResults,isRunnerControl} from '../scripts/historical-case-roster.mjs';
import {HISTORICAL_BEHAVIOR_KIND,HISTORICAL_BEHAVIOR_SHAS,historicalBehaviorRequirements,historicalRegressionRequirements,validateHistoricalBehavior} from '../scripts/upstream-historical-behavior-evidence.mjs';
import {REQUIRED_REGRESSIONS} from '../scripts/historical-roster-reconciliation.mjs';
import {createFixture} from './upstream/artifact-behavior-fixture.mjs';
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {companionRoutes,inspectSourceMember,inspectSupportContracts,parse} from './current_inspector_contracts.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const hash=raw=>createHash('sha256').update(raw).digest('hex'),observed=new Map();
const read=member=>{
  const raw=readEvidenceMember(root,member),ref={path:member,sha256:hash(raw),bytes:raw.length};
  if(observed.has(member))assert.deepEqual(ref,observed.get(member),'current input changed during inspection '+member);
  observed.set(member,ref);return raw;
};
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const sourcePaths=candidateProductSourcePaths(root),material=[],overlay=[];
for(const member of sourcePaths){const facts=inspectSourceMember(member,read(member).toString());material.push(...facts.currentMaterial);overlay.push(...facts.overlay);}
assert.deepEqual(material.sort(),companionRoutes);assert.ok(overlay.length>0,'current public overlay routes missing');
const support=inspectSupportContracts({root,read,line});
for(const name of ['build-harness','compiler-build','example-docs','explicit-detection','global-zoneless','strict-tests','theming','zone-moves']){
  const intake=JSON.parse(read('compatibility/rc/mixed-'+name+'-source-intake.json'));
  for(const member of intake.owned_context_read)read(member.path);
}

// These exact original protocol statements keep their assertions. Their
// historical whole-tree checks are exercised separately at recorded revisions.
function originalProgram(family,startName,endName){
  const {subject}=historicalConsumerSubject({root,family}),raw=read(subject.probe);assert.equal(hash(raw),subject.probe_sha256);
  const file=parse(subject.probe,raw.toString());
  const variable=node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>row.name.getText(file)===startName);
  const start=file.statements.findIndex(variable);assert.ok(start>=0);
  let end;
  if(endName){end=file.statements.findIndex(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>row.name.getText(file)===endName));assert.ok(end>start);}
  else{end=start+2;assert.ok(ts.isForOfStatement(file.statements[start+1]));}
  const code=file.statements.slice(start,end).map(node=>node.getText(file)).join('\n');
  return {code,ref:{path:subject.probe,sha256:subject.probe_sha256,statement_count:end-start,
    assertion_statements_unchanged:true,source_text_rewritten:false,historical_snapshot_checks_included:false}};
}
const adapterProgram=originalProgram('spec-wide-fixture-adapter','line','repair');
const adapterBindings={assert,root,require,ts,read,hash,reviewFrameworkEnumUses,adaptSpec,gunzipSync,
  mkdtempSync:fs.mkdtempSync,mkdirSync:fs.mkdirSync,symlinkSync:fs.symlinkSync,rmSync:fs.rmSync,
  readFileSync:fs.readFileSync,writeFileSync:fs.writeFileSync,tmpdir,dirname:path.dirname,resolve:path.resolve,join:path.join,pathToFileURL};
const adapterFactory=new Function(...Object.keys(adapterBindings),'return (async()=>{'+adapterProgram.code+
  '\nreturn {line,results,controls,actualHistoricalMetadata,adapter_sha256:hash(read("testing/legacy-runner/adapt-spec.mjs")),enum_files:enums.files};})()');
const adapter=await adapterFactory(...Object.values(adapterBindings));assert.equal(adapter.line,line);assert.equal(adapter.controls.length,7);
const writerProgram=originalProgram('historical-roster-reconciliation','positives');
const currentRegressions=historicalRegressionRequirements();
assert.deepEqual(currentRegressions.slice(0,REQUIRED_REGRESSIONS.length),REQUIRED_REGRESSIONS);
assert.equal(currentRegressions.length,7);
const producer=read('scripts/rc-test-legacy-family.mjs').toString(),writerSource=parse('writer.mjs',producer);
const writers=writerSource.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='writeAcceptance');assert.equal(writers.length,1);
const writerBody=writers[0].getText(writerSource),roster=deriveHistoricalRoster(root);
assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2236);
const originalWriterCohort=JSON.parse(read('compatibility/rc/historical-behavior-admission-inputs.json')).original_patches.map(row=>row.sha);
assert.deepEqual(originalWriterCohort,['77ffdf98ba71c11d908b29e02b516dddf487ae0b','5dd614aa100e28f0815fdd83e5b68f4239ef01f9','86ad5150110522873dae2801fd3c2957502949e7']);
for(const sha of originalWriterCohort)assert.ok(HISTORICAL_BEHAVIOR_SHAS.includes(sha));
// The generic fixture belongs to these original three contracts. Later
// contracts have their individual source/behavior protocols and owners.
const model={line,prior:{selected:originalWriterCohort.map(sha=>({sha,definition:historicalBehaviorRequirements(sha)}))}};
const controls=[],writerBindings={assert,fs,path,root,read,hash,model,controls,writerBody,roster,
  HISTORICAL_BEHAVIOR_KIND,HISTORICAL_BEHAVIOR_SHAS:originalWriterCohort,historicalBehaviorRequirements,REQUIRED_REGRESSIONS:currentRegressions,
  validateHistoricalBehavior,createFixture,rejectionReasons,discoveryNegativeResults,isRunnerControl};
const writerFactory=new Function(...Object.keys(writerBindings),writerProgram.code+'\nreturn {positives,controls};');
const writer=writerFactory(...Object.values(writerBindings));assert.equal(writer.positives,originalWriterCohort.length);

const rejections=[];
function rejectMember(id,member,extra,pattern){
  const original=read(member).toString();inspectSourceMember(member,original);
  assert.throws(()=>inspectSourceMember(member,original+extra),pattern,id);rejections.push({id,result:'rejected',scope:'predicate sensitivity only'});
}
const sample='projects/ngx-material-legacy/legacy-menu/menu.ts';
for(const route of ['@angular/cdk/stepper','@angular/cdk/accordion','@angular/material/expansion','@angular/cdk/menu',
  '@angular/cdk/drag-drop','@angular/cdk/listbox','@angular/cdk/column-resize','@angular/cdk/popover-edit','@angular/cdk/combobox',
  '@angular/aria/menu','@angular/cdk/schematics','@angular/material/timepicker','@angular/components-examples/button'])
  rejectMember('forbidden-import:'+route,sample,"\nimport {UnownedSubject} from '"+route+"';\n",/dependency/);
for(const statement of ["import {Subject} from '@angular/cdk/tree';","export {Subject} from '@angular/material/tree';",
  "const tree = import('@angular/cdk/tree');","const tree = require('@angular/cdk/tree');"])
  rejectMember('forbidden-tree-route:'+statement,sample,'\n'+statement+'\n',/tree dependency/);
for(const name of ['CdkStepper','CdkContextMenuTrigger','DragRef','CdkMenuBase','MatTreeNode'])
  rejectMember('ordinary-fork:'+name,sample,'\nclass '+name+' {}\n',/fork/);
rejectMember('tree-template',sample,"\nconst unownedTemplate = '<mat-tree></mat-tree>';\n",/tree template/);
const style='projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss';
rejectMember('experimental-M3-import',style,"\n@use '@angular/material-experimental' as matx;\n",/experimental M3/);
rejectMember('current-Material-forward',style,"\n@forward '@angular/material';\n",/wildcard facade/);
const alias=read(style).toString().match(/@use\s+['"]@angular\/material['"]\s+as\s+([\w-]+)/)?.[1];assert.ok(alias);
rejectMember('upstream-m2-call-through',style,'\n.test { color: '+alias+'.m2-get-color-from-palette($palette, 500); }\n',/m2 compatibility/);
for(const name of ['get-theme-version','get-theme-type','get-theme-color','get-theme-typography','get-theme-density','theme-has'])
  rejectMember('modern-inspection:'+name,style,'\n.test { value: '+alias+'.'+name+'($theme); }\n',/inspection API/);

function rejectSupport(id,member,transform,pattern){
  const original=read(member).toString(),changed=transform(original);assert.notEqual(changed,original,id+': inactive mutation');
  assert.throws(()=>inspectSupportContracts({root,line,read:name=>name===member?Buffer.from(changed):read(name)}),pattern,id);
  rejections.push({id,result:'rejected',scope:'predicate sensitivity only'});
}
function caseChange(member,name,needle,replacement){return text=>{
  const found=originalEnvironmentCases({members:[{path:member,after:{text}}]},'after').filter(row=>row.name===name);assert.equal(found.length,1);
  const changed=found[0].raw.replace(needle,replacement);assert.notEqual(changed,found[0].raw);assert.equal(text.split(found[0].raw).length,2);return text.replace(found[0].raw,changed);
};}
const base='projects/ngx-material-legacy/';
rejectSupport('bootstrap-replaced','testing/legacy-runner/init-test-env.ts',text=>text.replace('provideZoneChangeDetection()','provideCheckNoChangesConfig()'),/bootstrap preparation/);
for(const member of ['legacy-tabs/tabs-module.ts','legacy-form-field/form-field-module.ts','legacy-checkbox/checkbox-module.ts','legacy-slide-toggle/slide-toggle-module.ts'])
  rejectSupport('public-observer:'+member,base+member,text=>text.replace("from '@angular/cdk/observers'","from '@angular/cdk/stepper'"),/observer route/);
rejectSupport('dialog-standalone',base+'legacy-dialog/dialog-content-directives.ts',text=>text.replace('standalone: false','standalone: true'),/dialog directive/);
const touch=base+'legacy-tooltip/tooltip.spec.ts';
rejectSupport('touchstart-delay',touch,caseChange(touch,"'should have a delay when showing on touchstart'",'tick(250)','tick(251)'),/touchstart/);
rejectSupport('dialog-heading',base+'legacy-dialog/dialog.spec.ts',text=>text.replaceAll('h1[tabindex="-1"]','h2[tabindex="-1"]'),/heading query/);
rejectSupport('chip-input-type',base+'legacy-chips/chip-input.ts',text=>text.replace('chipInput: MatLegacyChipInput;','chipInput: unknown;'),/chip input type/);
for(const family of ['dialog','snack-bar'])rejectSupport('harness-preparation:'+family,'testing/legacy-runner/shims/harness/'+family+'/shared.spec.ts',text=>text.replaceAll('LEGACY_NOOP_ANIMATIONS','UNOWNED_ANIMATIONS'),/harness preparation/);
const menu=base+'legacy-menu/menu.spec.ts';
rejectSupport('recursive-menu-case',menu,caseChange(menu,"'should throw if assigning a menu that contains the trigger'",'.toThrowError(/menu cannot contain its own trigger/)','.not.toThrow()'),/recursive menu/);
const chip=base+'legacy-chips/chip-list.spec.ts';
rejectSupport('empty-chip-regression',chip,caseChange(chip,"'should clear a destroyed active chip when the list becomes empty'",/expect\(keyManager.activeItem\)\.toBeNull\(\)/g,'expect(keyManager.activeItem).toBeTruthy()'),/empty chip/);
rejectSupport('explicit-OnPush',base+'legacy-input/input.spec.ts',text=>text.replace('changeDetection: ChangeDetectionStrategy.OnPush','changeDetection: ChangeDetectionStrategy.Eager'),/OnPush fixture/);
rejectSupport('historical-zone-shim','testing/legacy-runner/shims/mock-ng-zone.ts',text=>text.replace('this.onStable.emit(null)','this.onStable.emit(undefined)'),/shim contract/);
rejectSupport('consumer-engine-narrowed',base+'package.json',text=>{const data=JSON.parse(text);data.engines.node='>=24.0.0 <25.0.0';return JSON.stringify(data);});
rejectSupport('private-pnpm-pin','package.json',text=>{const data=JSON.parse(text);data.packageManager='pnpm@12.0.0';return JSON.stringify(data);});
rejectSupport('node-pin','.node-version',()=> '24.0.0');
rejectSupport('npm-pin','.npm-version',()=> '11.0.0');
rejectSupport('compiler-configuration','tsconfig.json',()=> '{',/compiler configuration/);
rejectSupport('historical-oracle','compatibility/rc/oracles/material-16.2.14-sass-api.json',text=>{const data=JSON.parse(text);data.counts.functions++;return JSON.stringify(data);});

// Acceptance is delegated once, after the actual source predicates and protocol
// checks. Retain every observed current input for late-change detection.
const current=historicalChipCurrentSubject({root});assert.equal(current.line,line);
const qualifiedSourcePaths=current.bound.filter(row=>row.path.startsWith(base)&&/\.(ts|scss|css|html)$/.test(row.path)).map(row=>row.path).sort();
assert.deepEqual([...sourcePaths].sort(),qualifiedSourcePaths);
current.assertCurrent();
for(const ref of observed.values()){const raw=readEvidenceMember(root,ref.path);assert.equal(hash(raw),ref.sha256,'late current inspector input '+ref.path);assert.equal(raw.length,ref.bytes);}
const report={schema_version:1,line,role:'Actual current predicates and original writer/adapter protocol assertions; no historical source bytes substituted.',
  current_subject:current.report,source_members:sourcePaths.length,current_public_overlay_routes:overlay,current_companion_style_routes:material,
  support,original_adapter_protocol:adapterProgram.ref,adapter:{witnesses:adapter.results,historical_metadata_witnesses:adapter.actualHistoricalMetadata,rejection_controls:adapter.controls,actual_adapter_sha256:adapter.adapter_sha256},
  original_writer_protocol:writerProgram.ref,writer:{positive_cases:writer.positives,rejection_controls:writer.controls,
    actual_current_writer_sha256:hash(writerBody),required_full_case_ids:2236,current_regression_requirements:currentRegressions,
    historical_regression_count:REQUIRED_REGRESSIONS.length,original_native_contract_cohort:originalWriterCohort,
    additional_individually_owned_scopes:HISTORICAL_BEHAVIOR_SHAS.filter(sha=>!originalWriterCohort.includes(sha)),
    additional_individual_scopes_executed_by_this_generic_fixture:false,
    current_definitions_used_without_historical_substitution:true,synthetic_observations_only:true},
  predicate_rejection_controls:rejections,current_inputs:[...observed.values()].sort((a,b)=>a.path.localeCompare(b.path)),
  producer:{path:'tests/current_inspector_contracts_probe.mjs',sha256:hash(readEvidenceMember(root,'tests/current_inspector_contracts_probe.mjs'))},
  current_contract_test_helper:{path:'tests/current_inspector_contracts.mjs',sha256:hash(readEvidenceMember(root,'tests/current_inspector_contracts.mjs'))},
  actual_Angular_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
