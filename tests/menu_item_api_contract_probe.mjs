/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual source declarations, factories and checker settlement; no packed/AOT claim. */
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
import {originalCompilerFactoryContext} from '../scripts/api-original-factory-contexts.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), req = createRequire(import.meta.url);
const at = process.argv.indexOf('--subject-root');
const subjectRoot = at < 0 ? dirname(req.resolve('@angular/core/package.json')).replace(/\/node_modules\/@angular\/core$/, '') : process.argv[at + 1];
const subjectReq = at < 0 ? req : createRequire(join(subjectRoot, 'package.json'));
const ts = req('typescript'), url = spec => pathToFileURL(subjectReq.resolve(spec)).href;
const importModule = spec => import(url(spec));
if (process.argv.includes('--production')) globalThis.ngDevMode = false;
await importModule('@angular/compiler'); const core = await importModule('@angular/core');
const metadata = new WeakMap(), priorMetadata = Reflect.metadata, priorGetMetadata = Reflect.getOwnMetadata;
Reflect.metadata = (key, value) => target => {const values = metadata.get(target) || new Map(); values.set(key, value); metadata.set(target, values);};
Reflect.getOwnMetadata = (key, target) => metadata.get(target)?.get(key);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const prefix = 'projects/ngx-material-legacy/legacy-menu/';
const path = prefix + 'menu-item.ts', basePath = prefix + 'internal/menu-item-base.ts';
const read = p => readFileSync(resolve(root, p), 'utf8');
const sf = (text, p = 'fixture.ts') => ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true);
const originalPath = '/original/src/material/legacy-menu/menu-item.ts';
const old = packedShape(sf(read('reference/material-16.2.14/menu-item-sources/legacy-menu-item.ts')), 'MatLegacyMenuItem');
const inherited = originalInheritedConstructor(originalPath, 'MatLegacyMenuItem');
const symbol = {symbol_id: 'legacy-menu/primary/MatLegacyMenuItem', family: 'legacy-menu', kind: 'primary',
  name: 'MatLegacyMenuItem', di_id: 'menu-item-fixture', shape: {...old,
    inheritedConstructor: inherited, originalFactory: originalFactoryContract(originalPath, 'MatLegacyMenuItem'),
    signatures: [...old.ownSignatures, ...inherited.signatures]}};
symbol.shape.originalFactoryContext = originalCompilerFactoryContext(symbol.shape.originalFactory);
const contract = approvedMenuItemContract(symbol), differences = loadDifferences();
assert.equal(expectedFactoryDi(symbol.shape).length, 5);
assert.equal(contract.runtime_requests.length, 5);
assert.ok(!differences.some(row => row.construction_contract === 'menu-item-angular-di-construction-v1'));
const source = read(path), base = read(basePath);
// TypeScript emits declarations from the actual owned source and actual public peers.
const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, experimentalDecorators: true,
  skipLibCheck: false, declaration: true, emitDeclarationOnly: true, noEmitOnError: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
const host = ts.createCompilerHost(options), declarations = new Map();
host.resolveModuleNames = (names, from) => names.map(name => ts.resolveModuleName(name,
  name.startsWith('.') || name.startsWith('/') ? from : join(subjectRoot, 'source.ts'), options, host).resolvedModule);
host.writeFile = (file, text) => declarations.set(file, text);
const program = ts.createProgram([resolve(root, path)], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p,
  getCurrentDirectory: () => root, getNewLine: () => '\n'}));
assert.equal(program.emit().emitSkipped, false);
const declaration = declarations.get(resolve(root, basePath.replace(/\.ts$/, '.d.ts'))) + '\n'
  + declarations.get(resolve(root, path.replace(/\.ts$/, '.d.ts')));
