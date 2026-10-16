/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bound the tooling-only Eager repair without changing any source judgment or runtime admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {historicalBehaviorRequirements, validateHistoricalBehavior} from './upstream-historical-behavior-evidence.mjs';
import {report as outputQualification} from '../tests/spec_wide_fixture_adapter_probe.mjs';
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const priorPath = 'compatibility/rc/spec-wide-fixture-source-adapter-prior.json.gz';
const adapterPath = 'testing/legacy-runner/adapt-spec.mjs';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
export const ADAPTER_QUALIFICATION_PATH = 'compatibility/rc/spec-wide-fixture-source-adapter-proof.json';
const pins = {main:'f2089b27c291c6f1f46988f1815b44921ac7b9b77eda71feac7e061756a7ffec',
  '21.x':'cbb0267f6a6935d207c4c23b1af0c3e1c8081b68890a1f44bfce0eddd7e0a8a9'};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const canonical = value => JSON.stringify(value, function(key, item) {
  return item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(k => [k,item[k]])) : item;
}).replace(/[\u007f-\uffff]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4,'0'));
function patchRows(text, updates) {
  const file = ts.parseJsonText('ledger.json', text); assert.equal(file.parseDiagnostics.length, 0);
  const rows = file.statements[0].expression.properties.find(n => n.name.text === 'entries').initializer;
  const edits = [];
  for (const node of rows.elements) {
    const next = updates.get(JSON.parse(node.getText(file)).sha); if (!next) continue;
    const indent = ' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);
    edits.push({start:node.getStart(file),end:node.end,text:JSON.stringify(next,null,2).replaceAll('\n','\n'+indent)});
  }
  assert.equal(edits.length, 13);
  for (const edit of edits.reverse()) text = text.slice(0,edit.start) + edit.text + text.slice(edit.end);
  return Buffer.from(text);
}
function nativeTransition(root, old, next, priorAdapter, read) {
  const definition = historicalBehaviorRequirements(old.sha); assert.ok(definition);
  const temporary = mkdtempSync(join(tmpdir(),'ngx-wide-native-source-'));
  const validate = entry => validateHistoricalBehavior({root:temporary,entry,proof:entry.individual_proof,request:null});
  const write = (path, bytes) => { mkdirSync(dirname(join(temporary,path)),{recursive:true}); writeFileSync(join(temporary,path),bytes); };
  try {
    for (const path of definition.members) write(path, read(path));
    write(adapterPath, priorAdapter);
    const before = validate(old); assert.deepEqual(before,{ok:false,detail:'missing coordinator run'});
    write(adapterPath, read(adapterPath));
    const stale = validate(old); assert.deepEqual(stale,{ok:false,detail:'stale historical source member'});
    const after = validate(next); assert.deepEqual(after,{ok:false,detail:'missing coordinator run'});
    const controls = [];
    for (const kind of ['missing-member','duplicate-member','wrong-case','wrong-patch','wrong-kind']) {
      const entry = structuredClone(next), scope = entry.individual_proof.historical_behavior;
      if (kind === 'missing-member') scope.source_members.pop();
      if (kind === 'duplicate-member') scope.source_members[1] = scope.source_members[0];
      if (kind === 'wrong-case') scope.case_ids[0] += '-unreviewed';
      if (kind === 'wrong-patch') entry.individual_proof.diff_sha256 = '0'.repeat(64);
      if (kind === 'wrong-kind') scope.kind += '-unreviewed';
      const rejected = validate(entry); assert.equal(rejected.ok,false); assert.notEqual(rejected.detail,'missing coordinator run');
      controls.push({id:kind,detail:rejected.detail});
    }
    return {sha:old.sha,before,stale,after,controls,definition_and_all_required_case_identities_unchanged:true};
  } finally { rmSync(temporary,{recursive:true,force:true}); }
}
export function inspectWideAdapterRequalification({root=defaultRoot,readMember}={}) {
  const read = readMember || (path => readFileSync(resolve(root,path)));
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x':'main';
  assert.equal(hash(read(priorPath)),pins[line]); const prior = JSON.parse(gunzipSync(read(priorPath)));
  assert.equal(prior.line,line); assert.match(prior.source_parent,/^[a-f0-9]{40}$/);
  const env = {...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for (const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  const beforeBytes = execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',prior.source_parent+':'+ledgerPath],{cwd:root,env,maxBuffer:20*1024*1024});
  assert.equal(hash(beforeBytes),prior.ledger_sha256); const before = JSON.parse(beforeBytes);
  assert.equal(before.entries.length,1697); assert.equal(prior.selected_entries.length,13);
  const selected = new Set(prior.selected_entries.map(n=>n.sha)); assert.equal(selected.size,13);
  assert.deepEqual(before.entries.filter(n=>selected.has(n.sha)),prior.selected_entries);
  assert.equal(hash(canonical(before.entries.filter(n=>!selected.has(n.sha)))),prior.remaining_entries_sha256);
  assert.equal(hash(prior.adapter.text),prior.adapter.sha256);
  assert.equal(prior.adapter.sha256,'5eae6132be50c169c2a010ffd63bf04b86b1c2599792b2ae72037edb7595c960');
  assert.equal(hash(read(adapterPath)),'668f2a08a004a9ba0b97a1738df051dcb9f81eb50a98672155c83c842b0cc6b3');
  assert.equal(outputQualification.line,line); assert.equal(outputQualification.after_adapter_sha256,hash(read(adapterPath)));
  assert.equal(outputQualification.actual_adapter_output_witnesses,line==='main'?12:11); assert.equal(outputQualification.rejection_controls,7);
  const native = [], updates = new Map(), writes = new Map();
  const refresh = ref => {
    assert.equal(hash(read(ref.path)),ref.path===adapterPath ? outputQualification.after_adapter_sha256 : ref.sha256,'unreviewed source delta '+ref.path);
    if (ref.path===adapterPath) { assert.equal(ref.sha256,prior.adapter.sha256); return {...ref,sha256:hash(read(adapterPath))}; }
    return ref;
  };
  // First build the exact entries. The proof does not contain evidence-report hashes, avoiding cycles.
  for (const old of prior.selected_entries) {
    const next = structuredClone(old), scope = next.individual_proof.historical_behavior;
    if (scope) {
      assert.equal(scope.source_members.filter(n=>n.path===adapterPath).length,1);
      scope.source_members = scope.source_members.map(refresh);
      native.push(nativeTransition(root,old,next,prior.adapter.text,read));
    } else {
      assert.equal(next.individual_proof.source_evidence.filter(n=>n.path===adapterPath).length,1);
      next.individual_proof.source_evidence = next.individual_proof.source_evidence.map(refresh);
    }
    next.evidence_report = 'compatibility/f10/disposition-ledger/evidence/spec-wide-fixture-adapter-'+old.sha+'.json';
    updates.set(old.sha,next);
  }
  assert.equal(native.length,3);
  const proof = {schema_version:1,line,prior:{path:priorPath,sha256:pins[line]},source_parent:prior.source_parent,
    before_adapter_sha256:prior.adapter.sha256,after_adapter_sha256:hash(read(adapterPath)),
    output_qualification:outputQualification,native_validator_transitions:native,
    generic_source_bindings_requalified:10,native_source_bindings_requalified:3,unrelated_ledger_rows_preserved:1684,
    all1697_verdicts_unchanged:true,all_prior_evidence_documents_preserved:true,
    source_binding_qualification_complete:true,actual_Angular_native_artifact_or_floor_qualified:false,
    producer:{path:'scripts/spec-wide-fixture-adapter-requalification.mjs',sha256:hash(read('scripts/spec-wide-fixture-adapter-requalification.mjs'))},g11_claim:'not-passed'};
  writes.set(ADAPTER_QUALIFICATION_PATH,json(proof));
  const proofRef = {path:ADAPTER_QUALIFICATION_PATH,sha256:hash(writes.get(ADAPTER_QUALIFICATION_PATH))};
  for (const old of prior.selected_entries) {
    const next = updates.get(old.sha), ref = prior.source_references.find(n=>n.path===old.evidence_report); assert.ok(ref);
    const bytes = read(ref.path); assert.equal(hash(bytes),ref.sha256); const document = JSON.parse(bytes);
    assert.deepEqual(document.individual_proof,old.individual_proof);
    next.individual_proof.adapter_source_context = proofRef;
    document.individual_proof = structuredClone(next.individual_proof);
    for (const field of ['reviewed_source_members','independent_source_evidence','independent_evidence']) {
      if (Array.isArray(document[field])) document[field] = document[field].map(refresh);
    }
    document.adapter_eager_source_requalification = {qualification_proof:proofRef,
      prior_review:ref,prior_entry:{ledger_path:ledgerPath,ledger_commit:prior.source_parent,entry_sha256:hash(json(old))},
      source_judgment_and_runtime_requirements_preserved:true};
    writes.set(next.evidence_report,json(document));
  }
  writes.set(ledgerPath,patchRows(beforeBytes.toString(),updates)); assert.equal(writes.size,15);
  const current = read(ledgerPath); assert.ok(current.equals(beforeBytes)||current.equals(writes.get(ledgerPath)),'ledger changed outside bounded adapter qualification');
  const after = JSON.parse(writes.get(ledgerPath));
  assert.deepEqual(after.entries.map(n=>[n.sha,n.final_disposition]),before.entries.map(n=>[n.sha,n.final_disposition]));
  assert.deepEqual(after.entries.filter(n=>!selected.has(n.sha)),before.entries.filter(n=>!selected.has(n.sha)));
  for (const [path,bytes] of writes) if (path!==ledgerPath&&existsSync(resolve(root,path))) assert.ok(read(path).equals(bytes),'conflicting qualification output '+path);
  return {line,proof,writes,updates,native,all1697_verdicts_unchanged:true,actual_Angular_native_artifact_or_floor_qualified:false};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectWideAdapterRequalification();
  if (process.argv.includes('--write')) for (const [path,bytes] of result.writes) writeFileSync(resolve(defaultRoot,path),bytes);
  console.log(JSON.stringify({line:result.line,qualified_entries:13,unrelated_rows_preserved:1684,
    native_rejection_controls:result.native.reduce((sum,n)=>sum+n.controls.length,0),
    all1697_verdicts_unchanged:true,applied:process.argv.includes('--write'),actual_Angular_native_artifact_or_floor_qualified:false}));
}
