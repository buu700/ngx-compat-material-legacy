/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectHistoricalMenuMetadataRequalification,METADATA_INPUTS} from '../scripts/historical-menu-metadata-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(resolve(root,p));
const report=await inspectHistoricalMenuMetadataRequalification({root}),controls=[];
const base='projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts';
const leaf='projects/ngx-material-legacy/legacy-menu/menu-item.ts';
for(const[id,path,change,expected]of[
 ['changed-input-identities',METADATA_INPUTS,b=>Buffer.concat([b,Buffer.from(' ')]),/metadata inputs changed/],
 ['changed-actual-class-report','compatibility/rc/historical-menu-class-decorator-requalification-diagnostic.json',b=>Buffer.concat([b,Buffer.from(' ')]),/metadata evidence changed/],
 ['changed-owner-authority','compatibility/rc/owned-menu-item-implementation-decision.json',b=>Buffer.concat([b,Buffer.from(' ')]),/metadata evidence changed/],
 ['historical-base-standalone-lost',base,b=>Buffer.from(b.toString().replace('@Directive({standalone: false})','@Directive()')),/historical standalone mode must be explicit/],
 ['historical-base-decorator-type-only',base,b=>Buffer.from(b.toString().replace('  Directive,','  type Directive,')),/runtime class decorator imported type only/],
 ['restored-input-metadata-lost',leaf,b=>Buffer.from(b.toString().replace("  inputs: ['disabled', 'disableRipple'],\n",'')),/fresh metadata source differs/],
]){const original=read(path),altered=change(original);assert.notDeepEqual(original,altered,id+': mutation did not apply');await assert.rejects(inspectHistoricalMenuMetadataRequalification({root,readMember:p=>p===path?altered:read(p)}),expected,id+': mutation escaped');controls.push({id,rejected:true});}
const result={...report,negative_controls:controls};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:result.line,groups:result.groups.map(g=>({group:g.group,cases:g.current_cases,unchanged_role_shapes:g.unchanged_role_shapes})),negative_controls:controls.length,native_or_packed_qualified:false}));
