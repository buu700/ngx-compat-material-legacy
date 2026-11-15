/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {isDeepStrictEqual as eq} from 'node:util';
import {tableCases,tableFaultControls,tableSupplementalCases,tableSupplementalFaultControls,TABLE_SUPPLEMENTAL_IDS} from '../testing/table-inherited/contracts.mjs';
export const TABLE_SOURCE_PATHS=Object.freeze([
  "compatibility/rc/table-inherited-review/27dae25a420e76817a1209f373326084ae6dd11c.patch",
  "compatibility/rc/table-inherited-review/3b6ca5c9880996b57e08caffb408f6c12ed78de4.patch",
  "compatibility/rc/table-inherited-review/59b8f433c28e81c213668ccf7d220f12e3524635.patch",
  "projects/ngx-material-legacy/legacy-table/table.ts",
  "projects/ngx-material-legacy/legacy-table/cell.ts",
  "projects/ngx-material-legacy/legacy-table/row.ts",
  "projects/ngx-material-legacy/legacy-core/public-api.ts",
  "projects/ngx-material-legacy/legacy-core/internal/common-module.ts",
  "projects/ngx-material-legacy/legacy-core/internal/sanity-checks.ts",
  "projects/ngx-material-legacy/legacy-core/internal/test-environment.ts",
  "projects/ngx-material-legacy/legacy-table/table-module.ts",
  "projects/ngx-material-legacy/legacy-table/text-column.ts",
  "projects/ngx-material-legacy/legacy-table/internal/table-outlet.ts",
  "projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts",
  "projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts",
  "projects/ngx-material-legacy/legacy-table/internal/column-classes.ts",
  "projects/ngx-material-legacy/legacy-table/internal/definition-owner.ts",
  "scripts/table-inherited-native-run.mjs",
  "testing/table-inherited/consumer.ts",
  "testing/table-inherited/supplemental.ts",
  "testing/table-inherited/negative.ts",
  "testing/table-inherited/readonly-negative.ts",
  "testing/table-inherited/contracts.mjs",
  "scripts/check-companion-computed-styles.mjs",
  "scripts/safe-package-extract.mjs",
  "scripts/chromium-debug-endpoint.mjs",
  "scripts/npm-tooling-options.mjs",
  "scripts/resolve-run-library.mjs",
  "scripts/badge-high-contrast-contract.mjs",
  "scripts/bundle-consumer-harness.mjs",
  "scripts/consumer-animation-engine.mjs",
  "scripts/companion-computed-cases.mjs",
  "scripts/companion-bridge-peer-oracle.mjs",
  "fixtures/sass/stepper-historical-bridge-oracle.json",
  "tests/fixtures/stepper-material-16/source-manifest.json",
  "tests/fixtures/stepper-material-16/shape-observation.json",
  "compatibility/rc/table-inherited-deps-main.json",
  "compatibility/rc/table-inherited-toolchain-main.json",
  "compatibility/rc/overlay-inherited-toolchain-main.json",
  "compatibility/rc/overlay-inherited-toolchain-main-x64-provisional.json",
  "scripts/inherited-native-profiles.mjs",
  "compatibility/rc/inherited-native-profiles.json",
  "scripts/table-inherited-toolchain.mjs",
  "pnpm-lock.yaml",
  "toolchain-lock.json",
  "package.json"
]);
const need=(v,m)=>{if(!v)throw Error(m)};
export function verifyTableLiveBody(body,{binding,runId,invocation,library,profile,sourcePins}){
 need(body?.kind==='table-inherited-live-native'&&body.role==='table-inherited-live-evidence'&&body.schema_version===2&&body.run_id===runId&&body.invocation_id===invocation&&eq(body.binding,binding),'wrong table run or role');
 need(body.source_commit===binding.source_commit&&body.source_tree===binding.source_tree&&body.artifact_sha256===library.sha256&&eq(body.library,library),'wrong table source or artifact');
 need(/^[0-9a-f]{32}$/.test(body.nonce||'')&&body.toolchain_profile===profile.id&&body.toolchain_record_sha256===profile.recordHash&&body.controls_are_upstream_mutations===false,'wrong table nonce/profile');
 need(sourcePins&&eq(Object.keys(body.source_before||{}).sort(),[...TABLE_SOURCE_PATHS].sort())&&eq(body.source_before,body.source_after)&&TABLE_SOURCE_PATHS.every(path=>/^[0-9a-f]{64}$/.test(sourcePins[path]||'')&&body.source_before[path]===sourcePins[path]),'wrong table source snapshot');
 need(eq(body.tool_before,body.tool_after)&&body.toolchain_verified_before_and_after===true&&body.aot_positive===0&&Number.isInteger(body.aot_missing_module_negative)&&body.aot_missing_module_negative!==0&&body.aot_negative_has_ng8002===true&&typeof body.aot_negative_diagnostic==='string'&&body.aot_negative_diagnostic.includes('NG8002')&&Number.isInteger(body.aot_readonly_negative)&&body.aot_readonly_negative!==0&&body.aot_readonly_has_ts2339===true&&typeof body.aot_readonly_diagnostic==='string'&&body.aot_readonly_diagnostic.includes('TS2339'),'incomplete table execution');
 need(body.modes&&eq(Object.keys(body.modes).sort(),['zoneful','zoneless']),'missing or extra scheduling mode');
 const modes={};for(const mode of ['zoneless','zoneful']){const result=body.modes[mode],data=result?.observation;
  need(result?.browser===profile.browser_product&&data?.nonce===body.nonce+':'+mode&&data?.mode===mode&&data?.zone_active===(mode==='zoneful')&&/^[0-9a-f]{64}$/.test(result?.bundle_sha256||''),'wrong mode identity or scheduling');
  const cases=tableCases(data),controls=tableFaultControls(data),supplemental=tableSupplementalCases(data),supplementalControls=tableSupplementalFaultControls(data);
  need(eq(cases,result.cases)&&Object.values(cases).every(Boolean)&&eq(controls,result.controls)&&controls.length===17&&controls.every(x=>x.rejected)&&eq(supplemental,result.supplemental)&&eq(Object.keys(supplemental),TABLE_SUPPLEMENTAL_IDS)&&Object.values(supplemental).every(Boolean)&&eq(supplementalControls,result.supplemental_controls)&&supplementalControls.length===TABLE_SUPPLEMENTAL_IDS.length&&supplementalControls.every(x=>x.rejected),'table case or fault control failed');modes[mode]={cases,supplemental};
 }
 need(body.modes.zoneful.bundle_sha256!==body.modes.zoneless.bundle_sha256,'scheduling bundles identical');return modes;
}
export function tableOutputRecords(rows,runId,invocation){
 const records=new Map();for(const row of rows||[]){if(row?.execution!=='live-packed-native-table')continue;
  need(typeof row.output==='string'&&/^table-live-[a-f0-9]{32}\.json$/.test(row.output)&&row.output===`table-live-${row.nonce}.json`&&/^[a-f0-9]{64}$/.test(row.sha256)&&Number.isSafeInteger(row.bytes)&&row.bytes>0&&row.run_id===runId&&row.invocation_id===invocation,'wrong table live output identity');
  const item={path:`evidence/upstream-audit-disposition/${invocation}/${row.output}`,sha256:row.sha256,bytes:row.bytes},old=records.get(item.path);need(!old||eq(old,item),'conflicting table live output');records.set(item.path,item);
 }return [...records.values()];
}
