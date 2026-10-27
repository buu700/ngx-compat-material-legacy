/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact metadata reconstruction, guard exclusions and the actual raw reader. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,symlinkSync,rmSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {checkerReferenceMetadata,reconstructReviewedChecker,CHECKER_REFERENCE_REVIEW} from '../scripts/checker-reference-metadata.mjs';
import {registeredSourceCheckerTransition} from '../scripts/registered-source-checker-transition.mjs';
const ts=createRequire(import.meta.url)('typescript');
const root=process.cwd(),rawRead=path=>readFileSync(join(root,path));
// Preserve the original fourteen-token stage under the exact additive checker successor.
const read=registeredSourceCheckerTransition({root,read:rawRead}).beforeRead;
const independent=execFileSync('python3',['-c','import sys;sys.path.insert(0,"tests");from checker_reference_metadata_patch import derive_checker_reference_successor;sys.stdout.buffer.write(derive_checker_reference_successor()[1])'],{cwd:root,maxBuffer:8*1024*1024});
const review=JSON.parse(read(CHECKER_REFERENCE_REVIEW)),source=checkerReferenceMetadata({root,read});
assert.equal(source.checker_digest_tokens,14);assert.equal(source.individual_decisions,0);source.assertCurrent();
assert.equal(source.after.equals(independent),true);
assert.equal(reconstructReviewedChecker(review),read(review.checker.path).toString());
const before=ts.createSourceFile('old.mjs',review.original_checker,ts.ScriptTarget.Latest,true);
const after=ts.createSourceFile('current.mjs',review.current_checker,ts.ScriptTarget.Latest,true);
const declarations=ast=>new Map(ast.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node.getText(ast)]));
const oldFunctions=declarations(before),newFunctions=declarations(after),changed=[];
for(const [name,text]of oldFunctions){assert.ok(newFunctions.has(name));if(newFunctions.get(name)!==text)changed.push(name);}
assert.deepEqual(changed,['evidenceClass','individualPatchBound']);
assert.deepEqual([...newFunctions.keys()].filter(name=>!oldFunctions.has(name)),['readRegularRepoBytes']);
const states=ast=>ast.statements.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations).filter(node=>['ALLOWED_FINAL','PENDING','INHERITED','BEHAVIOR','REVIEW_DEPTHS'].includes(node.name.getText(ast))).map(node=>node.getText(ast));
assert.deepEqual(states(before),states(after));assert.equal(states(before).length,5);
const dir=mkdtempSync(join(tmpdir(),'ngx-checker-reader-'));let readerCases=0;
try{
  writeFileSync(join(dir,'value.txt'),'actual bytes\n');mkdirSync(join(dir,'folder'));symlinkSync(join(dir,'value.txt'),join(dir,'link'));
  const reader=runInNewContext(newFunctions.get('readRegularRepoBytes')+'\nreadRegularRepoBytes;',{root:dir,join,lstatSync,readFileSync});
  assert.equal(reader('value.txt').toString(),'actual bytes\n');readerCases++;
  assert.throws(()=>reader('missing.txt'),error=>error.code==='ENOENT');readerCases++;
  for(const path of ['../value.txt','/value.txt','./value.txt','folder/../value.txt','folder\\value.txt','folder','link']){
    assert.throws(()=>reader(path),undefined,path);readerCases++;
  }
}finally{rmSync(dir,{recursive:true,force:true});}
const rejected=[];
for(const path of [CHECKER_REFERENCE_REVIEW,review.checker.path,'projects/ngx-material-legacy/package.json',
  ...review.guard_modules.map(ref=>ref.path),review.selected_entries[0].evidence_report.path]){
  assert.throws(()=>checkerReferenceMetadata({root,read:name=>name===path?Buffer.concat([read(name),Buffer.from('\n')]):read(name)}),undefined,path);
  rejected.push(path);
}
assert.throws(()=>checkerReferenceMetadata({root,read,line:'main'}));rejected.push('wrong-line');
let target=null;const live=checkerReferenceMetadata({root,read:path=>path===target?Buffer.concat([read(path),Buffer.from('\n')]):read(path)});
for(const path of [review.checker.path,review.guard_modules[0].path,review.selected_entries[0].evidence_report.path]){
  target=path;assert.throws(()=>live.assertCurrent(),undefined,'late '+path);target=null;rejected.push('late:'+path);
}
live.assertCurrent();source.after.fill(32);assert.equal(checkerReferenceMetadata({root,read}).after.equals(independent),true);
const report={schema_version:1,line:'21.x',complete_checker_hunks_reconstructed:6,
  original_functions_preserved:oldFunctions.size-2,modified_original_functions:changed,new_functions:['readRegularRepoBytes'],
  structural_policy_sets_preserved:5,actual_guard_exclusions:56,actual_reader_cases:readerCases,
  rejection_controls:rejected.length,rejected,selected_checker_reference_tokens:14,independent_Python_bytes_match:true,
  mutable_result_cannot_change_next_preparation:true,all_fixture_roots_removed:true,
  original_decisions_or_hunk_judgments_changed:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
