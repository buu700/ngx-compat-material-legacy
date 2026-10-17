/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real raw source guards and selected CLI admission; no runtime qualification. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {chipFocusSourcePrior,chipFocusCurrentSourceBodies,inspectChipFocusSourceQualification,CHIP_FOCUS_SOURCE_APIS,CHIP_FOCUS_SOURCE_PRIOR} from '../scripts/chip-focus-source-qualification.mjs';
import {qualifyChipFocusSourceEpoch} from '../scripts/chip-focus-source-epoch.mjs';
import {CHIP_FOCUS_SOURCE,readChipFocusRepairPrior} from '../scripts/chip-focus-contract.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript'),json=v=>JSON.stringify(v,null,2)+'\n';
const prior=chipFocusSourcePrior(),current=inspectChipFocusSourceQualification(),groups=chipFocusCurrentSourceBodies(),ledger=JSON.parse(read(prior.ledger_path)),paths=candidateProductSourcePaths(process.cwd()).sort(),focus=readChipFocusRepairPrior(),controls=[];
const beforeSources=new Map(focus.sources.filter(m=>m.path.startsWith('projects/')).map(m=>[m.path,m.text])),beforeRead=p=>beforeSources.has(p)?Buffer.from(beforeSources.get(p)):read(p);
let retained=0;
for(const group of groups){const api=CHIP_FOCUS_SOURCE_APIS[group.unit],old=JSON.parse(prior.reviews.find(m=>m.path===group.prior_report).text);
 for(const sha of group.shas){const entry=ledger.entries.find(e=>e.sha===sha),previous=prior.entries.find(e=>e.sha===sha);
  assert.equal(api.validate(group.body,entry,read,paths,prior.line),true);assert.equal(api.validate(old,previous,beforeRead,paths,prior.line),true,'original context changed '+sha);retained++;
  const forged=structuredClone(entry);forged.individual_proof.proof_kind='documentation-only';assert.equal(api.validate(group.body,forged,read,paths,prior.line),false);controls.push({sha,id:'wrong-proof-kind',result:'rejected'});
  const altered=structuredClone(group.body);altered.actual_native_packed_or_floor_qualified=true;const bytes=Buffer.from(json(altered)),rebound=structuredClone(entry);rebound.source_check.evidence_report_sha256=hash(bytes);assert.equal(api.validate(altered,rebound,p=>p===entry.evidence_report?bytes:read(p),paths,prior.line),false);controls.push({sha,id:'rebound-runtime-credit',result:'rejected'});
 }
 const entry=ledger.entries.find(e=>e.sha===group.shas[0]),mutant="import {MatChipRow as UnknownOwnedRow} from '@angular/material/chips';\n"+read(CHIP_FOCUS_SOURCE);assert.equal(ts.createSourceFile('valid.ts',mutant,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0);assert.equal(api.validate(group.body,entry,p=>p===CHIP_FOCUS_SOURCE?Buffer.from(mutant):read(p),paths,prior.line),false);controls.push({unit:group.unit,id:'new-current-peer-row-route',valid_TypeScript:true,result:'rejected'});
}
const members=focus.sources.filter(m=>['projects/ngx-material-legacy/legacy-chips/chip.ts','projects/ngx-material-legacy/legacy-chips/chip.spec.ts'].includes(m.path)).slice(0,1).map(({path,sha256})=>({path,sha256}));
assert.equal(members[0].path,CHIP_FOCUS_SOURCE);const qualified=qualifyChipFocusSourceEpoch(members,read);assert.equal(qualified.approved_focus_source_epoch.current_owner.sha256,hash(read(CHIP_FOCUS_SOURCE)));assert.equal(qualified.approved_focus_source_epoch.all_product_members_read_raw,true);assert.deepEqual(qualifyChipFocusSourceEpoch(members,beforeRead),{members});
const mutations=[
 ['pending-refocus-altered',CHIP_FOCUS_SOURCE,b=>Buffer.from(b.toString().replace('!this._hasFocus || wasBlurPending','!this._hasFocus'))],
 ['other-production-member-altered',CHIP_FOCUS_SOURCE,b=>Buffer.from(b.toString().replace('this.removed.emit({chip: this});','this.removed.emit({chip: this});\n    this.removed.emit({chip: this});'))],
 ['approved-native-spec-altered','projects/ngx-material-legacy/legacy-chips/chip.spec.ts',b=>Buffer.concat([b,Buffer.from('\n')])],
 ['unrelated-structural-style','projects/ngx-material-legacy/legacy-chips/chips.scss',b=>Buffer.concat([b,Buffer.from('\n')])],
 ['tagged-source-altered','reference/material-16.2.14/chips-keyboard-sources/chip.ts',b=>Buffer.concat([b,Buffer.from('\n')])],
 ['focus-inputs-altered','compatibility/rc/chip-focus-repair-inputs.json',b=>Buffer.concat([b,Buffer.from('\n')])],
 ['raw-inspector-altered','scripts/chip-focus-contract.mjs',b=>Buffer.concat([b,Buffer.from('\n')])],
];
for(const [id,path,mutate]of mutations){const bytes=mutate(read(path));assert.notEqual(hash(bytes),hash(read(path)));if(path.endsWith('.ts'))assert.equal(ts.createSourceFile(path,bytes.toString(),ts.ScriptTarget.Latest,true).parseDiagnostics.length,0);assert.throws(()=>qualifyChipFocusSourceEpoch(members,p=>p===path?bytes:read(p)));controls.push({id,result:'rejected'});}
const unknown=structuredClone(members);unknown[0].sha256='0'.repeat(64);assert.throws(()=>qualifyChipFocusSourceEpoch(unknown,read));controls.push({id:'different-historical-preimage',result:'rejected'});
const second=[...members,{path:'projects/ngx-material-legacy/legacy-chips/chip-input.ts',sha256:hash(read('projects/ngx-material-legacy/legacy-chips/chip-input.ts'))}];assert.throws(()=>qualifyChipFocusSourceEpoch(second,p=>p===second[1].path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)));controls.push({id:'second-owned-source-change',result:'rejected'});
assert.throws(()=>chipFocusSourcePrior(p=>p===CHIP_FOCUS_SOURCE_PRIOR?Buffer.concat([read(p),Buffer.from('changed')]):read(p)));controls.push({id:'late-prior-corruption',result:'rejected'});assert.ok(Object.isFrozen(prior.entries[0]));assert.throws(()=>prior.entries[0].reason='changed');controls.push({id:'prior-mutation',result:'rejected'});
const work=mkdtempSync(join(tmpdir(),'ngx-chip-focus-source-cli-')),cli=[];
try{const seed=JSON.parse(read('compatibility/f10/upstream-sha-risk-bootstrap.json')),ids=new Set(prior.entries.map(e=>e.sha));seed.commits=seed.commits.filter(e=>ids.has(e.sha));assert.equal(seed.commits.length,12);
 for(const corrupt of [false,true]){const entries=ledger.entries.filter(e=>ids.has(e.sha)).map(e=>structuredClone(e));if(corrupt)for(const e of entries){e.evidence_report='README.md';e.individual_proof={proof_kind:'documentation-only'};}
  const seedPath=join(work,'seed.json'),ledgerPath=join(work,'ledger.json'),reportPath=join(work,'report.json');writeFileSync(seedPath,json(seed));writeFileSync(ledgerPath,json({entries}));
  const child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line',prior.line,'--seed',seedPath,'--ledger',ledgerPath,'--report',reportPath],{encoding:'utf8',timeout:60000});assert.equal(child.error,undefined,child.stderr);assert.equal(child.status,1,child.stderr);const report=JSON.parse(readFileSync(reportPath));assert.equal(report.g11_claim,'not-passed');assert.equal(report.disposition_admission,'incomplete');
  if(corrupt){for(const g of groups)for(const sha of g.shas)assert.ok(report.evidence_failures.some(r=>r.sha===sha&&r.reason==='invalid-'+g.unit+'-source-scope'),sha);}else for(const key of ['missing_evidence','insufficient_sensitive','insufficient_behavior','insufficient_inherited','missing_branch_applicability'])assert.equal(report[key],0,key);
  cli.push({kind:corrupt?'missing-proof-and-wrong-suffix':'all-twelve-current-raw-source-decisions',exit_code:child.status,scope_source_valid:!corrupt,overall_G11:'incomplete'});
 }
}finally{rmSync(work,{recursive:true,force:true});}
const report={...current,selected_original_contexts_preserved:retained,controls,actual_CLI_controls:cli,source_owner_subject:'current raw focus repair only;explicit prior bytes above characterize the old source epoch and are not read by native admission',actual_native_browser_or_floor_execution:false};
if(process.argv[2])writeFileSync(process.argv[2],json(report),{flag:'wx'});console.log(JSON.stringify({...report,current_source_subjects:current.current_source_subjects.length,source_bodies:current.source_bodies.length,controls:controls.length,actual_CLI_controls:cli.length}));
