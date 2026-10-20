/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Five finite Core type/token callers; canonical integration has a separate owner. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {currentCoreRoleOccurrences} from './core-view-use-current-roles.mjs';
export const CORE_TOKEN_CALLER_PRIOR='compatibility/rc/core-token-caller-roles-prior.json.gz';
export const CORE_TOKEN_CALLER_REVIEW='compatibility/f10/authored-use-reviews/core-token-callers.json';
const priorPins={main:'4d182d7e2a1e7b83069335c5a854a835ecdee2c6e136ebcfc22dd1b836738c87','21.x':'79c2b36d191286a956fe96253fb434a20b32aaba445daa7fa0c3aa08e68ae70b'};
const publicPins={main:{path:'compatibility/rc/core-token-caller-roles-public-main.json',sha256:'feb97a5ae3ba779a800bd0ee2387e9efb0d621c114fefbec3681b16aac8b3c2e'},'21.x':{path:'compatibility/rc/core-token-caller-roles-public-21.json',sha256:'5e5669c9130ca9e6b329bc9e275069ccf0595498cc4721e5c9792ca98e3f1020'}};
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),raw=root=>p=>readFileSync(join(root,p)),authenticated=new Set(),decoded=new Map();
const id=r=>JSON.stringify([r.file,r.module,r.symbol]);
function freeze(v){if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}
function original(root,commit,m){
 assert.equal(hash(m.text),m.sha256);const key=JSON.stringify([root,commit,m.path,m.sha256]);if(authenticated.has(key))return;
 const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+m.path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(bytes),m.sha256);authenticated.add(key);
}
export function coreTokenCallerPrior({root=process.cwd(),read=raw(root)}={}){
 const bytes=read(CORE_TOKEN_CALLER_PRIOR),digest=hash(bytes),line=Object.keys(priorPins).find(k=>priorPins[k]===digest);assert.ok(line,'changed Core token caller preimages');
 if(!decoded.has(digest))decoded.set(digest,freeze(JSON.parse(gunzipSync(bytes))));const prior=decoded.get(digest);assert.equal(prior.line,line);assert.equal(prior.selected.length,5);assert.equal(prior.sources.length,5);assert.equal(prior.ledgers.length,3);assert.equal(prior.evidence.length,14);
 for(const m of [...prior.sources,...prior.evidence,...prior.ledgers])original(root,prior.source_parent,m);return prior;
}
function parse(path,text){const s=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(s.parseDiagnostics.length,0);return s;}
function members(source){const out=new Map();for(const n of source.statements){if(n.name)out.set(n.name.text,n);if((ts.isClassDeclaration(n)||ts.isInterfaceDeclaration(n))&&n.name)for(const m of n.members){const name=ts.isConstructorDeclaration(m)?'constructor':m.name?.getText(source);if(name)out.set(n.name.text+'.'+name,m);}}return out;}
const contexts={
 'legacy-dialog/internal/dialog-container-base.ts:ProviderToken':['ambientService'],
 'legacy-dialog/internal/dialog-container-base.ts:Renderer2':['ambientService','_MatDialogContainerBase._legacyFocusRenderer','_MatDialogContainerBase._trapFocus','_MatDialogContainerBase.ngOnDestroy'],
 'legacy-dialog/internal/dialog-initial-focus.ts:Renderer2':['LegacyDialogInitialFocusContext','focusLegacyDialogInitially'],
 'legacy-table/row.ts:IterableDiffers':['MatLegacyHeaderRowDef.constructor','MatLegacyFooterRowDef.constructor','MatLegacyRowDef.constructor'],
 'legacy-menu/internal/menu-panel.ts:EventEmitter':['MatMenuPanel'],
};
export function coreTokenCallerFacts({root=process.cwd(),read=raw(root)}={}){
 const prior=coreTokenCallerPrior({root,read});for(const m of [...prior.sources,...prior.evidence])assert.equal(hash(read(m.path)),m.sha256,'changed Core caller/evidence '+m.path);
 const facts=[];
 for(const {original_row:row}of prior.selected){const path='projects/ngx-material-legacy/'+row.file,text=read(path).toString(),source=parse(path,text),all=members(source),role=currentCoreRoleOccurrences(text,row);assert.equal(role.import_local,row.symbol);
  const complete=contexts[row.file+':'+row.symbol].map(name=>{const node=all.get(name);assert.ok(node,name);return {name,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,sha256:hash(node.getText(source)),text:node.getText(source)};});
  const counts={ProviderToken:1,IterableDiffers:6,EventEmitter:1};if(row.symbol in counts)assert.equal(role.occurrences.length,counts[row.symbol]);else assert.equal(role.occurrences.length,1);
  facts.push({file:row.file,module:row.module,symbol:row.symbol,candidate_source_sha256:hash(text),source_role:role,complete_context_members:complete});
 }
 assert.equal(new Set(facts.map(id)).size,5);assert.equal(facts.reduce((n,f)=>n+f.complete_context_members.length,0),11);
 const menu=facts.find(f=>f.symbol==='EventEmitter'),existing=JSON.parse(read('compatibility/f10/authored-use-reviews/public-event-emitter-boundary.json')),reviews=existing.reviews.filter(r=>id(r)===id(menu));assert.equal(reviews.length,1);assert.equal(reviews[0].candidate_source_sha256,menu.candidate_source_sha256);assert.equal(reviews[0].conclusion,'stable-public-peer');
 for(const ref of reviews[0].independent_evidence)assert.equal(hash(read(ref.path)),ref.sha256,'changed reused EventEmitter proof '+ref.path);
 return {prior,facts,reused_event_emitter_review:reviews[0]};
}
/** Exact current snippets for finite strict/runtime contracts; parent and renderer protocols stay explicit. */
export function coreTokenSourceContract(options={}){
 const root=options.root??process.cwd(),read=options.read??raw(root),{facts}=coreTokenCallerFacts({root,read}),base=facts.find(f=>f.symbol==='ProviderToken'),renderer=facts.find(f=>f.symbol==='Renderer2'&&f.file.includes('container-base'));
 const ambient=base.complete_context_members[0].text,trap=renderer.complete_context_members.find(m=>m.name.endsWith('._trapFocus')).text;
 assert.match(ambient,/return inject\(token, \{optional: true\}\);/);assert.match(ambient,/assertInInjectionContext\(ambientService\)/);
 const parsed=parse('trap.ts','class Receiver {\n'+trap+'\n}');let fallback;function visit(n){if(ts.isPropertyAssignment(n)&&n.name.getText(parsed)==='renderer'){assert.equal(fallback,undefined);assert.ok(ts.isBinaryExpression(n.initializer));assert.equal(n.initializer.left.getText(parsed),'this._legacyFocusRenderer');assert.equal(n.initializer.operatorToken.kind,ts.SyntaxKind.BarBarToken);fallback=n.initializer.right.getText(parsed);}ts.forEachChild(n,visit);}visit(parsed);assert.ok(fallback);
 const row=facts.find(f=>f.symbol==='IterableDiffers'),constructors=row.complete_context_members.map(m=>({name:m.name.split('.')[0],text:m.text}));
 for(const ctor of constructors){assert.match(ctor.text,/differs: IterableDiffers/);assert.match(ctor.text,/\{provide: IterableDiffers, useValue: differs\}/);}
 const refPath='reference/material-16.2.14/dialog-focus-sources/cdk-dialog-container.ts',reference=parse(refPath,read(refPath).toString()),method=members(reference).get('CdkDialogContainer._forceFocus');assert.ok(method?.body);
 const focus=read('projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts').toString(),menu=read('projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts').toString(),focusFile=parse('focus.ts',focus),menuFile=parse('menu.ts',menu),rendererSlot=members(focusFile).get('LegacyDialogInitialFocusContext.renderer'),close=members(menuFile).get('MatMenuPanel.close');assert.ok(rendererSlot&&close);
 return {ambient,fallback,constructors,focus,menu,renderer_slot:rendererSlot.getText(focusFile),menu_close:close.getText(menuFile),helper:read('projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts').toString(),tagged_force_focus:method.getText(reference).replace(/^private\s+/,''),tagged_reference:{path:refPath,sha256:hash(read(refPath)),method_sha256:hash(method.getText(reference))}};
}
export function qualifiedCoreTokenEvidence({root=process.cwd(),read=raw(root)}={}){
 const {prior,reused_event_emitter_review}=coreTokenCallerFacts({root,read}),ref=publicPins[prior.line],bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'changed Core caller public proof');const proof=JSON.parse(bytes);assert.equal(proof.line,prior.line);assert.equal(proof.type_subjects.length,3);assert.equal(proof.runtime_subjects.length,6);
 for(const m of proof.inputs)assert.equal(hash(read(m.path)),m.sha256,'changed Core public proof input '+m.path);
 const versions={original:'16.2.12',main:'22.1.7','21.x':'21.2.23'};for(const s of proof.type_subjects){assert.equal(s.Core,versions[s.line]);assert.ok(s.strict&&s.skipLibCheck===false&&s.diagnostics===0);assert.equal(s.negative_type_controls,3);assert.equal(s.public_nondeprecated_symbols.length,4);assert.ok(s.listen_returns_disposer);}
 for(const s of proof.runtime_subjects){assert.equal(s.cases.length,12);assert.equal(s.differ_constructor_protocols,3);assert.equal(s.renderer_protocol_cases,6);assert.equal(s.untouched_tagged_renderer_event_comparisons,4);assert.equal(s.actual_legacy_parents_or_native_renderer_executed,false);}
 assert.equal(proof.runtime_fault_controls.length,12);assert.ok(proof.runtime_fault_controls.every(c=>c.rejected));
 assert.equal(proof.actual_native_packed_or_full_floor_qualified,false);assert.equal(proof.g11_claim,'not-passed');return {prior,proof,ref,reused_event_emitter_review};
}
const decisions={
 ProviderToken:'The complete ambientService<T> uses public ProviderToken<T> solely to preserve token/result typing across assertInInjectionContext and optional inject. Missing context returns null; present class and InjectionToken values preserve identity; missing optional values return null and provider errors propagate. Strict actual snippets select stable public signatures at the untouched original and both exact minima. The annotation is erased; no token alias or private lookup is introduced. This qualifies the generic token boundary, not every injected service or complete dialog lifecycle.',
 'Renderer2:base':'The owned dialog field optionally resolves the public Renderer2 token through the complete ambient helper. The complete focus caller chooses that instance or its unchanged manual add/removeEventListener fallback and retains the returned cleanup for recapture and destruction. Strict checks cover the actual fallback against public Pick<Renderer2,listen>; genuine public token identity and explicit listener/disposer protocols cover the consumed boundary. No Renderer2 constructor, concrete Angular renderer, application or native behavior is claimed.',
 'Renderer2:focus':'The complete context interface consumes only public Renderer2.listen. The complete selector branch registers blur and mousedown outside the zone, focuses with the original options and returns idempotent cleanup removing both listeners and temporary tabindex. Recording protocols exercise exact current code; event cleanup/focus observations compare to the untouched tagged _forceFocus body. Explicit teardown additionally tests the owned cleanup contract and is not relabeled as an original returned disposer. Concrete Angular rendering, browser focus/trap behavior and broader lifecycle stay separately owned.',
 IterableDiffers:'All three complete manual row-definition constructors retain the supplied public IterableDiffers annotation and forward that exact object under the same public token into the existing borrowed dependency context. No new differ, default registry, private token or destruction owner is created. Actual constructor bodies and the unchanged complete helper execute with genuine Core namespaces and explicit parent protocols, retaining template/table arguments, prototypes and borrowed lifetimes. Existing real table behavior is historical supporting context under borrowed22, not a current21/native/floor pass. Only the named registry type/token/forwarding boundary is closed.',
 EventEmitter:'The actual menu-panel interface uses a type-only public EventEmitter import for readonly close:EventEmitter<void|click|keydown|tab>. It constructs or emits nothing. The existing exact source-bound EventEmitter review and its genuine original/minimum evidence are reused, including measured signal suppression and optional lifecycle-capture differences. Strict compilation of the exact current close declaration retains readonly and the precise payload union; rejected reassignment, invalid payload and signal-style replacement controls protect that contract. The other menu-panel properties are not qualified by this isolated type contract. Menu producer, trigger, pending-task and native lifecycle receive no additional clearance.',
};
export function prepareCoreTokenCallerReview({root=process.cwd(),read=raw(root)}={}){
 const {prior,facts}=coreTokenCallerFacts({root,read}),q=qualifiedCoreTokenEvidence({root,read}),ref=path=>({path,sha256:hash(read(path))}),evidence=[ref(CORE_TOKEN_CALLER_PRIOR),q.ref,ref('scripts/core-token-caller-roles.mjs'),ref('scripts/core-view-use-current-roles.mjs')];
 return {schema_version:1,line:prior.line,status:'reviewed',criteria:'Five individually reviewed complete Core type/token callers. Existing EventEmitter evidence reused; finite strict and runtime supplements. Canonical integration remains separate.',reviews:facts.map(f=>({...f,conclusion:'stable-public-peer',reviewer:'Codex primary implementer; individual complete Core type/token caller review',decision:decisions[f.symbol==='Renderer2'?'Renderer2:'+(f.file.includes('container-base')?'base':'focus'):f.symbol],independent_evidence:f.symbol==='EventEmitter'?[...evidence,ref('compatibility/f10/authored-use-reviews/public-event-emitter-boundary.json'),...q.reused_event_emitter_review.independent_evidence]:evidence,scope_limit:'Named public dependency only. No complete component,application,native,packed,AOT,consumer,compiler/Node/RxJS/full-peer-floor or G01-G13 qualification.'})),source_closures_prepared:5,source_closures_integrated:0,actual_native_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
}
export function inspectCoreTokenCallerReview(options={}){const root=options.root??process.cwd(),read=options.read??raw(root),body=prepareCoreTokenCallerReview({root,read});assert.equal(hash(read(CORE_TOKEN_CALLER_REVIEW)),hash(JSON.stringify(body,null,2)+'\n'),'changed prepared Core token caller review');return body;}
