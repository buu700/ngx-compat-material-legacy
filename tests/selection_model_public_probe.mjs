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
const worker=readFileSync(join(root,'tests/selection_model_public_subject.mjs'),'utf8'),results=[],mutations=[],declarations=[],typeChecks=[],declarationControls=[];
function publicDeclaration(subject,members){
 const manifest=JSON.parse(members.get('package.json')),entry=manifest.exports['./collections'].types.slice(2),seen=new Set();
 function follow(path,name){
  assert.ok(!seen.has(path+'#'+name),'selection declaration cycle');seen.add(path+'#'+name);
  const text=members.get(path);assert.equal(typeof text,'string','missing selection declaration module');
  const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);
  const classes=file.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);
  if(classes.length){
   assert.equal(classes.length,1);const node=classes[0];
   const direct=node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword);
   const exported=file.statements.filter(n=>ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause))
    .flatMap(n=>n.exportClause.elements).some(e=>(e.propertyName||e.name).text===name);
   assert.ok(direct||exported,'selection class is not publicly exported');return {path,text,file,node};
  }
  const links=file.statements.filter(n=>ts.isExportDeclaration(n)&&n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause))
   .flatMap(n=>n.exportClause.elements.filter(e=>e.name.text===name).map(e=>({node:n,binding:e})));
  const localExport=file.statements.filter(n=>ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause))
   .flatMap(n=>n.exportClause.elements.filter(e=>e.name.text===name));
  if(localExport.length){assert.equal(localExport.length,1);const localName=(localExport[0].propertyName||localExport[0].name).text;
   links.push(...file.statements.filter(n=>ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))
    .flatMap(n=>n.importClause.namedBindings.elements.filter(e=>e.name.text===localName).map(e=>({node:n,binding:e}))));
  }
  assert.equal(links.length,1,'missing/ambiguous public selection export');const link=links[0];assert.ok(link.node.moduleSpecifier.text.startsWith('./'));
  return follow(posix.join(posix.dirname(path),link.node.moduleSpecifier.text.replace(/\.js$/,'.d.ts')),(link.binding.propertyName||link.binding.name).text);
 }
 const found=follow(entry,'SelectionModel'),{node,file}=found;
 assert.equal(node.typeParameters.length,1);assert.equal(node.typeParameters[0].name.text,'T');
 const names=['selected','changed','select','deselect','setSelection','toggle','clear','isSelected','isEmpty','hasValue','sort','isMultipleSelection','compareWith'];
 const selected=names.map(name=>{const matches=node.members.filter(n=>n.name?.getText(file)===name);assert.equal(matches.length,1,'missing/ambiguous public model member '+name);return matches[0];});
 const constructors=node.members.filter(ts.isConstructorDeclaration);assert.equal(constructors.length,1);assert.equal(constructors[0].parameters.length,4);
 for(const member of [node,constructors[0],...selected]){
  assert.ok(!(member.modifiers||[]).some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind)),'private model contract');
  const forbidden=subject.line==='original'?['deprecated','docs-private','experimental']:['deprecated','docs-private','experimental','breaking-change'];
  assert.ok(!ts.getJSDocTags(member).some(t=>forbidden.includes(t.tagName.text)),'deprecated/private/planned-removal model contract');
 }
 for(const name of ['select','deselect','setSelection','toggle','clear']){
  const member=selected.find(n=>n.name.getText(file)===name);
  if(subject.line==='original')assert.equal(member.type.getText(file).replace(/\s/g,''),'boolean|void');
  else assert.equal(member.type.kind,ts.SyntaxKind.BooleanKeyword,'current change result must be boolean');
 }
 return {line:subject.line,version:manifest.version,entry:{path:entry,sha256:hash(members.get(entry))},target:{path:found.path,sha256:hash(found.text)},
  public_chain:[...seen],declaration:node.getText(file),members:names,public_current_methods_return_boolean:subject.line!=='original'};
}
const typeFixture=`import {SelectionModel} from '@angular/cdk/collections';
type Choice={id:number};
const first:Choice={id:1},second:Choice={id:2};
const model=new SelectionModel<Choice>(true,[first],true,(a,b)=>a.id===b.id);
const selected:Choice[]=model.selected;
const subscription=model.changed.subscribe(event=>{const source:SelectionModel<Choice>=event.source;const added:Choice[]=event.added;const removed:Choice[]=event.removed;void [source,added,removed];});
const results:(boolean|void)[]=[model.select(first),model.deselect(first),model.setSelection(second),model.toggle(first),model.clear(false)];
const flags:boolean[]=[model.isSelected(first),model.isEmpty(),model.hasValue(),model.isMultipleSelection()];
model.sort((a,b)=>a.id-b.id);model.compareWith=(a,b)=>a.id===b.id;subscription.unsubscribe();void [selected,results,flags];
// @ts-expect-error The public selected getter cannot be reassigned.
model.selected=[];
// @ts-expect-error The generic choice domain is enforced at selection.
model.select({id:'wrong'});
// @ts-expect-error Constructor multiplicity requires a boolean.
new SelectionModel<Choice>('multiple');
// @ts-expect-error Current private implementation methods are not a public contract.
model._markSelected(first);
`;
const sourceReview=reviewSelectionModelUses({root}),selected='projects/ngx-material-legacy/legacy-chips/chip-list.ts',selectedText=readFileSync(join(root,selected),'utf8');
const sourceNegatives=[selectedText.replace("from '@angular/cdk/collections'","from '@angular/cdk/private'"),
 selectedText.replace('new SelectionModel<MatLegacyChip>(this.multiple, undefined, false)','new SelectionModel<MatLegacyChip>(this.multiple, undefined, false, this._compareWith)'),
 selectedText.replace('this._selectionModel.select(correspondingChip)','this._selectionModel.setSelection(correspondingChip)'),
 selectedText+'\nfunction shadow(SelectionModel: any) {return SelectionModel;}\n',
 selectedText.replace('import {SelectionModel}', 'import type {SelectionModel}'),
 selectedText.replace('this._selectionModel.clear()', 'this._selectionModel._unmarkAll()'),
 selectedText.replace('this._selectionModel.clear()', 'this._selectionModel.clear = () => true'),
 selectedText.replace('this._selectionModel.clear()', 'delete this._selectionModel.clear'),
 selectedText.replace('this._selectionModel.clear()', 'this._selectionModel["clear"]()')];
