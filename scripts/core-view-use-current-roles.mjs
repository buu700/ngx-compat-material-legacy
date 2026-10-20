/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact current caller decisions; source closure is separate from runtime gates. */
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const json=v=>JSON.stringify(v,null,2)+'\n',readRaw=root=>p=>readFileSync(join(root,p));
export const CURRENT_ROLE_PRIOR='compatibility/rc/core-view-use-current-roles-prior.json.gz';
export const CURRENT_ROLE_REVIEW='compatibility/f10/authored-use-reviews/core-view-current-roles.json';
const recipePath='compatibility/rc/core-view-use-current-roles-decisions.json',runtimePath='compatibility/rc/core-view-use-current-roles-runtime.json';
const producer='scripts/core-view-use-current-roles.mjs';
const pins={main:'99b030203510f78c6f479759f65f6881aadc34f09c0ba60a5e78def890c32a6b','21.x':'86f8c2039fd0b06e5600360d6c1ef06b34196817afec2f961401b66115ff6c44'};
const recipePin='df780ba17f9778e4e32d316d1dd5867cf870a21c0398ec9ea303b1917a4101bd',runtimePin='6b19219426615c5e681da49cf4afa6383a47c98e870e8495d1987faaf2dd12f5';
const identity=r=>[r.file,r.module,r.symbol].join('#'),authenticated=new Set();
export function currentCoreRolePrior({root=process.cwd(),read=readRaw(root)}={}){
 const bytes=read(CURRENT_ROLE_PRIOR),line=Object.keys(pins).find(k=>hash(bytes)===pins[k]);assert.ok(line,'changed current view-role preimages');
 const prior=JSON.parse(gunzipSync(bytes));assert.equal(prior.line,line);assert.equal(prior.selected.length,35);assert.equal(prior.sources.length,22);assert.equal(prior.ledgers.length,3);assert.equal(prior.reports.length,5);
 for(const m of [...prior.ledgers,...prior.sources,...prior.reports,...prior.tooling_preimages,...prior.protected]){
  assert.equal(hash(m.text),m.sha256);const key=JSON.stringify([root,prior.source_parent,m.path,m.sha256]);if(authenticated.has(key))continue;
  const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',prior.source_parent+':'+m.path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(raw),m.sha256,'unbound original caller '+m.path);authenticated.add(key);
 }
 return prior;
}
/** All selected identifiers and complete enclosing caller members, never a type index alone. */
export function currentCoreRoleOccurrences(sourceText,row){
 const file=ts.createSourceFile(row.file,sourceText,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);
 const imports=file.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===row.module).flatMap(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?n.importClause.namedBindings.elements:[]).filter(n=>(n.propertyName??n.name).text===row.symbol);assert.equal(imports.length,1);const local=imports[0].name.text,occurrences=[],bindings=new Set(),members=new Map();
 function member(node,reason){let top=node;while(top.parent&&!ts.isSourceFile(top.parent)&&!ts.isClassDeclaration(top.parent)&&!ts.isInterfaceDeclaration(top.parent))top=top.parent;const start=top.getStart(file),old=members.get(start)??{line:file.getLineAndCharacterOfPosition(start).line+1,member_sha256:hash(top.getText(file)),reasons:[]};if(!old.reasons.includes(reason))old.reasons.push(reason);members.set(start,old);}
 function visit(node){if(ts.isIdentifier(node)&&node.text===local&&!ts.isImportSpecifier(node.parent)){
  const location=file.getLineAndCharacterOfPosition(node.getStart(file));occurrences.push({line:location.line+1,column:location.character+1,parent_kind:ts.SyntaxKind[node.parent.kind],parent_source:node.parent.getText(file)});member(node,'Core:'+local);
  let owner=node;while(owner&&!ts.isParameter(owner)&&!ts.isPropertyDeclaration(owner)&&!ts.isPropertySignature(owner)&&!ts.isSourceFile(owner)&&!ts.isMethodDeclaration(owner))owner=owner.parent;
  if(owner&&(ts.isParameter(owner)||ts.isPropertyDeclaration(owner)||ts.isPropertySignature(owner))&&ts.isIdentifier(owner.name))bindings.add(owner.name.text);
 }ts.forEachChild(node,visit);}visit(file);assert.ok(occurrences.length);
 function references(node){if(ts.isPropertyAccessExpression(node)&&node.expression.kind===ts.SyntaxKind.ThisKeyword&&bindings.has(node.name.text))member(node,'this.'+node.name.text);ts.forEachChild(node,references);}references(file);
 return {import_local:local,occurrences,bound_parameters_and_fields:[...bindings],complete_caller_members:[...members.values()].sort((a,b)=>a.line-b.line)};
}
export function computeCurrentCoreRoleWrites({root=process.cwd(),read=readRaw(root)}={}){
 const prior=currentCoreRolePrior({root,read});
 for(const m of [...prior.sources,...prior.reports,...prior.protected])assert.equal(hash(read(m.path)),m.sha256,'changed current caller/evidence '+m.path);
 const recipeRaw=read(recipePath),runtimeRaw=read(runtimePath);assert.equal(hash(recipeRaw),recipePin);assert.equal(hash(runtimeRaw),runtimePin);const recipe=JSON.parse(recipeRaw),runtime=JSON.parse(runtimeRaw);
 assert.equal(recipe.decisions.length,35);assert.equal(new Set(recipe.decisions.map(identity)).size,35);assert.deepEqual(recipe.decisions.map(identity).sort(),prior.selected.map(identity).sort());
 assert.equal(runtime.runtime_subjects.length,10);assert.deepEqual(runtime.runtime_subjects.reduce((a,s)=>(a[s.line]=(a[s.line]??0)+1,a),{}),{original:2,main:4,'21.x':4});
 assert.equal(runtime.actual_snack_bar_component_native_packed_or_floor_qualified,false);for(const s of runtime.runtime_subjects){assert.equal(s.cases.length,2);assert.equal(s.behavior_faults_rejected.length,2);assert.equal(s.genuine_Core_views_and_CDK_outlet,true);}for(const m of runtime.source_members)assert.equal(hash(read(m.path)),m.sha256,'changed outlet caller subject '+m.path);
 const coreMember=prior.reports.find(m=>m.path.includes('core-view-use-public-'));assert.ok(coreMember);const publicView=JSON.parse(read(coreMember.path));assert.equal(publicView.type_subjects.length,3);assert.equal(publicView.runtime_subjects.length,10);
 for(const subject of publicView.type_subjects){assert.equal(subject.strict,true);assert.equal(subject.skipLibCheck,false);assert.equal(subject.diagnostics,0);assert.deepEqual(subject.public_symbols.map(s=>s.name),['ApplicationRef','ComponentRef','EmbeddedViewRef','TemplateRef','Type','ViewContainerRef']);}
 for(const subject of publicView.runtime_subjects){assert.equal(subject.genuine_public_Core_and_CDK_portal_subjects,true);assert.equal(subject.cases.length,13);assert.equal(subject.behavior_faults_rejected.length,10);}
 const ref=path=>({path,sha256:hash(read(path))}),reviews=[];
 for(const decision of recipe.decisions){const selected=prior.selected.find(r=>identity(r)===identity(decision));assert.ok(selected);const member=prior.sources.find(m=>m.path==='projects/ngx-material-legacy/'+decision.file);assert.ok(member);assert.equal(selected.original_row.disposition,'open');
  const independent=[ref(CURRENT_ROLE_PRIOR),ref(recipePath),ref(runtimePath),ref(coreMember.path),ref(producer)];
  const extra=decision.file.startsWith('legacy-table/')?['compatibility/rc/table-definition-public-token-source-proof.json','compatibility/rc/table-outlet-public-protocol-source-proof.json','projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts']:decision.file==='legacy-tabs/tab-body.ts'?[prior.reports.find(m=>m.path.includes('tab-portal-explicit-container-public-')).path,'projects/ngx-material-legacy/legacy-tabs/internal/tab-portal-construction-context.ts']:decision.file.startsWith('legacy-dialog/')?['compatibility/rc/dialog-public-container-source-proof.json']:[];
  for(const path of extra)independent.push(ref(path));
  reviews.push({...decision,candidate_source_sha256:member.sha256,conclusion:'stable-public-peer',reviewer:'Codex primary implementer; individual current caller review',source_role:currentCoreRoleOccurrences(read(member.path).toString(),selected),independent_evidence:independent,scope_limit:'This source decision qualifies the named stable public Core API role. Genuine public view/outlet cases and complete public declarations support the contract; full legacy-component browser/packed/consumer/Node/RxJS/compiler-floor and G01-G13 qualification remain separate. It is not a fresh independent release audit.'});
 }
 const body={schema_version:1,line:prior.line,status:'reviewed',criteria:'All35 actual current callers and identifier roles reviewed individually;22 full sources authenticated. Public type identity alone is insufficient. One null-container CdkPortalOutlet path has a separate genuine tagged/minimum public lifecycle proof.',reviews,new_source_closures_when_integrated:35,actual_legacy_component_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 const reviewBytes=Buffer.from(json(body)),reviewRef={path:CURRENT_ROLE_REVIEW,sha256:hash(reviewBytes)},writes=new Map([[CURRENT_ROLE_REVIEW,reviewBytes]]),changed=[];
 for(const ledger of prior.ledgers.filter(m=>m.path.includes('authored-dependency-'))){
  const source=ts.parseJsonText('before.json',ledger.text);assert.equal(source.parseDiagnostics.length,0);const props=source.statements[0].expression.properties,array=props.find(p=>p.name.text==='symbol_uses').initializer,replacements=[];
  for(const node of array.elements){const before=JSON.parse(node.getText(source));const selected=prior.selected.find(r=>r.ledger===ledger.path&&identity(r)===identity(before));if(!selected)continue;assert.equal(isDeepStrictEqual(before,selected.original_row),true);const after={...before,status:'reviewed',disposition:'closed',source_review:reviewRef};replacements.push({start:node.getStart(source),end:node.end,text:JSON.stringify(after,null,2).replaceAll('\n','\n    ')});changed.push({ledger:ledger.path,file:before.file,module:before.module,symbol:before.symbol});}
  assert.equal(replacements.length,ledger.path.endsWith('/authored-dependency-dispositions.json')?26:9);
  if(ledger.path.endsWith('/authored-dependency-dispositions.json'))for(const[key,value]of [['reviewed_uses',1490],['open_uses',246],['note','Frozen1736-use denominator retained. Thirty-five individual current Core view caller decisions admitted with source-bound public declaration/lifecycle evidence. Valid reviewed uses:1490; open:246. Native,packed,consumer and full floor qualification remain separate; G11 not-passed.']]){const property=props.find(p=>p.name.text===key);assert.ok(property);replacements.push({start:property.initializer.getStart(source),end:property.initializer.end,text:JSON.stringify(value)});}
  let text=ledger.text;for(const replacement of replacements.sort((a,b)=>b.start-a.start))text=text.slice(0,replacement.start)+replacement.text+text.slice(replacement.end);writes.set(ledger.path,Buffer.from(text));
 }
 assert.equal(changed.length,35);assert.equal(writes.size,3);return {prior,body,writes,changed,runtime};
}
export function inspectCurrentCoreRoleIntegration({root=process.cwd(),read=readRaw(root)}={}){
 const built=computeCurrentCoreRoleWrites({root,read});for(const[path,bytes]of built.writes)assert.equal(hash(read(path)),hash(bytes),'changed exact current Core role successor '+path);
 const frozen=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),additional=JSON.parse(read('compatibility/f10/authored-dependency-current-dispositions.json'));
 const a=authoredUseReviewEvidence(frozen,built.prior.line,read,hash),b=authoredUseReviewEvidence(additional,built.prior.line,read,hash);assert.equal(a.reviewed,1490);assert.equal(b.reviewed,194);assert.equal(a.insufficient,0);assert.equal(b.insufficient,0);
 return {line:built.prior.line,selected_current_callers_reviewed:35,current_source_files:22,frozen_source_closures:26,additional_source_closures:9,frozen_reviewed:a.reviewed,additional_reviewed:b.reviewed,insufficient:0,frozen_open:frozen.symbol_uses.filter(r=>r.disposition!=='closed').length,additional_open:additional.symbol_uses.filter(r=>r.disposition!=='closed').length,null_container_public_lifecycle_cases:20,null_container_behavior_faults_rejected:20,actual_legacy_component_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
