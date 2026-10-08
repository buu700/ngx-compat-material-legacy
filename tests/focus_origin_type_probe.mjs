/** Exact original/minimum type domain and authored erasure; no focus behavior qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewFocusOriginTypes} from '../scripts/focus-origin-type-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');
const subjects = JSON.parse(read('compatibility/rc/focus-origin-declaration-subjects.json'));
const report = reviewFocusOriginTypes({root});
assert.equal(report.cases.length, 12); assert.equal(report.sources.length, 12);
report.mutations = [];
function reject(id, pattern, overrides = {}, subjectData = subjects) {
  assert.throws(() => reviewFocusOriginTypes({root, subjectData, readSource: p => overrides[p] ?? read(p)}), pattern, id);
  report.mutations.push({id, rejected: true});
}
const usePath = report.sources[0].path;
reject('runtime-type-reference', /runtime\/unsupported/, {[usePath]: read(usePath) + '\nconsole.log(FocusOrigin);\n'});
reject('missing-import', /missing\/ambiguous/, {[usePath]: read(usePath).replace("import {FocusOrigin} from '@angular/cdk/a11y';", '')});
reject('duplicate-import', /missing\/ambiguous/, {[usePath]: read(usePath) + "\nimport type {FocusOrigin as Duplicate} from '@angular/cdk/a11y';\n"});
for (const line of ['main', '21.x']) {
  const subject = subjects.subjects.find(s => s.line === line), raw = read(subject.path);
  for (const [id, replacement, pattern] of [
    ['widened-domain', raw.replace("'program' | null", "'program' | null | 'unknown'"), /domain\/equality/],
    ['missing-null', raw.replace("'program' | null", "'program'"), /domain\/equality/],
    ['private-alias', raw.replace('type FocusOrigin =', '/** @docs-private */\ntype FocusOrigin ='), /private\/deprecated/],
  ]) {
    assert.notEqual(replacement, raw);
    const model = structuredClone(subjects), cap = model.subjects.find(s => s.line === line);
    cap.sha256 = sha(replacement);
    reject(line + ':' + id, pattern, {[subject.path]: replacement}, model);
  }
  reject(line + ':stale-declaration', /declaration subject changed/, {[subject.path]: raw + '\n'});
  const entry = read(subject.entry_path).replace(', FocusOrigin }', ' }');
  assert.notEqual(entry, read(subject.entry_path));
  const model = structuredClone(subjects); model.subjects.find(s => s.line === line).entry_sha256 = sha(entry);
  reject(line + ':missing-public-export', /missing public/, {[subject.entry_path]: entry}, model);
}
const args = process.argv.slice(2);
if (args.length) {
  assert.equal(args.length, 2); assert.equal(args[0], '--report'); assert.equal(existsSync(args[1]), false);
  writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({uses: report.cases.length, files: report.sources.length,
  assignments: report.strict_assignments, equalities: report.strict_equalities,
  accepted_literals: report.accepted_literals, rejected_literals: report.rejected_literals,
  mutants_rejected: report.mutations.length, node: report.node, compiler: report.compiler}));
