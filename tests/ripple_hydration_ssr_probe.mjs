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
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
import {installHydrationServerPublicSubject} from '../scripts/hydration-server-public-subjects.mjs';
import {rippleHydrationComponentFixture} from '../scripts/ripple-hydration-component-fixture.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=value=>createHash('sha256').update(value).digest('hex'),paths={renderer:'ripple/ripple-renderer.ts',ref:'ripple/ripple-ref.ts',
 manager:'ripple/ripple-event-manager.ts',helper:'internal/dom/shadow-dom.ts'};
const emit=source=>{const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true},reportDiagnostics:true});assert.equal(result.diagnostics.length,0);return result.outputText;};
const payload={fixture:emit(rippleHydrationComponentFixture)};
for(const[key,path]of Object.entries(paths))payload[key]=emit(readFileSync(join(root,'projects/ngx-material-legacy/legacy-core',path),'utf8'));
const loaded=prepareMaterialPublicSubjects(root),results=[];
try{
 const worker=readFileSync(join(root,'tests/ripple_hydration_ssr_subject.mjs'),'utf8');
 for(const model of loaded.models.filter(model=>model.line!=='original')){
  const zone=installNgZonePublicSubject(model,root),server=installHydrationServerPublicSubject(model,root);
  writeFileSync(join(model.root,'ripple-hydration-ssr-payload.json'),JSON.stringify(payload));
  const path=join(model.root,'ripple-hydration-ssr-subject.mjs');writeFileSync(path,worker);
  for(const mode of['zoneful','zoneless'])for(const production of[false,true]){
   const stdout=execFileSync(process.execPath,['--max-old-space-size=512',path,mode,String(production)],{cwd:model.root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
   const output=JSON.parse(stdout.trim().split('\n').at(-1));results.push({line:model.line,mode,production,server_subject:server,zone_subject:zone,borrowed:model.borrowed,...output});
  }
 }
 assert.equal(results.length,8);
 const report={schema_version:1,node:process.version,parser:ts.version,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),
  shared_component_sha256:hash(rippleHydrationComponentFixture),source_bindings:Object.values(paths).map(path=>({path:'projects/ngx-material-legacy/legacy-core/'+path,sha256:hash(readFileSync(join(root,'projects/ngx-material-legacy/legacy-core',path)))})),
  public_namespace_capsule_sha256:loaded.capsule_hash,results,
  scope:'Complete matching pinned public platform-server runtime/DOM and genuine Core/Browser/Material/CDK namespaces; actual shared component SSR with genuine public MatRipple identity (the existing alias lead), real withEventReplay server metadata, three serialized event bindings and exact host rejection. Complete owned renderer/ref/manager/helper source is loaded, but Platform.isBrowser=false prevents owned renderer instantiation. JIT diagnostic with borrowed Rx/tslib. No packed library, Angular AOT, client bootstrap, early capture script, native event/replay, actual owned renderer or full Node/Rx floors.'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({subjects:8,SSR_cases:8,host_rejection_cases:8,genuine_server_DOM_and_peer_directive:true,native_client_or_replay_executed:false}));
}finally{loaded.dispose();}
