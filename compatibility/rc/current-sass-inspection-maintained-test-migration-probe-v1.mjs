/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite metadata models on an actual candidate fixture; no compiler or C04 tool constructor. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createCurrentSassSource} from '../../scripts/current-sass-source.mjs';
import {inspectOwnedMaterialBoundary} from '../../scripts/measure-sass-inspection-scope.mjs';
import {assertCurrentSassInspectionScopeSuccessor, captureCurrentSassMetadata} from '../../scripts/current-sass-inspection-scope.mjs';

const root=resolve(process.argv[2]);assert.ok(root.includes('ngx-current-sass-source-test-'));
const hash=v=>createHash('sha256').update(v).digest('hex'),read=p=>readFileSync(join(root,p));
const source=createCurrentSassSource({root});
const historical=JSON.parse(gunzipSync(read('compatibility/rc/upstream-sass-inspection-current-scope.json.gz'))).actual;
const rows=new Map(source.transitions.map(r=>[r.path,r]));
const noticeBytes=source.line==='main'?read('compatibility/rc/sass-wrapper-notice-successor.json'):null;
if(noticeBytes)assert.equal(hash(noticeBytes),'5be99f3d9441057f9007868ffc7f1c9efe7d7b766b56fa0e640ba80e4cff7493');
const notices=new Map(noticeBytes?JSON.parse(noticeBytes).subjects.map(row=>[row.path,row]):[]);
const qualify=(ref,prefix='')=>{const row=rows.get(prefix+ref.path),notice=notices.get(prefix+ref.path);
 if(row)return {...ref,sha256:row.current.sha256,bytes:row.current.bytes};
 if(notice){assert.ok([notice.before.sha256,notice.after.sha256].includes(ref.sha256));return {...ref,sha256:notice.after.sha256,bytes:notice.after.bytes};}
 return structuredClone(ref);};
const census=historical.owned_scss_population.map(r=>qualify(r));
const boundaries=[...structuredClone(historical.boundaries),...source.transitions.map(r=>inspectOwnedMaterialBoundary(r.path,read(r.path)))].sort((a,b)=>a.path.localeCompare(b.path));
const mixins=[...historical.public_override_mixins,'progress-spinner-overrides','snack-bar-overrides','checkbox-overrides','button-overrides'].sort();
const candidate=structuredClone(historical.candidate),peer=structuredClone(historical.current);
candidate.program=candidate.program.replace('owned-material16-inspection-scope','projects/ngx-material-legacy');candidate.program_sha256=hash(candidate.program);
candidate.loaded_sources=candidate.loaded_sources.map(r=>r.root===0?qualify(r,'projects/ngx-material-legacy/'):r);
peer.program=peer.program.slice(0,peer.program.indexOf("@debug 'override/"))+mixins.map(n=>`@debug 'override/${n}/#{meta.mixin-exists('${n}',peer)}';`).join('\n');peer.program_sha256=hash(peer.program);
peer.messages=[...historical.inspection_names.map(n=>'inspection/'+n+'/true'),...mixins.map(n=>'override/'+n+'/true')];
const current={schema_version:1,line:source.line,result:'pass',role:'Four-module current compiler visibility only; historical receipts remain unchanged',
 owned_scss_population:census,owned_population_sha256:hash(JSON.stringify(census)),boundaries,public_override_mixins:mixins,
 candidate,current:peer,inspection_names:historical.inspection_names,current_source:source.descriptor,compiler:historical.sass,compile_calls:2,
 historical_physical_constructor_executed:false,css_or_artifact_admission_granted:false,
 producer:{path:'scripts/current-sass-inspection-scope.mjs',sha256:hash(read('scripts/current-sass-inspection-scope.mjs'))},g11_claim:'not-passed'};
const checks=[];
checks.push(assertCurrentSassInspectionScopeSuccessor({root,historical,current}));
for(const name of ['get-theme-color','private-get-theme-density']) {
 const mutant=structuredClone(current);mutant.candidate.functions.push(name);mutant.candidate.functions.sort();
 assert.throws(()=>assertCurrentSassInspectionScopeSuccessor({root,historical,current:mutant}),/current inspection differs beyond/);
}
assert.equal(checks[0].current_owned_rows,409);assert.equal(checks[0].current_boundaries,8);
assert.equal(checks[0].current_override_mixins,20);assert.equal(checks[0].historical_functions,25);
assert.equal(checks[0].independently_qualified_notice_prefixes,source.line==='main'?7:0);
console.log(JSON.stringify({line:source.line,result:'pass',comparison:checks[0],compiler_observation_mutations_rejected:2,
 fresh_compiler_calls:0,old_physical_constructor_executed:false,css_or_artifact_admission_granted:false,
 candidate_fixture_only:true,g11_claim:'not-passed'}));
