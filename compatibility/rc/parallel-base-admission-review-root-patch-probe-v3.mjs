/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Execute the actual bounded root predicate; never execute the root CLI. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import admission from '../../scripts/upstream-base-class-removal-admission.cjs';
import {applyBaseClassRemovalCanonicalStage, baseClassRemovalRegistrySuccessor} from '../../scripts/base-class-removal-canonical-stage.mjs';

const root = resolve(process.cwd()), read = path => fs.readFileSync(join(root, path));
const hash = raw => createHash('sha256').update(raw).digest('hex');
assert.equal(process.versions.node, '24.21.0');
const checkerPath = 'scripts/check-upstream-audit-disposition.mjs', checker = read(checkerPath).toString();
assert.equal(hash(checker), '4a6002153caabe102887bcd8847128818c2f7025a3d1257d97cd446f34fbf106');
const names = ['sensitiveClass', 'evidenceJson', 'evidenceClass', 'regularRepoMember', 'readRegularRepoBytes', 'individualPatchBound'];
const functions = names.map(name => {
  const start = checker.indexOf('function ' + name + '(');
  assert.ok(start >= 0);
  const end = checker.indexOf('\n}\n', start);
  assert.ok(end > start);
  return checker.slice(start, end + 3);
});
const absoluteImports = source => source.replace(/from '(\.\/[^']+)'/g,
  (_match, path) => 'from ' + JSON.stringify(pathToFileURL(join(root, 'scripts', path)).href));
const dataUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const imports = [...checker.matchAll(/^import[\s\S]*?;\n/gm)].map(match => match[0]).join('');
const globals = `const root=${JSON.stringify(root)},line='21.x';
const ALLOWED_FINAL=new Set(['irrelevant','not-applicable','inherited','already-adapted','do-not-adopt','adapt','already-present']);
const INHERITED=new Set(['inherited']),BEHAVIOR=new Set(['adapt','already-adapted','already-present']);
const evidenceCache=new Map(),testConsolidationCache=new Map(),testImportCache=new Map();
`;
const body = JSON.parse(read(admission.BASE_CLASS_REMOVAL_REVIEW));
const before = read('compatibility/f10/disposition-ledger/ledger.json');
const registryBefore = read('scripts/upstream-source-contract-registry.mjs');
const stage = applyBaseClassRemovalCanonicalStage({before, body});
const entry = stage.entries[0], proof = entry.individual_proof;
const registryAfter = baseClassRemovalRegistrySuccessor(registryBefore);
const original = JSON.parse(gunzipSync(read('compatibility/rc/21x-base-class-removal-source-originals.json.gz')));
const patch = read(body.patch_file);
assert.equal(patch.toString(), original.diff);
assert.equal(hash(patch), proof.diff_sha256);

const outcomes = [];
for (const proposedRegistry of [false, true]) {
  let selectedImports = absoluteImports(imports);
  if (proposedRegistry) {
    const scopePath = 'scripts/upstream-individual-evidence-scope.mjs';
    const originalScope = read(scopePath).toString();
    const scope = originalScope
      .replace("from './upstream-source-contract-registry.mjs'", 'from ' + JSON.stringify(dataUrl(registryAfter.toString())))
      .replace('createRequire(import.meta.url)', 'createRequire(' + JSON.stringify(pathToFileURL(join(root, scopePath)).href) + ')');
    assert.notEqual(scope, originalScope);
    const old = JSON.stringify(pathToFileURL(join(root, scopePath)).href);
    assert.equal(selectedImports.split(old).length, 2);
    selectedImports = selectedImports.replace(old, JSON.stringify(dataUrl(scope)));
  }
  const module = await import(dataUrl(selectedImports + '\n' + globals + functions.join('\n') +
    '\nexport {individualPatchBound,evidenceClass}; export const resetEvidence=()=>evidenceCache.clear();'));
  assert.equal(module.evidenceClass(entry), 'file');
  assert.equal(module.individualPatchBound(entry, proof), true);
  const cases = [{id: 'authentic-v6-complete-patch', accepted: true}];
  for (const [id, mutate] of [
    ['wrong-proof-diff', value => value.individual_proof.diff_sha256 = '0'.repeat(64)],
    ['foreign-entry-sha', value => value.sha = '0'.repeat(40)],
    ['missing-evidence-path', value => value.evidence_report = 'compatibility/rc/parallel-base-admission-review-missing-v3.json'],
    ['old-review-without-patch-pointer', value => value.evidence_report = 'compatibility/rc/21x-base-class-removal-admission-individual-review.json'],
  ]) {
    const changed = structuredClone(entry); mutate(changed);
    assert.equal(module.individualPatchBound(changed, changed.individual_proof), false, id);
    cases.push({id, accepted: false});
  }
  const physicalRead = fs.readFileSync, target = join(root, body.patch_file);
  fs.readFileSync = function(file, ...args) {
    const raw = physicalRead.call(this, file, ...args);
    return typeof file === 'string' && resolve(file) === target
      ? (typeof raw === 'string' ? raw + '\n' : Buffer.concat([raw, Buffer.from('\n')])) : raw;
  };
  syncBuiltinESMExports();
  try { assert.equal(module.individualPatchBound(entry, proof), false); }
  finally { fs.readFileSync = physicalRead; syncBuiltinESMExports(); }
  assert.equal(module.individualPatchBound(entry, proof), true);
  cases.push({id: 'changed-physical-patch', accepted: false}, {id: 'authentic-patch-restored', accepted: true});
  outcomes.push({registry: proposedRegistry ? 'pure-proposed-70-record-registry-in-memory' : 'actual-current-69-record-registry', cases});
}
const ref = path => {const raw=read(path);return {path,sha256:hash(raw),bytes:raw.length};};
const report = {schema_version:1,status:'actual-bounded-root-patch-predicate-accepted-v6',node:process.versions.node,
  checker:ref(checkerPath),handler:ref('scripts/upstream-base-class-removal-admission.cjs'),
  scope:ref('scripts/upstream-individual-evidence-scope.mjs'),review:ref(admission.BASE_CLASS_REMOVAL_REVIEW),patch:ref(body.patch_file),
  exact_original_diff_identity:true,original_files:original.sections.length,original_hunks:original.sections.reduce((n,s)=>n+s.hunks.length,0),
  extracted_functions:names,extracted_functions_unchanged:true,outcomes,
  proposed_registry_is_memory_only:true,current_registry_unchanged:read('scripts/upstream-source-contract-registry.mjs').equals(registryBefore),
  current_ledger_unchanged:read('compatibility/f10/disposition-ledger/ledger.json').equals(before),
  actual_full_root_checker_executed:false,full_owner_executed:false,canonical_admission_granted:false,
  actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const output='compatibility/rc/parallel-base-admission-review-root-patch-result-v3.json';
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,modes:outcomes.length,positive_cases:4,rejected_cases:10,
  full_root_checker_executed:false,full_owner_executed:false}));
