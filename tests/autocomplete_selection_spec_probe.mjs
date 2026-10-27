/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Source/AST preservation and real qualifier controls; no Angular execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sassWrapperNoticeSubject} from '../scripts/sass-wrapper-notice-subject.mjs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveHistoricalRoster} from '../scripts/historical-case-roster.mjs';
import {autocompleteSelectionSpecSubject,autocompleteSelectionReaderSubject,AUTOCOMPLETE_SELECTION_SPEC,AUTOCOMPLETE_SELECTION_SPEC_PACKET} from '../scripts/autocomplete-selection-spec-subject.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const subject=autocompleteSelectionSpecSubject({root,read}),{packet}=subject;
function tree(text){const file=ts.createSourceFile(AUTOCOMPLETE_SELECTION_SPEC,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;}
function functions(file){
  const cases=[],helpers=[];
  function visit(node){
    if(ts.isFunctionDeclaration(node)&&node.name?.text==='prepareRequiredSelection')helpers.push(node);
    if(ts.isCallExpression(node)&&node.expression.getText(file)==='it'&&node.arguments.length>=2){
      let fn=node.arguments[1];
      while(ts.isCallExpression(fn)&&['fakeAsync','waitForAsync'].includes(fn.expression.getText(file)))fn=fn.arguments[0];
      assert.ok(ts.isArrowFunction(fn)||ts.isFunctionExpression(fn));cases.push({name:ts.isStringLiteral(node.arguments[0])?node.arguments[0].text:node.arguments[0].getText(file),fn});
    }
    ts.forEachChild(node,visit);
  }visit(file);return {cases,helpers};
}
const before=tree(subject.original_source.toString()),after=tree(subject.current_source.toString());
const previous=functions(before),current=functions(after);assert.equal(previous.cases.length,173);assert.equal(current.cases.length,173);
const changed=[];
for(const [i,old]of previous.cases.entries()){
  const next=current.cases[i];assert.equal(old.name,next.name);
  const oldStatements=old.fn.body.statements.map(node=>node.getText(before)),newStatements=next.fn.body.statements.map(node=>node.getText(after));
  let index=0;for(const original of oldStatements){const found=newStatements.indexOf(original,index);assert.ok(found>=index,'lost baseline statement in '+old.name);index=found+1;}
  if(old.fn.body.getText(before)!==next.fn.body.getText(after))changed.push(old.name);
}
assert.deepEqual(changed,[
  'should retain the selected model while typing when selection is required',
  'should reset unmatched required-selection text once on outside click',
  'should update the control back to a string if user types after an option is selected',
  'should clear the text field if value is reset programmatically',
]);assert.equal(previous.helpers.length,1);assert.equal(current.helpers.length,1);
const oldHelper=previous.helpers[0].body.statements.map(node=>node.getText(before)),newHelper=current.helpers[0].body.statements.map(node=>node.getText(after));
let helperIndex=0;for(const statement of oldHelper){const found=newHelper.indexOf(statement,helperIndex);assert.ok(found>=helperIndex,'lost original required-selection setup');helperIndex=found+1;}
const additions=Object.fromEntries(packet.insertions.map(row=>[row.target,row.text]));
assert.match(additions[changed[2]],/input\.value = 'Californi';/);
assert.doesNotMatch(additions[changed[2]],/clearElement\(|typeInElement\(/);
assert.match(additions[changed[2]],/expect\(display\)\.toHaveBeenCalledWith\(selectedOption\.value\)/);
assert.match(additions[changed[2]],/expect\(selectedOption\.selected\)\.toBe\(false\)/);
assert.match(additions[changed[3]],/component\.stateCtrl\.reset\(\)/);
assert.match(additions[changed[3]],/expect\(selections\)\.not\.toHaveBeenCalled\(\)/);
assert.match(additions[changed[1]],/filteredStates = \[\]/);
assert.match(additions[changed[1]],/filteredStates = \[fixture\.componentInstance\.states\[1\]\]/);
const roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2236);
assert.equal(hash(JSON.stringify(roster.cases)),packet.global_case_identity_sha256);
const nativeCases=roster.cases.filter(row=>row.candidate===AUTOCOMPLETE_SELECTION_SPEC);assert.equal(nativeCases.length,173);
const changedIndices=changed.map(name=>{const matches=nativeCases.filter(row=>row.full_name.endsWith(' > '+name));assert.equal(matches.length,1);return matches[0].index;});
assert.deepEqual(changedIndices,[37,39,42,46]);
const transpiled=ts.transpileModule(subject.current_source.toString(),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true},reportDiagnostics:true});
assert.deepEqual(transpiled.diagnostics,[]);
const rejected=[];
function reject(id,change){assert.throws(()=>autocompleteSelectionSpecSubject({root,read:change}));rejected.push(id);}
reject('changed-qualified-packet',p=>p===AUTOCOMPLETE_SELECTION_SPEC_PACKET?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
reject('old-test-source-without-new-assertions',p=>p===AUTOCOMPLETE_SELECTION_SPEC?subject.original_source:read(p));
reject('unrelated-test-source-change',p=>p===AUTOCOMPLETE_SELECTION_SPEC?Buffer.concat([read(p),Buffer.from('\n// unrelated\n')]):read(p));
for(const [i,edit]of packet.insertions.entries()){
  const offset=edit.byte_offset+packet.insertions.filter(row=>row.byte_offset<edit.byte_offset).reduce((sum,row)=>sum+Buffer.byteLength(row.text),0);
  const bytes=Buffer.from(edit.text);assert.equal(subject.current_source.subarray(offset,offset+bytes.length).equals(bytes),true);
  const missing=Buffer.concat([subject.current_source.subarray(0,offset),subject.current_source.subarray(offset+bytes.length)]);
  reject('missing-extension-'+i,p=>p===AUTOCOMPLETE_SELECTION_SPEC?missing:read(p));
}
assert.throws(()=>autocompleteSelectionSpecSubject({root,read,line:subject.line==='main'?'21.x':'main'}));rejected.push('wrong-line');
for(const target of [AUTOCOMPLETE_SELECTION_SPEC_PACKET,AUTOCOMPLETE_SELECTION_SPEC]){
  let late=false;const live=autocompleteSelectionSpecSubject({root,read:p=>late&&p===target?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  // Public evidence metadata cannot weaken the private late-change guard.
  live.bound.length=0;live.packet.insertions.length=0;late=true;assert.throws(()=>live.assertCurrent());rejected.push('late-change-'+target);
}
assert.equal(subject.native_or_full_source_admission_credit,false);
const readerPacketPath='compatibility/rc/autocomplete-selection-source-reader-successors.json';
const readerPacket=JSON.parse(read(readerPacketPath)),reader=autocompleteSelectionReaderSubject({root,read}),readerRejected=[];
assert.equal(reader.native_or_full_source_admission_credit,false);assert.equal(readerPacket.code_subjects.length,7);
assert.equal(reader.qualify({path:'unrelated.mjs',sha256:'0'.repeat(64)}),null);
const notices=sassWrapperNoticeSubject({root,read});
for(const row of readerPacket.code_subjects){
  const current=notices.qualify({path:row.path,...row.after})??{path:row.path,...row.after};
  assert.deepEqual(reader.qualify({path:row.path,...row.before}),current);
  assert.deepEqual(reader.qualify({path:row.path,...row.after}),current);
  assert.deepEqual(reader.qualify(current),current);
  assert.deepEqual(reader.historicalMetadataReference(row.path),{path:row.path,sha256:row.before.sha256});
  assert.throws(()=>reader.qualify({path:row.path,sha256:'0'.repeat(64)}));readerRejected.push('unknown-code-digest-'+row.path);
  assert.throws(()=>reader.qualify({path:row.path,...row.before,bytes:row.before.bytes+1}));readerRejected.push('wrong-code-size-'+row.path);
  assert.throws(()=>autocompleteSelectionReaderSubject({root,read:p=>p===row.path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)}));readerRejected.push('changed-code-'+row.path);
}
assert.throws(()=>autocompleteSelectionReaderSubject({root,read:p=>p===readerPacketPath?Buffer.concat([read(p),Buffer.from(' ')]):read(p)}));readerRejected.push('changed-code-packet');
for(const target of [...readerPacket.code_subjects.map(row=>row.path),readerPacketPath]){
  let late=false;const live=autocompleteSelectionReaderSubject({root,read:p=>late&&p===target?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  live.bound.length=0;live.spec.bound.length=0;live.spec.packet.insertions.length=0;late=true;
  assert.throws(()=>live.assertCurrent());assert.throws(()=>live.historicalMetadataReference(readerPacket.code_subjects[0].path));readerRejected.push('late-reader-change-'+target);
}
assert.throws(()=>reader.historicalMetadataReference('unrelated.mjs'));readerRejected.push('unregistered-historical-metadata');
reader.spec.after.sha256='0'.repeat(64);reader.spec.before.sha256='0'.repeat(64);reader.spec.packet.after.sha256='0'.repeat(64);
assert.throws(()=>reader.qualify({path:AUTOCOMPLETE_SELECTION_SPEC,sha256:'0'.repeat(64)}));readerRejected.push('mutated-public-reader-metadata');
assert.deepEqual(reader.qualify({path:AUTOCOMPLETE_SELECTION_SPEC,...subject.before}),{path:AUTOCOMPLETE_SELECTION_SPEC,...subject.after});
reader.assertCurrent();assert.equal(readerRejected.length,32);
const report={schema_version:1,line:subject.line,source_subject_before:subject.before,source_subject_after:subject.after,
  native_case_count:173,all_original_case_names_and_statement_order_preserved:true,static_it_definitions_preserved:previous.cases.length,only_changed_case_indices:changedIndices,
  required_selection_helper_extended:true,all_2236_global_case_identities_unchanged:true,syntax_transpile_diagnostics:0,
  corruption_controls:rejected,source_reader_code_hooks:7,source_reader_corruption_controls:readerRejected,producer_sha256:hash(read('tests/autocomplete_selection_spec_probe.mjs')),
  actual_semantic_typecheck_or_Angular_native_browser_artifact_execution:false,old_full_source_reports_or_canonical_ledger_requalified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:report.line,native_case_names_preserved:173,extended_cases:changedIndices,global_case_identities:2236,
  corruption_controls:rejected.length,source_reader_corruption_controls:readerRejected.length,actual_Angular_native_execution:false}));
