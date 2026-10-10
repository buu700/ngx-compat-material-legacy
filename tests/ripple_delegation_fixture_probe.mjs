/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {rippleDelegationLifetimeFixture,legacyRippleDelegationLifetimeNativeOkay} from '../scripts/ripple-delegation-lifetime-fixture.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=value=>createHash('sha256').update(value).digest('hex');
const emitted=ts.transpileModule(rippleDelegationLifetimeFixture,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true},reportDiagnostics:true});
assert.equal(emitted.diagnostics.length,0);
const loaded=prepareMaterialPublicSubjects(root),results=[];
try{
 const worker=readFileSync(join(root,'tests/ripple_delegation_fixture_subject.mjs'),'utf8');
 for(const model of loaded.models.filter(model=>model.line!=='original')){
  const zone=installNgZonePublicSubject(model,root);
  writeFileSync(join(model.root,'ripple-delegation-fixture-payload.json'),JSON.stringify({fixture:emitted.outputText,contract:legacyRippleDelegationLifetimeNativeOkay.toString()}));
  const path=join(model.root,'ripple-delegation-fixture-subject.mjs');writeFileSync(path,worker);
  for(const mode of['zoneful','zoneless'])for(const production of[false,true])for(const variant of['live','reversed-order','missing-remove','no-motion']){
   const output=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path,mode,String(production),variant],{cwd:model.root,encoding:'utf8',timeout:10000,maxBuffer:1024*1024}));
   results.push({line:model.line,mode,production,zone_subject:zone,borrowed:model.borrowed,...output});
  }
 }
 assert.equal(results.length,32);
 const report={schema_version:1,node:process.version,parser:ts.version,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),
  shared_fixture_sha256:hash(rippleDelegationLifetimeFixture),worker_sha256:hash(worker),public_namespace_capsule_sha256:loaded.capsule_hash,results,
  scope:'Whole shared fixture; genuine public current Core component/query/DI/embedded-view automatic signal/render scheduling and destruction, public NgZone providers and CDK Platform. One initial app tick. Parent iframe/document/renderer/ref/DOM/CSS/trusted event/timer-performance clock and child API are protocols; no actual second realm or owned renderer is executed. Reversed order, missing root listener removal and absent CSS ends fail. Repeated run, concurrent prepare rejection and explicit disposal are checked. No native/packed/AOT/consumer/actual hydration or full Node/Rx floors.'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({subjects:8,cases:32,negative_variants:24,native_or_actual_owned_renderer_executed:false}));
}finally{loaded.dispose();}
