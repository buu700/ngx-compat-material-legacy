/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Discovery/evidence/admission controls; no component or peer runtime qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const fixturePath = 'projects/ngx-material-legacy/fixture.ts';
const fixture = `import CoreDefault, {type Injector as Alias, inject, inject as Again} from '@angular/core';
import type * as CoreTypes from '@angular/core';
import * as Forms from '@angular/forms';
import '@angular/common';
export {Injector as PublicInjector, type InjectionToken as Token} from '@angular/core';
export * from '@angular/cdk';
export * as bidi from '@angular/cdk/bidi';
type Typed = import('@angular/core').Injector;
type Whole = typeof import('@angular/core');
const menu = import('@angular/material/menu');
const cdkMenu = import(\`@angular/cdk/menu\`);
const unresolved = import(moduleName);
import {Subject} from 'rxjs';
type Rx = import('rxjs').Subject<unknown>;
`;
const discover = (scan = scanCurrentAuthoredUses) => scan({files: [fixturePath], readSource: () => fixture});
const expected = [
  ['@angular/core', 'default'], ['@angular/core', 'Injector'], ['@angular/core', 'inject'],
  ['@angular/core', '*'], ['@angular/core', 'InjectionToken'], ['@angular/forms', '*'],
  ['@angular/common', '<side-effect>'], ['@angular/cdk', '*'], ['@angular/cdk/bidi', '*'],
  ['@angular/material/menu', '*'], ['@angular/cdk/menu', '*'], ['<computed-module>', '<unresolved>'],
].map(([module, symbol]) => key({file: 'fixture.ts', module, symbol})).sort();
function checkDiscovery(scan) {
  const found = discover(scan);
  assert.deepEqual(found.symbol_uses.map(key).sort(), expected);
  const injector = found.symbol_uses.find(row => row.symbol === 'Injector');
  assert.deepEqual(injector.occurrences.map(row => row.kind), ['named-import', 'named-reexport', 'import-type']);
  assert.equal(injector.occurrences[0].local_name, 'Alias');
  assert.equal(injector.occurrences[0].type_only, true);
  assert.equal(injector.occurrences[1].type_only, false);
  assert.equal(injector.occurrences[2].type_only, true);
  assert.equal(found.symbol_uses.find(row => row.symbol === 'inject').occurrences.length, 2);
  assert.equal(found.symbol_uses.find(row => row.symbol === 'InjectionToken').occurrences[0].type_only, true);
  return found;
}
const discovered = checkDiscovery(scanCurrentAuthoredUses);
for (const files of [[], [fixturePath, fixturePath], ['../fixture.ts'],
  ['projects/ngx-material-legacy/fixture.spec.ts']])
  assert.throws(() => scanCurrentAuthoredUses({files, readSource: () => fixture}));
assert.throws(() => scanCurrentAuthoredUses({files: [fixturePath], readSource: () => 'const = ;'}));
const hidden = scanCurrentAuthoredUses({files: ['projects/ngx-material-legacy/.hidden.ts'], readSource: () => fixture});
assert.equal(hidden.symbol_uses.length, discovered.symbol_uses.length);

const temporary = mkdtempSync(join(tmpdir(), 'current-authored-discovery-controls-'));
let discoveryMutants = 0;
try {
  const producer = readFileSync(join(root, 'scripts/authored-current-use-inventory.mjs'), 'utf8');
  writeFileSync(join(temporary, 'authored-use-inventory.mjs'), readFileSync(join(root, 'scripts/authored-use-inventory.mjs')));
  const edits = [
    ['ts.isExportDeclaration(node) && node.moduleSpecifier', 'false && ts.isExportDeclaration(node) && node.moduleSpecifier'],
    ['ts.isImportTypeNode(node) && ts.isLiteralTypeNode', 'false && ts.isImportTypeNode(node) && ts.isLiteralTypeNode'],
    ["} else add('<computed-module>', '<unresolved>', node, 'computed-dynamic-import');", '}'],
  ];
  for (const [index, [before, after]] of edits.entries()) {
    const changed = producer.replace(before, after); assert.notEqual(changed, producer);
    const path = join(temporary, `mutant-${index}.mjs`); writeFileSync(path, changed);
    const mutated = await import(pathToFileURL(path).href);
    assert.throws(() => checkDiscovery(mutated.scanCurrentAuthoredUses), /AssertionError/);
    discoveryMutants++;
  }
} finally {rmSync(temporary, {recursive: true, force: true});}

