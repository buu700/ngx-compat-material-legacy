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
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewProgressSpinnerZone} from '../scripts/progress-spinner-zone-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const path='projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.ts',template='projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.html';
const priorPath='compatibility/f10/authored-use-reviews/public-progress-spinner-zone-boundary.json',prior=JSON.parse(read(priorPath)).reviews.find(r=>r.file==='legacy-progress-spinner/progress-spinner.ts'&&r.symbol==='NgZone');assert.ok(prior);
const capsule=JSON.parse(gunzipSync(read(prior.source_context.original_subject.path))),original=capsule.members.find(m=>m.path.endsWith('/progress-spinner.html')).source;
assert.equal(hash(read(path)),prior.candidate_source_sha256,'zone implementation changed');
for(const evidence of prior.independent_evidence)assert.equal(hash(evidence.path===template?Buffer.from(original):read(evidence.path)),evidence.sha256,'prior executable/public namespace/source evidence changed '+evidence.path);
// Re-evaluate the unchanged class against its immutable reference context.
// The actual changed template is qualified separately; it is never returned as unchanged.
const reference=reviewProgressSpinnerZone({root,readSource:p=>p===template?original:read(p).toString()});
const native=JSON.parse(read('compatibility/rc/progress-spinner-zone-runtime-diagnostic.json'));
assert.equal(native.source_review.candidate_source_sha256,hash(read(path)));assert.equal(native.results.length,10);
for(const source of native.sources)assert.equal(hash(read(source.path)),source.sha256);
const sourceProofPath='compatibility/rc/template-control-flow-source-proof.json',sourceProof=JSON.parse(read(sourceProofPath)),observation=sourceProof.observations.find(o=>o.path===template);assert.ok(observation);
assert.equal(observation.before_sha256,hash(original));assert.equal(observation.candidate_sha256,hash(read(template)));
const browserPath='compatibility/rc/template-control-flow-browser-diagnostic.json',browser=JSON.parse(read(browserPath));
const peers=browser.results.map(r=>({line:r.line,states:r.families.filter(f=>f.family==='legacy-progress-spinner'&&!f.variant.startsWith('negative/'))}));assert.equal(peers.length,3);assert.ok(peers.every(r=>r.states.length));
const source=read(path).toString(),controls=[];
for(const[id,changed]of [['changed-zone-throttle',source.replace('viewportRuler.change(150)','viewportRuler.change(0)')],['removed-zone-entry',source.replace('ngZone.run(() => changeDetectorRef.markForCheck());','changeDetectorRef.markForCheck();')],['removed-subscription-cleanup',source.replace('this._resizeSubscription.unsubscribe();','')]]){assert.notEqual(changed,source);assert.throws(()=>reviewProgressSpinnerZone({root,readSource:p=>p===template?original:p===path?changed:read(p).toString()}),assert.AssertionError,id);controls.push({id,rejected:true});}
const {payload,unchanged_template,...sourceContext}=reference;
const report={schema_version:1,line:browser.line,file:reference.file,module:reference.module,symbol:reference.symbol,candidate_source_sha256:hash(read(path)),prior_review:{path:priorPath,sha256:hash(read(priorPath))},unchanged_executed_class:true,prior_runtime:{path:'compatibility/rc/progress-spinner-zone-runtime-diagnostic.json',sha256:hash(read('compatibility/rc/progress-spinner-zone-runtime-diagnostic.json')),subjects:10,not_reexecuted:true,reason:'Whole class/color/runtime worker/public namespace bytes are unchanged; all prior independently hashed execution inputs verified.'},reference_class_context:sourceContext,actual_template:{path:template,sha256:hash(read(template)),matches_tagged_bytes:false,source_proof:{path:sourceProofPath,sha256:hash(read(sourceProofPath))},browser_proof:{path:browserPath,sha256:hash(read(browserPath))},peer_states:peers},negative_controls:controls,scope:'Only the unchanged spinner NgZone constructor/field/resize/destruction dependency is rebound to the changed template context. The immutable original template remains a reference input. Real candidate JIT SVG mode/view identities and exact binding/predicate/geometry-call source structure supplement the unchanged class executions. No native Safari/zoom/geometry, full component/DI/AOT/packed or compiler/runtime/RxJS floor claim.',g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({source_negative_controls:controls.length,unchanged_runtime_subjects:10,current_template_peer_models:peers.length,full_native_qualified:false}));
