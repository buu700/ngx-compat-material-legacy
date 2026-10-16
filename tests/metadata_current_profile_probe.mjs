/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current population joins and preserved metadata validators; no native qualification. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanCurrentAuthoredUses} from '../scripts/authored-current-use-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const prefix='compatibility/rc/metadata-current-profile-',inputPath=prefix+'inputs.json';
const key=row=>JSON.stringify([row.file,row.module,row.symbol]);
function parse(path,text){const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;}
function inspect(readMember=read){
 const line=JSON.parse(readMember('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 const bytes=readMember(inputPath);assert.equal(hash(bytes),{main:'561af74da42f6e40cf5057711eb9009182273c20a33ae8ec6f65886fdfcdc54f','21.x':'7273fbb3386a74bac77705c60a7743da067cdba7ad84b30231c503d765338012'}[line],'changed metadata input');
 const inputs=JSON.parse(bytes),stored=readMember(inputs.prior_contexts.path);assert.equal(hash(stored),inputs.prior_contexts.sha256);
 const raw=gunzipSync(stored);assert.equal(hash(raw),inputs.prior_contexts.raw_sha256);const prior=JSON.parse(raw);assert.equal(prior.line,line);
 for(const member of inputs.protected_evidence)assert.equal(hash(readMember(member.path)),member.sha256,'changed retained diagnostic');
 for(const report of prior.reports){assert.equal(hash(report.text),report.sha256);assert.equal(hash(readMember(report.path)),report.sha256,'changed retained source review');}
 const preservation=[];
 for(const old of prior.checkers){
  assert.equal(hash(old.text),old.sha256);const source=readMember(old.path).toString(),before=parse(old.path,old.text),after=parse(old.path,source);
  const publicName=old.path.includes('class-decorator')?'reviewClassDecoratorUses':'reviewFrameworkEnumUses';
  const named=(file,name)=>file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  for(const node of before.statements.filter(ts.isFunctionDeclaration).filter(node=>node.name?.text!==publicName)){
   assert.equal(named(after,node.name.text)?.getText(after),node.getText(before),'changed public contract/helper body');
  }
  const first=named(before,publicName),last=named(after,publicName);
  const loop=(fn,file,expression)=>{
   const found=[];function visit(node){if(ts.isForOfStatement(node)&&node.expression.getText(file)===expression)found.push(node);ts.forEachChild(node,visit);}visit(fn);
   assert.equal(found.length,1);return found[0].getText(file);
  };
  const variable=(fn,file,name)=>{
   const found=[];function visit(node){if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(n=>n.name.getText(file)===name))found.push(node);ts.forEachChild(node,visit);}visit(fn);
   assert.equal(found.length,1);return found[0].getText(file);
  };
  if(publicName==='reviewClassDecoratorUses'){
   assert.equal(loop(last,after,'actual'),loop(first,before,'actual'),'changed class metadata validation');
   const condition=(fn,file)=>{
    const found=[];function visit(node){if(ts.isIfStatement(node)&&node.expression.getText(file)==='!skipDiagnostics')found.push(node);ts.forEachChild(node,visit);}visit(fn);assert.equal(found.length,1);return found[0].getText(file);
   };
   assert.equal(condition(last,after),condition(first,before),'changed genuine metadata constructor replay');
   for(const name of ['seed','options','manifest'])assert.equal(variable(last,after,name),variable(first,before,name),'changed class namespace/source/type setup');
   assert.ok(source.includes("current?132:130")&&source.includes("current?184:183"),'changed finite current class scope');
   const delta=after.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(n=>n.name.text==='currentDeltaKeys'));
   assert.equal(delta.getText(after),"const currentDeltaKeys = [...deltaKeys, 'legacy-paginator/internal/page-size-options.ts#Directive', 'legacy-table/internal/column-classes.ts#Directive'].sort();",'changed finite class additions');
   const oldGuards=first.body.statements.find(ts.isIfStatement).getText(before),newGuards=last.body.statements.find(node=>ts.isIfStatement(node)&&node.expression.getText(after)==='selected').getText(after);
   assert.equal(newGuards.replace("||current&&delta.some(key=>key.split('#')[0]===file)",''),oldGuards,'changed captured source-selection guards');
  }else{
   const inserted="        if(population==='current')assert.ok(!binding.isTypeOnly&&!binding.parent.parent.isTypeOnly,'runtime enum imported type only');\n";
   assert.equal(loop(last,after,'uses').replace(inserted,''),loop(first,before,'uses'),'changed enum metadata/value validation');
   for(const name of ['models','paths','host','program','pkg'])assert.equal(variable(last,after,name),variable(first,before,name),'changed enum namespace/binding setup');
  }
  preservation.push({path:old.path,prior_sha256:old.sha256,current_sha256:hash(source),all_other_named_helpers_unchanged:true,complete_existing_semantic_validator_and_namespace_protocols_preserved:true});
 }
 const snapshot=scanCurrentAuthoredUses({root}),profiles={};
 for(const [name,names,expected]of [['class',['Component','Directive','NgModule'],149],['enum',['ChangeDetectionStrategy','ViewEncapsulation'],76]]){
  const path=prefix+name+'-diagnostic.json',report=JSON.parse(readMember(path));assert.equal(report.line,line);assert.equal(report.population,'current');
  const actual=snapshot.symbol_uses.filter(row=>row.module==='@angular/core'&&names.includes(row.symbol));
  assert.equal(actual.length,expected);assert.equal(report.cases.length,expected,'current report roster changed');
  assert.equal(new Set(report.cases.map(key)).size,expected);assert.deepEqual(report.cases.map(key).sort(),actual.map(key).sort(),'current report population differs from independent scanner');
  for(const row of report.cases)assert.equal(hash(readMember('projects/ngx-material-legacy/'+row.file)),row.candidate_source_sha256,'stale current metadata subject');
  assert.equal(report.frozen_uses,inputs.required_profiles[name].frozen);assert.equal(report.retired_frozen_uses.length,inputs.required_profiles[name].removed_frozen);
  for(const row of report.retired_frozen_uses){assert.equal(row.file,inputs.retired_file);assert.ok(inputs.retired_symbols.includes(row.symbol));assert.equal(hash(readMember('projects/ngx-material-legacy/'+row.file)),row.candidate_source_sha256);}
  assert.equal(report.g11_claim,'not-passed');assert.equal(report.mutations.length,26);
  const previousPath=name==='class'?'compatibility/rc/historical-menu-class-decorator-requalification-diagnostic.json':'compatibility/rc/framework-enum-use-review.json';
  const previous=JSON.parse(readMember(previousPath));
  for(const control of previous.mutations)assert.ok(report.mutations.some(row=>row.id===control.id&&row.rejected===true),'previous semantic control removed');
  if(name==='class'){
   assert.equal(report.source_override_used,false);assert.equal(report.whole_population_reviewed,true);assert.equal(report.current_delta_uses,6);
   assert.equal(report.cases.flatMap(row=>row.references).length,184);assert.deepEqual(report.authored_metadata.map(row=>row.metadata_constructor_count),[184,184,184]);
   assert.deepEqual(report.behaviors.map(row=>row.cases.length),[13,13,13]);assert.equal(report.type_compilation.subjects.length,3);
  }else{assert.equal(report.whole_current_population_reviewed,true);assert.equal(report.files,38);assert.equal(report.cases.flatMap(row=>row.references).length,84);}
  profiles[name]={path,sha256:hash(readMember(path)),live_roles:expected,frozen_obligations:report.frozen_uses,retired_frozen_roles:report.retired_frozen_uses.length,
   source_files:new Set(actual.map(row=>row.file)).size,controls:26,previous_semantic_controls_retained:previous.mutations.length,source_override_used:!!report.source_override_used};
 }
 return {schema_version:1,line,source_parent:inputs.source_parent,input_capsule_sha256:hash(bytes),preservation,profiles,
  prior_reviewed_rows:inputs.affected_reviewed_rows,all_prior_source_reviews_and_receipts_retained:true,whole_current_population_joined:true,
  product_native_packed_AOT_or_supported_toolchain_floors_qualified:false,g11_claim:'not-passed'};
}
const report=inspect(),inputs=JSON.parse(read(inputPath)),controls=[];
for(const [id,path,change,expected]of [
 ['input-capsule',inputPath,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/changed metadata input/],
 ['retained-diagnostic',inputs.protected_evidence[0].path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/changed retained diagnostic/],
 ['class-factory-contract','scripts/class-decorator-use-review.mjs',bytes=>Buffer.from(bytes.toString().replace('numeric_component_default: 1','numeric_component_default: 0')),/changed public contract\/helper body/],
 ['class-forbidden-option-guard','scripts/class-decorator-use-review.mjs',bytes=>Buffer.from(bytes.toString().replace("'moduleId','interpolation','animations','jit'","'moduleId','interpolation','jit'")),/changed class metadata validation/],
 ['class-added-roster','scripts/class-decorator-use-review.mjs',bytes=>Buffer.from(bytes.toString().replace("'legacy-paginator/internal/page-size-options.ts#Directive', ",'')),/changed finite class additions/],
 ['enum-stability-guard','scripts/framework-enum-use-review.mjs',bytes=>Buffer.from(bytes.toString().replace("assert.deepEqual(markers(binding.node), [], 'private/deprecated enum declaration');","assert.ok(true);")),/changed enum namespace\/binding setup/],
 ['enum-historical-value-guard','scripts/framework-enum-use-review.mjs',bytes=>Buffer.from(bytes.toString().replace('record.value, old.value','record.value, record.value')),/changed enum metadata\/value validation/],
 ['missing-live-class',prefix+'class-diagnostic.json',bytes=>{const x=JSON.parse(bytes);x.cases.pop();return Buffer.from(JSON.stringify(x));},/current report roster changed/],
 ['stale-current-enum',prefix+'enum-diagnostic.json',bytes=>{const x=JSON.parse(bytes);x.cases[0].candidate_source_sha256='0'.repeat(64);return Buffer.from(JSON.stringify(x));},/stale current metadata subject/],
 ['missing-prior-semantic-control',prefix+'enum-diagnostic.json',bytes=>{const x=JSON.parse(bytes);x.mutations[0].id='unreviewed-replacement';return Buffer.from(JSON.stringify(x));},/previous semantic control removed/],
]){
 const before=read(path),after=change(before);assert.notDeepEqual(before,after,id+': mutation did not apply');
 assert.throws(()=>inspect(p=>p===path?after:read(p)),expected,id+': mutation escaped');controls.push({id,rejected:true});
}
report.source_preservation_controls=controls;report.producer_sha256=hash(read('tests/metadata_current_profile_probe.mjs'));
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:report.line,current_class_roles:149,current_enum_roles:76,retained_frozen_roles:222,source_preservation_controls:controls.length,prior_reviewed_rows:report.prior_reviewed_rows,g11_claim:'not-passed'}));
