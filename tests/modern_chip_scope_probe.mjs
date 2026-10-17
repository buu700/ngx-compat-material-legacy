/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {analyzeModernChipSubjects,modernChipSourceContext,MODERN_CHIP_SUBJECTS} from '../scripts/upstream-modern-chip-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),paths=candidateProductSourcePaths(process.cwd()).sort();
const subjects=analyzeModernChipSubjects(read),context=modernChipSourceContext(read,paths);
assert.equal(subjects.length,3);assert.equal(subjects.reduce((n,r)=>n+r.original_blobs,0),10);
assert.equal(subjects[0].detail.focuses_primary_action_before_optional_selection,true);
assert.equal(subjects[1].detail.new_private_peer_dependency,'_ErrorStateTracker');
assert.equal(subjects[2].detail.new_up_down_regressions,4);
assert.ok(context.production_and_test_typescript_members.length>300);
assert.deepEqual(context.owned_base_expressions,['_MatChipMixinBase','_MatChipListBase']);
const chip='projects/ngx-material-legacy/legacy-chips/chip.ts',list='projects/ngx-material-legacy/legacy-chips/chip-list.ts';
const mutations=[
 ['named-import',chip,s=>"import {MatChipOption} from '@angular/material/chips';\n"+s],
 ['aliased-import',chip,s=>"import {MatChipOption as HiddenOption} from '@angular/material/chips';\n"+s],
 ['namespace-import',chip,s=>"import * as HiddenChips from '@angular/material/chips';\n"+s],
 ['barrel-export',chip,s=>s+"\nexport * from '@angular/material/chips';\n"],
 ['aliased-export',chip,s=>s+"\nexport {MatChipGrid as HiddenGrid} from '@angular/material/chips';\n"],
 ['root-peer-barrel',chip,s=>s+"\nexport * from '@angular/material';\n"],
 ['type-import',chip,s=>s+"\ntype HiddenGrid = import('@angular/material/chips').MatChipGrid;\n"],
 ['literal-dynamic-import',chip,s=>s+"\nconst hidden = import('@angular/material/chips');\n"],
 ['literal-require',chip,s=>s+"\nconst hidden = require('@angular/material/chips');\n"],
 ['import-equals',chip,s=>"import hidden = require('@angular/material/chips');\n"+s],
 ['nonliteral-module-route',chip,s=>s+"\nconst hidden = import(dynamicChipModule);\n"],
 ['modern-declaration',chip,s=>s+"\nclass MatChipGrid {}\n"],
 ['modern-selector',chip,s=>s+"\n@Directive({selector: 'mat-chip-grid'}) class OtherGrid {}\n"],
 ['modern-base',chip,s=>s.replace('extends _MatChipMixinBase','extends MatChipOption')],
 ['inherited-list-base',list,s=>s.replace('  class {','  class extends MatChipGrid {')],
 ['private-peer-tracker',list,s=>"import {_ErrorStateTracker as HiddenTracker} from '@angular/material/core';\n"+s],
 ['foreign-error-state-mixin',list,s=>s.replace("import {CanUpdateErrorState, mixinErrorState} from './internal/common-behaviors';","import {CanUpdateErrorState, mixinErrorState} from '@angular/material/core';")],
 ['foreign-error-state-barrel','projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/index.ts',s=>s.replace("from './error-state'","from '@angular/material/core'")],
 ['foreign-returned-mixin-base','projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/error-state.ts',s=>s.replace('return class extends base','return class extends OtherChipBase')],
 ['foreign-chip-factory-base',chip,s=>s.replace('mixinDisableRipple(MatChipBase)','mixinDisableRipple(OtherChipBase)')],
];
const cases=[];
for(const [id,path,mutate]of mutations){const old=read(path).toString(),text=mutate(old);assert.notEqual(text,old,id);assert.throws(()=>modernChipSourceContext(p=>p===path?Buffer.from(text):read(p),paths),undefined,id);cases.push({id,result:'rejected'});}
for(const suffix of ['\n// MatChipOption @angular/material/chips\n',"\nconst chipDocumentation = '@angular/material/chips';\n",'\nconst oldExample = "MatChipGrid";\n']){
 const text=read(chip)+suffix;const actual=modernChipSourceContext(p=>p===chip?Buffer.from(text):read(p),paths);assert.equal(actual.authored_current_chip_module_routes,0);cases.push({id:'non-executable-prose-'+cases.length,result:'accepted-as-prose-only'});
}
let capsuleControls=0;
for(const bytes of [Buffer.from('not gzip'),Buffer.concat([read(MODERN_CHIP_SUBJECTS),Buffer.from('changed')])]){assert.throws(()=>analyzeModernChipSubjects(p=>p===MODERN_CHIP_SUBJECTS?bytes:read(p)));capsuleControls++;}
assert.throws(()=>modernChipSourceContext(read,[...paths,paths[0]].sort()));capsuleControls++;
assert.throws(()=>modernChipSourceContext(read,[...paths].reverse()));capsuleControls++;
const report={schema_version:1,line:context.line,scope:'Original whole-source authentication and current authored AST dependency/class/metadata boundaries only; no source dispositions or actual runtime admission.',
 compiler:createRequire(import.meta.url)('typescript').version,node:process.version,subjects,context,cases,semantic_mutation_controls:mutations.length,non_executable_prose_controls:3,archive_and_membership_controls:capsuleControls,
 source_dispositions_or_role_closures:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:context.line,subjects:subjects.length,original_blobs:10,typescript_members:context.production_and_test_typescript_members.length,semantic_mutation_controls:mutations.length,prose_controls:3,archive_and_membership_controls:capsuleControls,actual_native_packed_or_floor_qualified:false}));
