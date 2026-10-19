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
import {reviewFormMenuZoneUses, emitFormMenuZoneClass, changeFormMenuZoneMethod, formMenuZonePublicDeclarations,
  FIELD, MENU, HELPER} from '../scripts/form-menu-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewFormMenuZoneUses({root});
const fieldFault = (from, to) => emitFormMenuZoneClass(changeFormMenuZoneMethod(review.fieldRaw, 'MatLegacyFormField', 'ngAfterContentInit', from, to), 'MatLegacyFormField', 'ColorProtocol');
const menuFault = (from, to) => emitFormMenuZoneClass(changeFormMenuZoneMethod(review.menuRaw, '_MatMenuTriggerBase', '_subscribeToPositions', from, to), '_MatMenuTriggerBase');
const change = (raw, from, to) => {assert.equal(raw.split(from).length, 2); return raw.replace(from, to);};
const payload = {...review.payload, faults: {
  fieldWrongZone: fieldFault('afterFormFieldRender(this._ngZone, this._injector)', 'afterFormFieldRender(undefined, this._injector)'),
  fieldInsideHook: fieldFault('this._ngZone.runOutsideAngular(() => {\n      afterFormFieldRender', 'this._ngZone.run(() => {\n      afterFormFieldRender'),
  fieldInsideFrame: fieldFault('this._ngZone.runOutsideAngular(() => {\n            const frameId', 'this._ngZone.run(() => {\n            const frameId'),
  fieldNoCancel: emitFormMenuZoneClass(changeFormMenuZoneMethod(review.fieldRaw, 'MatLegacyFormField', 'ngOnDestroy',
    'this._directionFrames.forEach(frameId => cancelAnimationFrame(frameId));', ''), 'MatLegacyFormField', 'ColorProtocol'),
  fieldLateWrite: fieldFault('if (!this._formFieldDestroyed) {\n                this.updateOutlineGap();\n              }', 'this.updateOutlineGap();'),
  menuWrongX: menuFault("overlayX === 'start'", "overlayX === 'end'"),
  menuWrongY: menuFault("overlayY === 'top'", "overlayY === 'bottom'"),
  menuNoCallbackGuard: menuFault('if (menu.setPositionClasses)', 'if (true)'),
  menuOutside: menuFault('this._ngZone.run(', 'this._ngZone.runOutsideAngular('),
}};
const loaded = prepareMaterialPublicSubjects(root), results = [], types = [], controls = [];
try {
  const worker = read('tests/form_menu_zone_use_subject.mjs');
  for (const model of loaded.models) {
    const declaration = formMenuZonePublicDeclarations(model);
    const fixture = `import {NgZone, Injector} from '@angular/core';import {Observable,Subject} from 'rxjs';import {takeUntil} from 'rxjs/operators';import {merge} from 'rxjs';
interface MatMenuPanel{setPositionClasses?:(x:MenuPositionX,y:MenuPositionY)=>void;}
type MenuPositionX='before'|'after';type MenuPositionY='above'|'below';
interface FlexibleConnectedPositionStrategy{positionChanges:Observable<{connectionPair:{overlayX:'start'|'end';overlayY:'top'|'bottom'}}>;}
class TriggerReceipt{constructor(private _ngZone?:NgZone){}${review.menuMethod}}
declare function afterFormFieldRender(zone:NgZone,injector?:Injector):Observable<void>;
class FieldReceipt{constructor(private _ngZone:NgZone,private _injector?:Injector){}
private _destroyed=new Subject<void>();private _formFieldDestroyed=false;private _directionFrames=new Set<number>();
private _outlineGapCalculationNeededOnStable=false;private _dir?:{change:Observable<string>};
private _prefixChildren!:{changes:Observable<void>};private _suffixChildren!:{changes:Observable<void>};
private _hintChildren!:{changes:Observable<void>};private _errorChildren!:{changes:Observable<void>};
private _changeDetectorRef!:{markForCheck():void};private _validateControlChild(){}private _processHints(){}private _syncDescribedByIds(){}updateOutlineGap(){}
${review.fieldMethod}}
declare const zone:NgZone;new TriggerReceipt();new TriggerReceipt(zone);new FieldReceipt(zone);new FieldReceipt(zone,Injector.NULL);
const value:number=zone.run(()=>1);const outside:string=zone.runOutsideAngular(()=>'value');
// @ts-expect-error A public zone service is required for the field.
new FieldReceipt();
// @ts-expect-error The optional trigger zone is still typed.
new TriggerReceipt({});
// @ts-expect-error The field zone is still typed.
new FieldReceipt({});
// @ts-expect-error A synchronous callback is required.
zone.run(1);
// @ts-expect-error An outside callback is required.
zone.runOutsideAngular(1);
// @ts-expect-error Callback return type is preserved.
const wrong:string=zone.run(()=>1);
// @ts-expect-error Placement vocabulary is finite.
const wrongPosition:MenuPositionX='start';
// @ts-expect-error Constructor injector type is public.
new FieldReceipt(zone,{});
`;
    const path = join(model.root, 'form-menu-zone-types.ts'); writeFileSync(path, fixture);
    const program = ts.createProgram([path], {strict: true, noEmit: true, skipLibCheck: false, types: [],
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({...declaration, fixture_sha256: hash(fixture), negative_checks: 8, owned_surrounding_types_are_explicit_protocols: true});
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'form-menu-zone-use-payload.json'), JSON.stringify(payload));
    const workerPath = join(model.root, 'form-menu-zone-use-subject.mjs'); writeFileSync(workerPath, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, ['--max-old-space-size=384', workerPath, model.line, mode, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
      const observed = JSON.parse(stdout.trim().split('\n').at(-1));
      assert.equal(observed.cases.length, 10); assert.ok(observed.cases.every(row => row.result === 'pass'));
      results.push({line: model.line, mode, production, framework_version: model.packages.get('@angular/core').version,
        zone_subject: zoneSubject, borrowed_dependencies: model.borrowed, ...observed});
    }
    const declarationSource = ts.createSourceFile(declaration.path, model.sources.get(declaration.path), ts.ScriptTarget.Latest, true);
    const zoneClass = declarationSource.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'NgZone');
    for (const [id, name, mutate] of [['deprecated-inside-method', 'run', raw => '/** @deprecated */\n' + raw],
      ['wrong-outside-return', 'runOutsideAngular', raw => raw.replace(/:\s*T;$/, ': string;')]]) {
      const member = zoneClass.members.find(node => node.name?.getText(declarationSource) === name);
      const from = member.getText(declarationSource), to = mutate(from);
      assert.notEqual(from, to); const sources = new Map(model.sources);
      sources.set(declaration.path, declarationSource.text.slice(0, member.getStart(declarationSource)) + to + declarationSource.text.slice(member.end));
      assert.throws(() => formMenuZonePublicDeclarations({...model, sources})); controls.push({line: model.line, id, result: 'rejected'});
    }
  }
  const corruptions = [
    [FIELD, 'optional-field-service', 'private _ngZone: NgZone', 'private _ngZone?: NgZone'],
    [FIELD, 'lost-field-service-type', 'private _ngZone: NgZone', 'private _ngZone: any'],
    [FIELD, 'escaped-field-service', 'afterFormFieldRender(this._ngZone, this._injector)', 'afterFormFieldRender((this as any)._ngZone, this._injector)'],
    [MENU, 'required-trigger-service', 'private _ngZone?: NgZone', 'private _ngZone: NgZone'],
    [MENU, 'lost-overload-service-type', '    ngZone: NgZone,', '    ngZone: any,'],
    [MENU, 'changed-position-vocabulary', "overlayX === 'start'", "overlayX === 'end'"],
    [MENU, 'changed-unrelated-constructor-default', 'restoreFocus: boolean = true;', 'restoreFocus: boolean = false;'],
    [HELPER, 'changed-reused-helper', 'if (zone.isStable)', 'if (true)'],
    [review.reused.path, 'forged-old-report', '"schema_version": 1', '"schema_version": 2'],
    [review.reused.producer.path, 'changed-old-producer', '/** Complete constructor/member replay', '/** Changed constructor/member replay'],
  ];
  for (const [path, id, from, to] of corruptions) {
    const changed = Buffer.from(change(read(path).toString(), from, to));
    assert.throws(() => reviewFormMenuZoneUses({root, readMember: member => member === path ? changed : read(member)}));
    controls.push({id, result: 'rejected'});
  }
  const runtimeFaults = results.reduce((sum, row) => sum + row.faults.length, 0);
  assert.equal(results.length, 10); assert.equal(runtimeFaults, 78); assert.equal(controls.length, 16);
  const report = {schema_version: 1, line: review.line, node: process.version, diagnostic_compiler: ts.version,
    cases: review.cases, sources: review.sources, originals: review.originals, reused_field_evidence: review.reused,
    public_namespace_capsule_sha256: loaded.capsule_hash, public_declarations_and_types: types, runtime_results: results, controls,
    producers: ['scripts/form-menu-zone-use-review.mjs', 'tests/form_menu_zone_use_probe.mjs', 'tests/form_menu_zone_use_subject.mjs'].map(path => ({path, sha256: hash(read(path))})),
    limits: review.limits, source_imports_reviewed: 2, authored_ledger_integration: 'pending finite integration batch',
    actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: review.line, source_imports: 2, genuine_zone_subjects: results.length,
    fresh_protocol_cases: results.flatMap(row => row.cases).length, fresh_runtime_faults_rejected: runtimeFaults,
    source_declaration_controls: controls.length, reused_subjects: 10, reused_faults: 120, reused_execution_rerun: false,
    actual_native_packed_or_floor_qualified: false}));
} finally {loaded.dispose();}