for(const text of sourceNegatives){assert.notEqual(text,selectedText);assert.throws(()=>reviewSelectionModelUses({root,readSource:p=>p===selected?text:readFileSync(join(root,p),'utf8')}));}
const deltaPath='projects/ngx-material-legacy/legacy-select/select.ts',deltaText=readFileSync(join(root,deltaPath),'utf8');
const deltaNegatives=[deltaText.replace('this._selectionModel.selected[0]','this._selectionModel._selection'),deltaText+'\nfunction unreviewed() {return this._selectionModel;}\n'];
for(const text of deltaNegatives){assert.notEqual(text,deltaText);assert.throws(()=>reviewSelectionModelUses({root,readSource:p=>p===deltaPath?text:readFileSync(join(root,p),'utf8')}));}
try{
 for(const model of loaded.models){const subject=capsule.subjects.find(s=>s.line===model.line);assert.ok(subject);assert.equal(subject.archive_sri_verified,true);assert.deepEqual(subject.external,['@angular/core','rxjs']);const members=new Map();
  for(const member of subject.members){assert.equal(member.path,'compatibility/rc/selection-model-public-source-members/'+member.sha256+'.gz');const stored=readFileSync(join(root,member.path));assert.equal(hash(stored),member.stored_sha256);const raw=gunzipSync(stored);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);const key='@angular/cdk/'+member.module_path;
   assert.equal(members.has(member.module_path),false);members.set(member.module_path,raw.toString());
   if(model.sources.has(key))assert.equal(model.sources.get(key),raw.toString());else{const dest=join(model.root,'node_modules',key);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,raw);}
  }
  const manifest=JSON.parse(members.get('package.json'));assert.equal(manifest.version,subject.version);assert.equal(manifest.name,'@angular/cdk');
  assert.deepEqual(subject.roots,['package.json',manifest.exports['./collections'].default.slice(2),manifest.exports['./collections'].types.slice(2)]);
  const seen=new Set(),external=new Set();
  const visit=path=>{if(seen.has(path))return;assert.ok(members.has(path),path);seen.add(path);if(path==='package.json')return;
   const file=ts.createSourceFile(path,members.get(path),ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);
   const edge=spec=>{if(!spec.startsWith('.')){external.add(spec);return;}const target=posix.normalize(posix.join(posix.dirname(path),path.endsWith('.d.ts')?spec.replace(/\.js$/,'.d.ts'):spec));assert.ok(!target.startsWith('../'));visit(target);};
   for(const n of file.statements)if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier)edge(n.moduleSpecifier.text);
   const nested=n=>{if(ts.isImportTypeNode(n)&&ts.isLiteralTypeNode(n.argument)&&ts.isStringLiteral(n.argument.literal))edge(n.argument.literal.text);assert.ok(!(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword),'unqualified dynamic collections import');ts.forEachChild(n,nested);};nested(file);
  };subject.roots.forEach(visit);assert.deepEqual([...seen].sort(),[...members.keys()].sort());assert.deepEqual([...external].sort(),subject.external);
  const declaration=publicDeclaration(subject,members);declarations.push(declaration);
  const target=members.get(declaration.target.path),targetAst=ts.createSourceFile(declaration.target.path,target,ts.ScriptTarget.Latest,true);
  const targetClass=targetAst.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='SelectionModel');assert.ok(targetClass);
  const deprecatedClass=target.slice(0,targetClass.getStart(targetAst))+'/** @deprecated */\n'+target.slice(targetClass.getStart(targetAst));
  for(const [id,text] of [
   ['deprecated-class',deprecatedClass],
   ['private-selected',target.replace('get selected():', 'private get selected():')],
   ['deprecated-select',target.replace('    select(...values:', '    /** @deprecated */\n    select(...values:')],
   ['missing-changed',target.replace('readonly changed:', 'readonly renamedChanged:')],
  ]){assert.notEqual(text,target);const changed=new Map(members);changed.set(declaration.target.path,text);assert.throws(()=>publicDeclaration(subject,changed),undefined,model.line+':'+id);declarationControls.push({line:model.line,id,assertion_rejected:true});}
  const fixturePath=join(model.root,'selection-model-public-contract.mts');writeFileSync(fixturePath,typeFixture);
  const options={strict:true,noEmit:true,skipLibCheck:false,types:[],lib:['lib.es2022.d.ts','lib.dom.d.ts'],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext};
  const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([fixturePath],options));
  assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  typeChecks.push({line:model.line,compiler:ts.version,strict:true,skipLibCheck:false,fixture_sha256:hash(typeFixture),negative_type_controls:4,diagnostics:diagnostics.length});
  const runtimePath=join(model.root,'node_modules/@angular/cdk/fesm2022',model.line==='original'?'collections.mjs':'_selection-model-chunk.mjs');
  const original=readFileSync(runtimePath,'utf8');assert.ok(original.includes('class SelectionModel'));
  const workerPath=join(model.root,'selection_model_public_subject.mjs');writeFileSync(workerPath,worker);
  for(const mode of ['development','production']){
   const stdout=execFileSync(process.execPath,[workerPath,model.line,'false',mode],{cwd:model.root,encoding:'utf8',timeout:10000});results.push({...JSON.parse(stdout.trim().split('\n').at(-1)),borrowed:model.borrowed});
  }
  const runtimeAst=ts.createSourceFile(runtimePath,original,ts.ScriptTarget.Latest,true),runtimeClass=runtimeAst.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='SelectionModel');assert.ok(runtimeClass);
  const emptyMethod=name=>{const method=runtimeClass.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(runtimeAst)===name);assert.ok(method?.body);return original.slice(0,method.body.getStart(runtimeAst))+'{}'+original.slice(method.body.end);};
  assert.equal(original.split('if (flushEvent)').length,2);
  for(const [id,text] of [['suppress-public-change-events',emptyMethod('_emitChangeEvent')],['disable-public-sort',emptyMethod('sort')],['flush-deferred-clear-immediately',original.replace('if (flushEvent)','if (true)')]]){
   writeFileSync(runtimePath,text);const result=spawnSync(process.execPath,[workerPath,model.line,'true'],{cwd:model.root,encoding:'utf8',timeout:10000});
   assert.notEqual(result.status,0,id+' escaped');assert.match(result.stderr,/AssertionError/,id+' did not reach a contract assertion');mutations.push({line:model.line,id,assertion_rejected:true});
  }
  writeFileSync(runtimePath,original);
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
  subjects_capsule_sha256:hash(capsuleBytes),core_capsule_sha256:loaded.capsule_hash,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),declarations,typeChecks,declarationControls,results,mutations,
  source_review:sourceReview,source_negative_controls:sourceNegatives.length,delta_negative_controls:deltaNegatives.length,
  scope:'Whole authenticated publiccollections modules with genuine original/minimum Core/Compiler and borrowedRxJS. Model operations and source recipes only, no actual legacy component execution, AOT/packed/native/NodeRx floors/security or completeG11 qualification.',g11_claim:'not-passed'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({uses:sourceReview.cases.length,delta_sources:sourceReview.delta_sources.length,delta_negative_controls:deltaNegatives.length,subjects:results.length,cases:results.reduce((n,r)=>n+r.cases.length,0),source_negative_controls:sourceNegatives.length,original_bug_reproduced:true,mutation_rejections:mutations.length,strict_type_subjects:typeChecks.length,declaration_negative_controls:declarationControls.length,native_executed:false}));
}finally{loaded.dispose();}
