/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {bootstrapBefore, BOOTSTRAP_PATH} from '../scripts/bootstrap-stability-contract.mjs';
import {inspectBootstrapPreparation, bootstrapPreparationEntryOk, requiresBootstrapPreparation,
  BOOTSTRAP_QUALIFICATION_REPORT} from '../scripts/bootstrap-stability-evidence.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), read = p => readFileSync(resolve(root, p));
const hash = x => createHash('sha256').update(x).digest('hex'), ts = createRequire(import.meta.url)('typescript');
const before = bootstrapBefore({root}), report = inspectBootstrapPreparation(read), ledger = JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const selected = before.affected_source_receipts.map(n => ledger.entries.find(e => e.sha === n.sha));
for (const entry of selected) {assert.ok(requiresBootstrapPreparation(entry)); assert.ok(bootstrapPreparationEntryOk(entry, entry.individual_proof, read));}
const cases = [];
function reject(id, entry, proof, reader = read) {assert.equal(bootstrapPreparationEntryOk(entry, proof, reader), false, id); cases.push({id, result: 'rejected'});}
for (const entry of selected) {
  const absent = structuredClone(entry.individual_proof); delete absent.current_bootstrap_preparation;
  reject(entry.sha + ':missing-required-preparation', entry, absent);
  const stale = structuredClone(entry.individual_proof);
  stale.source_evidence.find(n => n.path === BOOTSTRAP_PATH).sha256 = before.bootstrap.sha256;
  reject(entry.sha + ':stale-bootstrap-source-hash', entry, stale);
  reject(entry.sha + ':changed-source-conclusion', {...entry, final_disposition: 'adapt'}, entry.individual_proof);
}
const entry = selected[0], proof = entry.individual_proof;
const changed = (path, bytes) => p => p === path ? Buffer.from(bytes) : read(p);
reject('restored-false-stability-shortcut', entry, proof, changed(BOOTSTRAP_PATH, before.bootstrap.text));
const inputPath = 'compatibility/rc/bootstrap-stability-qualification-inputs.json';
reject('preparation-membership-input-drift', entry, proof, changed(inputPath, read(inputPath).toString() + '\n'));
const referencePath = 'compatibility/rc/mixed-peer-async-source-fixture-stability-reference-intake.json.gz';
reject('framework-reference-drift', entry, proof, changed(referencePath, Buffer.concat([read(referencePath), Buffer.from('x')])));
for (const path of ['scripts/bootstrap-stability-contract.mjs', 'tests/bootstrap_stability_probe.mjs'])
  reject('changed-contract-program:'+path, entry, proof, changed(path, read(path).toString()+'\n// unreviewed contract program\n'));
const fabricated = {...JSON.parse(read(BOOTSTRAP_QUALIFICATION_REPORT)), actual_Angular_fixture_fakeAsync_native_browser_SSR_or_floor_qualified: true};
const fabricatedBytes = Buffer.from(JSON.stringify(fabricated,null,2)+'\n'), forgedProof = structuredClone(proof);
forgedProof.current_bootstrap_preparation.sha256 = hash(fabricatedBytes);
reject('source-model-is-not-native-admission', entry, forgedProof, changed(BOOTSTRAP_QUALIFICATION_REPORT, fabricatedBytes));
const original = before.affected_source_receipts[0];
reject('changed-original-source-receipt', entry, proof, changed(original.evidence_report, read(original.evidence_report).toString()+'\n'));
const activeBody = JSON.parse(read(entry.evidence_report)); activeBody.historical_source_review.decision = 'unreviewed historical conclusion';
const activeBytes = Buffer.from(JSON.stringify(activeBody,null,2)+'\n');
reject('forged-historical-source-facts', {...entry, source_check: {...entry.source_check, evidence_report_sha256: hash(activeBytes)}}, proof,
  changed(entry.evidence_report, activeBytes));
const foreign = ledger.entries.find(n => !selected.some(e => e.sha === n.sha)); assert.ok(!requiresBootstrapPreparation(foreign));
reject('foreign-source-claim-cannot-join-nine', foreign, proof);
assert.equal(cases.length, 36);
const checkerPath = 'scripts/check-upstream-audit-disposition.mjs';
const historical = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', before.source_parent+':'+checkerPath], {cwd:root}).toString();
const parse = text => ts.createSourceFile('checker.mjs',text,ts.ScriptTarget.Latest,true), source = parse(read(checkerPath).toString()), removed = [];
function semantic(node) {const children=[];ts.forEachChild(node,n=>{children.push(semantic(n));});return[node.kind,ts.isIdentifier(node)?node.text:ts.isLiteralExpression(node)?node.text:null,children];}
const transformed = ts.transform(source,[context=>{
  const visit=node=>{
    if(ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./bootstrap-stability-evidence.mjs'){
      assert.deepEqual(node.importClause.namedBindings.elements.map(n=>n.name.text),['requiresBootstrapPreparation','bootstrapPreparationEntryOk']);
      removed.push({kind:'finite-preparation-validator-import',sha256:hash(node.getText(source))});return undefined;
    }
    if(ts.isIfStatement(node)&&node.expression.getText(source).includes('requiresBootstrapPreparation(entry)')){
      assert.ok(node.expression.getText(source).includes('bootstrapPreparationEntryOk(entry, proof,'));
      assert.ok(ts.isReturnStatement(node.thenStatement)&&node.thenStatement.expression.kind===ts.SyntaxKind.FalseKeyword);
      removed.push({kind:'mandatory-finite-preparation-failure-guard',sha256:hash(node.getText(source))});return undefined;
    }
    return ts.visitEachChild(node,visit,context);
  };return node=>ts.visitNode(node,visit);
}]);
assert.deepEqual(removed.map(n=>n.kind),['finite-preparation-validator-import','mandatory-finite-preparation-failure-guard']);
assert.equal(hash(JSON.stringify(semantic(transformed.transformed[0]))),hash(JSON.stringify(semantic(parse(historical)))));
transformed.dispose();
const output={schema_version:1,line:before.line,current_source_receipts_qualified:9,negative_controls:cases.length,cases,
  current_bootstrap_sha256:report.current_bootstrap.sha256,original_source_programs_inputs_assertions_unchanged:true,
  checker_delta:{path:checkerPath,before_sha256:hash(historical),current_sha256:hash(read(checkerPath)),removed_to_compare:removed,all_preexisting_admission_operations_preserved:true},
  actual_Angular_fixture_native_browser_SSR_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...output,cases:undefined}));