// Positive evidence fixture proves that complete, bound current-use records can
// pass this validator. Its synthetic evidence does not qualify a product use.
const simple = "import {Injector as LocalInjector} from '@angular/core';\n";
const current = scanCurrentAuthoredUses({files: [fixturePath], readSource: () => simple});
const frozen = [{file: 'retired.ts', module: '@angular/core', symbol: 'Injector'}];
const reviewPath = 'compatibility/f10/authored-use-reviews/current-inventory-test-fixture.json';
const independentPath = 'compatibility/rc/current-inventory-test-fixture.txt';
const independent = Buffer.from('Synthetic validator-fixture evidence; no product or Angular contract claim.');
const review = {schema_version: 1, line: 'main', status: 'reviewed', reviews: [{
  ...current.symbol_uses[0], conclusion: 'stable-public-peer', reviewer: 'validator fixture',
  decision: 'This synthetic caller and independent observation test source-bound inventory admission only. This record is not a semantic decision for any production dependency or component.',
  independent_evidence: [{path: independentPath, sha256: hash(independent)}],
}]};
const reviewBytes = Buffer.from(JSON.stringify(review));
const memberBytes = {[fixturePath]: Buffer.from(simple), [reviewPath]: reviewBytes, [independentPath]: independent};
const candidate = {schema_version: 1, line: 'main', status: 'closed',
  current_uses: current.symbol_uses.length, current_source_files: current.source_files.length,
  current_source_population_sha256: current.source_population_sha256, symbol_use_count: 1,
  symbol_uses: [{...current.symbol_uses[0], status: 'reviewed', disposition: 'closed',
    source_review: {path: reviewPath, sha256: hash(reviewBytes)}}]};
const admit = (body = candidate, members = memberBytes, source = current) => currentAuthoredUseAdmission({
  current: source, frozen, candidate: body, line: 'main', readMember: path => members[path]});
const good = admit(); assert.equal(good.ready, true); assert.equal(good.removed_seed_uses, 1);
assert.equal(good.additional_uses, 1); assert.equal(good.review_evidence.reviewed, 1);
const clone = value => JSON.parse(JSON.stringify(value));
let admissionControls = 0;
const rejected = (body, members = memberBytes, source = current) => {
  assert.equal(admit(body, members, source).ready, false); admissionControls++;
};
for (const body of [null, {}, {...candidate, line: '21.x'}, {...candidate, schema_version: 2},
  {...candidate, status: 'in-progress'}, {...candidate, symbol_uses: []},
  {...candidate, symbol_uses: [...candidate.symbol_uses, ...candidate.symbol_uses]},
  {...candidate, symbol_use_count: 0}, {...candidate, current_uses: 0},
  {...candidate, current_source_files: 0}, {...candidate, current_source_population_sha256: '0'.repeat(64)},
  {...candidate, symbol_uses: [null]}]) rejected(body);
let bad = clone(candidate); bad.symbol_uses[0].symbol = 'Unknown'; rejected(bad);
bad = clone(candidate); delete bad.symbol_uses[0].source_review; rejected(bad);
bad = clone(candidate); bad.symbol_uses[0].occurrences[0].type_only = true; rejected(bad);
bad = clone(candidate); bad.symbol_uses[0].candidate_source_sha256 = '0'.repeat(64); rejected(bad);
rejected(candidate, {...memberBytes, [fixturePath]: Buffer.from(simple + '// changed caller\n')});
rejected(candidate, {...memberBytes, [independentPath]: Buffer.from('changed independent evidence')});
rejected(candidate, {...memberBytes, [reviewPath]: Buffer.from('changed review')});
const newlyExported = scanCurrentAuthoredUses({files: [fixturePath], readSource: () => simple +
  "export {InjectionToken as NewToken} from '@angular/core';\n"});
