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
import {reviewCheckboxZoneUse, emitCheckboxZoneClass, checkboxZonePublicDeclarations,
  CHECKBOX_ZONE_BASE, CHECKBOX_ZONE_LEAF} from '../scripts/checkbox-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewCheckboxZoneUse({root}), base = review.raw, leaf = review.leaf;
const change = (raw, from, to) => { assert.equal(raw.split(from).length, 2); return raw.replace(from, to); };
const emitBase = raw => emitCheckboxZoneClass(raw, '_MatCheckboxBase', 'TraitProtocol');
const payload = {...review.payload, zoneFault: emitBase(change(base, 'this._ngZone.runOutsideAngular(', 'this._ngZone.run(')),
  mutations: {
    noReuse: emitBase(change(base, '!this._checkboxDestroyed && !reused', '!this._checkboxDestroyed')),
    noCancel: emitBase(change(base, '      clearTimeout(cleanup.timeout);\n', '')),
    noLateGuard: emitBase(change(base, '!this._checkboxDestroyed && !reused', '!reused')),
    noClear: emitBase(change(base, '    this._animationCleanups.clear();\n', '')),
    noDestroyCleanup: emitBase(change(base, '      cleanup.element.classList.remove(cleanup.animationClass);\n', '')),
    noTransitionGuard: emitBase(change(base, '    if (this._checkboxDestroyed) {\n      return;\n    }\n    let oldState', '    let oldState')),
    noLeafDestroy: emitCheckboxZoneClass(change(leaf, '    super.ngOnDestroy();\n', ''), 'MatLegacyCheckbox', 'Base'),
  }};
