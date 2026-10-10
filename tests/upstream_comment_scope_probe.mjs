/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {COMMENT_SUBJECTS, COMMENT_CONTEXT_PATHS, COMMENT_SHAS, analyzeCommentSubjects,
  commentProgramIdentity, commentScopeEvidenceOk} from '../scripts/upstream-comment-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path)), hash = data => createHash('sha256').update(data).digest('hex');
const facts = analyzeCommentSubjects(read);
const before = '/** Before prose. */\nexport class Config { maxWidth?: number | string; enabled: boolean = true; }\n';
const after = before.replace('Before prose.', 'After prose.');
assert.ok(commentProgramIdentity('config.ts', before, after));
const sourceMutants = [
  after.replace('true', 'false'),
  after.replace('number | string', 'boolean'),
  after.replace('Config', 'Renamed'),
  after.replace('enabled:', 'private enabled:'),
  after.replace('maxWidth?', 'maxWidth'),
  after.replace('enabled: boolean', 'enabled: any'),
  after + 'export const extra = 1;\n',
  after.replace('After prose.', '@deprecated After prose.'),
  after.replace('After prose.', '@docs-private After prose.'),
  after + '// @ts-ignore\n',
  after.replace('export class', '/* @__PURE__ */ export class'),
  after + '// sourceMappingURL=other.map\n',
];
for (const mutant of sourceMutants) assert.throws(() => commentProgramIdentity('config.ts', before, mutant));
const reportPath = 'compatibility/f10/disposition-ledger/evidence/closeout-ten-comment-source-review.json';
const body = JSON.parse(read(reportPath)), ledger = JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const rows = ledger.entries.filter(e => COMMENT_SHAS.includes(e.sha)); assert.equal(rows.length, 10);
for (const row of rows) assert.equal(commentScopeEvidenceOk(body, row, read, body.line), true, row.sha);
let scopeControls = 0;
const reject = mutate => {
  const changed = structuredClone(body); mutate(changed);
  assert.equal(commentScopeEvidenceOk(changed, rows[0], read, body.line), false); scopeControls++;
};
reject(b => {b.line = body.line === 'main' ? '21.x' : 'main';});
reject(b => {b.scope_sha_ids.pop();});
reject(b => {b.reviews.pop();});
reject(b => {b.reviews[1] = b.reviews[0];});
reject(b => {b.reviews[0].diff += '\n';});
reject(b => {b.reviews.find(r => r.sha.startsWith('ede633')).members.pop();});
reject(b => {b.reviews[0].members[0].program_tokens_sha256 = '0'.repeat(64);});
reject(b => {b.reviews[0].final_disposition = 'inherited';});
reject(b => {b.context_members = [];});
for (const path of [COMMENT_SUBJECTS, ...COMMENT_CONTEXT_PATHS]) {
  assert.equal(commentScopeEvidenceOk(body, rows[0], p => p === path ? Buffer.from('changed input') : read(p), body.line), false);
  scopeControls++;
}
const sameObject = structuredClone(body);
assert.equal(commentScopeEvidenceOk(sameObject, rows[0], read, body.line), true);
sameObject.reviews[0].members[0].tokens++;
assert.equal(commentScopeEvidenceOk(sameObject, rows[0], read, body.line), false); scopeControls++;
const wrongEntry = structuredClone(rows[0]); wrongEntry.individual_proof.proof_kind = 'batch';
assert.equal(commentScopeEvidenceOk(body, wrongEntry, read, body.line), false); scopeControls++;
const result = {schema_version: 1, role: 'Finite complete upstream TypeScript documentation source proof', line: body.line,
  node: process.version, compiler: facts.compiler, subjects: facts.reviews.length,
  complete_changed_files: facts.reviews.reduce((n, r) => n + r.members.length, 0),
  unchanged_noncomment_tokens: facts.reviews.reduce((n, r) => n + r.members.reduce((m, f) => m + f.tokens, 0), 0),
  source_negative_controls: sourceMutants.length, scope_negative_controls: scopeControls,
  inputs: [COMMENT_SUBJECTS, reportPath, 'scripts/upstream-comment-review.mjs', 'tests/upstream_comment_scope_probe.mjs']
    .map(path => ({path, sha256: hash(read(path))})),
  actual_upstream_or_product_runtime_executed: false, native_or_packed_qualified: false,
  scope: 'Ten complete original patches, raw commit identities and32 complete original before/after Git blobs; unchanged syntax/type tokens, JSDoc tags and compiler/bundler/test annotations. Branch package identity and the owned80vw dialog default are source-bound. No installed-floor, constructor/component/browser/Sass/runtime or G11 qualification.', g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(result));
