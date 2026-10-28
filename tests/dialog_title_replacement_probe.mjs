/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {measureDialogTitleReplacement,observeDialogTitleVariant,inspectDialogTitleReplacement} from '../scripts/dialog-title-replacement-contract.mjs';
const root=resolve(process.env.DIALOG_TITLE_SOURCE_ROOT??process.cwd()),read=path=>readFileSync(join(root,path));
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21x':'main';
const recorded=JSON.parse(readFileSync(new URL('../compatibility/rc/21x-c04-dialog-title-replacement-measurement-'+line+'.json',import.meta.url)));
const measured=await measureDialogTitleReplacement({root});assert.deepEqual(measured,recorded);
const scope=inspectDialogTitleReplacement({root}),folder='projects/ngx-material-legacy/legacy-dialog/';
const title=read(folder+'dialog-content-directives.ts').toString(),base=read(folder+'internal/dialog-container-base.ts').toString(),host=read(folder+'dialog-container.ts').toString();
const mutants=[
 ['late-queue-lookup','title',title.replace('removeLegacyDialogTitle(instance, this.id, queue);','removeLegacyDialogTitle(instance, this.id);')],
 ['removed-title-stays-registered','title',title.replace('removeLegacyDialogTitle(instance, this.id, queue);','void this.id;')],
 ['wrong-title-order','title',title.replace('addLegacyDialogTitle(container, this.id);','container._ariaLabelledByQueue?.unshift(this.id);')],
 ['synchronous-registration','title',title.replace('Promise.resolve().then(() => {','({then: (callback: () => void) => callback()}).then(() => {')],
 ['modern-id-namespace','title',title.replace('mat-dialog-title-${dialogElementUid++}','mat-mdc-dialog-title-${dialogElementUid++}')],
 ['unknown-removal-deletes-first','title',title.replace('removeLegacyDialogTitle(instance, this.id, queue);','removeLegacyDialogTitle(instance, queue[0], queue);')],
 ['missing-onpush-registration-mark','title',title.replace('addLegacyDialogTitle(container, this.id);','container._ariaLabelledByQueue?.push(this.id);')],
 ['destroyed-owner-state-not-cleared','base',base.replace('destroyLegacyDialogContainerState(this);','')],
 ['host-uses-second-title','host',host.replace('_config.ariaLabel ? null : _ariaLabelledByQueue[0]','_config.ariaLabel ? null : _ariaLabelledByQueue[1]')],
];
const rejected=[];
for(const [id,key,changed]of mutants){assert.notEqual(changed,{title,base,host}[key]);const observed=await observeDialogTitleVariant({root,scope,variant:'owned',overrides:{[key]:changed}});assert.ok(observed.failed.length>0,id);rejected.push({id,failed_cases:observed.failed});}
let sourceRejected=0;
for(const target of [folder+'dialog-content-directives.ts',folder+'internal/dialog-container-state.ts',folder+'internal/dialog-container-base.ts',folder+'dialog-container.ts',folder+'dialog-container.html',folder+'dialog.scss','tests/dialog_initial_focus_runtime_probe.mjs','node_modules/@angular/material/package.json']){
 const changed=target.endsWith('package.json')?Buffer.from(JSON.stringify({...JSON.parse(read(target)),version:'99.0.0'})):Buffer.concat([read(target),Buffer.from('\n')]);
 assert.throws(()=>inspectDialogTitleReplacement({root,read:path=>path===target?changed:read(path)}));sourceRejected++;
}
const report={schema_version:1,line:measured.line,original_after_cases:15,tagged_cases:15,owned_cases:18,original_before_counterexamples:6,compiled_lifecycle_mutants_rejected:rejected.length,source_rejections:sourceRejected,rejected,
 fresh_measurement_matches_recorded:true,actual_owned_helper_namespace_matches_constructor:true,synthetic_host_binding_interpreter:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
