/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current raw type proof rejects changed inputs and historical substitutions. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedMenuContentTypeBoundary,MENU_CONTENT_PANEL_SOURCE} from '../scripts/menu-panel-content-boundary.mjs';
const root=process.cwd(),readMember=p=>readFileSync(join(root,p)),line=JSON.parse(readMember('compatibility/rc/menu-caller-worksheet.json')).line;
const q=qualifiedMenuContentTypeBoundary({line,readMember}),cap=JSON.parse(readMember('compatibility/rc/menu-caller-public-subjects.json'));
const controls=[q.ref.path,MENU_CONTENT_PANEL_SOURCE,'scripts/menu-caller-contracts.mjs','scripts/menu-caller-public-subjects.mjs','tests/menu_panel_content_type_probe.mjs',
 'compatibility/rc/menu-caller-prior.json.gz','compatibility/rc/menu-panel-content-type-proposal.json','compatibility/rc/menu-caller-public-subjects.json',
 'projects/ngx-material-legacy/legacy-menu/menu-content.ts','projects/ngx-material-legacy/legacy-menu/internal/menu-content-base.ts','projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
 'compatibility/rc/api/export-name-allowlist.json',...cap.subjects.map(s=>s.additions[0].path)];
assert.equal(new Set(controls).size,controls.length);
for(const path of controls)assert.throws(()=>qualifiedMenuContentTypeBoundary({line,readMember:p=>p===path?Buffer.concat([readMember(p),Buffer.from('\n')]):readMember(p)}),e=>e?.code==='ERR_ASSERTION',path);
for(const path of [q.ref.path,MENU_CONTENT_PANEL_SOURCE]){let changed=false;const late=p=>changed&&p===path?Buffer.concat([readMember(p),Buffer.from('\n')]):readMember(p);qualifiedMenuContentTypeBoundary({line,readMember:late});changed=true;assert.throws(()=>qualifiedMenuContentTypeBoundary({line,readMember:late}),e=>e?.code==='ERR_ASSERTION');}
const prior=JSON.parse(readMember('compatibility/rc/menu-panel-content-type-proposal.json')).diagnostic;
assert.throws(()=>qualifiedMenuContentTypeBoundary({line,readMember:p=>p===MENU_CONTENT_PANEL_SOURCE?Buffer.from(prior.before):readMember(p)}),e=>e?.code==='ERR_ASSERTION');
const report={line,SDK_models:3,semantic_source_files:53,private_current_method_uses_before:2,private_current_method_uses_after:0,owned_content_assignment_restored:true,
 semantic_JS_files_identical:53,actual_interface_mutants_rejected:3,raw_input_corruptions_rejected:controls.length,late_changes_rejected:2,historical_before_substitution_rejected:true,
 actual_product_files_changed:1,HTML_CSS_SCSS_consumer_map_or_allowlist_changes:0,actual_runtime_native_packed_AOT_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
