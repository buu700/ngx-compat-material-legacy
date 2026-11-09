/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Main-only current caller epoch; preserves historic receipt and helper.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {currentCoreRoleOccurrences} from './core-view-use-current-roles.mjs';
import {coreTokenCallerPrior,CORE_TOKEN_CALLER_PRIOR} from './core-token-caller-roles.mjs';
export {coreTokenCallerPrior,CORE_TOKEN_CALLER_PRIOR};
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),raw=root=>p=>readFileSync(join(root,p)),id=r=>JSON.stringify([r.file,r.module,r.symbol]),cache=new Set();
export const CORE_TOKEN_CURRENT_EPOCH='compatibility/rc/core-token-current-main.json';
const publicPins={main:{path:'compatibility/rc/core-token-caller-roles-public-current-main.json',sha256:'07aa1cf79c7e71bd68d80b87ad44a5362be5d6a02c9d95db13ab213d65dd585a'}};
function verifyEpoch({root,read,prior}){const b=read(CORE_TOKEN_CURRENT_EPOCH);assert.equal(hash(b),'2da03d809721e7ad008839c0ad2d2f1283e642d4888e16c4a3e2dee8943d14ac');const e=JSON.parse(b);assert.equal(prior.line,'main');assert.equal(e.line,'main');assert.equal(e.source_commit,'65015ae59f87127708e2be3c20e54a8738dd7307');assert.equal(e.prior_sha256,hash(read(CORE_TOKEN_CALLER_PRIOR)));assert.deepEqual(e.sources.map(m=>m.path),prior.sources.map(m=>m.path));for(const m of e.sources){const b=read(m.path);assert.equal(hash(b),m.sha256,'changed current Core source '+m.path);assert.equal(b.length,m.bytes);const k=JSON.stringify([root,e.source_commit,m.path,m.sha256]);if(!cache.has(k)){const data=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',e.source_commit+':'+m.path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(data),m.sha256);cache.add(k);}}for(const m of prior.evidence)assert.equal(hash(read(m.path)),m.sha256,'changed historical Core evidence '+m.path);}

function parse(path,text){const s=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(s.parseDiagnostics.length,0);return s;}
function members(source){const out=new Map();for(const n of source.statements){if(n.name)out.set(n.name.text,n);if((ts.isClassDeclaration(n)||ts.isInterfaceDeclaration(n))&&n.name)for(const m of n.members){const name=ts.isConstructorDeclaration(m)?'constructor':m.name?.getText(source);if(name)out.set(n.name.text+'.'+name,m);}}return out;}
const contexts={
 'legacy-dialog/internal/dialog-container-base.ts:ProviderToken':['ambientService'],
 'legacy-dialog/internal/dialog-container-base.ts:Renderer2':['ambientService','_MatDialogContainerBase._legacyFocusRenderer','_MatDialogContainerBase._trapFocus','_MatDialogContainerBase.ngOnDestroy'],
 'legacy-dialog/internal/dialog-initial-focus.ts:Renderer2':['LegacyDialogInitialFocusContext','focusLegacyDialogInitially'],
 'legacy-table/row.ts:IterableDiffers':['MatLegacyHeaderRowDef.constructor','MatLegacyFooterRowDef.constructor','MatLegacyRowDef.constructor'],
 'legacy-menu/internal/menu-panel.ts:EventEmitter':['MatMenuPanel'],
};
export function currentCoreTokenCallerFacts({root=process.cwd(),read=raw(root)}={}){
 const prior=coreTokenCallerPrior({root,read});verifyEpoch({root,read,prior});
 const facts=[];
 for(const {original_row:row}of prior.selected){const path='projects/ngx-material-legacy/'+row.file,text=read(path).toString(),source=parse(path,text),all=members(source),role=currentCoreRoleOccurrences(text,row);assert.equal(role.import_local,row.symbol);
  const complete=contexts[row.file+':'+row.symbol].map(name=>{const node=all.get(name);assert.ok(node,name);return {name,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,sha256:hash(node.getText(source)),text:node.getText(source)};});
  const counts={ProviderToken:1,IterableDiffers:6,EventEmitter:1};if(row.symbol in counts)assert.equal(role.occurrences.length,counts[row.symbol]);else assert.equal(role.occurrences.length,1);
  facts.push({file:row.file,module:row.module,symbol:row.symbol,candidate_source_sha256:hash(text),source_role:role,complete_context_members:complete});
 }
 assert.equal(new Set(facts.map(id)).size,5);assert.equal(facts.reduce((n,f)=>n+f.complete_context_members.length,0),11);
 const menu=facts.find(f=>f.symbol==='EventEmitter'),existing=JSON.parse(read('compatibility/f10/authored-use-reviews/public-event-emitter-boundary.json')),reviews=existing.reviews.filter(r=>id(r)===id(menu));assert.equal(reviews.length,1);const oldMenu=prior.sources.find(m=>m.path==='projects/ngx-material-legacy/'+menu.file);assert.equal(reviews[0].candidate_source_sha256,oldMenu.sha256);const historical=members(parse(menu.file,oldMenu.text)).get('MatMenuPanel.close'),current=members(parse(menu.file,read(oldMenu.path).toString())).get('MatMenuPanel.close');assert.ok(historical&&current);assert.equal(historical.getText(),current.getText(),'historical EventEmitter member changed');assert.equal(reviews[0].conclusion,'stable-public-peer');
 for(const ref of reviews[0].independent_evidence)assert.equal(hash(read(ref.path)),ref.sha256,'changed reused EventEmitter proof '+ref.path);
 return {prior,facts,reused_event_emitter_review:reviews[0]};
}
/** Exact current snippets for finite strict/runtime contracts; parent and renderer protocols stay explicit. */
export function currentCoreTokenSourceContract(options={}){
 const root=options.root??process.cwd(),read=options.read??raw(root),{facts}=currentCoreTokenCallerFacts({root,read}),base=facts.find(f=>f.symbol==='ProviderToken'),renderer=facts.find(f=>f.symbol==='Renderer2'&&f.file.includes('container-base'));
 const ambient=base.complete_context_members[0].text,trap=renderer.complete_context_members.find(m=>m.name.endsWith('._trapFocus')).text;
 assert.match(ambient,/return inject\(token, \{optional: true\}\);/);assert.match(ambient,/assertInInjectionContext\(ambientService\)/);
 const parsed=parse('trap.ts','class Receiver {\n'+trap+'\n}');let fallback;function visit(n){if(ts.isPropertyAssignment(n)&&n.name.getText(parsed)==='renderer'){assert.equal(fallback,undefined);assert.ok(ts.isBinaryExpression(n.initializer));assert.equal(n.initializer.left.getText(parsed),'this._legacyFocusRenderer');assert.equal(n.initializer.operatorToken.kind,ts.SyntaxKind.BarBarToken);fallback=n.initializer.right.getText(parsed);}ts.forEachChild(n,visit);}visit(parsed);assert.ok(fallback);
 const row=facts.find(f=>f.symbol==='IterableDiffers'),constructors=row.complete_context_members.map(m=>({name:m.name.split('.')[0],text:m.text}));
 for(const ctor of constructors){assert.match(ctor.text,/differs: IterableDiffers/);assert.match(ctor.text,/\{provide: IterableDiffers, useValue: differs\}/);}
 const refPath='reference/material-16.2.14/dialog-focus-sources/cdk-dialog-container.ts',reference=parse(refPath,read(refPath).toString()),method=members(reference).get('CdkDialogContainer._forceFocus');assert.ok(method?.body);
 const focus=read('projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts').toString(),menu=read('projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts').toString(),focusFile=parse('focus.ts',focus),menuFile=parse('menu.ts',menu),rendererSlot=members(focusFile).get('LegacyDialogInitialFocusContext.renderer'),close=members(menuFile).get('MatMenuPanel.close');assert.ok(rendererSlot&&close);
 return {ambient,fallback,constructors,focus,menu,renderer_slot:rendererSlot.getText(focusFile),menu_close:close.getText(menuFile),helper:read('projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts').toString(),tagged_force_focus:method.getText(reference).replace(/^private\s+/,''),tagged_reference:{path:refPath,sha256:hash(read(refPath)),method_sha256:hash(method.getText(reference))}};
}
export function qualifiedCurrentCoreTokenEvidence({root=process.cwd(),read=raw(root)}={}){
 const {prior,reused_event_emitter_review}=currentCoreTokenCallerFacts({root,read}),ref=publicPins[prior.line],bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'changed Core caller public proof');const proof=JSON.parse(bytes);assert.equal(proof.line,prior.line);assert.equal(proof.type_subjects.length,3);assert.equal(proof.runtime_subjects.length,6);
 for(const m of proof.inputs)assert.equal(hash(read(m.path)),m.sha256,'changed Core public proof input '+m.path);
 const versions={original:'16.2.12',main:'22.1.7','21.x':'21.2.23'};for(const s of proof.type_subjects){assert.equal(s.Core,versions[s.line]);assert.ok(s.strict&&s.skipLibCheck===false&&s.diagnostics===0);assert.equal(s.negative_type_controls,3);assert.equal(s.public_nondeprecated_symbols.length,4);assert.ok(s.listen_returns_disposer);}
 for(const s of proof.runtime_subjects){assert.equal(s.cases.length,12);assert.equal(s.differ_constructor_protocols,3);assert.equal(s.renderer_protocol_cases,6);assert.equal(s.untouched_tagged_renderer_event_comparisons,4);assert.equal(s.actual_legacy_parents_or_native_renderer_executed,false);}
 assert.equal(proof.runtime_fault_controls.length,12);assert.ok(proof.runtime_fault_controls.every(c=>c.rejected));
 assert.equal(proof.actual_native_packed_or_full_floor_qualified,false);assert.equal(proof.g11_claim,'not-passed');return {prior,proof,ref,reused_event_emitter_review};
}
