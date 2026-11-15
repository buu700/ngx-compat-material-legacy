/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * MIT license; see LICENSE.
 */
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {deriveSurface, readDts, packedShape, compareSignatures, loadDifferences} from '../scripts/api-surface.mjs';
import {settleFormConstructor} from '../scripts/api-form-constructor-contract.mjs';
import {extractPackageArchive} from '../scripts/safe-package-extract.mjs';

const [packageRoot, tarball, referenceRoot] = process.argv.slice(2).map(x => resolve(x));
const symbol = deriveSurface(referenceRoot).symbols.find(x => x.symbol_id === 'legacy-form-field/primary/MatLegacyFormField');
const file = readDts(packageRoot).get('ngx-compat-material-legacy-legacy-form-field.d.ts');
const raw = compareSignatures(symbol, packedShape(file, symbol.name), loadDifferences());
assert.equal(raw.blocking.length, 2);
const before = JSON.stringify(raw);
const context = {packageRoot, tarball, referenceRoot};
const settled = settleFormConstructor(symbol, file, raw, context);
assert.deepEqual(settled.blocking, []);
const proof = settled.rows.find(x => x.proof?.declaration?.changed_declarations).proof;
assert.equal(proof.declaration.sources, 309);
assert.deepEqual(proof.declaration.changed_declarations, ['types/ngx-compat-material-legacy-legacy-core.d.ts']);
assert.equal(JSON.stringify(raw), before);
let negatives = 0;
for (const bad of [null, {...context, tarball: join(packageRoot, 'package.json')}, {...context, packageRoot: referenceRoot}, {...context, referenceRoot: packageRoot}]) {
  assert.equal(settleFormConstructor(symbol, file, raw, bad), raw); negatives++;
}
const forgedSymbol = {...symbol, shape: {...symbol.shape, signatures: []}};
assert.equal(settleFormConstructor(forgedSymbol, file, raw, context), raw); negatives++;
const forgedSignature = {...raw, blocking: raw.blocking.slice(1)};
assert.equal(settleFormConstructor(symbol, file, forgedSignature, context), forgedSignature); negatives++;

const parent = join(process.cwd(), 'artifacts/local/form-signature-negative'); mkdirSync(parent, {recursive: true});
const scratch = mkdtempSync(join(parent, 'reference-'));
try {
  const altered = extractPackageArchive(tarball, scratch);
  const core = join(altered, 'types/ngx-compat-material-legacy-legacy-core.d.ts');
  writeFileSync(core, readFileSync(core, 'utf8') + '\nexport declare const unreviewed: number;\n');
  const alteredFile = readDts(altered).get('ngx-compat-material-legacy-legacy-form-field.d.ts');
  assert.equal(settleFormConstructor(symbol, alteredFile, raw, {...context, packageRoot: altered}), raw); negatives++;
} finally { rmSync(scratch, {recursive: true, force: true}); }
console.log(JSON.stringify({signature: 'pass', strict_consumer_sources: 309,
  seven_and_eight_arguments_and_subclass: 'pass', wrong_eighth_argument_rejected: true, negatives}));
