/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual historical menu/checker integration at both authenticated minimum peer namespaces. */
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {prepareMenuItemPublicSubjects} from '../scripts/menu-item-public-subjects.mjs';
import {prepareOwnedMenuItemTypeSubjects} from './owned_menu_item_type_subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const capsulePath = 'compatibility/rc/menu-item-public-subjects.json';
const capsule = JSON.parse(readFileSync(join(root, capsulePath))), namespaceControls = [];
for (const [id, mutate] of [
  ['wrong-framework-base-capsule', c => c.base_capsule.sha256 = '0'.repeat(64)],
  ['wrong-line', c => c.subjects[1].line = 'main'],
  ['borrowed-main-closure', c => c.subjects[1].closures = c.subjects[0].closures],
  ['missing-runtime-edge', c => c.subjects[0].closures.runtime.edges.pop()],
  ['missing-type-member', c => c.subjects[0].closures.types.members.pop()],
  ['missing-peer-source', c => c.subjects[0].additions.pop()],
]) {
  const changed = structuredClone(capsule); mutate(changed);
  assert.throws(() => prepareMenuItemPublicSubjects(root, {readMember: p => p === capsulePath
    ? Buffer.from(JSON.stringify(changed)) : readFileSync(join(root, p))}), /capsule changed/);
  namespaceControls.push({id, rejected: true});
}
const memberPath = capsule.subjects[0].additions[0].path;
for (const id of ['changed-compressed-peer-member', 'missing-compressed-peer-member']) {
  assert.throws(() => prepareMenuItemPublicSubjects(root, {readMember: p => {
    const bytes = readFileSync(join(root, p));
    return p !== memberPath ? bytes : id.startsWith('missing') ? Buffer.alloc(0) : Buffer.concat([bytes, Buffer.from('tamper')]);
  }})); namespaceControls.push({id, rejected: true});
}
const loaded = prepareOwnedMenuItemTypeSubjects(root), temp = mkdtempSync(join(tmpdir(), 'historical-menu-minimum-')), subjects = [];
try {
  for (const model of loaded.models) for (const production of [false, true]) {
    const reportPath = join(temp, model.line + '-' + production + '.json');
    const args = [join(root, 'tests/menu_item_api_contract_probe.mjs'), '--subject-root', model.root, '--report', reportPath];
    if (production) args.push('--production');
    execFileSync(process.execPath, args, {cwd: root, timeout: 45000, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024});
    const report = JSON.parse(readFileSync(reportPath));
    assert.equal(report.runtime_peer, model.packages.get('@angular/core').version);
    subjects.push({line: model.line, production, public_peer: report.runtime_peer,
      original: report.original, signature_mutants: report.signature_mutants.length,
      runtime_mutants: report.runtime.length - 1, settlement_mutants: report.settlement_mutants.length,
      observed: report.runtime[0].observed, declaration_sha256: report.emitted_declaration_sha256,
      borrowed: model.borrowed});
  }
} finally {loaded.dispose(); rmSync(temp, {recursive: true, force: true});}
const report = {schema_version: 2, minimum_namespaces: 2, development_production_contexts: subjects.length,
  signature_mutations_rejected: subjects.reduce((n, r) => n + r.signature_mutants, 0),
  runtime_mutations_rejected: subjects.reduce((n, r) => n + r.runtime_mutants, 0),
  settlement_mutations_rejected: subjects.reduce((n, r) => n + r.settlement_mutants, 0),
  namespace_controls: namespaceControls.length, subjects, actual_JIT_factory_subjects: subjects.length,
  packed_or_native_qualified: false, limits: 'Actual source declarations and inherited factories use both authenticated advertised minimum frameworks. DOM/focus/parent/detector protocols and host TypeScript/RxJS borrowed; no native/AOT/packed/canonical/full compiler floors claim.'};
const at = process.argv.indexOf('--report');
if (at >= 0) {const {writeFileSync} = await import('node:fs'); writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});}
const {subjects: details, limits, ...summary} = report;
console.log(JSON.stringify(summary));
