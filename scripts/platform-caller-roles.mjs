/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four finite public token/field caller reviews; no component or floor clearance. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {currentCoreRoleOccurrences} from './core-view-use-current-roles.mjs';
export const PLATFORM_CALLER_PRIOR='compatibility/rc/platform-caller-roles-prior.json.gz';
export const PLATFORM_CALLER_REVIEW='compatibility/f10/authored-use-reviews/platform-callers.json';
const priorPins={main:'f6f74df5b6a014536f95f2e7b3bb255913b8747cea9f4421a48699e86ef148d6','21.x':'695782eb6d78e2d509791d4c36d4e23c1b865d52a7cb3f98e57b61a2e8c09b78'};
const publicPins={"main":{"path":"compatibility/rc/platform-caller-roles-public-main.json","sha256":"c4209a9a66340fc7b94006f4e001b9e53d7359d8788b39d7e309c1d99e66fa17"},"21.x":{"path":"compatibility/rc/platform-caller-roles-public-21.json","sha256":"9bef11547931b289ab8e8e5d595b67308f764b3cae36fd482e05f171c8512797"}};
const edgePath='compatibility/rc/spec-cdk-async-source-viewport-nonbrowser-observation.json',edgePins={main:'f9c0a6c9717d731ab263d4c8d39ad2d1292b7b479f666fad00dd7a4abdfcfc44','21.x':'84ad6569fddf6674ca61db313d1feb8c41ae556ef0ee11469a91864ca971e650'};
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),raw=root=>p=>readFileSync(join(root,p)),decoded=new Map(),authenticated=new Set();
function freeze(v){if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}
function original(root,commit,m){
 assert.equal(hash(m.text),m.sha256);const key=JSON.stringify([root,commit,m.path,m.sha256]);if(authenticated.has(key))return;
 const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+m.path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(bytes),m.sha256);authenticated.add(key);
}
export function platformCallerPrior({root=process.cwd(),read=raw(root)}={}){
 const bytes=read(PLATFORM_CALLER_PRIOR),digest=hash(bytes),line=Object.keys(priorPins).find(k=>priorPins[k]===digest);assert.ok(line,'changed Platform caller preimages');
 if(!decoded.has(digest))decoded.set(digest,freeze(JSON.parse(gunzipSync(bytes))));const prior=decoded.get(digest);assert.equal(prior.line,line);assert.equal(prior.selected.length,4);assert.equal(prior.sources.length,4);assert.equal(prior.ledgers.length,3);assert.equal(prior.evidence.length,4);
 for(const m of [...prior.sources,...prior.ledgers,...prior.evidence])original(root,prior.source_parent,m);return prior;
}
const contexts={
 'legacy-core/internal/common-module.ts':['MatCommonModule.constructor','_checkThemeIsPresent'],
 'legacy-core/internal/datetime/native-date-adapter.ts':['LegacyNativeDateAdapter.constructor'],
 'legacy-core/internal/legacy-viewport.ts':['ViewportState','_LegacyViewport.constructor','_LegacyViewport.ngOnDestroy','_LegacyViewport.getViewportSize','_LegacyViewport.getViewportScrollPosition'],
 'legacy-dialog/internal/dialog-container-base.ts':['ambientService','_MatDialogContainerBase._legacyFocusPlatform','_MatDialogContainerBase._isBrowser'],
};
export function platformCallerFacts({root=process.cwd(),read=raw(root)}={}){
 const prior=platformCallerPrior({root,read});for(const m of [...prior.sources,...prior.evidence])assert.equal(hash(read(m.path)),m.sha256,'changed Platform caller/evidence '+m.path);
 const facts=[];
 for(const {original_row:row}of prior.selected){
  const path='projects/ngx-material-legacy/'+row.file,text=read(path).toString(),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
  const role=currentCoreRoleOccurrences(text,row);assert.equal(role.import_local,'Platform');for(const m of role.complete_caller_members)m.reasons=m.reasons.map(r=>r.replace(/^Core:/,'Platform:'));
  const members=new Map();for(const top of source.statements){if((ts.isFunctionDeclaration(top)||ts.isInterfaceDeclaration(top))&&top.name)members.set(top.name.text,top);if(ts.isClassDeclaration(top)&&top.name)for(const m of top.members){const name=ts.isConstructorDeclaration(m)?'constructor':m.name?.getText(source);if(name)members.set(top.name.text+'.'+name,m);}}
  const complete=contexts[row.file].map(name=>{const node=members.get(name);assert.ok(node,name);return {name,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,sha256:hash(node.getText(source)),text:node.getText(source)};});
  const flagReads=[];let constructors=0;function visit(node){if(ts.isNewExpression(node)&&node.expression.getText(source)==='Platform')constructors++;if(ts.isPropertyAccessExpression(node)&&node.name.text==='isBrowser')flagReads.push({line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,expression:node.getText(source)});ts.forEachChild(node,visit);}visit(source);assert.equal(constructors,0);
  const expected={'legacy-core/internal/common-module.ts':1,'legacy-core/internal/datetime/native-date-adapter.ts':0,'legacy-core/internal/legacy-viewport.ts':5,'legacy-dialog/internal/dialog-container-base.ts':1};assert.equal(flagReads.length,expected[row.file]);
  if(row.file.includes('native-date-adapter')){const ctor=members.get('LegacyNativeDateAdapter.constructor');assert.equal(ctor.parameters[1].name.getText(source),'_platform');let references=0;const scan=n=>{if(ts.isIdentifier(n)&&n.text==='_platform')references++;ts.forEachChild(n,scan);};scan(ctor);assert.equal(references,1);}
  facts.push({file:row.file,module:row.module,symbol:row.symbol,candidate_source_sha256:hash(text),source_role:role,complete_context_members:complete,public_flag_reads:flagReads,explicit_Platform_constructor_calls:constructors});
 }
 assert.equal(facts.reduce((n,f)=>n+f.complete_context_members.length,0),11);assert.equal(facts.reduce((n,f)=>n+f.public_flag_reads.length,0),7);return {prior,facts};
}
export function qualifiedPlatformEvidence({root=process.cwd(),read=raw(root)}={}){
 const prior=platformCallerPrior({root,read}),ref=publicPins[prior.line],bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'changed independent Platform public proof');const proof=JSON.parse(bytes);assert.equal(proof.line,prior.line);assert.equal(proof.type_subjects.length,3);assert.equal(proof.runtime_subjects.length,3);
 for(const m of proof.inputs)assert.equal(hash(read(m.path)),m.sha256,'changed Platform public proof input '+m.path);
 const versions={original:['16.2.12','16.2.14'],main:['22.1.7','22.1.7'],'21.x':['21.2.23','21.2.14']};for(const subject of proof.type_subjects){assert.deepEqual([subject.Core,subject.CDK],versions[subject.line]);assert.ok(subject.strict&&subject.skipLibCheck===false&&subject.diagnostics===0);assert.equal(subject.public_isBrowser_type,'boolean');assert.equal(subject.public_class_and_member_nondeprecated,true);assert.equal(subject.explicit_Platform_constructor_calls,0);}
 const tagged=proof.runtime_subjects.find(s=>s.line==='original');for(const s of proof.runtime_subjects){assert.equal(s.cases.length,13);assert.deepEqual(s.cases,tagged.cases);assert.equal(s.explicit_Platform_constructor_calls,0);assert.equal(s.public_service_factory_only,true);}assert.equal(proof.public_factory_cases,39);assert.equal(proof.untouched_original_date_parameter.body_references,0);assert.equal(proof.actual_full_peer_component_native_packed_or_floor_qualified,false);assert.equal(proof.g11_claim,'not-passed');
 const edgeBytes=read(edgePath);assert.equal(hash(edgeBytes),edgePins[prior.line]);original(root,prior.source_parent,{path:edgePath,sha256:edgePins[prior.line],text:edgeBytes.toString()});const edge=JSON.parse(edgeBytes);assert.equal(edge.untouched_reference_and_owned_exhibit_same_synthetic_edge,true);const owned=edge.rows.find(r=>r.label==='owned'),reference=edge.rows.find(r=>r.label==='tagged');assert.equal(hash(read(owned.path)),owned.sha256);assert.equal(hash(read(reference.path)),reference.sha256);assert.deepEqual(owned.getViewportSize,reference.getViewportSize);assert.deepEqual(owned.getViewportRect,reference.getViewportRect);
 return {prior,proof,ref,edge:{path:edgePath,sha256:edgePins[prior.line]}};
}
const decisions={
 'legacy-core/internal/common-module.ts':'The complete dev-mode constructor optionally resolves the public Platform service and passes its public isBrowser flag through boolean conversion to the owned theme-check predicate. It reads no browser-family flags or private platform ID and never calls the Platform constructor. Genuine tagged/minimum provider and null-provider cases support the token/field boundary; module creation, high-contrast initialization and rendered theme detection retain separate obligations.',
 'legacy-core/internal/datetime/native-date-adapter.ts':'The retained _platform parameter has the current public Platform type and no date-logic reads. The untouched16.2.14 NativeDateAdapter constructor also retains this ignored parameter. Its type can still be used as an Angular DI token; this review does not pretend it is erased from factory metadata. Public class identity and normal provider resolution are supported without invoking the21.x compatibility constructor. Adapter factories, date behavior and historical deprecated adapter APIs remain separately owned.',
 'legacy-core/internal/legacy-viewport.ts':'The complete viewport state interface, constructor, destruction, size and scroll methods consume only public Platform.isBrowser. The flag controls listener registration/removal and nonbrowser values; no Platform constructor or private field is used. Size access resolves its window before testing the flag,matching the untouched16.2.14 helper. The preserved no-window observation therefore remains visible and grants no Angular SSR guarantee. Public flag identity/behavior supports this dependency; viewport geometry,caching,event lifetimes and native roots keep their separate gates.',
 'legacy-dialog/internal/dialog-container-base.ts':'The complete ambient-service function resolves the public Platform token only in an existing injection context. The owned field is consumed by _isBrowser through a nullish fallback,so an explicit false service flag takes precedence over DOM availability. Normal public service identity and boolean/null behavior are supported at both minima without a compatibility constructor call. Manual construction, fallback policy, focus trapping/restoration and component/native behavior retain their separate evidence requirements.',
};
export function preparePlatformCallerReview({root=process.cwd(),read=raw(root)}={}){
 const {prior,facts}=platformCallerFacts({root,read}),qualified=qualifiedPlatformEvidence({root,read}),ref=path=>({path,sha256:hash(read(path))}),evidence=[ref(PLATFORM_CALLER_PRIOR),qualified.ref,ref('compatibility/rc/material-public-subjects.json'),ref('scripts/material-public-subjects.mjs'),ref('scripts/core-view-use-current-roles.mjs'),ref('scripts/platform-caller-roles.mjs')];
 return {schema_version:1,line:prior.line,status:'reviewed',criteria:'Four individually reviewed complete public Platform token/field routes; eleven complete context members and seven public flag reads. Source preparation only.',reviews:facts.map(f=>({...f,current_role:f.file.includes('native-date-adapter')?'retained-unused-historical-type-and-DI-slot':'public-service-token-and-browser-flag',decision:decisions[f.file],conclusion:'stable-public-peer',reviewer:'Codex primary implementer; individual complete public Platform caller review',independent_evidence:f.file.endsWith('legacy-viewport.ts')?[...evidence,qualified.edge]:evidence,scope_limit:'Named public token/field dependency only; no broad module,date,viewport,dialog focus,component,native,packed,consumer or floor clearance.'})),source_closures_prepared:4,source_closures_integrated:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
export function inspectPlatformCallerReview(options={}){
 const root=options.root??process.cwd(),read=options.read??raw(root),body=preparePlatformCallerReview({root,read});assert.equal(hash(read(PLATFORM_CALLER_REVIEW)),hash(JSON.stringify(body,null,2)+'\n'),'changed prepared Platform caller review');return body;
}
