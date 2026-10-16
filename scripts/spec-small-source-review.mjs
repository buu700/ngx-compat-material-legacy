/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Six complete original spec edits and one narrowly owned fixture-data repair. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),gitHash=(kind,bytes)=>createHash('sha1').update(kind+' '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
export const SPEC_SMALL_CAPSULES={
 'compatibility/rc/spec-small-source-subjects.json.gz':'055c40ba3907191e258676b4ebff84ea5d233fb5c00bb877eac0f525dcf5ccfd',
 'compatibility/rc/spec-small-source-acquisition.json.gz':'f71a905296710e45c15a2e6bfb3766a741061aebb39b8d55e7aa7d48fa6a8200',
 'compatibility/rc/spec-small-fixture-prior.json.gz':'da83db9d7a07c2cc3f1dcf89a5fd312f433966b3486ceebf5b05d9d45bf1c9fc',
};
export const SPEC_SMALL_SHAS=['47ac55fcdc5178f094ad5e8bb2d378f1525d02a8','917f0026b1c0b0d80672b0ea1a79a2f0a4bd6e7b',
 '8e091797f8664cf99af86a5c7c4d5615734fcaf1','69e1369c99df0d28a8f305a64fe90d5b58dd8b6a',
 'df7104f86f19bf34846e9081be232489ca4f120d','886fb6d156938aa088093fd5602a9691e79dfc74'];
export const GROUPED_FIXTURE_PATH='projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts';
const parse=(text,path='source.ts')=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const collect=(node,predicate)=>{const found=[];function visit(n){if(predicate(n))found.push(n);ts.forEachChild(n,visit);}visit(node);return found;};
const namedClass=(file,name)=>{const found=file.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.equal(found.length,1);return found[0];};
const metadata=(file,cls)=>{const found=(ts.getDecorators(cls)||[]).filter(n=>ts.isCallExpression(n.expression)&&n.expression.expression.getText(file)==='Component');assert.equal(found.length,1);const value=found[0].expression.arguments[0];assert.ok(ts.isObjectLiteralExpression(value));return value;};
const field=(object,name)=>object.properties.find(n=>n.name?.getText()===(name));
function fixtureParts(text){
 const file=parse(text),direct=namedClass(file,'AutocompleteWithGroups'),indirect=namedClass(file,'AutocompleteWithIndirectGroups');
 const property=direct.members.find(n=>ts.isPropertyDeclaration(n)&&n.name.getText(file)==='stateGroups');assert.ok(ts.isArrayLiteralExpression(property.initializer));
 const rows=property.initializer.elements.map(node=>{
  assert.ok(ts.isObjectLiteralExpression(node));const result={};
  for(const item of node.properties){assert.ok(ts.isPropertyAssignment(item)&&ts.isIdentifier(item.name));assert.ok(!Object.hasOwn(result,item.name.text));
   if(ts.isStringLiteral(item.initializer))result[item.name.text]=item.initializer.text;
   else{assert.ok(item.name.text==='states'&&ts.isArrayLiteralExpression(item.initializer)&&item.initializer.elements.every(ts.isStringLiteral));result.states=item.initializer.elements.map(n=>n.text);}
  }return result;
 });
 const templates=[direct,indirect].map(cls=>{const value=field(metadata(file,cls),'template')?.initializer;assert.ok(ts.isNoSubstitutionTemplateLiteral(value));return value.text;});
 assert.equal(indirect.heritageClauses[0].types[0].expression.getText(file),'AutocompleteWithGroups');
 const bindings=templates.map(value=>{const matches=[...value.matchAll(/\[label\]="group\.([a-zA-Z]+)"/g)];assert.equal(matches.length,1);return matches[0][1];});
 return {file,direct,property,rows,templates,bindings};
}
export function groupedFixtureObservations(text){const {rows,templates,bindings}=fixtureParts(text);return {rows,templates,bindings,
 labels:bindings.map(binding=>rows.map(row=>row[binding]??null)),state_counts:rows.map(row=>row.states.length)};}
export function proposeGroupedFixtureRepair(before,tagged){
 const current=fixtureParts(before),original=fixtureParts(tagged);assert.deepEqual(current.rows,original.rows);
 assert.deepEqual(current.templates,original.templates);assert.deepEqual(current.bindings,['label','label']);assert.equal(current.rows.length,3);
 assert.ok(current.rows.every(row=>Object.keys(row).join(',')==='title,states'&&typeof row.title==='string'));
 const edits=current.property.initializer.elements.map(object=>{const name=field(object,'title').name;return {start:name.getStart(current.file),end:name.end};});
 let next=before;for(const edit of edits.reverse())next=next.slice(0,edit.start)+'label'+next.slice(edit.end);
 const result=groupedFixtureObservations(next),expected=original.rows.map(row=>row.title);
 assert.deepEqual(result.templates,original.templates);assert.deepEqual(result.bindings,['label','label']);assert.deepEqual(result.labels,[expected,expected]);
 assert.deepEqual(result.rows.map(row=>row.states),original.rows.map(row=>row.states));return next;
}
/** Consume all original diff context/removal/addition lines and recover the whole after-file. */
export function reviewSpecOriginal(subject){
 assert.ok(SPEC_SMALL_SHAS.includes(subject.sha));assert.equal(gitHash('commit',subject.raw_commit),subject.sha);assert.equal(hash(subject.raw_commit),subject.raw_commit_sha256);
 const metadata=subject.raw_commit.split('\n\n')[0].split('\n');assert.deepEqual(metadata.filter(line=>line.startsWith('parent ')).map(line=>line.slice(7)),subject.parents);assert.ok(metadata.includes('tree '+subject.tree));
 assert.equal(subject.members.length,1);assert.equal(subject.complete_changed_files.length,1);const member=subject.members[0],identity=subject.complete_changed_files[0];assert.equal(member.path,identity.path);assert.ok(member.path.endsWith('.spec.ts'));
 for(const side of ['before','after']){const raw=member[side];assert.equal(hash(raw.text),raw.sha256);assert.equal(Buffer.byteLength(raw.text),raw.bytes);assert.equal(gitHash('blob',raw.text),raw.git_blob);assert.equal(raw.git_blob,identity[side+'_blob']);}
 assert.equal(hash(subject.diff),subject.diff_sha256);assert.equal(Buffer.byteLength(subject.diff),subject.diff_bytes);
 const lines=subject.diff.split('\n');assert.equal(lines[0],`diff --git a/${member.path} b/${member.path}`);assert.equal(lines[1],`index ${member.before.git_blob}..${member.after.git_blob} 100644`);assert.equal(lines[2],'--- a/'+member.path);assert.equal(lines[3],'+++ b/'+member.path);
 const before=member.before.text.split('\n'),result=[],hunks=[];let at=4,cursor=0;
 while(at<lines.length-1){const start=at,header=lines[at++].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);assert.ok(header);
  const offset=Number(header[1])-1;assert.ok(offset>=cursor);result.push(...before.slice(cursor,offset));cursor=offset;assert.equal(result.length,Number(header[3])-1);let removed=0,added=0;
  while(at<lines.length-1&&!lines[at].startsWith('@@ ')){const prefix=lines[at][0],text=lines[at].slice(1);assert.ok([' ','-','+'].includes(prefix));if(prefix!=='+'){assert.equal(before[cursor++],text);removed++;}if(prefix!=='-'){result.push(text);added++;}at++;}
  assert.equal(removed,header[2]===undefined?1:Number(header[2]));assert.equal(added,header[4]===undefined?1:Number(header[4]));hunks.push({path:member.path,header:lines[start],sha256:hash(lines.slice(start,at).join('\n')+'\n')});
 }result.push(...before.slice(cursor));assert.equal(result.join('\n'),member.after.text);assert.equal(hunks.length,subject.original_hunks);return hunks;
}
const exactReplace=(before,needle,replacement,count=1)=>{assert.equal(before.split(needle).length-1,count,'original semantic edit population changed');return before.replaceAll(needle,replacement);};
export function analyzeSpecSemantics(subject){
 const member=subject.members[0],before=member.before.text,after=member.after.text,file=parse(before,member.path),next=parse(after,member.path);
 let expected,kind,facts={};
 switch(subject.sha){
  case SPEC_SMALL_SHAS[0]:{
   kind='unused-test-local-read-removal';
   const found=collect(file,n=>ts.isVariableDeclaration(n)&&n.name.getText(file)==='panelId'&&n.initializer?.getText(file)==='fixture.componentInstance.autocomplete.id')
    .filter(node=>{let block=node;while(block&&!ts.isBlock(block))block=block.parent;return block&&collect(block,n=>ts.isIdentifier(n)&&n.text==='panelId').length===1;});assert.equal(found.length,1);
   const start=before.lastIndexOf('\n',found[0].getStart(file))+1,end=before.indexOf('\n',found[0].end)+1;
   assert.equal(before.slice(start,end),'      const panelId = fixture.componentInstance.autocomplete.id;\n');expected=before.slice(0,start)+before.slice(end);
   facts={removed_local_unreferenced_in_complete_block:true,removed_initializer_is_property_read:true,no_type_only_or_getter_side_effect_equivalence_claim:true};break;
  }
  case SPEC_SMALL_SHAS[1]:{
   kind='unused-named-import-removal';expected=exactReplace(before,"import {parse, Rule} from 'postcss';","import {parse} from 'postcss';");assert.equal(collect(file,n=>ts.isIdentifier(n)&&n.text==='Rule').length,1);
   const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true,removeComments:true}}).outputText;
   assert.equal(emit(before),emit(after));facts={all_other_source_bytes_preserved:true,diagnostic_emitted_program_equal:true,typescript:ts.version,compiler_floor_qualified:false};break;
  }
  case SPEC_SMALL_SHAS[2]:{
   kind='fixture-ngmodule-metadata-repair';const cls=namedClass(next,'AsyncMultiSelectionChipListbox'),property=field(metadata(next,cls),'standalone');assert.ok(property&&property.initializer.kind===ts.SyntaxKind.FalseKeyword);
   assert.equal(field(metadata(file,namedClass(file,'AsyncMultiSelectionChipListbox')),'standalone'),undefined);
   const pos=property.getStart(next),start=after.lastIndexOf('\n',pos)+1,end=after.indexOf('\n',pos)+1;assert.equal(after.slice(start,end),'  standalone: false,\n');expected=after.slice(0,start)+after.slice(end);assert.equal(expected,before);expected=after;
   facts={metadata_default_changes:true,all_other_source_bytes_preserved:true,ordinary_type_only_cleanup:false};break;
  }
  case SPEC_SMALL_SHAS[3]:
   kind='fixture-runtime-default-initialization';expected=exactReplace(exactReplace(before,'vertical: boolean;','vertical = false;'),'inset: boolean;','inset = false;');
   facts={before_values:'undefined',after_values:false,emitted_runtime_change:true,ordinary_type_only_cleanup:false};break;
  case SPEC_SMALL_SHAS[4]:
   kind='mixed-test-diagnostics-selectors-and-fixture-binding';expected=exactReplace(before,'auxilliary button','auxiliary button');expected=exactReplace(expected,'Expected autocompete not','Expected autocomplete not');expected=exactReplace(expected,'Firefox, edge return','Firefox, Edge return',2);expected=exactReplace(expected,'mat-option[aria-selected="true"\'','mat-option[aria-selected="true"]\'',2);expected=exactReplace(expected,'[label]="group.label"','[label]="group.title"',2);
   facts={original_hunks:8,selector_closing_brackets_repaired:2,group_template_bindings_changed:2,diagnostic_spelling_and_comments_changed:true,owned_data_mismatch_requires_individual_repair:true};break;
  case SPEC_SMALL_SHAS[5]:
   kind='accessibility-test-assertion-removal';expected=exactReplace(before,"          expect(select.getAttribute('aria-autocomplete')).toBe('none');\n",'');
   facts={expectation_removed:true,not_an_implementation_fix:true,not_ordinary_type_only_cleanup:true};break;
  default:assert.fail('unregistered small-spec subject');
 }assert.equal(expected,after,'additional unreviewed original source edit');return {kind,...facts};
}
export function inspectSpecSmallSources({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),packets=[];
 for(const [path,digest]of Object.entries(SPEC_SMALL_CAPSULES)){const raw=read(path);assert.equal(hash(raw),digest,'original source capsule changed');packets.push(JSON.parse(gunzipSync(raw)));}
 const [originals,acquisition,prior]=packets;assert.deepEqual(originals.subjects.map(row=>row.sha),SPEC_SMALL_SHAS);assert.deepEqual(acquisition.subjects,SPEC_SMALL_SHAS);
 assert.equal(acquisition.private_temporary_object_view_removed,true);assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;assert.match(version,/^(21|22)\./);const line=version.startsWith('21.')?'21.x':'main',census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));
 assert.equal(census.line,line);const originalsBySha=new Map(census.commits.map(row=>[row.sha,row]));
 const subjects=originals.subjects.map(subject=>{const row=originalsBySha.get(subject.sha);assert.ok(row);assert.equal(row.raw_commit,subject.raw_commit);assert.deepEqual(row.complete_changed_files,subject.complete_changed_files);return {sha:subject.sha,subject:subject.subject,hunks:reviewSpecOriginal(subject),semantics:analyzeSpecSemantics(subject)};});
 const tagged=prior.tagged_original_sources.find(row=>row.path.endsWith('legacy-autocomplete/autocomplete.spec.ts'));assert.equal(hash(tagged.text),tagged.sha256);assert.equal(tagged.sha256,'e38aae3cfa3f9f3151e812020f345a447b209c4d77843683e27f9b5fc72b9d31');
 const before=prior.current_before_sources.find(row=>row.line===line&&row.path===GROUPED_FIXTURE_PATH);assert.equal(hash(before.text),before.sha256);
 const proposed=proposeGroupedFixtureRepair(before.text,tagged.text),current=read(GROUPED_FIXTURE_PATH).toString();assert.ok(current===before.text||current===proposed,'unreviewed owned fixture edit');
 const originalObservations=groupedFixtureObservations(before.text),proposedObservations=groupedFixtureObservations(proposed);
 assert.deepEqual(originalObservations.labels,[[null,null,null],[null,null,null]]);assert.deepEqual(proposedObservations.labels,[['One','Two','Three'],['One','Two','Three']]);
 const selected=read('projects/ngx-material-legacy/legacy-select/select.spec.ts').toString();assert.ok(selected.includes("expect(select.hasAttribute('aria-autocomplete')).toBe(false);"),'existing negative accessibility assertion changed');
 assert.ok(read('testing/legacy-runner/adapt-spec.mjs').toString().includes("if (!has('standalone')) text += 'standalone: false,';"));
 return {schema_version:1,line,subjects,complete_original_files:6,complete_original_hunks:subjects.reduce((n,row)=>n+row.hunks.length,0),
  fixture_repair:{path:GROUPED_FIXTURE_PATH,before_sha256:before.sha256,proposed_sha256:hash(proposed),applied:current===proposed,
   original_tagged_observations:groupedFixtureObservations(tagged.text),before:originalObservations,after:proposedObservations,
   changed_private_data_names:3,all_template_bytes_values_states_cases_assertions_imports_and_other_source_preserved:true},
  proposed_source:proposed,source_context_requalification_required:true,ledger_decisions_applied:false,
  actual_upstream_test_Angular_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let result=inspectSpecSmallSources();if(process.argv.includes('--write')){writeFileSync(resolve(rootDefault,GROUPED_FIXTURE_PATH),result.proposed_source);result=inspectSpecSmallSources();}
 const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify({...result,proposed_source:undefined},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:result.line,complete_original_files:result.complete_original_files,complete_original_hunks:result.complete_original_hunks,fixture_repaired:result.fixture_repair.applied,source_context_requalification_required:true,actual_upstream_test_Angular_native_packed_or_floor_qualified:false}));
}