assert.ok(!declaration.includes('undefined\n'));
const candidate = packedShape(sf(declaration), symbol.name);
const matched = compareSignatures(symbol, candidate, differences);
assert.deepEqual(matched.blocking, []);
const signatureMutants = [];
for (const [id, altered] of [
  ['missing-first-argument', declaration.replace('elementRef: ElementRef<HTMLElement>, document?:', 'elementRef?: ElementRef<HTMLElement>, document?:')],
  ['lost-overload', declaration.replace(/    constructor\(elementRef: ElementRef<HTMLElement>, document: any[^\n]+\n/, '')],
  ['wrong-panel-type', declaration.replaceAll('MatMenuPanel<_LegacyMenuItemBase>', 'MatMenuPanel<unknown>')],
  ['lost-focus-method', declaration.replace(/    focus\([^\n]+\n/, '')],
  ['wrong-role', declaration.replace("'menuitem' | 'menuitemradio' | 'menuitemcheckbox'", "'menuitem'")],
  ['modern-parent', declaration.replace('extends _LegacyMenuItemBase', 'extends PeerMatMenuItem')],
  ['leaf-zero-argument-constructor', declaration.replace('export declare class MatLegacyMenuItem extends _LegacyMenuItemBase {', 'export declare class MatLegacyMenuItem extends _LegacyMenuItemBase {constructor();')],
  ['empty-shadow-base', 'declare class _LegacyMenuItemBase {} export declare class MatLegacyMenuItem extends _LegacyMenuItemBase {}'],
]) {
  assert.notEqual(altered, declaration, id + ': mutation did not apply');
  const result = compareSignatures(symbol, packedShape(sf(altered), symbol.name), differences);
  assert.ok(result.blocking.length, id + ': declaration mutation escaped'); signatureMutants.push({id, rejected: true});
}
const authorityMutants = [];
for (const mode of ['contract', 'authority', 'original-constructor', 'original-factory']) {
  const altered = structuredClone(symbol);
  if (mode === 'original-constructor') altered.shape.inheritedConstructor.signatures[0] += '?';
  if (mode === 'original-factory') altered.shape.originalFactory.inherited_factory.declaration += ' ';
  const reader = p => {const bytes = readFileSync(resolve(root, p)); return (mode === 'contract' && p === MENU_ITEM_CONTRACT_PATH)
    || (mode === 'authority' && p === contract.authority.path) ? Buffer.concat([bytes, Buffer.from(' ')]) : bytes;};
  assert.throws(() => approvedMenuItemContract(altered, reader)); authorityMutants.push({id: mode, rejected: true});
}
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2015,
  module: ts.ModuleKind.CommonJS, experimentalDecorators: true, emitDecoratorMetadata: true}}).outputText;
