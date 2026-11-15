/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
import {prepareHistoricalCdk16Reference} from '../scripts/api-historical-cdk-reference.mjs';

const [packageRoot, tarball, referenceRoot, output] = process.argv.slice(2).map(x => resolve(x));
assert.ok(packageRoot && tarball && referenceRoot && output);
const require = createRequire(import.meta.url);
const load = spec => import(pathToFileURL(require.resolve(spec)).href);
await load('@angular/compiler');
const symbols = deriveSurface(referenceRoot).symbols;
const historical = await prepareHistoricalCdk16Reference();
const context = {packageRoot, tarball, referenceRoot, ...historical};
try {
const rows = await observeRuntimeDi(packageRoot, symbols, [], load, context);
assert.ok(rows.length > 25);
const observations = rows.map(row => {
  const settled = settleDi(row, [], context);
  return {
    symbol: row.symbol.symbol_id,
    outcome: row.factory_outcome,
    error: row.factory_error,
    problems: row.problems,
    settlement: settled.result,
    settlement_problems: settled.problems,
    observed: row.runtime_requests?.map(request => ({
      expected: request.expected_ident,
      observed: request.observed_label,
      identity_matched: request.identity_matched,
      intentional_difference: request.intentional_token_difference || null,
    })),
  };
});
writeFileSync(output, JSON.stringify({role: 'combined-full-factory-integration-diagnostic', observations,
  scope: 'All derived original DI factory shapes; no declaration, full API or release pass claimed.'}, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(observations.map(({symbol, outcome, error, problems, settlement, settlement_problems}) =>
  ({symbol, outcome, error, problems, settlement, settlement_problems}))));

} finally { historical.cleanup(); }
