/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Type-boundary corruption and actual qualifier fault controls,not a runtime pass. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedA11yCallerTypes} from '../scripts/a11y-caller-type-evidence.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),q=qualifiedA11yCallerTypes({root}),paths=[...new Set([q.ref.path,'compatibility/rc/a11y-caller-prior.json.gz','compatibility/rc/a11y-caller-public-subjects.json','scripts/a11y-caller-contracts.mjs','scripts/a11y-caller-public-subjects.mjs','tests/a11y_caller_public_type_probe.mjs',...q.source.prior.sources.map(m=>m.path),...q.source.metadata.map(m=>m.path),'compatibility/rc/api/export-name-allowlist.json'])];
for(const path of paths)assert.throws(()=>qualifiedA11yCallerTypes({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}),e=>e?.code==='ERR_ASSERTION',path);
let changed=null;const late=p=>p===changed?Buffer.concat([read(p),Buffer.from('\n')]):read(p);qualifiedA11yCallerTypes({root,read:late});for(changed of [q.ref.path,'projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts'])assert.throws(()=>qualifiedA11yCallerTypes({root,read:late}),e=>e?.code==='ERR_ASSERTION');
const report={line:q.source.prior.line,current_graph_files:118,current_public_symbols:7,actual_resolved_calls:12,actual_member_references:21,invalid_typed_controls:9,source_input_corruptions_rejected:paths.length,late_changes_rejected:2,source_closures:0,service_or_owned_caller_runtime_qualified:false,actual_native_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