const temp = mkdtempSync(join(tmpdir(), 'historical-menu-api-')), runtime = [], settlementMutants = [];
async function observe(id, changedBase = base, changedLeaf = source, footer = '', tokenTwin = false) {
  const directory = join(temp, id); mkdirSync(join(directory, 'fesm2022'), {recursive: true});
  const modules = ['@angular/core', '@angular/cdk/a11y', '@angular/cdk/coercion', '@angular/material/menu', 'rxjs'];
  const imports = modules.map((spec, i) => 'import * as m' + i + ' from ' + JSON.stringify(url(spec)) + ';').join('\n');
  const payload = {base: emit(changedBase), leaf: emit(changedLeaf), token: emit(read(prefix + 'internal/menu-panel-token.ts')),
    mixins: ['disabled', 'disable-ripple'].map(name => emit(read(prefix + 'internal/common-behaviors/' + name + '.ts')))};
  const code = imports + '\nconst mods = new Map([' + modules.map((spec, i) => '[' + JSON.stringify(spec) + ',m' + i + ']').join(',') + ']);\n'
    + 'const payload=' + JSON.stringify(payload) + ';const token={},mixins={},base={},leaf={};\n'
    + 'const execute=(exports,source,require)=>new Function("exports","require",source)(exports,require);\n'
    + 'execute(token,payload.token,spec=>mods.get(spec));for(const source of payload.mixins)execute(mixins,source,spec=>mods.get(spec));\n'
    + 'execute(base,payload.base,spec=>spec==="./menu-panel-token"?token:spec.startsWith("./common-behaviors")?mixins:mods.get(spec));\n'
    + 'execute(leaf,payload.leaf,spec=>spec==="./internal/menu-item-base"?base:mods.get(spec));\n'
    + 'export let MatLegacyMenuItem=leaf.MatLegacyMenuItem;export const MAT_LEGACY_MENU_PANEL='
    + (tokenTwin ? 'new m0.InjectionToken("MAT_MENU_PANEL")' : 'token.MAT_MENU_PANEL') + ';\n' + footer;
  writeFileSync(join(directory, 'fesm2022/ngx-compat-material-legacy-legacy-menu.mjs'), code);
  const [row] = await observeRuntimeDi(directory, [symbol], [], importModule); return settleDi(row, []);
}
try {
  const good = await observe('positive'); assert.equal(good.result, 'pass', JSON.stringify(good.problems));
  assert.deepEqual(good.problems, []); assert.equal(good.factory_outcome, 'returned'); assert.equal(good.observed.length, 5);
  runtime.push({id: 'actual-source-factory-checker-and-settlement', result: 'pass', historical: good.historical,
    observed: good.observed, approved_construction: good.approved_construction});
  for (const [id, changedBase, changedLeaf, footer, twin] of [
    ['same-description-token-twin', base, source, '', true],
    ['wrong-panel-optional-flag', base.replace('@Optional()', ''), source, '', false],
    ['required-document-optional', base.replace('@Inject(DOCUMENT)', '@Inject(DOCUMENT) @Optional()'), source, '', false],
    ['missing-parent-registration', base.replace('_parentMenu?.addItem?.(this);', ''), source, '', false],
    ['missing-focus-monitoring', base.replace('this._focusMonitor.monitor(this._elementRef, false);', ''), source, '', false],
    ['missing-disabled-prevention', base.replace('event.preventDefault();', ''), source, '', false],
    ['missing-stream-completion', base.replace('this._focused.complete();', ''), source, '', false],
    ['wrong-label', base.replace("clone.textContent?.trim() || ''", "'Wrong label'"), source, '', false],
    ['missing-state-mark', base.replace('this._changeDetectorRef?.markForCheck();', ''), source, '', false],
    ['empty-returning-factory', base, source, 'MatLegacyMenuItem=class extends MatLegacyMenuItem {static ɵfac(){return {};}};', false],
    ['throwing-factory', base, source, 'MatLegacyMenuItem=class extends MatLegacyMenuItem {static ɵfac(){throw new Error("factory did not complete");}};', false],
  ]) {
    assert.ok(changedBase !== base || changedLeaf !== source || footer || twin, id + ': mutation did not apply');
    const result = await observe(id, changedBase, changedLeaf, footer, twin);
    assert.equal(result.result, 'fail', id + ': runtime mutation escaped'); runtime.push({id, result: 'rejected', problems: result.problems});
  }
  for (const [id, change] of [
    ['missing-profile', row => delete row.approved_construction],
    ['wrong-profile', row => row.approved_construction.profile_id = 'different'],
    ['wrong-contract-hash', row => row.approved_construction.contract_sha256 = '0'.repeat(64)],
    ['factory-not-returned', row => row.factory_outcome = 'threw'],
    ['hidden-application-request', row => row.approved_construction.root_requests.push({optional: false, unresolved: false})],
    ['required-provider-controls-missing', row => row.approved_construction.counts.requiredProviderControls = 3],
    ['optional-panel-control-missing', row => row.approved_construction.counts.optionalPanelControls = 0],
    ['manual-overload-lost', row => row.approved_construction.counts.manualOverloads = 1],
    ['subclass-control-lost', row => row.approved_construction.counts.subclassControls = 0],
    ['borrowed-service-destroyed', row => row.approved_construction.counts.borrowedDestroyed = 1],
    ['missing-behavior-proof', row => delete row.approved_construction.behavior_problems],
    ['behavior-failure', row => row.approved_construction.behavior_problems.push('parent identity failed')],
    ['token-identity-failure', row => row.problems.push('token object differs')],
    ['optional-flag-failure', row => row.problems.push('optional flag differs')],
    ['missing-request-identity-proof', row => delete row.runtime_requests],
    ['forged-request-identity', row => row.runtime_requests[0].identity_matched = false],
    ['forged-panel-optional-flag', row => row.runtime_requests[3].optional = false],
    ['wrong-request-order', row => row.runtime_requests.reverse()],
    ['factory-owned-instance-unproved', row => row.factory_returned_owned_instance = false],
  ]) {
    const changed = structuredClone(good); change(changed);
    assert.equal(settleDi(changed, []).result, 'fail', id + ': settlement mutation escaped'); settlementMutants.push({id, rejected: true});
  }
} finally {rmSync(temp, {recursive: true, force: true}); Reflect.metadata = priorMetadata; Reflect.getOwnMetadata = priorGetMetadata;}
const report = {schema_version: 2, role: 'Owner-approved historical menu API/DI checker integration; source fixtures, not packed/AOT',
  node: process.version, compiler: ts.version, runtime_peer: core.VERSION.full,
  source_caps: [path, basePath, 'scripts/menu-item-construction-contract.mjs', 'scripts/api-menu-item-factory.mjs',
    'scripts/api-di-observe.mjs', 'scripts/api-surface.mjs', 'scripts/api-completeness.mjs', 'tests/menu_item_api_contract_probe.mjs',
    MENU_ITEM_CONTRACT_PATH, contract.authority.path].map(p => ({path: p, sha256: sha(readFileSync(resolve(root, p)))})),
  original: {constructor: inherited, factory: symbol.shape.originalFactory, expected_factory_di: expectedFactoryDi(symbol.shape)},
  emitted_declaration_sha256: sha(declaration), signature_comparison: matched, signature_mutants: signatureMutants,
  authority_mutants: authorityMutants, runtime, settlement_mutants: settlementMutants,
  limits: ['Actual owned source declarations/factories and public peers; borrowed compiler/RxJS, synthetic DOM/services.',
    'Original manual overloads and five-service DI remain checked; only the approved current-parent subtype changes.',
    'No native provider/query/input, AOT/packed, canonical/full floors/security/G02 qualification.']};
const reportAt = process.argv.indexOf('--report');
if (reportAt >= 0) {assert.equal(existsSync(process.argv[reportAt + 1]), false); writeFileSync(process.argv[reportAt + 1], JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({signature_mutants: signatureMutants.length, authority_mutants: authorityMutants.length,
  runtime_positive: 1, runtime_mutants: runtime.length - 1, settlement_mutants: settlementMutants.length,
  original_factory_dependencies: 5, accepted_context_requests: 5, compiler: ts.version, runtime_peer: core.VERSION.full}));
