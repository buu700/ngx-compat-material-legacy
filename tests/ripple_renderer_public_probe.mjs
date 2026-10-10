/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths={renderer:'ripple/ripple-renderer.ts',ref:'ripple/ripple-ref.ts',manager:'ripple/ripple-event-manager.ts',helper:'internal/dom/shadow-dom.ts'};
const texts=Object.fromEntries(Object.entries(paths).map(([key,path])=>[key,readFileSync(join(root,'projects/ngx-material-legacy/legacy-core',path),'utf8')]));
const emit=text=>{const r=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});assert.equal(r.diagnostics.length,0);return r.outputText;};
const change=(a,b)=>{assert.equal(texts.renderer.split(a).length,2,a);return emit(texts.renderer.replace(a,b));};
const payload=Object.fromEntries(Object.entries(texts).map(([key,text])=>[key,emit(text)]));
payload.mutations={fakeMouse:{renderer:change('isFakeMousedownFromScreenReader(event)','false')},fakeTouch:{renderer:change('isFakeTouchstartFromScreenReader(event)','false')},
 coercion:{renderer:change('this._containerElement = coerceElement(elementOrElementRef);','this._containerElement = elementOrElementRef as HTMLElement;')},
 heldRemoval:{renderer:change('onTransitionEnd();\n          }\n        }, enterDuration + 100)','onTransitionCancel();\n          }\n        }, enterDuration + 100)')},
 insideZone:{renderer:change('this._ngZone.runOutsideAngular(() => {\n          eventListeners.fallbackTimer','this._ngZone.run(() => {\n          eventListeners.fallbackTimer')},
 };
const loaded=prepareMaterialPublicSubjects(root),results=[];
try {
 const worker=readFileSync(join(root,'tests/ripple_renderer_public_subject.mjs'),'utf8');
 for(const model of loaded.models){const zone=installNgZonePublicSubject(model,root),workerPath=join(model.root,'ripple-renderer-public-subject.mjs');
  writeFileSync(workerPath,worker);writeFileSync(join(model.root,'ripple-renderer-public-payload.json'),JSON.stringify(payload));
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of[false,true])for(const passive of[false,true]){
   const stdout=execFileSync(process.execPath,['--max-old-space-size=512',workerPath,model.line,mode,String(production),String(passive)],{cwd:model.root,encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
   results.push({line:model.line,mode,production,passive,zone_subject:zone,borrowed:model.borrowed,...JSON.parse(stdout.trim().split('\n').at(-1))});
  }
 }
 const report={schema_version:1,node:process.version,parser:ts.version,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),
  sources:Object.values(paths).map(path=>({path:'projects/ngx-material-legacy/legacy-core/'+path,sha256:hash(readFileSync(join(root,'projects/ngx-material-legacy/legacy-core',path)))})),
  public_namespace_capsule_sha256:loaded.capsule_hash,results,
  scope:'Whole owned renderer/ref/manager/helper with genuine original and exactminimum publicCore/CDK namespaces, NgZone zoneful/currentzoneless providers, Platform browser/server construction in publiccontext, publica11y/passive/coercion functions. DOM/CSS/event/timer/clock protocols are explicit; no native eventloop/motion, actuallegacy nodeDI, hydration, packedAOT, consumerbuild or fullNode/Rx floors.'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({subjects:results.length,cases:results.reduce((n,r)=>n+r.cases.length,0),mutation_rejections:results.reduce((n,r)=>n+r.mutations.length,0),native_or_packed_qualified:false}));
}finally{loaded.dispose();}
