/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic observation/forwarding controls and generated strict TS; no browser. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {SourceTextModule} from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {CONTENT_OBSERVER_STAGES, contentObserverNativeOkay, contentObserverNativeFixture, installContentObserverNativeTrace} from '../scripts/content-observer-native-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const line=JSON.parse(fs.readFileSync(path.join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main';
import {contentObserverNativeSample,contentObserverNativeRecord as record} from './content_observer_native_sample.mjs';
export {contentObserverNativeSample};
let negatives=0;
for(const zoneless of [false,true]){
  const sample=contentObserverNativeSample(zoneless);assert.equal(contentObserverNativeOkay(sample,zoneless),true);
  const mutate=[o=>o.execution='workspace-projection',o=>o.error='failed',o=>o.zoneless=!zoneless,o=>o.mutations_outside_angular=false,
    ...Object.keys(sample.identity).map(key=>o=>o.identity[key]=false),...Object.keys(sample.calibration).map(key=>o=>o.calibration[key]=false),
    ...Object.keys(sample.cleanup).map(key=>o=>o.cleanup[key]=false),o=>o.initial_native_generations=0,o=>o.native_generations.pop(),
    o=>o.native_generations[1].id=o.native_generations[0].id,o=>o.native_generations[0].disconnects=0,
    o=>o.native_generations[0].active=true,o=>o.native_generations[0].observes=2,o=>o.stages.pop(),o=>o.stages.reverse(),
    o=>o.stages[0]=structuredClone(o.stages[1]),o=>o.stages[0].text_changed=true,
    o=>o.stages.find(r=>r.id==='text-same').pagination_calls=1,
    o=>o.stages.find(r=>r.id==='mixed-add').delivered_records[0].added_types=[8],
    o=>o.stages.find(r=>r.id==='mixed-remove').delivered_records.push(record('childList',1,[],[8])),
    o=>o.stages.find(r=>r.id==='text-edit').delivered_records[0].target_type=8,
    o=>o.stages.find(r=>r.id==='text-add').delivered_records[0].added_types=[8],
    o=>o.stages.find(r=>r.id==='text-remove').delivered_records[0].removed_types=[8],
    o=>o.stages.find(r=>r.id==='comment-add').raw_records=[record('characterData',8)],
    o=>o.stages.find(r=>r.id==='comment-remove').raw_records=[record('characterData',8)],
    o=>o.stages.find(r=>r.id==='reobserve-detached').delivered_records.push(record('childList',1,[3])),
  ];
  for(let i=0;i<sample.stages.length;i++){
    for(const key of ['public_events','owned_callbacks','pagination_calls'])mutate.push(o=>o.stages[i][key]++);
    mutate.push(o=>o.stages[i].raw_records=[],o=>o.stages[i].raw_records[0].native=false,
      o=>o.stages[i].owner_destroyed=!o.stages[i].owner_destroyed,o=>o.stages[i].owner_connected=!o.stages[i].owner_connected);
    if(sample.stages[i].public_events)mutate.push(o=>o.stages[i].public_zones[0]=zoneless);
    if(sample.stages[i].owned_callbacks)mutate.push(o=>o.stages[i].owned_zones[0]=zoneless);
    if(!sample.stages[i].owner_destroyed)mutate.push(o=>o.stages[i].cache_matches_text=false);
  }
  for(const change of mutate){const bad=structuredClone(sample);change(bad);assert.equal(contentObserverNativeOkay(bad,zoneless),false);negatives++;}
  for(const absent of [null,undefined,true,{},[],{ok:true}]){assert.equal(contentObserverNativeOkay(absent,zoneless),false);negatives++;}
}
// This only checks forwarding/identity/restore. It synthesizes no record and
// cannot provide native ContentObserver or Angular fixture qualification.
const calls=[];
class PlatformObserver{observe(target,options){calls.push(['observe',this,target,options]);if(!target)throw Error('native failure');return 'native-observe';}disconnect(){calls.push(['disconnect',this]);return 'native-disconnect';}}
const scope={MutationObserver:PlatformObserver},originalObserve=PlatformObserver.prototype.observe,originalDisconnect=PlatformObserver.prototype.disconnect;
installContentObserverNativeTrace(scope);const trace=scope.__closeoutNativeObserverTrace,one=new PlatformObserver(),two=new PlatformObserver(),target={};
assert.equal(scope.MutationObserver,PlatformObserver);assert.equal(one.observe(target,{subtree:true}),'native-observe');
const snapshot=trace.forTarget(target);assert.deepEqual(snapshot,[{id:1,observes:1,disconnects:0,active:true}]);snapshot[0].observes=100;
assert.equal(trace.forTarget(target)[0].observes,1);
// A Zone-style forwarding wrapper exposes a different object identity while
// preserving the genuine underlying platform receiver. Target tracing survives.
const proxy={observe:(...args)=>two.observe(...args),disconnect:()=>two.disconnect()};proxy.observe(target,{});
assert.equal(trace.forTarget(target).length,2);assert.equal(proxy.disconnect(),'native-disconnect');assert.equal(one.disconnect(),'native-disconnect');
assert.deepEqual(trace.forTarget(target).map(r=>r.disconnects),[1,1]);assert.ok(trace.forTarget(target).every(r=>!r.active));
assert.throws(()=>new PlatformObserver().observe(null,{}));assert.equal(trace.forTarget(target).length,2);
assert.equal(calls.length,5);assert.equal(trace.restore(),true);assert.equal(trace.restore(),true);
assert.equal(PlatformObserver.prototype.observe,originalObserve);assert.equal(PlatformObserver.prototype.disconnect,originalDisconnect);
const fixture=contentObserverNativeFixture();
assert.doesNotMatch(fixture,/ɵ|MutationObserverFactory|shouldIgnoreRecord|\._onContentChanges\(\)/);
assert.ok(fixture.includes('observer.observe(element).subscribe(receive)'));assert.ok(fixture.includes('r instanceof MutationRecord'));
assert.ok(fixture.includes('header._onContentChanges=function'));assert.ok(fixture.includes('oldContent.apply(this,args)'));
assert.ok(fixture.includes('zone.runOutsideAngular'));assert.ok(fixture.includes('destroyOwned();await settle()'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'content-observer-strict-ts-'));
let genuineTypes;
try{
  const nodeModules=[path.join(root,'node_modules'),...(process.env.NODE_PATH||'').split(path.delimiter)].find(p=>p&&fs.existsSync(path.join(p,'@angular/core/package.json'))&&fs.existsSync(path.join(p,'@angular/cdk/package.json')));
  assert.ok(nodeModules,'Current installed declaration context is required');
  fs.symlinkSync(nodeModules,path.join(temp,'node_modules'),'dir');
  const file=path.join(temp,'fixture.ts'),stub=path.join(temp,'owned-test-stub.d.ts');fs.writeFileSync(file,fixture);
  fs.writeFileSync(stub,"declare module '@ngx-compat/material-legacy/legacy-tabs' {export class MatLegacyTabGroup{} export class MatLegacyTabHeader{} export class MatLegacyTabsModule{}}\n");
  const options={strict:true,skipLibCheck:true,noEmit:true,experimentalDecorators:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,types:[]};
  const program=ts.createProgram([file,stub],options),diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>temp,getNewLine:()=> '\n'}));
  genuineTypes=JSON.parse(fs.readFileSync(require.resolve('@angular/core/package.json'))).version;
}finally{fs.rmSync(temp,{recursive:true,force:true});}
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const capsuleBytes=fs.readFileSync(path.join(root,'compatibility/rc/key-manager-public-subjects.json'));
assert.equal(hash(capsuleBytes),'97733629aa03a8faa5dfa88ccf96efa9f1cb3b40914f65efed7123870eedc0fb');
const ast=ts.createSourceFile('fixture.ts',fixture,ts.ScriptTarget.Latest,true),component=ast.statements.find(ts.isClassDeclaration);
const metadata=ts.getDecorators(component)[0].expression.arguments[0];
const template=metadata.properties.find(node=>node.name.getText(ast)==='template').initializer.text;
const templateParsers={};
for(const subject of JSON.parse(capsuleBytes).subjects.filter(row=>['main','21.x'].includes(row.line))){
  const pkg=subject.packages.find(row=>row.package==='@angular/compiler');
  const member=pkg.members.find(row=>row.archive_member==='package/fesm2022/compiler.mjs');
  const stored=fs.readFileSync(path.join(root,member.path));assert.equal(hash(stored),member.gzip_sha256);
  const bytes=gunzipSync(stored);assert.equal(hash(bytes),member.sha256);assert.equal(bytes.length,member.bytes);
  const compiler=new SourceTextModule(bytes.toString(),{identifier:'authenticated-compiler-'+subject.line});
  await compiler.link(specifier=>{throw Error('unexpected uncaptured compiler import '+specifier);});await compiler.evaluate();
  assert.equal(compiler.namespace.VERSION.full,subject.framework_version);
  const parsed=compiler.namespace.parseTemplate(template,'content-observer-native.html',{preserveWhitespaces:false});
  assert.equal(parsed.errors,null,JSON.stringify(parsed.errors));templateParsers[subject.line]=compiler.namespace.VERSION.full;
}
const output={schema_version:1,line,synthetic_observation_negative_controls:negatives,native_forwarding_identity_and_restore_checked:true,required_stages:13,
  generated_strict_TypeScript_compiler:ts.version,borrowed_angular_declaration_version:genuineTypes,
  owned_module_types_stubbed:true,authenticated_template_parser_versions:templateParsers,actual_Angular_AOT_or_native_or_packed_or_floor_qualified:false,original_programs_replayed:0,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(output));
