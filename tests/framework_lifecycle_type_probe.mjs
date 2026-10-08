/** Public type/default and erasure proof; no hook execution qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewFrameworkLifecycleTypes} from '../scripts/framework-lifecycle-type-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');
const subjects = JSON.parse(read('compatibility/rc/framework-lifecycle-declaration-subjects.json'));
const report = reviewFrameworkLifecycleTypes({root});
assert.equal(report.cases.length, 96);
assert.equal(report.sources.length, 38);
assert.equal(report.strict_default_assignments, 40);
assert.equal(report.strict_default_equalities, 20);
assert.equal(report.strict_dynamic_dictionary_lookups, 3);
report.mutations = [];
function reject(id, expected, overrides = {}, subjectData = subjects) {
  assert.throws(() => reviewFrameworkLifecycleTypes({root, subjectData,
    readSource: path => overrides[path] ?? read(path)}), expected, id);
  report.mutations.push({id, rejected: true});
}
const destroy = report.cases.find(c => c.symbol === 'OnDestroy');
const destroyPath = 'projects/ngx-material-legacy/' + destroy.file;
reject('runtime-type-reference', /executable emit|runtime\/unsupported/, {
  [destroyPath]: read(destroyPath) + '\nconsole.log(OnDestroy);\n',
});
const changes = report.cases.find(c => c.symbol === 'SimpleChanges');
const changesPath = 'projects/ngx-material-legacy/' + changes.file;
reject('modern-generic-usage', /modern generic type usage/, {
  [changesPath]: read(changesPath) + '\ntype ModernChanges = SimpleChanges<{value: string}>;\n',
});
const missing = read(destroyPath).replace(/\bOnDestroy\s*,/, '');
assert.notEqual(missing, read(destroyPath));
reject('missing-import', /missing\/ambiguous/, {[destroyPath]: missing});
reject('duplicate-import', /missing\/ambiguous/, {
  [destroyPath]: read(destroyPath) + "\nimport type {OnDestroy as DuplicateDestroy} from '@angular/core';\n",
});
for (const line of ['main', '21.x']) {
  const subject = subjects.subjects.find(s => s.line === line);
  const raw = read(subject.path);
  function semantic(id, replacement, expected) {
    assert.notEqual(replacement, raw, id);
    const modified = structuredClone(subjects);
    const cap = modified.subjects.find(s => s.line === line);
    cap.sha256 = sha(replacement); cap.bytes = Buffer.byteLength(replacement);
    reject(line + ':' + id, expected, {[subject.path]: replacement}, modified);
  }
  semantic('hook-shape', raw.replace('ngOnDestroy(): void;', 'ngOnDestroy(required: string): void;'),
    /historical hook shape changed/);
  semantic('object-default', raw.replace('SimpleChanges<T = unknown>', 'SimpleChanges<T = object>'),
    /unparameterized public type equivalence failed/);
  semantic('any-default', raw.replace('SimpleChanges<T = unknown>', 'SimpleChanges<T = any>'),
    /unparameterized public type equivalence failed/);
  semantic('unknown-change-default', raw.replace('SimpleChange<T = any>', 'SimpleChange<T = unknown>'),
    /unparameterized public type equivalence failed/);
  reject(line + ':stale-declaration-bytes', /peer declaration subject changed/,
    {[subject.path]: raw + '\n// changed declaration subject\n'});
  const privateMarker = structuredClone(subjects);
  privateMarker.subjects.find(s => s.line === line).symbols.OnDestroy.markers = ['docs-private'];
  reject(line + ':private-public-type', /private\/deprecated public type/, {}, privateMarker);
  const deprecated = structuredClone(subjects);
  deprecated.subjects.find(s => s.line === line).symbols.OnChanges.markers = ['deprecated'];
  reject(line + ':deprecated-public-type', /private\/deprecated public type/, {}, deprecated);
}
const args = process.argv.slice(2);
if (args.length) {
  assert.equal(args.length, 2); assert.equal(args[0], '--report');
  assert.equal(existsSync(args[1]), false, 'diagnostic report must be new');
  writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({uses: report.cases.length, files: report.sources.length,
  assignments: report.strict_default_assignments, equalities: report.strict_default_equalities,
  dictionary_lookups: report.strict_dynamic_dictionary_lookups, mutants_rejected: report.mutations.length,
  node: report.node, compiler: report.compiler}));
