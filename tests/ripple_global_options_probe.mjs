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
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {reviewRippleGlobalOptionSources, reviewRipplePublicTypes, resolveRipplePublicType} from '../scripts/ripple-global-options-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript'), hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFileSync(join(root, path), 'utf8');
const source = reviewRippleGlobalOptionSources({root}), loaded = prepareMaterialPublicSubjects(root);
const controls = [], results = [], declarations = [];
const sourceChanges = [
  ['legacy-chips/chip.ts', '@Inject(MAT_RIPPLE_GLOBAL_OPTIONS)', '@Inject(ANIMATION_MODULE_TYPE)'],
  ['legacy-chips/chip.ts', '@Optional()\n    @Inject(MAT_RIPPLE_GLOBAL_OPTIONS)', '@Inject(MAT_RIPPLE_GLOBAL_OPTIONS)'],
  ['legacy-chips/chip.ts', 'globalRippleOptions: RippleGlobalOptions | null', 'globalRippleOptions: RippleGlobalOptions | undefined'],
  ['legacy-chips/chip.ts', 'this.rippleConfig = globalRippleOptions || {};', 'this.rippleConfig = globalRippleOptions ?? {};'],
  ['legacy-chips/chip.ts', '!!this.rippleConfig.disabled', 'false'],
  ['legacy-chips/chip.ts', 'export interface MatLegacyChipEvent', 'const escapedOptions = MAT_RIPPLE_GLOBAL_OPTIONS;\nexport interface MatLegacyChipEvent'],
  ['legacy-chips/chip.ts', 'export interface MatLegacyChipEvent', 'const escapedOptions = RippleGlobalOptions;\nexport interface MatLegacyChipEvent'],
  ['legacy-chips/chip.ts', 'export interface MatLegacyChipEvent', "export {MAT_RIPPLE_GLOBAL_OPTIONS} from '@angular/material/core';\nexport interface MatLegacyChipEvent"],
  ['legacy-chips/chip.ts', "from '@angular/material/core'", "from '@angular/material/private'"],
  ['legacy-tabs/internal/tab-nav-bar-base.ts', 'this.rippleConfig.animation = {enterDuration: 0, exitDuration: 0};', 'this.rippleConfig.animation = {enterDuration: 1, exitDuration: 0};'],
  ['legacy-tabs/internal/tab-nav-bar-base.ts', 'this._tabNavBar.disableRipple', 'false'],
  ['legacy-tabs/internal/tab-nav-bar-base.ts', 'rippleConfig: RippleConfig & RippleGlobalOptions', 'rippleConfig: RippleConfig | RippleGlobalOptions'],
  ['legacy-tabs/tab-nav-bar/tab-nav-bar.ts', 'super(tabNavBar, elementRef, globalRippleOptions, tabIndex, focusMonitor, animationMode);', 'super(tabNavBar, elementRef, {...globalRippleOptions}, tabIndex, focusMonitor, animationMode);'],
  ['legacy-tabs/tab-nav-bar/tab-nav-bar.ts', '@Optional() @Inject(MAT_RIPPLE_GLOBAL_OPTIONS)', '@Inject(MAT_RIPPLE_GLOBAL_OPTIONS)'],
];
try {
  for (const [file, from, to] of sourceChanges) {
    const path = 'projects/ngx-material-legacy/' + file, original = read(path);
    assert.equal(original.split(from).length, 2, 'ambiguous source control');
    const changed = original.replace(from, to);
    assert.throws(() => reviewRippleGlobalOptionSources({root, readSource: member => member === path ? changed : read(member)}));
    controls.push({file, mutation: from + ' → ' + to, result: 'rejected'});
  }
  const refPath = 'projects/ngx-material-legacy/legacy-core/ripple/ripple-ref.ts';
  const ref = ts.createSourceFile(refPath, read(refPath), ts.ScriptTarget.Latest, true);
  const ownedTypes = ref.statements.filter(node => ['LegacyRippleConfig', 'LegacyRippleAnimationConfig'].includes(node.name?.text));
  assert.equal(ownedTypes.length, 2);
  const owned = ownedTypes.map(node => node.getText(ref)).join('\n');
  const worker = read('tests/ripple_global_options_subject.mjs');
  for (const model of loaded.models) {
    const publicTypes = reviewRipplePublicTypes(model);
    // The independent v16 shape is fixed, while the current namespace addition
    // remains optional and is not claimed as owned loader behavior.
    const fixture = `import {InjectionToken} from '@angular/core';
import {MAT_RIPPLE_GLOBAL_OPTIONS, RippleGlobalOptions, RippleAnimationConfig} from '@angular/material/core';
${owned}
type Historical = {disabled?: boolean; animation?: {enterDuration?: number; exitDuration?: number}; terminateOnPointerUp?: boolean};
type Projection = Pick<RippleGlobalOptions, 'disabled' | 'animation' | 'terminateOnPointerUp'>;
type Check<T extends true> = T;
type A = Check<Projection extends Historical ? true : false>;
type B = Check<Historical extends Projection ? true : false>;
type C = Check<{} extends Projection ? true : false>;
type D = Check<LegacyRippleAnimationConfig extends RippleAnimationConfig ? true : false>;
type E = Check<RippleAnimationConfig extends LegacyRippleAnimationConfig ? true : false>;
const token: InjectionToken<RippleGlobalOptions> = MAT_RIPPLE_GLOBAL_OPTIONS;
const enterOnly: RippleGlobalOptions = {animation: {enterDuration: 1}};
const exitOnly: RippleGlobalOptions = {animation: {exitDuration: 2}};
const config: LegacyRippleConfig & RippleGlobalOptions = {disabled: true, animation: {enterDuration: 1, exitDuration: 2}, terminateOnPointerUp: true};
const fromPeer: LegacyRippleConfig = enterOnly;
const toPeer: RippleGlobalOptions = fromPeer;
// @ts-expect-error Disabled remains boolean.
const badDisabled: RippleGlobalOptions = {disabled: 'yes'};
// @ts-expect-error Duration remains numeric.
const badDuration: RippleGlobalOptions = {animation: {enterDuration: 'fast'}};
// @ts-expect-error Termination remains boolean.
const badTermination: RippleGlobalOptions = {terminateOnPointerUp: 1};
// @ts-expect-error The peer/owned intersection retains numeric durations.
const badIntersection: LegacyRippleConfig & RippleGlobalOptions = {animation: {exitDuration: 'slow'}};
// @ts-expect-error Owned duration has the same numeric contract.
const badOwned: LegacyRippleConfig = {animation: {exitDuration: 'slow'}};
${model.line === 'original' ? '// @ts-expect-error Namespace was absent from the untouched historical API.\nconst namespace: RippleGlobalOptions = {namespace: "a"};' :
  'const namespace: RippleGlobalOptions = {namespace: "a"};\n// @ts-expect-error Current namespace is an optional string.\nconst badNamespace: RippleGlobalOptions = {namespace: 1};'}
`;
    const fixturePath = join(model.root, 'ripple-global-options-types.ts'); writeFileSync(fixturePath, fixture);
    const program = ts.createProgram([fixturePath], {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noEmit: true, skipLibCheck: false,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    declarations.push({...publicTypes, fixture_sha256: hash(fixture), strict_compile: true,
      positive_type_relations: 5, negative_compile_checks: 6});
    const workerPath = join(model.root, 'ripple-global-options-subject.mjs'); writeFileSync(workerPath, worker);
    writeFileSync(join(model.root, 'ripple-global-options-payload.json'), JSON.stringify(source.payload));
    const stdout = execFileSync(process.execPath, ['--max-old-space-size=384', workerPath], {
      cwd: model.root, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
    const observed = JSON.parse(stdout.trim().split('\n').at(-1));
    assert.equal(observed.construction_cases, 90); assert.equal(observed.injector_cases, 15);
    assert.equal(observed.runtime_mutations_rejected, 6);
    results.push({line: model.line, material_version: model.packages.get('@angular/material').version,
      framework_version: model.packages.get('@angular/core').version, borrowed_dependencies: model.borrowed, ...observed});
  }
  // Exercise declaration admission, independently of saved proof booleans.
  for (const model of loaded.models) {
    for (const [id, from, to] of [
      ['deprecated', '/** Configurable options for `matRipple`. */', '/** @deprecated Configurable options. */'],
      ['duration', 'enterDuration?: number;', 'enterDuration?: string;'],
      ['disabled', 'disabled?: boolean;', 'disabled?: string;'],
    ]) {
      const sources = new Map(model.sources);
      const resolved = resolveRipplePublicType(model, id === 'duration' ? 'RippleAnimationConfig' : 'RippleGlobalOptions');
      const statement = resolved.statement, text = statement.getFullText(resolved.source);
      assert.equal(text.split(from).length, 2, 'ambiguous declaration mutation: ' + id);
      sources.set(resolved.source.fileName, resolved.source.text.slice(0, statement.getFullStart()) +
        text.replace(from, to) + resolved.source.text.slice(statement.end));
      assert.throws(() => reviewRipplePublicTypes({...model, sources}), model.line + ': ' + id);
      controls.push({line: model.line, declaration_mutation: id, result: 'rejected'});
    }
  }
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const report = {schema_version: 1, line, node: process.version, compiler: ts.version,
    namespace_capsule_sha256: loaded.capsule_hash,
    producer: ['scripts/ripple-global-options-review.mjs', 'tests/ripple_global_options_probe.mjs',
      'tests/ripple_global_options_subject.mjs'].map(path => ({path, sha256: hash(read(path))})),
    owned_config: {path: refPath, sha256: hash(read(refPath))},
    cases: source.cases, construction_oracles: source.payload.map(({current, original, ...entry}) => ({...entry,
      current_phase_sha256: hash(current), original_phase_sha256: hash(original)})),
    public_declarations_and_types: declarations, runtime_results: results, controls,
    limits: source.limits + ' Namespace is opaque data; no historical ripple-loader support is added. Genuine public Injector tests use explicit factory providers derived from the checked optional token decorator, not Angular compiled legacy node factories. InjectionToken generic assignments are not a nominal payload-identity proof; the actual declaration and runtime token object are checked separately. Strict compilation uses the diagnostic compiler shown here, with existing host RxJS/tslib. It does not qualify their advertised minima.',
    six_source_boundaries_reviewed: true, authored_ledger_integration: 'pending finite integration batch',
    actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line, source_imports: source.cases.length, public_subjects: results.length,
    construction_cases: results.reduce((total, result) => total + result.construction_cases, 0),
    injector_cases: results.reduce((total, result) => total + result.injector_cases, 0),
    runtime_mutations_rejected: results.reduce((total, result) => total + result.runtime_mutations_rejected, 0),
    source_and_declaration_controls: controls.length, actual_native_packed_or_floor_qualified: false}));
} finally { loaded.dispose(); }
