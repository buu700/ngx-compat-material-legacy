/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete source-scope controls and real template/data agreement; no Angular execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,symlinkSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {SPEC_SMALL_CAPSULES,SPEC_SMALL_SHAS,GROUPED_FIXTURE_PATH,inspectSpecSmallSources,reviewSpecOriginal,
 analyzeSpecSemantics,groupedFixtureObservations,proposeGroupedFixtureRepair} from '../scripts/spec-small-source-review.mjs';
import {deriveHistoricalRoster} from '../scripts/historical-case-roster.mjs';
import {adaptSpec} from '../testing/legacy-runner/adapt-spec.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const result=inspectSpecSmallSources({root}),cases=[];
assert.equal(result.fixture_repair.applied,true,'group.label is still unresolved by the actual owned fixture data');
assert.equal(result.complete_original_files,6);assert.equal(result.complete_original_hunks,13);
assert.deepEqual(result.fixture_repair.before.labels,[[null,null,null],[null,null,null]]);
assert.deepEqual(groupedFixtureObservations(read(GROUPED_FIXTURE_PATH).toString()).labels,[['One','Two','Three'],['One','Two','Three']]);
assert.equal(result.subjects[2].semantics.ordinary_type_only_cleanup,false);
assert.equal(result.subjects[3].semantics.emitted_runtime_change,true);
assert.equal(result.subjects[5].semantics.expectation_removed,true);
for(const path of Object.keys(SPEC_SMALL_CAPSULES)){
 const changed=Buffer.concat([read(path),Buffer.from(' ')]);assert.throws(()=>inspectSpecSmallSources({root,readMember:name=>name===path?changed:read(name)}),/capsule changed/);cases.push({id:'changed-authenticated-capsule-'+path,result:'rejected'});
}
const originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-small-source-subjects.json.gz'))),prior=JSON.parse(gunzipSync(read('compatibility/rc/spec-small-fixture-prior.json.gz')));
for(const original of originals.subjects){
 assert.equal(reviewSpecOriginal(original).length,original.original_hunks);
 for(const [name,change]of [
  ['raw-commit',row=>{row.raw_commit+='\n';row.raw_commit_sha256=hash(row.raw_commit);}],
  ['complete-source',row=>{row.members[0].after.text+='\n';row.members[0].after.sha256=hash(row.members[0].after.text);row.members[0].after.bytes=Buffer.byteLength(row.members[0].after.text);}],
  ['full-hunk-count',row=>{row.original_hunks--;}],
  ['rehashed-hunk',row=>{row.diff=row.diff.replace(/^@@ /m,'@@  ');row.diff_sha256=hash(row.diff);row.diff_bytes=Buffer.byteLength(row.diff);}],
  ['foreign-path',row=>{row.members[0].path='src/material/unreviewed.spec.ts';}],
 ]){const changed=structuredClone(original);change(changed);assert.throws(()=>reviewSpecOriginal(changed));cases.push({id:original.sha+'-'+name,result:'rejected'});}
}
const semanticChanges=[
 row=>{row.members[0].before.text=row.members[0].before.text.replace('      const panelId = fixture.componentInstance.autocomplete.id;\n      const modalElement = fixture.componentInstance.modal.nativeElement;\n\n      expect(modalElement.getAttribute(\'aria-owns\')).toBeFalsy();',
  '      const panelId = fixture.componentInstance.autocomplete.id;\n      const modalElement = fixture.componentInstance.modal.nativeElement;\n      expect(panelId).toBeDefined();\n      expect(modalElement.getAttribute(\'aria-owns\')).toBeFalsy();');},
 row=>{row.members[0].before.text+='\nconst usedRule = Rule;\n';},
 row=>{row.members[0].after.text=row.members[0].after.text.replace('  standalone: false,\n})\nclass AsyncMultiSelectionChipListbox','  standalone: true,\n})\nclass AsyncMultiSelectionChipListbox');},
 row=>{row.members[0].after.text=row.members[0].after.text.replace('vertical = false;','vertical = true;');},
 row=>{row.members[0].after.text=row.members[0].after.text.replace('[label]="group.title"','[label]="group.label"');},
 row=>{row.members[0].after.text+='\n// another unreviewed edit\n';},
];
for(const [index,change]of semanticChanges.entries()){
 const changed=structuredClone(originals.subjects[index]);change(changed);assert.notDeepEqual(changed,originals.subjects[index],'semantic mutation anchor missing');assert.throws(()=>analyzeSpecSemantics(changed));cases.push({id:changed.sha+'-semantic-scope-escape',result:'rejected'});
}
const before=prior.current_before_sources.find(row=>row.line===result.line).text,tagged=prior.tagged_original_sources.find(row=>row.path.endsWith('legacy-autocomplete/autocomplete.spec.ts')).text;
assert.equal(proposeGroupedFixtureRepair(before,tagged),read(GROUPED_FIXTURE_PATH).toString());
for(const [needle,replacement]of [
 ["label: 'One'","title: 'One'"],["label: 'Two'","label: 'Wrong'"],
 ['[label]="group.label"','[label]="group.title"'],["states: ['Alabama'","states: ['Changed'"],
 ['class AutocompleteWithIndirectGroups extends AutocompleteWithGroups','class AutocompleteWithIndirectGroups extends OtherFixture'],
 ['expect(input.getAttribute(\'aria-owns\')).toBeFalsy();','expect(true).toBe(true);'],
]){const source=read(GROUPED_FIXTURE_PATH).toString(),changed=source.replace(needle,replacement);assert.notEqual(changed,source,'fixture mutation anchor missing '+needle);
 assert.throws(()=>inspectSpecSmallSources({root,readMember:path=>path===GROUPED_FIXTURE_PATH?Buffer.from(changed):read(path)}),/owned fixture edit/);cases.push({id:'owned-fixture-scope-escape-'+needle,result:'rejected'});
}
const worksheet=JSON.parse(read('compatibility/rc/spec-small-source-review-worksheet.json'));
const tree=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-rz',worksheet.source_parent,'--','projects/ngx-material-legacy'],{cwd:root}).toString().split('\0').filter(Boolean);
let unchanged=0;for(const row of tree){const [meta,path]=row.split('\t'),[mode,kind,blob]=meta.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');if(path===GROUPED_FIXTURE_PATH)continue;const bytes=read(path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,'unrelated product source changed '+path);unchanged++;}
assert.equal(unchanged,1140);const roster=deriveHistoricalRoster(root);assert.equal(roster.paths.length,57);
// The required2225 includes five discovery controls, alongside2220 original/shared cases.
assert.equal(roster.cases.length+roster.discovery_negative_ids.length,2225);
const directory=mkdtempSync(resolve(tmpdir(),'ngx-fixture-prior-roster-'));
try{
 const archive=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','archive','--format=tar',worksheet.source_parent,'projects/ngx-material-legacy','testing/legacy-runner','scripts/historical-case-roster.mjs'],{cwd:root,maxBuffer:32*1024*1024});
 execFileSync('tar',['-xf','-','-C',directory],{input:archive});
 symlinkSync(dirname(dirname(createRequire(import.meta.url).resolve('typescript/package.json'))),resolve(directory,'node_modules'),'dir');
 // The parser owns repository-relative shared-suite routes, so import its exact
 // committed version inside the private before-graph rather than rebasing paths
 // through the live parser's repository constants.
 const previousParser=await import(pathToFileURL(resolve(directory,'scripts/historical-case-roster.mjs')));
 const previousRoster=previousParser.deriveHistoricalRoster(directory);
 const identities=value=>value.cases.map(({case_id,historical_path,full_name,index,kind})=>({case_id,historical_path,full_name,index,kind}));
 assert.deepEqual(identities(roster),identities(previousRoster),'existing historical case identity/order changed');
 assert.deepEqual(roster.discovery_negative_ids,previousRoster.discovery_negative_ids);
}finally{rmSync(directory,{recursive:true,force:true});}
const ts=createRequire(import.meta.url)('typescript'),fixtureSubject=originals.subjects[2];
const fixtureClass=source=>{const file=ts.createSourceFile('fixture.ts',source,ts.ScriptTarget.Latest,true);return file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='AsyncMultiSelectionChipListbox').getText(file);};
const fixtureBefore=fixtureClass(fixtureSubject.members[0].before.text),fixtureAfter=fixtureClass(fixtureSubject.members[0].after.text);
for(const [id,source,expected]of [['default',fixtureBefore,false],['explicit-false',fixtureAfter,false],['explicit-true',fixtureBefore.replace('@Component({','@Component({standalone: true,'),true]]){
 const adapted=adaptSpec(source,resolve(root,GROUPED_FIXTURE_PATH));assert.deepEqual(adapted.problems,[]);
 const file=ts.createSourceFile('adapted.ts',adapted.code,ts.ScriptTarget.Latest,true),cls=file.statements.find(n=>ts.isClassDeclaration(n));
 const component=ts.getDecorators(cls).find(n=>ts.isCallExpression(n.expression)&&n.expression.expression.getText(file)==='Component').expression.arguments[0];
 const value=component.properties.find(n=>n.name?.getText(file)==='standalone').initializer;
 assert.equal(value.kind,expected?ts.SyntaxKind.TrueKeyword:ts.SyntaxKind.FalseKeyword);cases.push({id:'actual-legacy-spec-adapter-'+id,result:'pass'});
}
const report={schema_version:1,line:result.line,scope:'Complete six original source analyses, actual owned fixture-data repair and source/semantic rejection controls. No upstream tests or actual Angular/packed/browser/native/floor execution.',
 complete_original_files:6,complete_original_hunks:13,controls:cases.length,cases,analysis:{...result,proposed_source:undefined},
 unchanged_other_product_members:unchanged,exact_historical_paths:57,derived_historical_cases:roster.cases.length,discovery_controls:roster.discovery_negative_ids.length,complete_required_historical_cells:2225,original_case_ids_order_and_names_unchanged:true,
 private_data_names_changed:3,source_context_requalification_required:true,ledger_decisions_applied:false,
 producer_sha256:hash(read('tests/spec_small_source_probe.mjs')),helper_sha256:hash(read('scripts/spec-small-source-review.mjs')),
 actual_Angular_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,cases:undefined,analysis:undefined}));
