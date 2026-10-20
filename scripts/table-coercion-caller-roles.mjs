/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Three public coercion boundaries; parent table behavior has separate owners. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {currentCoreRoleOccurrences} from './core-view-use-current-roles.mjs';
import {coercionBehavior} from './coercion-pure-use-review.mjs';
export const TABLE_COERCION_PRIOR='compatibility/rc/table-coercion-caller-roles-prior.json.gz';
export const TABLE_COERCION_REVIEW='compatibility/f10/authored-use-reviews/table-coercion-callers.json';
const pins={main:'48a30f51691e47155530f4117b2496e34e3e691b82de9dfe3794eeabbd9f5fe7','21.x':'f903cfc7f1c7197262cef1eeea73566988810f98de1715f0cb58ec71cb8506b6'};
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const raw=root=>p=>readFileSync(isAbsolute(p)?p:join(root,p)),authenticated=new Set(),decoded=new Map();
const identity=r=>JSON.stringify([r.file,r.module,r.symbol]);
const versions={original:'16.2.14',main:'22.1.7','21.x':'21.2.14'};
const callers={
 'legacy-table/cell.ts':[['MatLegacyColumnDef','sticky',true],['MatLegacyColumnDef','stickyEnd',true]],
 'legacy-table/row.ts':[['MatLegacyHeaderRowDef','sticky',true],['MatLegacyFooterRowDef','sticky',true]],
 'legacy-table/table.ts':[['MatLegacyTable','fixedLayout',false],['MatLegacyTable','multiTemplateDataRows',false]],
};
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function original(root,commit,member){
 assert.equal(hash(member.text),member.sha256);const key=JSON.stringify([root,commit,member.path,member.sha256]);
 if(authenticated.has(key))return;
 const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+member.path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
 assert.equal(hash(bytes),member.sha256);authenticated.add(key);
}
export function tableCoercionPrior({root=process.cwd(),read=raw(root)}={}){
 const bytes=read(TABLE_COERCION_PRIOR),digest=hash(bytes),line=Object.keys(pins).find(k=>pins[k]===digest);assert.ok(line,'changed table coercion preimages');
 if(!decoded.has(digest))decoded.set(digest,freeze(JSON.parse(gunzipSync(bytes))));
 const prior=decoded.get(digest);assert.equal(prior.line,line);assert.equal(prior.selected.length,3);assert.equal(prior.sources.length,3);assert.equal(prior.evidence.length,4);assert.equal(prior.ledgers.length,3);
 for(const m of [...prior.sources,...prior.evidence,...prior.ledgers])original(root,prior.source_parent,m);
 return prior;
}
export function tableCoercionFacts({root=process.cwd(),read=raw(root)}={}){
 const prior=tableCoercionPrior({root,read});
 for(const m of [...prior.sources,...prior.evidence])assert.equal(hash(read(m.path)),m.sha256,'changed table coercion source/evidence '+m.path);
 const facts=[];
 for(const {original_row:row}of prior.selected){
  assert.equal(row.module,'@angular/cdk/coercion');assert.equal(row.symbol,'coerceBooleanProperty');
  const path='projects/ngx-material-legacy/'+row.file,text=read(path).toString(),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
  const role=currentCoreRoleOccurrences(text,row);assert.equal(role.import_local,'coerceBooleanProperty');assert.equal(role.occurrences.length,2);assert.equal(role.complete_caller_members.length,2);
  for(const occurrence of role.occurrences)assert.equal(occurrence.parent_kind,'CallExpression');
  const setters=[];
  for(const [className,name,reset]of callers[row.file]){
   const owner=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===className);assert.ok(owner);
   const found=owner.members.filter(n=>ts.isSetAccessorDeclaration(n)&&n.name.getText(source)===name);assert.equal(found.length,1);const node=found[0];
   assert.equal(node.parameters.length,1);assert.equal(node.parameters[0].name.getText(source),'value');assert.equal(node.body.statements.length,reset?2:1);
   if(reset)assert.equal(node.body.statements[0].getText(source),'this.resetStickyChanged();');
   const statement=node.body.statements.at(-1);assert.equal(statement.getText(source),'super.'+name+' = coerceBooleanProperty(value);');
   const call=statement.expression.right;assert.ok(ts.isCallExpression(call));assert.equal(call.arguments.length,1);assert.ok(!ts.isSpreadElement(call.arguments[0]));
   setters.push({class_name:className,name,reset_before_conversion:reset,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,member_sha256:hash(node.getText(source)),text:node.getText(source)});
  }
  for(const member of role.complete_caller_members)member.reasons=member.reasons.map(r=>r.replace(/^Core:/,'Coercion:'));
  facts.push({file:row.file,module:row.module,symbol:row.symbol,candidate_source_sha256:hash(text),source_role:role,setters});
 }
 assert.equal(new Set(facts.map(identity)).size,3);return {prior,facts};
}
export async function tableCoercionPublicModels({root=process.cwd(),read=raw(root)}={}){
 const {prior}=tableCoercionFacts({root,read}),member=prior.evidence.find(m=>m.path==='compatibility/rc/coercion-public-subjects.json'),subjects=JSON.parse(read(member.path));
 assert.equal(hash(read(member.path)),'be5c12b5d9829221410bb9b1ce490f247cf1992059fcd1893a1a5b7f90b86d86');
 assert.deepEqual(subjects.subjects.map(s=>s.line).sort(),['original','main','21.x'].sort());const models=[];
 for(const subject of subjects.subjects){
  assert.equal(subject.version,versions[subject.line]);assert.ok(subject.members.some(m=>m.path===subject.public_types));assert.ok(subject.members.some(m=>m.path===subject.public_entry));
  for(const m of subject.members){const bytes=read(join(subject.runtime_root,m.path));assert.equal(hash(bytes),m.sha256,'changed genuine coercion runtime '+m.path);assert.equal(bytes.length,m.bytes);}
  const pkg=JSON.parse(read(join(subject.runtime_root,'package.json')));assert.equal(pkg.version,subject.version);assert.equal(pkg.exports['./coercion'].default,'./'+subject.public_entry);assert.equal(pkg.exports['./coercion'].types,'./'+subject.public_types);
  const declarations=subject.declarations.map(m=>{const bytes=read(m.path);assert.equal(hash(bytes),m.sha256);assert.equal(bytes.length,m.bytes);const source=ts.createSourceFile(m.path,bytes.toString(),ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);return source;});
  const rows=declarations.flatMap(source=>source.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='coerceBooleanProperty').map(node=>({source,node})));assert.equal(rows.length,1);const {source,node}=rows[0];
  assert.equal(node.parameters.length,1);assert.equal(node.parameters[0].type.kind,ts.SyntaxKind.AnyKeyword);assert.equal(node.parameters[0].questionToken,undefined);assert.equal(node.parameters[0].dotDotDotToken,undefined);assert.equal(node.type.kind,ts.SyntaxKind.BooleanKeyword);assert.equal(node.typeParameters?.length??0,0);
  assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','docs-private','breaking-change'].includes(t.tagName.text)));
  const publicTypes=read(join(subject.runtime_root,subject.public_types)).toString();assert.match(publicTypes,/coerceBooleanProperty/);
  const runtime=await import(pathToFileURL(join(subject.runtime_root,subject.public_entry)).href);assert.equal(typeof runtime.coerceBooleanProperty,'function');
  models.push({line:subject.line,version:subject.version,archive_sha256:subject.archive_sha256,declaration_sha256:hash(node.getText(source)),signature:'(value: any): boolean',stable_public_export:true,runtime});
 }
 const tagged=models.find(m=>m.line==='original');const behavior=models.filter(m=>m!==tagged).map(m=>({line:m.line,...coercionBehavior(m.runtime,tagged.runtime)}));
 assert.ok(behavior.every(b=>b.boolean_cases===42&&b.number_cases===378));return {prior,models,behavior};
}
const decisions={
 'legacy-table/cell.ts': 'The two complete MatLegacyColumnDef sticky setters reset the existing sticky-change marker, call the public coerceBooleanProperty exactly once with the supplied value, then forward its boolean result to the corresponding parent property. This retains historical normalization for direct writes, including empty strings and numeric zero. The reset and parent sticky-state contracts remain separately owned; this decision qualifies the named pure public helper boundary only.',
 'legacy-table/row.ts': 'The complete header and footer row-definition sticky setters each reset the existing change marker, normalize one supplied value with public coerceBooleanProperty, and forward the resulting boolean. There are no helper aliases, spread arguments, alternate arities or escaped references. Genuine tagged/minimum public helper behavior supports these normalization calls; row construction, differ handling and parent sticky-state behavior retain their separate obligations.',
 'legacy-table/table.ts': 'The complete fixedLayout and multiTemplateDataRows setters normalize the single supplied value through public coerceBooleanProperty and immediately forward that boolean to the corresponding parent property. This keeps historical normalization for direct assignments as well as template bindings, without changing selectors or resources. The public helper boundary is stable at both minima; CdkTable layout, rendering, DI and lifecycle behavior receive no additional clearance from this decision.',
};
export async function prepareTableCoercionReview({root=process.cwd(),read=raw(root)}={}){
 const {prior,facts}=tableCoercionFacts({root,read}),qualified=await tableCoercionPublicModels({root,read}),ref=path=>({path,sha256:hash(read(path))});
 const evidence=[ref(TABLE_COERCION_PRIOR),ref('compatibility/rc/coercion-public-subjects.json'),ref('compatibility/rc/coercion-pure-use-review.json'),ref('scripts/coercion-pure-use-review.mjs'),ref('scripts/core-view-use-current-roles.mjs'),ref('scripts/table-coercion-caller-roles.mjs')];
 return {schema_version:1,line:prior.line,status:'reviewed',criteria:'Three complete additional caller routes and six exact setter members, with genuine public tagged/minimum declaration and normalization evidence. Canonical integration is separate.',reviews:facts.map(f=>({file:f.file,module:f.module,symbol:f.symbol,current_role:'single-argument-public-boolean-normalization',decision:decisions[f.file],candidate_source_sha256:f.candidate_source_sha256,conclusion:'stable-public-peer',reviewer:'Codex primary implementer; individual complete table coercion caller review',source_role:f.source_role,complete_setters:f.setters,independent_evidence:evidence,scope_limit:'Named pure helper dependency only. Parent setter/state, table construction, component/native/packed/consumer/floor and G01-G13 obligations remain separate.'})),public_subjects:qualified.models.map(({runtime,...m})=>m),public_behavior:qualified.behavior,source_closures_prepared:3,source_closures_integrated:0,public_declaration_identity_checked:true,strict_consumer_AOT_executed:false,borrowed_Core_for_unrelated_public_module_path:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}

/** Exact prepared evidence only; canonical integration remains independently owned. */
export async function inspectTableCoercionReview(options={}){
 const root=options.root??process.cwd(),read=options.read??raw(root),body=await prepareTableCoercionReview({root,read});
 assert.equal(hash(read(TABLE_COERCION_REVIEW)),hash(JSON.stringify(body,null,2)+'\n'),'changed prepared table coercion review');
 return body;
}
