/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current source/evidence binding and a selected owned predicate protocol. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {platformCallerFacts,qualifiedPlatformEvidence,inspectPlatformCallerReview,PLATFORM_CALLER_PRIOR,PLATFORM_CALLER_REVIEW} from '../scripts/platform-caller-roles.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript'),{prior,facts}=platformCallerFacts({root}),qualified=qualifiedPlatformEvidence({root}),integrated=process.argv.includes('--integrated');
const identity=r=>JSON.stringify([r.file,r.module,r.symbol]);
function canonical(body,readMember){
 const ref={path:PLATFORM_CALLER_REVIEW,sha256:hash(readMember(PLATFORM_CALLER_REVIEW))};
 for(const [i,m]of prior.ledgers.entries()){
  const data=JSON.parse(readMember(m.path)),rows=i===0?data.entries:data.symbol_uses;assert.equal(rows.length,[1697,1736,315][i]);
  if(!integrated)assert.equal(hash(readMember(m.path)),m.sha256,'preparation changed a canonical ledger');
  if(i!==2)continue;
  for(const selected of prior.selected){const before=selected.original_row,now=rows.find(r=>identity(r)===identity(before)),expected=integrated?{...before,status:'reviewed',disposition:'closed',source_review:ref}:before;assert.equal(isDeepStrictEqual(now,expected),true,'unregistered Platform canonical transition');}
 }
}
function inspect(readMember=read){const body=inspectPlatformCallerReview({root,read:readMember});canonical(body,readMember);return body;}
const body=inspect();assert.equal(body.reviews.length,4);assert.equal(facts.reduce((n,f)=>n+f.complete_context_members.length,0),11);assert.equal(facts.reduce((n,f)=>n+f.public_flag_reads.length,0),7);assert.equal(qualified.proof.public_factory_cases,39);
const subjects=JSON.parse(read('compatibility/rc/material-public-subjects.json')),important=subjects.subjects.flatMap(s=>s.members.filter(m=>m.package==='@angular/cdk'&&m.module_path.includes('platform')).map(m=>m.path));
const paths=[...new Set([PLATFORM_CALLER_PRIOR,PLATFORM_CALLER_REVIEW,'scripts/platform-caller-roles.mjs',qualified.ref.path,qualified.edge.path,'reference/material-16.2.14/viewport-sources/viewport-ruler.ts','tests/platform_public_subject_probe.mjs','tests/platform_caller_roles_public_subject.mjs',...prior.sources.map(m=>m.path),...prior.evidence.map(m=>m.path),...(integrated?[]:prior.ledgers.map(m=>m.path)),...important])];
for(const path of paths){const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspect(p=>p===path?bytes:read(p)),e=>e?.code==='ERR_ASSERTION',path);}
const ledger=prior.ledgers[2],badLedger=JSON.parse(read(ledger.path));badLedger.symbol_uses.find(r=>identity(r)===identity(prior.selected[0].original_row)).status='foreign';const badBytes=Buffer.from(JSON.stringify(badLedger));assert.throws(()=>canonical(body,p=>p===ledger.path?badBytes:read(p)),e=>e?.code==='ERR_ASSERTION');
let changed=false;const path=prior.sources[0].path,bytes=Buffer.concat([read(path),Buffer.from('\n')]),late=p=>changed&&p===path?bytes:read(p);inspect(late);changed=true;assert.throws(()=>inspect(late),e=>e?.code==='ERR_ASSERTION');
const dialog=facts.find(f=>f.file.includes('dialog-container-base')),method=dialog.complete_context_members.find(m=>m.name.endsWith('._isBrowser')).text;
function predicateCases(text){
 const compiled=ts.transpileModule('class Receiver {\n'+text+'\n}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});assert.equal(compiled.diagnostics?.length??0,0);
 const observations=[];for(const flag of [true,false,null,undefined])for(const present of [false,true])for(const focus of [false,true]){
  const Receiver=new Function('document',compiled.outputText+';return Receiver;')(present?{}:undefined),context={_legacyFocusPlatform:flag==null?flag:{isBrowser:flag},_elementRef:{nativeElement:focus?{focus(){}}:{}}};
  const actual=Receiver.prototype._isBrowser.call(context),expected=flag==null?present&&focus:flag;assert.equal(actual,expected,'provided false flag or manual fallback changed');observations.push({flag:flag===undefined?'undefined':flag,document_present:present,focus_available:focus,result:actual});
 }return observations;
}
const predicate=predicateCases(method),faults=[];
for(const [id,mutated]of [['false-loses-to-DOM-fallback',method.replace('??','||')],['platform-flag-inverted',method.replace('this._legacyFocusPlatform?.isBrowser','!this._legacyFocusPlatform?.isBrowser')]]){assert.notEqual(mutated,method);assert.throws(()=>predicateCases(mutated),e=>e?.code==='ERR_ASSERTION');faults.push(id);}
const report={schema_version:1,line:prior.line,individual_caller_roles:4,complete_context_members:11,public_flag_reads:7,strict_public_namespace_models:3,genuine_public_factory_cases:39,compatibility_constructor_calls:0,source_and_evidence_corruptions_rejected:paths.length,canonical_row_corruption_rejected:true,late_source_change_rejected:true,selected_owned_predicate_protocol_cases:predicate.length,incorrect_predicate_faults_rejected:faults,original_ignored_date_parameter_preserved:true,inherited_synthetic_viewport_edge_preserved:true,canonical_closures_integrated:integrated?4:0,all_canonical_ledger_bytes_preserved:!integrated,all1697_SHA_1736_frozen_315_additional_obligations_retained:true,actual_full_viewport_dialog_date_component_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
