/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source-use delta only; canonical owners and historical reports are untouched. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),prefix=process.argv[2];
assert.ok(['21x','main'].includes(prefix));
const stem=`compatibility/rc/${prefix}-base-class-removal-repair-`;
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(root+'/'+p);
const worksheet=JSON.parse(read(stem+'worksheet.json'));
const paths=worksheet.owned_paths.filter(p=>p.startsWith('projects/'));
assert.equal(paths.length,4);
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const k of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[k];
const beforeBytes=new Map(paths.map(p=>[p,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',worksheet.baseline_commit+':'+p],{cwd:root,env,maxBuffer:1024*1024})]));
const modulePath='scripts/authored-current-use-inventory.mjs';
const {scanCurrentAuthoredUses}=await import(pathToFileURL(root+'/'+modulePath));
const before=scanCurrentAuthoredUses({root,readSource:p=>beforeBytes.get(p)??read(p)});
const current=scanCurrentAuthoredUses({root});
const key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const oldMap=new Map(before.symbol_uses.map(r=>[key(r),r]));
const newMap=new Map(current.symbol_uses.map(r=>[key(r),r]));
const added=current.symbol_uses.filter(r=>!oldMap.has(key(r)));
const removed=before.symbol_uses.filter(r=>!newMap.has(key(r)));
assert.deepEqual(added.map(key),[
 '["legacy-form-field/testing/error-harness.ts","@angular/material/form-field/testing","MatErrorHarness"]',
 '["legacy-snack-bar/internal/snack-bar-base.ts","@angular/material/snack-bar","MatSnackBarRef"]'
]);
assert.deepEqual(removed,[]);
const changed=current.symbol_uses.filter(r=>oldMap.has(key(r))&&JSON.stringify(r)!==JSON.stringify(oldMap.get(key(r))));
const sourceChanges=current.source_files.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(before.source_files[i]));
assert.deepEqual(sourceChanges.map(r=>r.path).sort(),[...paths].sort());
const rawRosters=['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json'];
const rosterReads=rawRosters.map(path=>({path,sha256:hash(read(path))}));
const knownKeys=new Set(rawRosters.flatMap(p=>JSON.parse(read(p)).symbol_uses.map(key)));
assert.deepEqual(current.symbol_uses.filter(r=>!knownKeys.has(key(r))).map(key),added.map(key));
const result={schema_version:1,line:worksheet.line,compiler:current.compiler,
 status:'read-only finite live-use delta; source-owner admission not attempted',
 baseline_commit:worksheet.baseline_commit,
 producer:{path:stem+'authored-use-diagnostic.mjs',sha256:hash(read(stem+'authored-use-diagnostic.mjs'))},
 scanner:{path:modulePath,sha256:hash(read(modulePath))},
 worksheet:{path:stem+'worksheet.json',sha256:hash(read(stem+'worksheet.json'))},
 before:{files:before.source_files.length,uses:before.symbol_uses.length,source_population_sha256:before.source_population_sha256},
 current:{files:current.source_files.length,uses:current.symbol_uses.length,source_population_sha256:current.source_population_sha256},
 exact_changed_sources:sourceChanges.map(r=>({path:r.path,before_sha256:hash(beforeBytes.get(r.path)),after_sha256:r.sha256})),
 added,removed,existing_source_bound_rows_affected:changed.length,
 affected_existing_rows:changed.map(r=>({file:r.file,module:r.module,symbol:r.symbol,
 before_source_sha256:oldMap.get(key(r)).candidate_source_sha256,after_source_sha256:r.candidate_source_sha256,
 occurrence_metadata_changed:JSON.stringify(oldMap.get(key(r)).occurrences)!==JSON.stringify(r.occurrences)})),
 raw_rosters_read_only:rosterReads,
 warning:'Raw historical rosters are not a current admission read. Owner metadata composition and independent per-caller evidence remain required. No old receipt was reclassified as current.',
 canonical_dispositions_changed:0,source_owner_reconciliation_complete:false,
 actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(root+'/'+stem+'authored-use-diagnostic.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({line:result.line,before:result.before,current:result.current,added:added.map(r=>r.symbol),removed:removed.length,affected_existing_rows:changed.length,exact_changed_sources:sourceChanges.length,canonical_admission:false}));
