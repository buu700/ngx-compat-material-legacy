/** Real primitive contract plus mutants; no Angular/packed/floor qualification. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewOwnedCoercionInputTypes} from '../scripts/coercion-input-type-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const report = reviewOwnedCoercionInputTypes({root});
const file = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts';
const source = readFileSync(resolve(root, file), 'utf8');
const declaration = 'type BooleanInput = string | boolean | null | undefined;';
assert.equal(source.split(declaration).length, 2);
const mutants = [
  ['any-widening', 'type BooleanInput = any;', /primitive union/],
  ['null-narrowing', 'type BooleanInput = string | boolean | undefined;', /original union changed/],
  ['numeric-widening', 'type BooleanInput = string | boolean | number | null | undefined;', /original union changed/],
  ['duplicate-member', 'type BooleanInput = string | boolean | boolean | null | undefined;', /original union changed/],
  ['renamed-binding', 'type RenamedInput = string | boolean | null | undefined;', /missing or duplicate owned alias/],
  ['current-private-alias', "import type {BooleanInput as CurrentPrivateInput} from '@angular/cdk/coercion';\n" + declaration, /compatibility alias imported/],
  ['unplanned-export', 'export ' + declaration, /must stay unexported/],
];
report.mutations = [];
for (const [id, replacement, expected] of mutants) {
  const modified = source.replace(declaration, replacement);
  assert.throws(() => reviewOwnedCoercionInputTypes({root,
    readSource: path => path === file ? modified : readFileSync(resolve(root, path), 'utf8')}), expected, id);
  report.mutations.push({id, rejected: true});
}
const args = process.argv.slice(2);
if (args.length) {
  assert.equal(args.length, 2); assert.equal(args[0], '--report');
  assert.equal(existsSync(args[1]), false, 'diagnostic report must be new');
  writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({uses: report.cases.length, sources: report.sources.length,
  strict_type_checks: report.strict_type_checks, mutants_rejected: report.mutations.length,
  node: report.node, compiler: report.compiler}));