rejected(candidate, memberBytes, newlyExported);
assert.equal(admit(candidate, memberBytes, newlyExported).inventory.missing, 1);

// Execute both shipped predicates under otherwise sufficient controlled state.
// Removing either current-source condition would wrongly admit unreviewed uses.
const checkerText = readFileSync(join(root, 'scripts/check-upstream-audit-disposition.mjs'), 'utf8');
const checker = ts.createSourceFile('checker.mjs', checkerText, ts.ScriptTarget.Latest, true);
const declaration = name => checker.statements.filter(ts.isVariableStatement)
  .flatMap(statement => [...statement.declarationList.declarations]).find(node => node.name.getText(checker) === name);
const disposition = declaration('dispositionOk').initializer.getText(checker);
const cases = declaration('CASE_RESULTS').initializer.getText(checker);
const context = {structuralOk: true, missing: [], conflicts: [], outside: [], unresolved: [], unknown: [],
  forgedClearance: false, missingEvidence: [], circularEvidence: [], insufficientSensitive: [],
  insufficientInherited: [], insufficientBehavior: [], missingBranch: [], symbolInventory: {complete: true},
  symbolUsesOpen: 0, symbolStatus: 'closed', symbolReviewEvidence: {insufficient: 0}, advisory: {ok: true}};
const evaluate = (source, ready) => vm.runInNewContext(source, {...context, currentSymbolAdmission: {ready}});
const authoredCase = rows => rows.find(row => row[0] === 'authored-symbols')[2];
assert.equal(evaluate(disposition, true), true); assert.equal(evaluate(disposition, false), false);
assert.equal(authoredCase(evaluate(cases, true)), true); assert.equal(authoredCase(evaluate(cases, false)), false);
for (const source of [disposition, cases]) {
  const mutated = source.replace(' && currentSymbolAdmission.ready', ''); assert.notEqual(mutated, source);
  const value = evaluate(mutated, false);
  assert.equal(Array.isArray(value) ? authoredCase(value) : value, true);
}

const actual = scanCurrentAuthoredUses({root});
const actualSeed = JSON.parse(readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')));
const ledger = JSON.parse(readFileSync(join(root, 'compatibility/f10/authored-dependency-current-dispositions.json')));
const observed = currentAuthoredUseAdmission({current: actual, frozen: actualSeed.symbol_uses,
  candidate: ledger, line: ledger.line, readMember: path => readFileSync(join(root, path))});
assert.equal(observed.inventory.complete, true); assert.equal(observed.scope_valid, true);
assert.equal(observed.source_snapshot_valid, true);
const closed = ledger.symbol_uses.filter(row => row.status === 'reviewed' && row.disposition === 'closed').length;
assert.equal(observed.review_evidence.insufficient, 0);
assert.equal(observed.review_evidence.reviewed, closed);
assert.equal(observed.inventory.open, ledger.symbol_use_count - closed);
assert.equal(observed.ready, ledger.status === 'closed' && closed === ledger.symbol_use_count);
const result = {schema_version: 1, line: ledger.line, compiler: ts.version, node: process.version,
  fixture_discovered_routes: discovered.symbol_uses.length, discovery_path_or_syntax_controls: 5,
  whole_discovery_mutants_rejected: discoveryMutants, admission_negative_controls: admissionControls,
  shipped_admission_predicates: 2, shipped_predicate_mutants_detected: 2,
  positive_complete_source_bound_fixture: true, current: observed,
  product_peer_or_component_runtime_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(result));
