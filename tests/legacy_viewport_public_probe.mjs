/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
import {reviewLegacyViewportUses} from '../scripts/legacy-viewport-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex');
const path='projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts',referencePath='reference/material-16.2.14/viewport-sources/viewport-ruler.ts';
const source=readFileSync(join(root,path),'utf8'),reference=readFileSync(join(root,referencePath),'utf8');
const useReview=reviewLegacyViewportUses({root});
const selected='projects/ngx-material-legacy/legacy-tabs/tab-header.ts',selectedText=readFileSync(join(root,selected),'utf8');
const sourceNegatives=[
  [selected,selectedText.replace('_LegacyViewport as ViewportRuler','OtherViewport as ViewportRuler')],
  [selected,selectedText.replace("from '@ngx-compat/material-legacy/legacy-core'","from '@angular/cdk/scrolling'")],
  [selected,selectedText+'\nfunction shadow(ViewportRuler: any) {return ViewportRuler;}\n'],
  [selected,selectedText+'\nconst unsupported = ViewportRuler;\n'],
  [useReview.shared_export.path,readFileSync(join(root,useReview.shared_export.path),'utf8').replace("export {_LegacyViewport} from './internal/legacy-viewport';",'')],
  [path,source.replace('export class _LegacyViewport implements OnDestroy {','export class _LegacyViewport implements OnDestroy {\n private nominal = 1;')],
  [path,source+"\nimport {ViewportRuler} from '@angular/cdk/scrolling';\n"],
  ['projects/ngx-material-legacy/legacy-select/select.ts',readFileSync(join(root,'projects/ngx-material-legacy/legacy-select/select.ts'),'utf8').replace('this._viewportRuler.getViewportSize()','this._viewportRuler.getModernSize()')],
  [selected,selectedText.replace('super(elementRef, changeDetectorRef, viewportRuler, dir','super(elementRef, viewportRuler, changeDetectorRef, dir')],
  ['projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts',readFileSync(join(root,'projects/ngx-material-legacy/legacy-tabs/internal/paginated-tab-header.ts'),'utf8').replace('this._viewportRuler.change(150)','this._viewportRuler.change(1)')],
];
for(const [path,text] of sourceNegatives){assert.notEqual(text,readFileSync(join(root,path),'utf8'));assert.throws(()=>reviewLegacyViewportUses({root,readSource:p=>p===path?text:readFileSync(join(root,p),'utf8')}));}
assert.equal(hash(reference),'2cd3078732370fd98fad1fdf1c443acbaab5b5986fbf3cadd7ff546d51c3ed76');
const emit=text=>{
  const out=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true,emitDecoratorMetadata:true},reportDiagnostics:true});
  assert.equal(out.diagnostics.length,0);
  return out.outputText;
};
const altered={
  defaultDelay:source.replace('throttleTime: number = 20','throttleTime: number = 1'),
  orientation:source.replace("target.addEventListener('orientationchange', state.listener);",''),
  cacheTiming:source.replace('this.change().subscribe(() => state.size = null)','this.change(0).subscribe(() => state.size = null)'),
  cacheCopy:source.replace('const result = {...state.size};','const result = state.size;'),
  scrollOrder:source.replace('-rect.top || document.body.scrollTop || target.scrollY','target.scrollY || document.body.scrollTop || -rect.top'),
  teardown:source.replace("target.removeEventListener('resize', state.listener);",''),
  completion:source.replace('state.changes.complete();',''),
  insideZone:source.replace('zone.runOutsideAngular(() => {','zone.run(() => {'),
};
for(const [id,text] of Object.entries(altered))assert.notEqual(text,source,id);
const payload={source:emit(source),reference:emit(reference),mutations:Object.fromEntries(Object.entries(altered).map(([id,text])=>[id,emit(text)]))};
const loaded=prepareMaterialPublicSubjects(root),results=[];
const worker=readFileSync(join(root,'tests/legacy_viewport_public_subject.mjs'),'utf8');
const observations=readFileSync(join(root,'tests/legacy_viewport_observations.mjs'),'utf8');
try {
  for(const model of loaded.models){
    const zone=installNgZonePublicSubject(model,root);
    writeFileSync(join(model.root,'legacy_viewport_public_subject.mjs'),worker);
    writeFileSync(join(model.root,'legacy_viewport_observations.mjs'),observations);
    writeFileSync(join(model.root,'legacy-viewport-public-payload.json'),JSON.stringify(payload));
    for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of [false,true]){
      if(process.env.CLOSEOUT_DIAGNOSTIC_PROGRESS==='1')process.stderr.write(`viewport ${model.line} ${mode} production=${production}\n`);
      const stdout=execFileSync(process.execPath,[join(model.root,'legacy_viewport_public_subject.mjs'),model.line,mode,String(production)],{cwd:model.root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)),zone_subject:zone,borrowed:model.borrowed});
    }
  }
  const report={schema_version:1,role:'Whole owned viewport vs untouched16 under genuine public original/minimum framework providers',
    node:process.version,compiler:ts.version,source:{path,sha256:hash(source)},untouched_reference:{path:referencePath,sha256:hash(reference)},
    public_namespace_capsule_sha256:loaded.capsule_hash,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),observation_suite_sha256:hash(observations),results,
    source_review:useReview,source_negative_controls:sourceNegatives.length,
    scope:'Genuine Core/Compiler/Platform/NgZone zoneful/currentzoneless and real environment injectors with actual emitted decorators and genuine Angular JIT factory. Complete owned and untouched helper execution; window/geometry/clock are protocols, RxJS/tslib borrowed. No native DOM, generated ngc/AOT injectable DI, AOT/packed, full Node/Rx floors, actual control consumers, all upstream/security or G11 credit.',g11_claim:'not-passed'};
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({uses:useReview.cases.length,call_sites:useReview.calls.length,source_negative_controls:sourceNegatives.length,contexts:results.length,cases:results.reduce((n,r)=>n+r.cases.length,0),mutants:results.reduce((n,r)=>n+r.mutations.length,0),native_or_packed_qualified:false}));
}finally{loaded.dispose();}
