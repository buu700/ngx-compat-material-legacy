/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current physical tool/C04 fixture only. No compiler or source producer. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spinnerSnackC04Source,assertSpinnerSnackRetentionSuccessor,CURRENT_SASS_C04_RETENTION_CASE_IDS} from '../scripts/sass-spinner-snack-c04-source.mjs';
import {currentLegacyRetentionMeasurement} from '../scripts/current-sass-legacy-retention-css.mjs';

const root=process.argv[2],checks=[],hash=raw=>createHash('sha256').update(raw).digest('hex');
assert.ok(root.includes('ngx-current-sass-c04-tools-'));
const REPORTS=[
 {path:'compatibility/rc/21x-c04-theming-inspection-source-review.json',sha256:'55d2533ffe204f9e589cc82fd78d66dd286d31f89769573d71cbb1d8425687d2',bytes:133530},
 {path:'compatibility/rc/21x-c04-inspection-compatibility-source-review.json',sha256:'852cf937178ada91b0c604d349cf214cd810266af6118122c19e0dd534c55118',bytes:135386},
 {path:'compatibility/rc/21x-c04-control-m3-theme-source-review.json',sha256:'69df54b7474b863fc9e1db8f1017217d7289072f4272d20f57ea21391df51fd6',bytes:1852529},
 {path:'compatibility/rc/21x-c04-remaining-unthemable-source-review.json.gz',sha256:'c25b0a59e7bbe5e63eebc3068a84eb010e9e558d021770de22b81d669380e31b',bytes:1824722},
];
const RETENTION={path:'compatibility/rc/21x-c04-modern-control-base-measurement-21x.json',sha256:'4e99b606b4bcbf162f00edf8b8dcd7d4ff58a16760ec34d8d674a0b8720c124f',bytes:109842};
const source=spinnerSnackC04Source({root}),line=source.bridge.line;
const bound=structuredClone(source.bound),summary=structuredClone(source.summary),transitions=structuredClone(source.bridge.transitions);
assert.equal(transitions.length,6);checks.push('real current C04/tool constructor with sixth historical bridge transition');
const productRefs=[];
for(const row of transitions){
 const before={path:row.path,sha256:row.before.sha256,bytes:row.before.bytes,role:'authentic historical comparison metadata',nested:{preserved:true}};
 const current=source.qualify(before);
 assert.deepEqual(current,{...before,sha256:row.current.sha256,bytes:row.current.bytes});
 productRefs.push({before,current});checks.push('six-source current qualifier '+row.path);
}
source.bound.length=0;source.summary.sources.length=0;source.bridge.bound.length=0;source.bridge.transitions[0].path='foreign.scss';
source.assertCurrent();assert.deepEqual(source.qualify(productRefs[0].before),productRefs[0].current);
checks.push('public C04/bridge metadata copies preserve private authority');
// The public copies are restored for explicit caller-side model reconstruction.
source.bound=structuredClone(bound);source.summary=structuredClone(summary);
const late=join(root,'scripts/sass-spinner-snack-c04-source.mjs'),before=readFileSync(late);
try{writeFileSync(late,Buffer.concat([before,Buffer.from('\n// copied late source mutation\n')]));assert.throws(()=>source.assertCurrent());}
finally{writeFileSync(late,before);}
source.assertCurrent();checks.push('late copied C04 physical mutation rejects and restoration passes');

