/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {assertCurrentReviewTestSources} from './current_sass_review_test_scope.mjs';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {reviewThemingInspectionSource,verifyThemingOriginalData,inspectOwnedThemingMember} from '../scripts/upstream-theming-inspection-source-review.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=raw=>createHash('sha1').update('blob '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const original=JSON.parse(gunzipSync(read('compatibility/rc/21x-c04-theming-inspection-originals.json.gz')));
const census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz'))),rejected=[];
const actual=verifyThemingOriginalData(original,census);assert.equal(actual.original_files,11);assert.equal(actual.original_hunks,16);
for(const fault of ['unknown-sha','missing-file','missing-hunk','changed-commit','changed-patch','incomplete-seed','forged-tag','changed-move']){
 const data=structuredClone(original),first=data.reviews[0];
 if(fault==='unknown-sha')first.sha='0'.repeat(40);
 if(fault==='missing-file')first.sections.splice(0,1);
 if(fault==='missing-hunk')first.sections[0].hunks.pop();
 if(fault==='changed-commit')first.raw_commit+=' ';
 if(fault==='changed-patch'){first.diff+='\n';first.diff_sha256=hash(first.diff);}
 if(fault==='incomplete-seed')first.frozen_seed_paths.pop();
 if(fault==='forged-tag'){
  const member=data.tagged_reference.members[0];member.body+='\n';member.bytes=Buffer.byteLength(member.body);member.sha256=hash(member.body);member.blob=gitHash(member.body);
 }
 if(fault==='changed-move'){
  const member=first.sections.find(s=>s.path.endsWith('/theming-mixin-api.spec.ts')).after;
  member.body+='\n';member.bytes=Buffer.byteLength(member.body);member.sha256=hash(member.body);member.blob=gitHash(member.body);
 }
 assert.throws(()=>verifyThemingOriginalData(data,census),undefined,fault);rejected.push('original/'+fault);
}
const entry='projects/ngx-material-legacy/_index.scss',boundary='projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss';
for(const [fault,path,text]of [
 ['private-inspection',entry,read(entry)+'\n.x {a: private-get-theme-version(());}\n'],
 ['private-validation',entry,read(entry)+'\n.x {a: private-validate-required-values((), x);}\n'],
 ['modern-constructor',entry,read(entry)+'\n@function define-theme($config) {@return $config;}\n'],
 ['peer-forward',entry,read(entry)+"\n@forward '@angular/material';\n"],
 ['m2-callthrough',boundary,read(boundary)+'\n.x {a: mat.m2-define-palette(());}\n'],
 ['dynamic-peer-call',boundary,read(boundary)+"\n$f: meta.get-function('validate-required-values', $module: mat);\n"],
]){assert.throws(()=>inspectOwnedThemingMember(path,Buffer.from(text)),undefined,fault);rejected.push('ownership/'+fault);}
let late=null;const mutable=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const current=reviewThemingInspectionSource({root,read:mutable});assert.equal(current.report.reviews.length,2);assert.equal(current.report.canonical_decisions_changed,0);
assert.equal(current.report.owned_scss_members,409);assert.equal(current.report.historical_exported_functions,25);
const sourceQualification=assertCurrentReviewTestSources({kind:'theming-inspection',scope:current});
assert.equal(current.report.public_override_boundaries,9);assert.equal(current.report.fresh_compiler_execution_this_review,false);
const chosen=[
 'scripts/upstream-theming-inspection-source-review.mjs','scripts/upstream-candidate-source-evidence.mjs',
 'compatibility/rc/21x-c04-theming-inspection-originals.json.gz','compatibility/rc/upstream-complete-patch-census.json.gz',
 'compatibility/rc/upstream-sass-inspection-current-scope.json.gz','scripts/measure-sass-inspection-scope.mjs',
 'compatibility/rc/oracles/material-16.2.14-sass-api.json',entry,
 'projects/ngx-material-legacy/styles/core/theming/_palette.scss','projects/ngx-material-legacy/styles/core/theming/_theming.scss',
 'projects/ngx-material-legacy/styles/core/typography/_typography.scss','node_modules/@angular/material/package.json',
 'node_modules/@angular/material/core/theming/_inspection.scss','node_modules/@angular/cdk/package.json',
];
const bound=new Set(current.bound.map(ref=>ref.path));assert.ok(chosen.every(path=>bound.has(path)));
for(const path of chosen){late=path;assert.throws(()=>current.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;current.assertCurrent();
for(const path of [entry,'node_modules/@angular/material/package.json',...chosen.slice(0,5)]){
 assert.throws(()=>reviewThemingInspectionSource({root,read:member=>member===path?Buffer.concat([read(member),Buffer.from('\n')]):read(member)}));rejected.push('cold/'+path);
}
current.bound.length=0;for(const member of current.report.current_source_bindings)member.sha256='0'.repeat(64);
late=entry;assert.throws(()=>current.assertCurrent());late=null;current.assertCurrent();rejected.push('public-metadata-cannot-rewrite-owned-guards');
const report={schema_version:1,result:'pass',original_files:11,original_hunks:16,present_original_blobs:18,tagged_blobs:4,exact_patch_replays:11,byte_identical_test_relocations:1,
 proposed_individual_source_decisions:2,source_bindings:bound.size,...sourceQualification,historical_exported_functions:25,owned_scss_members:409,rejected,
 canonical_decisions_changed:0,fresh_compiler_execution_this_review:false,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
