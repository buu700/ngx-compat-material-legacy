/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Mechanical scoping aid; raw member identity never proves contract/behavior equivalence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
import {inspectBaseClassRemovalOriginal} from '../../scripts/upstream-base-class-removal-source.mjs';
const root=process.cwd(),source=inspectBaseClassRemovalOriginal({root}),hash=raw=>createHash('sha256').update(raw).digest('hex');
assert.equal(ts.version,'5.9.2');
function parse(path,body){
 if(path.endsWith('.md')){const blocks=[...body.matchAll(/```ts\n([\s\S]*?)\n```/g)];assert.equal(blocks.length,1,path);body=blocks[0][1];}
 const sf=ts.createSourceFile(path,body,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(sf.parseDiagnostics.length,0,path);return sf;
}
function classes(sf){return new Map(sf.statements.filter(ts.isClassDeclaration).map(node=>[node.name.text,node]));}
function members(node,sf){return node.members.map(member=>{
 const kind=ts.SyntaxKind[member.kind],name=member.name?.getText(sf)??(ts.isConstructorDeclaration(member)?'constructor':'<anonymous>'),text=member.getText(sf),body=member.body?.getText(sf),signature=body?text.slice(0,text.lastIndexOf(body)).trim():text;
 return {key:kind+':'+name+':'+Boolean(member.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword)),name,kind,sha256:hash(text),body_sha256:body?hash(body):null,signature:signature.length<=1500?signature:signature.slice(0,1500)+' <truncated;see original blob>',line:sf.getLineAndCharacterOfPosition(member.getStart(sf)).line+1};
});}
const rows=[];
for(const section of source.original.sections){
 const before=parse(section.path,section.before.body),after=parse(section.path,section.after.body),a=classes(before),b=classes(after),removed=[...a.keys()].filter(name=>!b.has(name)),added=[...b.keys()].filter(name=>!a.has(name)),pairs=[];
 for(const name of removed){
  const base=a.get(name),derived=[...a.values()].filter(node=>node.heritageClauses?.some(h=>h.token===ts.SyntaxKind.ExtendsKeyword&&h.types.some(t=>t.expression.getText(before)===name)));
  const direct=derived.filter(node=>b.has(node.name.text));
  const lexical=name.replace(/^_/,'').replace(/Base$/,'');
  const target=direct.length===1?direct[0].name.text:b.has(lexical)?lexical:null;
  if(!target){pairs.push({removed_class:name,matching_kind:'unmatched;individual review required'});continue;}
  const merged=b.get(target),baseline=new Map(members(base,before).map(m=>[m.key,m]));
  if(a.has(target)&&a.get(target)!==base)for(const m of members(a.get(target),before))baseline.set(m.key,m);
  const current=members(merged,after),matching=current.filter(m=>baseline.get(m.key)?.sha256===m.sha256),different=current.filter(m=>baseline.get(m.key)?.sha256!==m.sha256),deleted=[...baseline.values()].filter(m=>!current.some(n=>n.key===m.key));
  pairs.push({removed_class:name,current_class_candidate:target,matching_kind:direct.length===1?'same-file direct heritage relationship':'lexical-candidate;not independently qualified',old_base_members:members(base,before).length,old_concrete_members:a.has(target)?members(a.get(target),before).length:0,new_current_members:current.length,raw_byte_identical_member_count:matching.length,raw_byte_identical_members:matching.map(m=>({key:m.key,sha256:m.sha256})),changed_or_added_members:different,removed_member_candidates:deleted.map(m=>({key:m.key,signature:m.signature,sha256:m.sha256})),inheritance_and_decorator_contract_qualified:false,runtime_equivalence_qualified:false});
 }
 rows.push({path:section.path,before_blob:section.before_blob,after_blob:section.after_blob,original_hunks:section.hunks.length,before_classes:[...a.keys()],after_classes:[...b.keys()],removed_classes:removed,added_classes:added,class_consolidation_candidates:pairs,all_hunks_still_require_technical_review:true});
}
source.assertCurrent();const report={schema_version:1,line:'21.x',sha:source.original.sha,role:'Whole original AST inventory;mechanical candidates only,not substantive applicability or current-owned equivalence',typescript:ts.version,files:rows,files_parsed:72,original_hunks:329,removed_upstream_class_declarations:rows.reduce((n,row)=>n+row.removed_classes.length,0),candidate_consolidations:rows.reduce((n,row)=>n+row.class_consolidation_candidates.length,0),candidate_raw_identical_members:rows.reduce((n,row)=>n+row.class_consolidation_candidates.reduce((v,c)=>v+(c.raw_byte_identical_member_count??0),0),0),substantive_whole_SHA_review_complete:false,canonical_decisions_changed:0,product_changes:0,old_upstream_programs_executed:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
assert.equal(process.argv.length,3);writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:'inventory-only',files:72,removed_classes:report.removed_upstream_class_declarations,candidate_consolidations:report.candidate_consolidations,raw_identical_members:report.candidate_raw_identical_members,substantive_review_complete:false}));
