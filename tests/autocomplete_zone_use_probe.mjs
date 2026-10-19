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
import {reviewAutocompleteZoneUse, emitAutocompleteZoneClass, changeAutocompleteZoneMethod, autocompleteZonePublicDeclarations,
  AUTOCOMPLETE_ZONE_SOURCE as SOURCE, AUTOCOMPLETE_ZONE_HELPER as HELPER} from '../scripts/autocomplete-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewAutocompleteZoneUse({root}), change = (raw, from, to) => {assert.equal(raw.split(from).length, 2); return raw.replace(from, to);};
const fault = (method, from, to) => emitAutocompleteZoneClass(changeAutocompleteZoneMethod(review.raw, method, from, to));
const payload = {...review.payload, faults: {
  noRemove: fault('ngOnDestroy', "window.removeEventListener('blur', this._windowBlurHandler);", ''),
  wrongRemove: fault('ngOnDestroy', "window.removeEventListener('blur', this._windowBlurHandler);", "window.removeEventListener('blur', () => this._windowBlurHandler());"),
  wrongBorrowed: emitAutocompleteZoneClass(change(review.raw, 'this._viewContainerRef.injector.get(BreakpointObserver)', '({}) as BreakpointObserver')),
  destroyBorrowed: fault('ngOnDestroy', '    this._viewportSubscription.unsubscribe();', '    (this._breakpointObserver as any).ngOnDestroy();\n    this._viewportSubscription.unsubscribe();'),
  wrongForwarding: fault('_subscribeToClosingActions', 'afterLegacyRender(this._zone, this._viewContainerRef.injector)', 'afterLegacyRender(undefined, this._viewContainerRef.injector)'),
  insideBlur: fault('ngAfterViewInit', 'this._zone.runOutsideAngular(', 'this._zone.run('),
  outsideView: fault('_subscribeToClosingActions', 'this._zone.run(', 'this._zone.runOutsideAngular('),
  outsideClose: fault('closePanel', 'this._zone.run(', 'this._zone.runOutsideAngular('),
}};
const loaded = prepareMaterialPublicSubjects(root), results = [], types = [], controls = [];
try {
  const worker = read('tests/autocomplete_zone_use_subject.mjs');
  for (const model of loaded.models) {
    const declaration = autocompleteZonePublicDeclarations(model);
    const fixture = `import {NgZone, ViewContainerRef} from '@angular/core';import{Observable,Subscription,merge}from'rxjs';
import{delay,tap,switchMap,take}from'rxjs/operators';
declare function afterLegacyRender(zone:NgZone,injector:ViewContainerRef['injector']):Observable<void>;
declare function removeAriaReferencedId(element:Element,attribute:string,id:string):void;
class Receipt{constructor(private _zone:NgZone,private _viewContainerRef:ViewContainerRef){}
// Other owned component state is an explicit protocol; the consumed service and view injector use real public declarations.
[name:string]:any;
${review.typed_methods}}
declare const zone:NgZone,view:ViewContainerRef;new Receipt(zone,view).ngAfterViewInit();const value:number=zone.run(()=>1);
// @ts-expect-error The historical zone parameter is required.
new Receipt();
// @ts-expect-error The zone parameter is genuine and typed.
new Receipt({},view);
// @ts-expect-error The view container is a public Angular contract.
new Receipt(zone,{});
// @ts-expect-error Callback must be callable.
zone.runOutsideAngular(1);
// @ts-expect-error Inside callback must be callable.
zone.run(1);
// @ts-expect-error Inside return type is preserved.
const invalid:string=zone.run(()=>1);
// @ts-expect-error Outside return type is preserved.
const invalidOutside:number=zone.runOutsideAngular(()=>'value');
// @ts-expect-error Render helper receives the actual public view injector.
afterLegacyRender(zone,{});
`;
    const path = join(model.root, 'autocomplete-zone-types.ts'); writeFileSync(path, fixture);
    const program = ts.createProgram([path], {strict: true, noEmit: true, skipLibCheck: false, types: [], target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({...declaration, fixture_sha256: hash(fixture), negative_checks: 8, surrounding_owned_component_state_is_explicit_protocol: true});
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'autocomplete-zone-use-payload.json'), JSON.stringify(payload));
    const workerPath = join(model.root, 'autocomplete-zone-use-subject.mjs'); writeFileSync(workerPath, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, ['--max-old-space-size=384', workerPath, model.line, mode, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
      const observed = JSON.parse(stdout.trim().split('\n').at(-1));
      assert.equal(observed.cases.length, 5); assert.ok(observed.cases.every(row => row.result === 'pass'));
      results.push({line: model.line, mode, production, framework_version: model.packages.get('@angular/core').version,
        zone_subject: zoneSubject, borrowed_dependencies: model.borrowed, ...observed});
    }
    const source = ts.createSourceFile(declaration.path, model.sources.get(declaration.path), ts.ScriptTarget.Latest, true);
    const cls = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'NgZone');
    for (const [id, name, mutate] of [['deprecated-outside-method', 'runOutsideAngular', raw => '/** @deprecated */\n' + raw],
      ['wrong-inside-return', 'run', raw => raw.replace(/:\s*T;$/, ': string;')]]) {
      const member = cls.members.find(node => node.name?.getText(source) === name), from = member.getText(source), to = mutate(from);
      assert.notEqual(from, to); const sources = new Map(model.sources);
      sources.set(declaration.path, source.text.slice(0, member.getStart(source)) + to + source.text.slice(member.end));
      assert.throws(() => autocompleteZonePublicDeclarations({...model, sources})); controls.push({line: model.line, id, result: 'rejected'});
    }
  }
  const corruptions = [
    [SOURCE, 'optional-zone-service', 'private _zone: NgZone', 'private _zone?: NgZone'],
    [SOURCE, 'lost-zone-service-type', 'private _zone: NgZone', 'private _zone: any'],
    [SOURCE, 'escaped-zone-service', 'afterLegacyRender(this._zone, this._viewContainerRef.injector)', 'afterLegacyRender((this as any)._zone, this._viewContainerRef.injector)'],
    [SOURCE, 'inside-zone-blur', 'this._zone.runOutsideAngular(', 'this._zone.run('],
    [SOURCE, 'changed-unrelated-constructor-default', "position: 'auto' | 'above' | 'below' = 'auto'", "position: 'auto' | 'above' | 'below' = 'above'"],
    [HELPER, 'changed-render-helper', 'if (zone.isStable)', 'if (true)'],
    ['projects/ngx-material-legacy/legacy-core/option/option-base.ts', 'changed-option-dependency', 'export class MatOptionSelectionChange', 'export class ChangedOptionSelectionChange'],
    [review.render_evidence.path, 'forged-fresh-render-report', '"schema_version": 1', '"schema_version": 2'],
    [review.render_evidence.superseded_report.path, 'forged-old-render-report', '"schema_version": 1', '"schema_version": 2'],
    [review.render_evidence.producer.path, 'changed-original-render-producer', '/** Complete source bodies', '/** Altered source bodies'],
  ];
  for (const [path, id, from, to] of corruptions) {
    const changed = Buffer.from(change(read(path).toString(), from, to));
    assert.throws(() => reviewAutocompleteZoneUse({root, readMember: member => member === path ? changed : read(member)}));
    controls.push({id, result: 'rejected'});
  }
  const runtimeFaults = results.reduce((sum, row) => sum + row.faults.length, 0);
  assert.equal(results.length, 10); assert.equal(runtimeFaults, 74); assert.equal(controls.length, 16);
  const report = {schema_version: 1, line: review.line, node: process.version, diagnostic_compiler: ts.version, case: review.case,
    sources: review.sources, original: review.original, refreshed_original_render_evidence: review.render_evidence,
    public_namespace_capsule_sha256: loaded.capsule_hash, public_declarations_and_types: types, runtime_results: results, controls,
    producers: ['scripts/autocomplete-zone-use-review.mjs', 'tests/autocomplete_zone_use_probe.mjs', 'tests/autocomplete_zone_use_subject.mjs', 'scripts/form-menu-zone-use-review.mjs']
      .map(path => ({path, sha256: hash(read(path))})), limits: review.limits, source_imports_reviewed: 1,
    authored_ledger_integration: 'pending finite integration batch', actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: review.line, source_imports: 1, genuine_zone_subjects: results.length,
    fresh_supplement_cases: results.flatMap(row => row.cases).length, fresh_supplement_faults: runtimeFaults,
    source_declaration_evidence_controls: controls.length, refreshed_original_render_subjects: 10, refreshed_original_render_faults: 16,
    actual_native_packed_or_floor_qualified: false}));
} finally {loaded.dispose();}
