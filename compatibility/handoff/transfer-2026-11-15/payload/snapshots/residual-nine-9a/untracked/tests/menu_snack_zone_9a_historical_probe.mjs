/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Execute the original producer and all its controls on its authentic source epoch. */
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,readdirSync,symlinkSync,writeFileSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
const root=process.cwd(),commit='eb8380bf9bfb5449dd1e76b2cf94159c074a2191',git=(...a)=>execFileSync('git',['--no-replace-objects',...a],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1'},maxBuffer:16*1024*1024}),temp=mkdtempSync(join(tmpdir(),'zone-historical-'));
const historical=p=>git('show',commit+':'+p);const reports=['compatibility/rc/menu-snack-zone-use-menu-runtime.json','compatibility/rc/menu-snack-zone-use-snack-runtime.json'].map(p=>JSON.parse(historical(p)));const paths=new Set(['tests/menu_focus_runtime_probe.mjs','tests/menu_snack_zone_use_probe.mjs','scripts/menu-snack-zone-use-review.mjs','tests/menu_focus_runtime_subject.mjs','tests/snack_exit_runtime_subject.mjs','tests/snack_exit_runtime_probe.mjs','tests/menu_focus_runtime_probe.mjs','tests/test_menu_focus_runtime.py','tests/test_snack_exit_runtime.py','projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts','projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts',...reports.flatMap(r=>r.sources.map(x=>x.path))]);
// Materialize only exact historical files along overlay directories; symlink all
// other source paths read-only to the workspace. Git metadata remains shared.
const parents=new Set(['']);for(const p of paths){let x=dirname(p);while(x!=='.'&&!parents.has(x)){parents.add(x);x=dirname(x)}}
function mirror(rel){const src=join(root,rel),dst=join(temp,rel);mkdirSync(dst,{recursive:true});for(const name of readdirSync(src)){const child=rel?rel+'/'+name:name;if(child==='.git')continue;const out=join(temp,child);if(parents.has(child)){mirror(child);continue}if(paths.has(child)){writeFileSync(out,historical(child));continue}symlinkSync(join(root,child),out,lstatSync(join(root,child)).isDirectory()?'dir':'file')}}
try{mirror('');const gitdir=git('rev-parse','--absolute-git-dir').toString().trim();writeFileSync(join(temp,'.git'),'gitdir: '+gitdir+'\n');const run=p=>JSON.parse(execFileSync(process.execPath,[p],{cwd:temp,encoding:'utf8',timeout:150000,maxBuffer:4*1024*1024}).trim().split('\n').at(-1));const focus=run('tests/menu_focus_runtime_probe.mjs'),zone=run('tests/menu_snack_zone_use_probe.mjs');assert.equal(focus.subjects,10);assert.equal(focus.mutation_rejections,40);assert.equal(zone.genuine_zone_subjects,10);assert.equal(zone.supplement_cases,70);assert.equal(zone.supplement_behavioral_faults,46);assert.equal(zone.source_declaration_evidence_controls,16);assert.equal(zone.fresh_original_behavioral_faults,94);console.log(JSON.stringify({historical_commit:commit,focus_subjects:10,focus_faults:40,zone_subjects:10,zone_cases:70,zone_faults:46,source_controls:16,original_faults:94,scope:'historical execution, no current-runtime promotion'}));}finally{rmSync(temp,{recursive:true,force:true})}
