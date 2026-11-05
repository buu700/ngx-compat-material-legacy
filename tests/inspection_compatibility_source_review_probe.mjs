/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {assertCurrentReviewTestSources,assertPhysicalAbsentCounterpart} from './current_sass_review_test_scope.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {verifyInspectionCompatibilityOriginals,reviewInspectionCompatibilitySource,assertHistoricalInspectionModel} from '../scripts/upstream-inspection-compatibility-source-review.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=raw=>createHash('sha1').update('blob '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const original=JSON.parse(gunzipSync(read('compatibility/rc/21x-c04-inspection-compatibility-originals-complete-context.json.gz')));
const census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz'))),rejected=[];
const facts=verifyInspectionCompatibilityOriginals(original,census);assert.equal(facts.original_files,7);assert.equal(facts.original_hunks,14);
for(const fault of ['unknown-sha','missing-file','missing-hunk','changed-commit','changed-diff','omitted-seed','forged-tag','deleted-after-present','missing-absence','fake-formatting-fix']){
 const data=structuredClone(original),first=data.reviews[0];
 if(fault==='unknown-sha')first.sha='0'.repeat(40);
 if(fault==='missing-file')first.sections.shift();
 if(fault==='missing-hunk')first.sections[0].hunks.pop();
 if(fault==='changed-commit')first.raw_commit+=' ';
 if(fault==='changed-diff'){first.diff+='\n';first.diff_sha256=hash(first.diff);}
 if(fault==='omitted-seed')first.frozen_seed_paths.pop();
 if(fault==='forged-tag'){const m=data.tagged_reference.members[6];m.body+='\n';m.bytes=Buffer.byteLength(m.body);m.sha256=hash(m.body);m.blob=gitHash(m.body);}
 if(fault==='deleted-after-present')data.reviews[2].sections[0].after.absent=false;
 if(fault==='missing-absence')delete data.reviews[3].sections[0].after.absent;
 if(fault==='fake-formatting-fix'){const m=data.reviews[1].sections[0].after;m.body=m.body.replace('Unrecognized theme version','Changed theme version');m.bytes=Buffer.byteLength(m.body);m.sha256=hash(m.body);m.blob=gitHash(m.body);}
 assert.throws(()=>verifyInspectionCompatibilityOriginals(data,census),undefined,fault);rejected.push('original/'+fault);
}
const model='projects/ngx-material-legacy/styles/core/theming/_theming.scss',entry='projects/ngx-material-legacy/_index.scss';
for(const [id,path,text]of [
 ['compatibility-flag',entry,read(entry)+'\n$theme-legacy-inspection-api-compatibility: true;\n'],
 ['map-carrier',model,read(model)+'\n$x: (_mat-theming-internals-do-not-access: (m2-config: ()));\n'],
]){assert.throws(()=>assertHistoricalInspectionModel(path,Buffer.from(text)));rejected.push('model/'+id);}
let late=null;const mutable=path=>late===path?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const scope=reviewInspectionCompatibilitySource({root,read:mutable});assert.equal(scope.report.reviews.length,4);
assert.deepEqual(scope.report.reviews.map(row=>row.proposed_final_disposition),['do-not-adopt','not-applicable','not-applicable','not-applicable']);
const sourceQualification=assertCurrentReviewTestSources({kind:'inspection-compatibility',scope:scope});
const roles=[
 'scripts/upstream-inspection-compatibility-source-review.mjs','scripts/upstream-theming-inspection-source-review.mjs',
 'compatibility/rc/21x-c04-inspection-compatibility-originals-complete-context.json.gz','compatibility/rc/21x-c04-inspection-compatibility-originals.json.gz',
 'compatibility/rc/upstream-complete-patch-census.json.gz','compatibility/rc/upstream-sass-inspection-current-scope.json.gz',entry,model,
 'projects/ngx-material-legacy/styles/legacy-paginator/_paginator-variables.scss','projects/ngx-material-legacy/styles/legacy-paginator/_paginator-theme.scss',
 'projects/ngx-material-legacy/legacy-paginator/_paginator-theme.scss','projects/ngx-material-legacy/styles/core/tokens/m2/mat/_standard-button-toggle.scss',
 'projects/ngx-material-legacy/ng-package.json','projects/ngx-material-legacy/package.json','compatibility/rc/matrices/library-exports.json',
 'node_modules/@angular/material/package.json','node_modules/@angular/material/core/theming/_inspection.scss',
];
const bound=new Set(scope.bound.map(ref=>ref.path));assert.ok(roles.every(path=>bound.has(path)));
for(const path of roles){late=path;assert.throws(()=>scope.assertCurrent(),undefined,path);rejected.push('late/'+path);}late=null;scope.assertCurrent();
for(const path of scope.report.absent_owned_counterparts){
 assertPhysicalAbsentCounterpart({root,path,assertCurrent:scope.assertCurrent});rejected.push('absent/'+path);
}
assert.throws(()=>reviewInspectionCompatibilitySource({root,read:path=>{if(path===entry){const e=new Error('unreadable pinned source');e.code='EACCES';throw e;}return read(path);}}),error=>error.code==='EACCES');rejected.push('unreadable-pinned-input-propagates');
scope.bound.length=0;scope.report.current_source_bindings.length=0;late=entry;assert.throws(()=>scope.assertCurrent());late=null;scope.assertCurrent();rejected.push('public-metadata-cannot-rewrite-guards');
const report={schema_version:1,result:'pass',original_files:7,original_hunks:14,present_original_blobs:12,tagged_blobs:8,exact_patch_replays:7,whitespace_only_fixups:1,
 tagged_deleted_modern_files:2,proposed_individual_source_decisions:4,source_bindings:bound.size,...sourceQualification,owned_scss_members:409,historical_exported_functions:25,public_override_boundaries:9,historical_public_override_boundaries:4,
 legacy_theme_module_source_rewrites:4,legacy_theme_namespace_or_mixin_or_selector_rewrites:0,rejected,
 fresh_compiler_execution_this_review:false,upstream_code_executed:false,canonical_decisions_changed:0,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
