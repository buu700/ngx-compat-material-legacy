/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exactly three existing regressions expand the historical contract; no runtime pass. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import * as artifact from './upstream-artifact-behavior-evidence.mjs';
import * as historical from './upstream-historical-behavior-evidence.mjs';
import * as csp from './upstream-progress-csp-evidence.mjs';
import * as identity from './upstream-generated-identity-evidence.mjs';
import * as bidi from './upstream-bidi-evidence.mjs';
import * as selection from './upstream-selection-evidence.mjs';
import * as hover from './upstream-form-field-hover-evidence.mjs';
import * as tabs from './upstream-tab-completion-evidence.mjs';
import * as ripple from './upstream-ripple-replay-evidence.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const priorPath='compatibility/rc/historical-roster-reconciliation-prior.json.gz';
const matrixPath='compatibility/rc/matrices/full-verify.json',validatorPath='scripts/upstream-historical-behavior-evidence.mjs',ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
export const ROSTER_RECONCILIATION_PROOF='compatibility/rc/historical-roster-reconciliation-proof.json';
const pins={main:'d9abb4a158abd3dbd66ecf74828b630bf22faa16a031eee0504cdfd8566e2e94','21.x':'3424a5051c7faaf5cae20d2e70d52caa730617489ee91ae20339091047879809'};
const contracts={artifact_behavior:[artifact.artifactBehaviorRequirements,artifact.validateArtifactBehavior],historical_behavior:[historical.historicalBehaviorRequirements,historical.validateHistoricalBehavior],
 progress_csp_behavior:[csp.progressCspRequirements,csp.validateProgressCsp],generated_identity_behavior:[identity.generatedIdentityRequirements,identity.validateGeneratedIdentity],
 bidi_behavior:[bidi.bidiBehaviorRequirements,bidi.validateBidiBehavior],selection_behavior:[selection.selectionBehaviorRequirements,selection.validateSelectionBehavior],
 form_field_hover_behavior:[hover.formFieldHoverRequirements,hover.validateFormFieldHover],tab_completion_behavior:[tabs.tabCompletionRequirements,tabs.validateTabCompletion],ripple_replay_behavior:[ripple.rippleReplayRequirements,ripple.validateRippleReplay]};