const sorted=refs=>refs.sort((a,b)=>a.path.localeCompare(b.path));
const union=(a,b)=>sorted([...new Map([...a,...b].map(ref=>[ref.path,ref])).values()]);
const pinned=ref=>{const raw=readFileSync(join(root,ref.path));assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);return raw;};
let reports=0,unchangedPublic=0,unchangedDirect=0;
if(line==='21.x'){
 for(const ref of REPORTS)pinned(ref);reports=REPORTS.length;checks.push('all4 immutable C04 report pins retained');
 const historical=JSON.parse(pinned(REPORTS[0])),savedHistorical=structuredClone(historical),current=structuredClone(historical);
 current.current_source_bindings=union(bound,historical.current_source_bindings.map(ref=>source.qualify(ref)));
 current.current_public_bridge=structuredClone(summary);assert.equal(current.public_override_boundaries,4);current.public_override_boundaries=9;
 assert.equal(current.current_owned_sources_and_loaded_peers_match_retained_measurement,true);delete current.current_owned_sources_and_loaded_peers_match_retained_measurement;
 current.historical_owned_sources_and_loaded_peers_match_retained_measurement_except_separate_five_module_successor=true;
 assert.deepEqual(source.assertReportSuccessor('theming-inspection',current),historical);
 assert.deepEqual(historical,savedHistorical);checks.push('exact theming report successor from archived data');
 const wrongDescriptor=structuredClone(current);wrongDescriptor.current_public_bridge.current_source.source_modules.pop();
 assert.throws(()=>source.assertReportSuccessor('theming-inspection',wrongDescriptor));checks.push('wrong theming current descriptor rejects');

 const retention=JSON.parse(pinned(RETENTION)),savedRetention=structuredClone(retention),next=structuredClone(retention);
 assert.equal(retention.public_legacy_default_CSS_cases.length,12);assert.equal(retention.direct_original_legacy_color_cases.length,4);
 assert.deepEqual(CURRENT_SASS_C04_RETENTION_CASE_IDS,['mixin-css/legacy-button-color','mixin-css/legacy-button-theme','mixin-css/legacy-button-typography','direct-legacy-color/fab']);
 for(const key of ['input_members','loaded_sources'])next[key]=retention[key].map(ref=>source.qualify(ref));
 next.input_members.push(...bound.filter(ref=>!next.input_members.some(row=>row.path===ref.path)));
 next.producer=source.qualify(retention.producer);next.current_public_bridge=structuredClone(summary);
 const snack=next.subjects.find(row=>row.family==='snack-bar');assert.ok(snack);
 snack.modern_theme_exact_after_MDC_relocation=false;snack.historical_modern_source_exact_after_MDC_relocation=true;snack.separate_current_public_bridge=true;
 for(const id of CURRENT_SASS_C04_RETENTION_CASE_IDS){
  const rows=id.startsWith('direct-')?next.direct_original_legacy_color_cases:next.public_legacy_default_CSS_cases;
  const selected=rows.filter(row=>row.case_id===id);assert.equal(selected.length,1);Object.assign(selected[0],currentLegacyRetentionMeasurement(id));
 }
 const unchanged=(key,expectedCount)=>{
  const old=retention[key].filter(row=>!CURRENT_SASS_C04_RETENTION_CASE_IDS.includes(row.case_id));
  const retained=next[key].filter(row=>!CURRENT_SASS_C04_RETENTION_CASE_IDS.includes(row.case_id));
  assert.equal(old.length,expectedCount);assert.deepEqual(retained,old);return old.length;
 };
 unchangedPublic=unchanged('public_legacy_default_CSS_cases',9);unchangedDirect=unchanged('direct_original_legacy_color_cases',3);
 checks.push('allother9 public and3 direct retention rows exact unchanged');
 assert.equal(assertSpinnerSnackRetentionSuccessor({historical:retention,current:next,source}),true);
 assert.deepEqual(retention,savedRetention);checks.push('exact fourcase retention successor from archived data');
 const wrongCss=structuredClone(next);wrongCss.public_legacy_default_CSS_cases.find(row=>row.case_id==='mixin-css/legacy-button-color').css_sha256='0'.repeat(64);
 assert.throws(()=>assertSpinnerSnackRetentionSuccessor({historical:retention,current:wrongCss,source}));checks.push('wrong selected retention CSS row rejects');
 const wrongRetentionDescriptor=structuredClone(next);wrongRetentionDescriptor.current_public_bridge.current_source.source_packet.sha256='0'.repeat(64);
 assert.throws(()=>assertSpinnerSnackRetentionSuccessor({historical:retention,current:wrongRetentionDescriptor,source}));checks.push('wrong retention current descriptor rejects');
 for(const ref of [...REPORTS,RETENTION])pinned(ref);checks.push('all5 archived bytes remain unchanged after controls');
}else{
 assert.equal(line,'main');assert.equal(bound.some(ref=>REPORTS.some(report=>report.path===ref.path)),false);
 checks.push('main has no21archived C04 REPORTS binding');
}
source.assertCurrent();checks.push('final current C04/tool physical assertion');
const manifest=readFileSync(join(root,'compatibility/rc/parent-base-class-tool-successor-inputs-v3.json'));
console.log(JSON.stringify({line,checks,product_refs:productRefs,tool_manifest_sha256:hash(manifest),bound_count:bound.length,
 source_summary:summary,authenticated_C04_report_count:reports,unchanged_public_retention_rows:unchangedPublic,
 unchanged_direct_retention_rows:unchangedDirect,compiler_calls:0,old_physical_constructor_executed:false,
 current_product_projection_used:false,modeled_successors:true,artifact_or_audit_admission_granted:false}));
