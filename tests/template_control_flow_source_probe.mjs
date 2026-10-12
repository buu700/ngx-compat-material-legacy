/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {proveTemplateControlFlow} from '../scripts/template-control-flow-source-proof.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p),'utf8');
const mutations=[
 ['inactive-overlay-binding','legacy-select/select.html','[attr.aria-multiselectable]="multiple"','[attr.aria-multiselectable]="false"'],
 ['projection-selector','legacy-form-field/form-field.html','select="mat-label"','select="wrong-label"'],
 ['branch-predicate','legacy-menu/menu-item.html','@if (_triggersSubmenu)','@if (false)'],
 ['stylesheet-change','legacy-tabs/tab-group.scss','@use','/* extra */\n@use'],
 ['missing-differ-teardown','legacy-paginator/internal/page-size-options.ts','this._differ?.onDestroy();',''],
];
const result=proveTemplateControlFlow();
for(const[id,relative,from,to]of mutations){const path='projects/ngx-material-legacy/'+relative,source=read(path),changed=source.replace(from,to);assert.notEqual(changed,source,id);
 assert.throws(()=>proveTemplateControlFlow({readSource:p=>p===path?changed:read(p)}),assert.AssertionError,id);
}
const report={...result,negative_controls:mutations.map(([id])=>({id,rejected:true}))};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({templates:result.observations.length,unchanged_styles:result.unchanged_styles.length,negative_controls:mutations.length}));