const loaded = prepareMaterialPublicSubjects(root), results = [], types = [], controls = [];
try {
  const worker = read('tests/checkbox_zone_use_subject.mjs');
  for (const model of loaded.models) {
    const declaration = checkboxZonePublicDeclarations(model);
    const fixture = `import{NgZone}from'@angular/core';
const enum TransitionCheckState{Init,Checked,Unchecked,Indeterminate}
class Receipt{constructor(protected _ngZone:NgZone){}${review.typed_members}
private _getAnimationTargetElement():HTMLElement|null{return null;}
private _getAnimationClassForCheckStateTransition(_old:TransitionCheckState,_next:TransitionCheckState):string{return '';}}
declare const zone:NgZone;new Receipt(zone).ngOnDestroy();const value:number=zone.runOutsideAngular(()=>1);
// @ts-expect-error The required public service cannot be omitted.
new Receipt({});
// @ts-expect-error The outside callback must be callable.
zone.runOutsideAngular(1);
// @ts-expect-error The callback return type is retained.
const badResult:string=zone.runOutsideAngular(()=>1);
// @ts-expect-error Destruction returns void.
const invalid:boolean=new Receipt(zone).ngOnDestroy();
// @ts-expect-error Browser timeout handles cannot be strings.
const timeout:ReturnType<typeof setTimeout>='invalid';
// @ts-expect-error Transitions remain private.
new Receipt(zone)._transitionCheckState(TransitionCheckState.Checked);
`;
    const path = join(model.root, 'checkbox-zone-public-types.ts'); writeFileSync(path, fixture);
    const program = ts.createProgram([path], {strict: true, noEmit: true, skipLibCheck: false, types: [],
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({...declaration, fixture_sha256: hash(fixture), strict_compile: true, negative_checks: 6});
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'checkbox-zone-use-payload.json'), JSON.stringify(payload));
    const workerPath = join(model.root, 'checkbox-zone-use-subject.mjs'); writeFileSync(workerPath, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, ['--max-old-space-size=384', workerPath, model.line, mode, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
      const observed = JSON.parse(stdout.trim().split('\n').at(-1));
      assert.equal(observed.cases.length, 8); assert.ok(observed.cases.every(row => row.result === 'pass'));
      results.push({line: model.line, mode, production, framework_version: model.packages.get('@angular/core').version,
        zone_subject: zoneSubject, borrowed_dependencies: model.borrowed, ...observed});
    }
    const source = ts.createSourceFile(declaration.path, model.sources.get(declaration.path), ts.ScriptTarget.Latest, true);
    const cls = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'NgZone');
    const method = cls.members.find(node => node.name?.getText(source) === 'runOutsideAngular');
    for (const [id, altered] of [
      ['deprecated-outside-method', '/** @deprecated */\n' + method.getText(source)],
      ['wrong-outside-return-type', method.getText(source).replace(/:\s*T;$/, ': string;')],
    ]) {
      assert.notEqual(altered, method.getText(source)); const sources = new Map(model.sources);
      sources.set(declaration.path, source.text.slice(0, method.getStart(source)) + altered + source.text.slice(method.end));
      assert.throws(() => checkboxZonePublicDeclarations({...model, sources})); controls.push({line: model.line, id, result: 'rejected'});
    }
  }
  const sourceChanges = [
    [CHECKBOX_ZONE_BASE, 'optional-service', 'protected _ngZone: NgZone', 'protected _ngZone?: NgZone'],
    [CHECKBOX_ZONE_BASE, 'lost-service-type', 'protected _ngZone: NgZone', 'protected _ngZone: any'],
    [CHECKBOX_ZONE_BASE, 'inside-zone-member', 'this._ngZone.runOutsideAngular(', 'this._ngZone.run('],
    [CHECKBOX_ZONE_BASE, 'escaped-service', 'this._ngZone.runOutsideAngular(', 'const escapedZone = this._ngZone;\n      this._ngZone.runOutsideAngular('],
    [CHECKBOX_ZONE_BASE, 'changed-ARIA-default', 'ariaExpanded: boolean | null = null;', 'ariaExpanded: boolean | null = false;'],
    [CHECKBOX_ZONE_LEAF, 'wrong-forwarding-slot', "super('mat-checkbox-', elementRef, changeDetectorRef, ngZone,", "super('mat-checkbox-', elementRef, changeDetectorRef, undefined,"],
    ['projects/ngx-material-legacy/legacy-checkbox/owned-transition-state.ts', 'changed-enum-ordinal', '  Init,', '  Init = 1,'],
  ];
  for (const [path, id, from, to] of sourceChanges) {
    const changed = Buffer.from(change(read(path).toString(), from, to));
    assert.throws(() => reviewCheckboxZoneUse({root, readMember: member => member === path ? changed : read(member)}));
    controls.push({id, result: 'rejected'});
  }
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(results.length, 10); const runtimeFaults = results.reduce((total, result) => total + result.mutations.length, 0);
  assert.equal(runtimeFaults, 82); assert.equal(controls.length, 13);
  const report = {schema_version: 1, line, node: process.version, diagnostic_compiler: ts.version,
    case: review.case, sources: review.sources, originals: review.originals, owned_enum: review.owned_enum,
    public_namespace_capsule_sha256: loaded.capsule_hash, public_declarations_and_types: types,
    runtime_results: results, controls,
    producer: ['scripts/checkbox-zone-use-review.mjs', 'tests/checkbox_zone_use_probe.mjs', 'tests/checkbox_zone_use_subject.mjs']
      .map(path => ({path, sha256: hash(read(path))})),
    limits: review.limits + ' Genuine Node task context is observed through an explicit timer adapter which verifies requested1000ms then schedules at0ms. Browser1000ms timing, CSS animation and component factories remain unqualified. Constructor comparison enumerates existing ARIA defaults from SHA9122335 but grants no ARIA feature/API/behavior closure. Diagnostic compilers and borrowed host RxJS/tslib do not qualify all advertised minima.',
    source_imports_reviewed: 1, authored_ledger_integration: 'pending finite integration batch',
    actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line, source_imports: 1, genuine_zone_subjects: results.length,
    current_protocol_cases: results.reduce((total, result) => total + result.cases.length, 0),
    runtime_faults_rejected: runtimeFaults, source_declaration_controls: controls.length,
    actual_native_packed_or_floor_qualified: false}));
} finally { loaded.dispose(); }
