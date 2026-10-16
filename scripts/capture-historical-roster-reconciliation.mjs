/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Capture before-contract data only; do not execute product code or change existing evidence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
import {artifactBehaviorRequirements} from './upstream-artifact-behavior-evidence.mjs';
import {historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {progressCspRequirements} from './upstream-progress-csp-evidence.mjs';
import {generatedIdentityRequirements} from './upstream-generated-identity-evidence.mjs';
import {bidiBehaviorRequirements} from './upstream-bidi-evidence.mjs';
import {selectionBehaviorRequirements} from './upstream-selection-evidence.mjs';
import {formFieldHoverRequirements} from './upstream-form-field-hover-evidence.mjs';
import {tabCompletionRequirements} from './upstream-tab-completion-evidence.mjs';
import {rippleReplayRequirements} from './upstream-ripple-replay-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const worksheetPath='compatibility/rc/historical-roster-reconciliation-worksheet.json',worksheetBytes=read(worksheetPath),worksheet=JSON.parse(worksheetBytes);
assert.equal(worksheet.line,line);assert.equal(worksheet.matrix_current_count,2225);assert.equal(worksheet.derived_current_count,2228);
const functions={artifact:artifactBehaviorRequirements,historical:historicalBehaviorRequirements,csp:progressCspRequirements,identity:generatedIdentityRequirements,bidi:bidiBehaviorRequirements,selection:selectionBehaviorRequirements,hover:formFieldHoverRequirements,tabs:tabCompletionRequirements,ripple:rippleReplayRequirements};
const referenceBytes=read('compatibility/rc/spec-stability-context-inputs.json');
assert.equal(hash(referenceBytes),{main:'7259c44866d5e9f1d7c69a8685ad4682c6a0cfbb26eb9330a10879ac6a2b6638','21.x':'15628f1c418a3f3fd507860234209055db4b268aec2d7cf2ec353d29849620ff'}[line]);
const reference=JSON.parse(referenceBytes).runtime_requirements;
assert.equal(reference.length,20);const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',ledgerBytes=read(ledgerPath),ledger=JSON.parse(ledgerBytes),selected=[];
for(const row of reference){
 const key=row.kind;assert.ok(Object.hasOwn(functions,key));
 const definition=functions[key](row.sha,line);assert.deepEqual(definition,row.definition,'native definition changed before bounded expansion');
 const entry=ledger.entries.find(n=>n.sha===row.sha);assert.ok(entry);const field=row.field;
 const scope=entry.individual_proof[field];assert.ok(scope,'missing current native scope '+field);
 assert.deepEqual(scope.source_members.map(n=>n.path).sort(),definition.members.slice().sort());
 for(const member of scope.source_members)assert.equal(hash(read(member.path)),member.sha256,'stale before native source '+member.path);
 selected.push({sha:row.sha,field,definition,entry,review:{path:entry.evidence_report,sha256:hash(read(entry.evidence_report))}});
}
assert.equal(new Set(selected.map(n=>n.sha)).size,20);assert.equal(ledger.entries.length,1697);
const matrixPath='compatibility/rc/matrices/full-verify.json',matrixBytes=read(matrixPath),matrix=JSON.parse(matrixBytes),groups=matrix.checks.find(n=>n.check_id==='historical-legacy-artifact').acceptance.cases_by_line;
assert.deepEqual(groups[line==='main'?'21.x':'main'],{'original-and-shared-cases':null,'discovery-negatives':null});const bound=groups[line];
assert.deepEqual(Object.keys(bound),['original-and-shared-cases','discovery-negatives']);assert.equal(bound['original-and-shared-cases'].length,2220);assert.equal(bound['discovery-negatives'].length,5);
const roster=deriveHistoricalRoster(root),existing=Object.values(bound).flat(),current=[...roster.ids,...roster.discovery_negative_ids];
assert.equal(current.length,2228);assert.equal(roster.ids.length,2223);assert.ok(existing.every(n=>current.includes(n)));
const additions=current.filter(n=>!existing.includes(n));assert.deepEqual(additions,worksheet.exact_added_case_ids);
assert.deepEqual(roster.discovery_negative_ids,bound['discovery-negatives']);
const addedCases=roster.cases.filter(n=>additions.includes(n.case_id));assert.equal(addedCases.length,3);
const members=[matrixPath,'scripts/upstream-historical-behavior-evidence.mjs','tests/upstream/historical-behavior-admission.mjs','tests/test_upstream_historical_behavior.py'];
const captured=members.map(path=>({path,sha256:hash(read(path)),text:read(path).toString()}));
const chosen=new Set(selected.map(n=>n.sha));
const report={schema_version:1,line,source_parent:execFileSync('git',['--no-replace-objects','rev-parse','HEAD'],{cwd:root,encoding:'utf8',env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}}).trim(),
 worksheet:{path:worksheetPath,sha256:hash(worksheetBytes),text:worksheetBytes.toString()},ledger_sha256:hash(ledgerBytes),selected,
 other1677_entries:ledger.entries.filter(n=>!chosen.has(n.sha)),captured_members:captured,
 roster:{ids:roster.ids,cases:roster.cases,paths:roster.paths,discovery_negative_ids:roster.discovery_negative_ids},addedCases,
 added_spec_members:addedCases.map(row=>({path:row.candidate,sha256:hash(read(row.candidate))})),
 producer:{path:'scripts/capture-historical-roster-reconciliation.mjs',sha256:hash(read('scripts/capture-historical-roster-reconciliation.mjs'))},
 product_or_protocol_implementation_changed:false,all1697_verdicts_unchanged_required:true,actual_native_artifact_or_floor_qualified:false,g11_claim:'not-passed'};
writeFileSync(resolve(root,'compatibility/rc/historical-roster-reconciliation-prior.json.gz'),gzipSync(Buffer.from(JSON.stringify(report,null,2)+'\n')),{flag:'wx'});
console.log(JSON.stringify({line,native_definitions_and_fresh_source_bindings:selected.length,current_case_ids:current.length,old_matrix_case_ids:existing.length,addedCases,actual_native_artifact_or_floor_qualified:false}));