export const REQUIRED_REGRESSION_ROWS=[
 ['legacy-autocomplete/autocomplete.spec.ts',172,'MatAutocomplete > should not throw errors when closing without options'],
 ['legacy-chips/chip-list.spec.ts',87,'MatChipList > should clear a destroyed active chip when the list becomes empty'],
 ['legacy-table/table-data-source.spec.ts',6,'MatTableDataSource > sort > should be able to correctly sort an array of strings and numbers with left zero'],
];
export const REQUIRED_REGRESSIONS=REQUIRED_REGRESSION_ROWS.map(([path,index,full_name])=>({case_id:'historical-legacy-artifact/original-and-shared-cases/src/material/'+path+'#'+index,historical_path:'src/material/'+path,candidate:'projects/ngx-material-legacy/'+path,full_name}));
const supplement=`// Existing regression additions are required by the complete historical run.
// They supplement every original named scope; no prior requirement is replaced.
const retainedRegressionCases = [
${REQUIRED_REGRESSION_ROWS.map(([path,index,name])=>"  nativeCase('"+path+"', "+index+", '"+name+"'),").join('\n')}
];
export function historicalRegressionRequirements() {
  return structuredClone(retainedRegressionCases);
}
`;
export function expectedExpandedHistoricalValidator(before){let text=before;
 const replace=(needle,value)=>{assert.equal(text.split(needle).length,2,'historical contract anchor is not exact');text=text.replace(needle,value);};
 replace('const requiredCaseCount = 2225;','const requiredCaseCount = 2228;');
 replace('// This finite registry is owned by individual whole-patch source reviews.',supplement+'// This finite registry is owned by individual whole-patch source reviews.');
 replace("      && registered.cases.every(row => expected.includes(row.case_id)), 'incomplete full historical matrix roster');", "      && registered.cases.every(row => expected.includes(row.case_id))\n      && retainedRegressionCases.every(row => expected.includes(row.case_id)), 'incomplete full historical matrix roster');");
 replace('    for (const required of registered.cases) {','    for (const required of [...registered.cases, ...retainedRegressionCases]) {');
 replace('      required_cases: registered.cases.map(row => row.case_id)};','      required_cases: registered.cases.map(row => row.case_id),\n      retained_regression_cases: retainedRegressionCases.map(row => row.case_id)};');return text;
}
export function expectedExpandedHistoricalMatrix(before,ids){const data=JSON.parse(before),bound=Object.values(data.checks.find(n=>n.check_id==='historical-legacy-artifact').acceptance.cases_by_line).find(n=>Array.isArray(n['original-and-shared-cases']));
 const additions=new Set(REQUIRED_REGRESSIONS.map(n=>n.case_id));assert.equal(ids.length,2223);assert.deepEqual(ids.filter(n=>!additions.has(n)),bound['original-and-shared-cases']);
 const file=ts.parseJsonText('matrix.json',before),edits=[];assert.equal(file.parseDiagnostics.length,0);
 function visit(node){if(ts.isPropertyAssignment(node)&&node.name.text==='original-and-shared-cases'&&ts.isArrayLiteralExpression(node.initializer)){
  const indent=' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);edits.push({start:node.initializer.getStart(file),end:node.initializer.end,text:JSON.stringify(ids,null,2).replaceAll('\n','\n'+indent)});
 }ts.forEachChild(node,visit);}visit(file);assert.equal(edits.length,1);const edit=edits[0];return before.slice(0,edit.start)+edit.text+before.slice(edit.end);
}
function patchLedger(before,updates){const file=ts.parseJsonText('ledger.json',before),edits=[];assert.equal(file.parseDiagnostics.length,0);
 const rows=file.statements[0].expression.properties.find(n=>n.name.text==='entries').initializer;
 for(const node of rows.elements){const next=updates.get(JSON.parse(node.getText(file)).sha);if(!next)continue;const indent=' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);edits.push({start:node.getStart(file),end:node.end,text:JSON.stringify(next,null,2).replaceAll('\n','\n'+indent)});}
 assert.equal(edits.length,20);for(const edit of edits.reverse())before=before.slice(0,edit.start)+edit.text+before.slice(edit.end);return Buffer.from(before);
}
export function inspectHistoricalRosterReconciliation({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 const raw=read(priorPath);assert.equal(hash(raw),pins[line]);const prior=JSON.parse(gunzipSync(raw));assert.equal(prior.line,line);assert.equal(prior.selected.length,20);assert.equal(prior.other1677_entries.length,1677);
 assert.equal(hash(read(prior.producer.path)),prior.producer.sha256);assert.equal(hash(prior.worksheet.text),prior.worksheet.sha256);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 const beforeLedgerBytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',prior.source_parent+':'+ledgerPath],{cwd:root,env,maxBuffer:20*1024*1024});assert.equal(hash(beforeLedgerBytes),prior.ledger_sha256);const beforeLedger=JSON.parse(beforeLedgerBytes);
 const selected=new Set(prior.selected.map(n=>n.sha));assert.equal(selected.size,20);assert.deepEqual(beforeLedger.entries.filter(n=>!selected.has(n.sha)),prior.other1677_entries);
 const previous=new Map(prior.captured_members.map(n=>{assert.equal(hash(n.text),n.sha256);return[n.path,n];}));
 for(const path of [matrixPath,validatorPath])assert.equal(hash(execFileSync('git',['--no-replace-objects','show',prior.source_parent+':'+path],{cwd:root,env,maxBuffer:4*1024*1024})),previous.get(path).sha256);
 assert.equal(read(validatorPath).toString(),expectedExpandedHistoricalValidator(previous.get(validatorPath).text),'unreviewed native validator delta');
 assert.equal(read(matrixPath).toString(),expectedExpandedHistoricalMatrix(previous.get(matrixPath).text,prior.roster.ids),'unreviewed matrix delta');
 assert.deepEqual(historical.historicalRegressionRequirements(),REQUIRED_REGRESSIONS);assert.deepEqual(prior.addedCases.map(row=>Object.fromEntries(Object.keys(REQUIRED_REGRESSIONS[0]).map(key=>[key,row[key]]))),REQUIRED_REGRESSIONS);
 const roster=deriveHistoricalRoster(root);assert.deepEqual({ids:roster.ids,cases:roster.cases,paths:roster.paths,discovery_negative_ids:roster.discovery_negative_ids},prior.roster,'case source identity changed');
 for(const member of prior.added_spec_members)assert.equal(hash(read(member.path)),member.sha256,'regression body source changed');const product=inspectChipEmptyRepair({root,readMember:read});assert.equal(product.product_members,1141);
 const changed=new Set([matrixPath,validatorPath]),refresh=ref=>{const actual=hash(read(ref.path));if(changed.has(ref.path)){assert.equal(ref.sha256,previous.get(ref.path).sha256);return{...ref,sha256:actual};}assert.equal(actual,ref.sha256,'unreviewed source member '+ref.path);return ref;};
 const updates=new Map(),transitions=[];
 for(const registration of prior.selected){const old=registration.entry;assert.deepEqual(old,beforeLedger.entries.find(n=>n.sha===old.sha));const [requirements,validate]=contracts[registration.field];assert.deepEqual(requirements(old.sha,line),registration.definition,'original native definition changed');
  const next=structuredClone(old),scope=next.individual_proof[registration.field];assert.deepEqual(scope.source_members.map(n=>n.path).sort(),registration.definition.members.slice().sort());scope.source_members=scope.source_members.map(refresh);
  const stale=validate({root,entry:old,proof:old.individual_proof,request:null});assert.equal(stale.ok,false);assert.match(stale.detail,/stale/,'old source binding did not reject reviewed delta');
  const after=validate({root,entry:next,proof:next.individual_proof,request:null});assert.deepEqual(after,{ok:false,detail:'missing coordinator run'},'source refresh waived or broke native admission');
  transitions.push({sha:old.sha,field:registration.field,stale,after,original_definition_and_named_cases_unchanged:true});
  next.evidence_report='compatibility/f10/disposition-ledger/evidence/historical-roster-reconciliation-'+old.sha+'.json';updates.set(old.sha,next);
 }
 const proof={schema_version:1,line,prior:{path:priorPath,sha256:pins[line]},source_parent:prior.source_parent,
  before_matrix_sha256:previous.get(matrixPath).sha256,after_matrix_sha256:hash(read(matrixPath)),before_validator_sha256:previous.get(validatorPath).sha256,after_validator_sha256:hash(read(validatorPath)),
  original_component_case_ids_preserved:2220,discovery_negatives_preserved:5,required_full_case_ids:2228,added_required_cases:REQUIRED_REGRESSIONS,all_previous_case_id_order_names_and_bodies_preserved:true,
  native20_original_definitions_preserved:true,native_transitions:transitions,before_and_proposed1697_verdicts_unchanged:true,other1677_proposed_entries_preserved:true,
  all1141_product_members_and2223_case_bodies_preserved:true,actual_native_artifact_or_floor_qualified:false,
  producer:{path:'scripts/historical-roster-reconciliation.mjs',sha256:hash(read('scripts/historical-roster-reconciliation.mjs'))},g11_claim:'not-passed'};
 const writes=new Map([[ROSTER_RECONCILIATION_PROOF,json(proof)]]),proofRef={path:ROSTER_RECONCILIATION_PROOF,sha256:hash(writes.get(ROSTER_RECONCILIATION_PROOF))};
 for(const registration of prior.selected){const old=registration.entry,next=updates.get(old.sha),bytes=read(registration.review.path);assert.equal(hash(bytes),registration.review.sha256);const document=JSON.parse(bytes);assert.deepEqual(document.individual_proof,old.individual_proof);
  next.individual_proof.historical_roster_source_context=proofRef;document.individual_proof=structuredClone(next.individual_proof);
  for(const field of ['reviewed_source_members','independent_source_evidence','independent_evidence'])if(Array.isArray(document[field]))document[field]=document[field].map(refresh);
  document.historical_roster_reconciliation={qualification:proofRef,prior_review:registration.review,prior_entry:{ledger_path:ledgerPath,ledger_commit:prior.source_parent,entry_sha256:hash(json(old))},source_judgment_and_actual_runtime_obligations_preserved:true};writes.set(next.evidence_report,json(document));
 }
 writes.set(ledgerPath,patchLedger(beforeLedgerBytes.toString(),updates));assert.equal(writes.size,22);const proposed=JSON.parse(writes.get(ledgerPath));assert.deepEqual(proposed.entries.filter(n=>!selected.has(n.sha)),prior.other1677_entries);assert.deepEqual(proposed.entries.map(n=>[n.sha,n.final_disposition]),beforeLedger.entries.map(n=>[n.sha,n.final_disposition]));
 const current=JSON.parse(read(ledgerPath));assert.deepEqual(current.entries.map(n=>n.sha),beforeLedger.entries.map(n=>n.sha),'current fixed1697 identity/order changed');assert.equal(current.entries.filter(n=>selected.has(n.sha)).length,20);for(const row of current.entries.filter(n=>selected.has(n.sha))){const old=beforeLedger.entries.find(n=>n.sha===row.sha);assert.ok(JSON.stringify(row)===JSON.stringify(old)||JSON.stringify(row)===JSON.stringify(updates.get(row.sha)),'owned native row changed outside reviewed source refresh');}
 for(const[path,bytes]of writes)if(path!==ledgerPath&&existsSync(resolve(root,path)))assert.ok(read(path).equals(bytes),'conflicting reconciliation output '+path);
 return {line,prior,beforeLedgerBytes,proof,writes,updates,transitions,required_full_case_ids:2228,actual_native_artifact_or_floor_qualified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectHistoricalRosterReconciliation();if(process.argv.includes('--write')){const current=readFileSync(resolve(rootDefault,ledgerPath));assert.ok(current.equals(result.beforeLedgerBytes)||current.equals(result.writes.get(ledgerPath)),'write would replace unrelated subsequent ledger work');for(const[path,bytes]of result.writes)writeFileSync(resolve(rootDefault,path),bytes);}
 console.log(JSON.stringify({line:result.line,required_full_case_ids:2228,native_source_bindings:20,prior_definitions_and_case_requirements_unchanged:true,before_and_proposed1697_verdicts_unchanged:true,applied:process.argv.includes('--write'),actual_native_artifact_or_floor_qualified:false}));
}
