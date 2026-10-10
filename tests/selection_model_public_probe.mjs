/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname,join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {reviewSelectionModelUses} from '../scripts/selection-model-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const capsuleBytes=readFileSync(join(root,'compatibility/rc/selection-model-public-subjects.json')),capsule=JSON.parse(capsuleBytes),loaded=prepareMaterialPublicSubjects(root);
assert.equal(hash(capsuleBytes),'4932727a9d031223efc0108d2d22c4a95019b81ee06e834424246173bf7998cc');
const worker=readFileSync(join(root,'tests/selection_model_public_subject.mjs'),'utf8'),results=[],mutations=[];
const sourceReview=reviewSelectionModelUses({root}),selected='projects/ngx-material-legacy/legacy-chips/chip-list.ts',selectedText=readFileSync(join(root,selected),'utf8');
const sourceNegatives=[selectedText.replace("from '@angular/cdk/collections'","from '@angular/cdk/private'"),
 selectedText.replace('new SelectionModel<MatLegacyChip>(this.multiple, undefined, false)','new SelectionModel<MatLegacyChip>(this.multiple, undefined, false, this._compareWith)'),
 selectedText.replace('this._selectionModel.select(correspondingChip)','this._selectionModel.setSelection(correspondingChip)'),
 selectedText+'\nfunction shadow(SelectionModel: any) {return SelectionModel;}\n'];
for(const text of sourceNegatives){assert.notEqual(text,selectedText);assert.throws(()=>reviewSelectionModelUses({root,readSource:p=>p===selected?text:readFileSync(join(root,p),'utf8')}));}
try{
 for(const model of loaded.models){const subject=capsule.subjects.find(s=>s.line===model.line);assert.ok(subject);assert.equal(subject.archive_sri_verified,true);assert.deepEqual(subject.external,['@angular/core','rxjs']);const members=new Map();
  for(const member of subject.members){assert.equal(member.path,'compatibility/rc/selection-model-public-source-members/'+member.sha256+'.gz');const stored=readFileSync(join(root,member.path));assert.equal(hash(stored),member.stored_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);const key='@angular/cdk/'+member.module_path;
   assert.equal(members.has(member.module_path),false);members.set(member.module_path,raw.toString());
   if(model.sources.has(key))assert.equal(model.sources.get(key),raw.toString());else{const dest=join(model.root,'node_modules',key);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,raw);}
  }
  const manifest=JSON.parse(members.get('package.json'));assert.equal(manifest.version,subject.version);
  assert.deepEqual(subject.roots,['package.json',manifest.exports['./collections'].default.slice(2),manifest.exports['./collections'].types.slice(2)]);
  const seen=new Set(),external=new Set();
  const visit=path=>{if(seen.has(path))return;assert.ok(members.has(path),path);seen.add(path);if(path==='package.json')return;
   const file=ts.createSourceFile(path,members.get(path),ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);
   const edge=spec=>{if(!spec.startsWith('.')){external.add(spec);return;}const target=posix.normalize(posix.join(posix.dirname(path),path.endsWith('.d.ts')?spec.replace(/\.js$/,'.d.ts'):spec));assert.ok(!target.startsWith('../'));visit(target);};
   for(const n of file.statements)if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier)edge(n.moduleSpecifier.text);
   const nested=n=>{if(ts.isImportTypeNode(n)&&ts.isLiteralTypeNode(n.argument)&&ts.isStringLiteral(n.argument.literal))edge(n.argument.literal.text);assert.ok(!(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword),'unqualified dynamic collections import');ts.forEachChild(n,nested);};nested(file);
  };subject.roots.forEach(visit);assert.deepEqual([...seen].sort(),[...members.keys()].sort());assert.deepEqual([...external].sort(),subject.external);
  const runtimePath=join(model.root,'node_modules/@angular/cdk/fesm2022',model.line==='original'?'collections.mjs':'_selection-model-chunk.mjs');
  const original=readFileSync(runtimePath,'utf8');assert.ok(original.includes('class SelectionModel'));
  const workerPath=join(model.root,'selection_model_public_subject.mjs');writeFileSync(workerPath,worker);
  const stdout=execFileSync(process.execPath,[workerPath,model.line,'false'],{cwd:model.root,encoding:'utf8',timeout:10000});results.push({...JSON.parse(stdout.trim().split('\n').at(-1)),borrowed:model.borrowed});
  if(model.line!=='original'){
   const fixed='new Set(values.map(value => this._getConcreteValue(value)))';assert.equal(original.split(fixed).length,2);
   const predicate='!newSelectedSet.has(this._getConcreteValue(value, newSelectedSet))';assert.equal(original.split(predicate).length,2);
   writeFileSync(runtimePath,original.replace(fixed,'new Set(values)').replace(predicate,'!newSelectedSet.has(value)'));
   const result=spawnSync(process.execPath,[workerPath,model.line,'true'],{cwd:model.root,encoding:'utf8',timeout:10000});assert.notEqual(result.status,0);assert.match(result.stderr,/same comparator key retains original selected identity/);
   mutations.push({line:model.line,id:'restore-original16-comparator-deletion-algorithm',assertion_rejected:true,
     note:'A set-normalization-only revert is masked by the peer concrete-value deletion predicate; both original16 defects are restored for this targeted negative.'});writeFileSync(runtimePath,original);
  }
 }
 const report={schema_version:1,node:process.version,compiler:ts.version,role:'Original selection comparator bug and both genuine public minimum fixes; exact identity-only owned recipes',
  subjects_capsule_sha256:hash(capsuleBytes),core_capsule_sha256:loaded.capsule_hash,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),results,mutations,
  source_review:sourceReview,source_negative_controls:sourceNegatives.length,
  scope:'Whole authenticated publiccollections modules with genuine original/minimum Core/Compiler and borrowedRxJS. Model operations and source recipes only, no actual legacy component execution, AOT/packed/native/NodeRx floors/security or completeG11 qualification.',g11_claim:'not-passed'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({uses:sourceReview.cases.length,subjects:results.length,cases:results.reduce((n,r)=>n+r.cases.length,0),source_negative_controls:sourceNegatives.length,original_bug_reproduced:true,mutation_rejections:mutations.length,native_executed:false}));
}finally{loaded.dispose();}
