/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual checker integration with emitted source fixtures; not a packed/AOT artifact. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {packedShape, originalFactoryContract, originalInheritedConstructor, compareSignatures, loadDifferences} from '../scripts/api-surface.mjs';
import {approvedMenuItemContract, MENU_ITEM_CONTRACT_PATH} from '../scripts/menu-item-construction-contract.mjs';
import {observeRuntimeDi, expectedFactoryDi} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), req = createRequire(import.meta.url);
const ts = req('typescript'), url = spec => pathToFileURL(req.resolve(spec)).href;
const importModule = spec => import(url(spec));
await importModule('@angular/compiler');
const core = await importModule('@angular/core');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const path = 'projects/ngx-material-legacy/legacy-menu/menu-item.ts', read = p => readFileSync(resolve(root, p), 'utf8');
const sf = (text, p = 'fixture.ts') => ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true);
const originalPath = '/original/src/material/legacy-menu/menu-item.ts';
const old = packedShape(sf(read('reference/material-16.2.14/menu-item-sources/legacy-menu-item.ts')), 'MatLegacyMenuItem');
const inherited = originalInheritedConstructor(originalPath, 'MatLegacyMenuItem');
const symbol = {symbol_id: 'legacy-menu/primary/MatLegacyMenuItem', family: 'legacy-menu', kind: 'primary',
  name: 'MatLegacyMenuItem', di_id: 'menu-item-fixture', shape: {...old,
    inheritedConstructor: inherited, originalFactory: originalFactoryContract(originalPath, 'MatLegacyMenuItem'),
    signatures: [...old.ownSignatures, ...inherited.signatures]}};
const contract = approvedMenuItemContract(symbol), differences = loadDifferences();
assert.equal(expectedFactoryDi(symbol.shape).length, 5, 'original expectation must not be replaced');
assert.equal(contract.runtime_requests.length, 6);
const source = read(path), candidate = packedShape(sf(source, path), symbol.name);
const matched = compareSignatures(symbol, candidate, differences);
assert.deepEqual(matched.blocking, []);
assert.equal(matched.rows.filter(r => r.construction_contract === contract.profile_id).length, 2);
for (const [importText, parent] of [
  ['import {MatMenuItem as PublicItem} from "@angular/material/menu";', 'PublicItem'],
  ['import * as material from "@angular/material/menu";', 'material.MatMenuItem'],
]) {
  const declaration = packedShape(sf(importText + `export declare class MatLegacyMenuItem extends ${parent} {constructor();}`), symbol.name);
  assert.equal(declaration.publicMenuItemParent, true);
  assert.deepEqual(compareSignatures(symbol, declaration, differences).blocking, []);
}
const signatureMutants = [];
for (const [id, text] of [
  ['missing-constructor', 'import {MatMenuItem} from "@angular/material/menu"; export class MatLegacyMenuItem extends MatMenuItem {}'],
  ['rest-arguments', 'import {MatMenuItem} from "@angular/material/menu"; export class MatLegacyMenuItem extends MatMenuItem {constructor(...args:unknown[]) {super();}}'],
  ['optional-manual-element', 'import {MatMenuItem} from "@angular/material/menu"; export class MatLegacyMenuItem extends MatMenuItem {constructor(element?:unknown) {super();}}'],
  ['extra-overload', 'import {MatMenuItem} from "@angular/material/menu"; export class MatLegacyMenuItem extends MatMenuItem {constructor();constructor(element:unknown);constructor(element?:unknown) {super();}}'],
  ['foreign-parent', 'export class Other {} export class MatLegacyMenuItem extends Other {constructor() {super();}}'],
  ['shadow-parent', 'export class MatMenuItem {} export class MatLegacyMenuItem extends MatMenuItem {constructor() {super();}}'],
  ['wrong-public-import', 'import {MatMenuItem} from "foreign/menu"; export class MatLegacyMenuItem extends MatMenuItem {constructor() {super();}}'],
]) {
  const result = compareSignatures(symbol, packedShape(sf(text), symbol.name), differences);
  assert.ok(result.blocking.length > 0, id + ': constructor/parent mutation escaped');
  signatureMutants.push({id, rejected: true, problems: result.blocking});
}
const unbound = differences.map(row => {const copy = {...row}; delete copy.construction_contract; return copy;});
assert.ok(compareSignatures(symbol, candidate, unbound).blocking.length > 0);
signatureMutants.push({id: 'plain-rationale-cannot-authorize-construction', rejected: true});
for (const mode of ['contract', 'authority', 'original-constructor', 'original-factory']) {
  const altered = structuredClone(symbol);
  if (mode === 'original-constructor') altered.shape.inheritedConstructor.signatures[0] += '?';
  if (mode === 'original-factory') altered.shape.originalFactory.inherited_factory.declaration += ' ';
  const reader = p => {const bytes = readFileSync(resolve(root, p));
    return (mode === 'contract' && p === MENU_ITEM_CONTRACT_PATH)
      || (mode === 'authority' && p === contract.authority.path) ? Buffer.concat([bytes, Buffer.from(' ')]) : bytes;};
  assert.throws(() => approvedMenuItemContract(altered, reader));
  signatureMutants.push({id: mode + '-identity-changed', rejected: true});
}

const base = 'projects/ngx-material-legacy/legacy-menu/', helper = read(base + 'internal/menu-item-context.ts');
const token = read(base + 'internal/menu-panel-token.ts');
const data = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, experimentalDecorators: true}}).outputText
  .replace(/(['"])(@angular\/[^'"]+)\1/g, (_, quote, spec) => JSON.stringify(url(spec)));
const tokenUrl = data(emit(token));
const temp = mkdtempSync(join(tmpdir(), 'menu-api-contract-'));
const runtime = [], settlementMutants = [];
async function observe(id, leaf = source, context = helper, footer = '', exportToken = tokenUrl) {
  const directory = join(temp, id); mkdirSync(join(directory, 'fesm2022'), {recursive: true});
  const contextUrl = data(emit(context).replaceAll("'./menu-panel-token'", JSON.stringify(tokenUrl)));
  const emitted = emit(leaf).replaceAll("'./internal/menu-item-context'", JSON.stringify(contextUrl));
  writeFileSync(join(directory, 'fesm2022/ngx-compat-material-legacy-legacy-menu.mjs'), emitted
    + '\nexport {MAT_MENU_PANEL as MAT_LEGACY_MENU_PANEL} from ' + JSON.stringify(exportToken) + ';\n' + footer);
  const [row] = await observeRuntimeDi(directory, [symbol], [], importModule);
  return settleDi(row, []);
}
try {
  const good = await observe('positive'); assert.equal(good.result, 'pass');
  assert.equal(good.status, 'intentional-legacy-difference'); assert.deepEqual(good.problems, []);
  assert.equal(good.factory_outcome, 'returned'); assert.equal(good.observed.length, 6);
  runtime.push({id: 'actual-source-factory-checker-and-settlement', result: 'pass', historical: good.historical,
    observed: good.observed, approved_construction: good.approved_construction});
  const twin = await observe('same-description-token-twin', source, helper, '', data(emit(token) + '\n// independent token identity\n'));
  assert.equal(twin.result, 'fail');
  assert.ok(twin.problems.some(problem => problem.includes('expected MAT_MENU_PANEL')));
  runtime.push({id: 'same-description-token-twin', result: 'rejected', problems: twin.problems});
  for (const [id, leaf, context, footer] of [
    ['wrong-optional-flag', source, helper.replace('inject(MAT_MENU_PANEL, {optional: true})', 'inject(MAT_MENU_PANEL)'), ''],
    ['missing-manual-argument-rejection', source.replace('if (arguments.length)', 'if (false)'), helper, ''],
    ['peer-optional-panel-leak', source, helper.replace('notFoundValue === null || options?.optional', 'options?.optional'), ''],
    ['wrong-new-target', source, helper.replace('Reflect.construct(MatMenuItem, [], target)', 'Reflect.construct(MatMenuItem, [], MatMenuItem)'), ''],
    ['empty-returning-factory', source, helper, 'Object.defineProperty(MatLegacyMenuItem,"ɵfac",{value:()=>({}),configurable:true});'],
    ['throwing-factory', source, helper, 'Object.defineProperty(MatLegacyMenuItem,"ɵfac",{value:()=>{throw new Error("factory did not complete");},configurable:true});'],
  ]) {
    assert.ok(leaf !== source || context !== helper || footer, id + ': mutation did not apply');
    const result = await observe(id, leaf, context, footer);
    assert.equal(result.result, 'fail', id + ': runtime mutation escaped');
    runtime.push({id, result: 'rejected', problems: result.problems});
  }
  for (const [id, change] of [
    ['missing-profile', row => delete row.approved_construction],
    ['wrong-profile', row => row.approved_construction.profile_id = 'different'],
    ['wrong-contract-hash', row => row.approved_construction.contract_sha256 = '0'.repeat(64)],
    ['factory-not-returned', row => row.factory_outcome = 'threw'],
    ['missing-root-execution', row => row.approved_construction.root_requests = []],
    ['unresolved-root-provider', row => row.approved_construction.root_requests[0].unresolved = true],
    ['optional-root-service', row => row.approved_construction.root_requests[0].optional = true],
    ['borrowed-service-destroyed', row => row.approved_construction.counts.borrowedDestroyed = 1],
    ['missing-style-loading', row => row.approved_construction.counts.styles = 0],
    ['missing-behavior-proof', row => delete row.approved_construction.behavior_problems],
    ['behavior-failure', row => row.approved_construction.behavior_problems.push('parent identity failed')],
    ['token-identity-failure', row => row.problems.push('token object differs')],
    ['optional-flag-failure', row => row.problems.push('optional flag differs')],
  ]) {
    const changed = structuredClone(good); change(changed);
    assert.equal(settleDi(changed, []).result, 'fail', id + ': settlement mutation escaped');
    settlementMutants.push({id, rejected: true});
  }
} finally {rmSync(temp, {recursive: true, force: true});}
const report = {schema_version: 1, role: 'Menu-specific authorized API/DI producer integration; emitted source fixtures, not packed/AOT qualification',
  node: process.version, compiler: ts.version, runtime_peer: core.VERSION.full,
  source_caps: [path, base + 'internal/menu-item-context.ts', base + 'internal/menu-panel-token.ts',
    'scripts/menu-item-construction-contract.mjs', 'scripts/api-menu-item-factory.mjs', 'scripts/api-di-observe.mjs',
    'scripts/api-surface.mjs', 'scripts/api-completeness.mjs', 'tests/menu_item_api_contract_probe.mjs',
    MENU_ITEM_CONTRACT_PATH].map(p => ({path: p, sha256: sha(readFileSync(resolve(root, p)))})),
  original: {constructor: inherited, factory: symbol.shape.originalFactory, expected_factory_di: expectedFactoryDi(symbol.shape)},
  signature_comparison: matched, signature_mutants: signatureMutants, runtime, settlement_mutants: settlementMutants,
  limits: ['Real Angular JIT factory executes emitted owned source against read-only22/publicroot with syntheticDOM/borrowed services.',
    'Default CLI observes actual packed exports and peer modules; this test supplies real peer-module URLs only for worktree diagnostics.',
    'Original reference/manual signatures and five-dependency DI expectation remain unchanged. Only recorded owner-approved constructor difference is admitted.',
    'No native boolean-input/provider/query, AOT/packed artifact, actual21/compiler,canonical/floor/security/G02 qualification.']};
const argv = process.argv.slice(2), at = argv.indexOf('--report');
if (at !== -1) {assert.equal(existsSync(argv[at + 1]), false); writeFileSync(argv[at + 1], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({signature_mutants: signatureMutants.length, runtime_positive: 1,
  runtime_mutants: runtime.length - 1, settlement_mutants: settlementMutants.length, original_factory_dependencies: 5,
  accepted_context_requests: 6, node: process.version, compiler: ts.version, runtime_peer: core.VERSION.full}));
