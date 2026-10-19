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
import {reviewTooltipSelectZoneUses, emitTooltipSelectClass, changeTooltipZoneMethod, tooltipSelectZonePublicDeclarations,
  TOOLTIP, SELECT, LEAF} from '../scripts/tooltip-select-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewTooltipSelectZoneUses({root}), change = (raw, from, to) => {assert.equal(raw.split(from).length, 2); return raw.replace(from, to);};
const fault = (method, from, to) => emitTooltipSelectClass(changeTooltipZoneMethod(review.payload.tooltipRaw, method, from, to));
function overlayFault(index) {
  const raw = review.payload.tooltipRaw, source = ts.createSourceFile('tooltip.ts', raw, ts.ScriptTarget.Latest, true);
  const cls = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === '_MatTooltipBase');
  const method = cls.members.find(node => node.name?.text === '_createOverlay'), calls = [];
  function visit(node) {if (ts.isPropertyAccessExpression(node) && node.getText(source) === 'this._ngZone.run') calls.push(node); ts.forEachChild(node, visit);}
  visit(method); assert.equal(calls.length, 2); const name = calls[index].name;
  return emitTooltipSelectClass(raw.slice(0, name.getStart(source)) + 'runOutsideAngular' + raw.slice(name.end));
}
const payload = {...review.payload, faults: {
  outsideFocusHide: fault('ngAfterViewInit', 'this._ngZone.run(() => this.hide(0));', 'this._ngZone.runOutsideAngular(() => this.hide(0));'),
  outsideFocusShow: fault('ngAfterViewInit', 'this._ngZone.run(() => this.show());', 'this._ngZone.runOutsideAngular(() => this.show());'),
  outsideClipped: overlayFault(0),
  outsideEscape: overlayFault(1),
  insideAria: fault('_syncAriaDescription', 'this._ngZone.runOutsideAngular(', 'this._ngZone.run('),
  noAriaDestroy: fault('ngOnDestroy', '    this._ariaDescriptionDestroyed = true;', ''),
}};
const loaded = prepareMaterialPublicSubjects(root), results = [], types = [], controls = [];
try {
  const worker = read('tests/tooltip_select_zone_use_subject.mjs');
  for (const model of loaded.models) {
    const declaration = tooltipSelectZonePublicDeclarations(model);
    const fixture = `import{NgZone,QueryList}from'@angular/core';import{Observable,Subject,defer,merge}from'rxjs';import{startWith,switchMap,filter,take,takeUntil}from'rxjs/operators';
interface MatOptionSelectionChange{source:unknown;}interface OptionProtocol{onSelectionChange:Observable<MatOptionSelectionChange>;}
class SelectReceipt{constructor(protected _ngZone:NgZone){}private options?:QueryList<OptionProtocol>;private _initialized=new Subject<void>();private _destroy=new Subject<void>();${review.typed.select}}
class TooltipReceipt{constructor(private _ngZone:NgZone){}[name:string]:any;${review.typed.tooltip}}
declare const zone:NgZone;new SelectReceipt(zone).optionSelectionChanges.subscribe();new TooltipReceipt(zone);const value:number=zone.run(()=>1);
// @ts-expect-error Select retains a required genuine public zone.
new SelectReceipt({});
// @ts-expect-error Tooltip retains a required genuine public zone.
new TooltipReceipt({});
// @ts-expect-error Outside callback is required.
zone.runOutsideAngular(1);
// @ts-expect-error Inside callback is required.
zone.run(1);
// @ts-expect-error Callback result remains typed.
const invalid:string=zone.run(()=>1);
// @ts-expect-error Public stability is readonly.
zone.isStable=true;
// @ts-expect-error Public stable stream is readonly.
zone.onStable=new Subject<void>();
// @ts-expect-error Historical select event payload remains an event object.
const invalidEvents:Observable<boolean>=new SelectReceipt(zone).optionSelectionChanges;
`;
    const path = join(model.root, 'tooltip-select-zone-types.ts'); writeFileSync(path, fixture);
    const program = ts.createProgram([path], {strict: true, noEmit: true, skipLibCheck: false, types: [], target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({...declaration, fixture_sha256: hash(fixture), negative_checks: 8, surrounding_owned_component_state_is_explicit_protocol: true});
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'tooltip-select-zone-use-payload.json'), JSON.stringify(payload));
    const workerPath = join(model.root, 'tooltip-select-zone-use-subject.mjs'); writeFileSync(workerPath, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, ['--max-old-space-size=384', workerPath, model.line, mode, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
      const observed = JSON.parse(stdout.trim().split('\n').at(-1)); assert.equal(observed.cases.length, 6);
      assert.ok(observed.cases.every(row => row.result === 'pass'));
      results.push({line: model.line, mode, production, framework_version: model.packages.get('@angular/core').version,
        zone_subject: zoneSubject, borrowed_dependencies: model.borrowed, ...observed});
    }
    const source = ts.createSourceFile(declaration.path, model.sources.get(declaration.path), ts.ScriptTarget.Latest, true);
    const cls = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'NgZone');
    for (const [id, name, mutate] of [['deprecated-stability-event', 'onStable', raw => '/** @deprecated */\n' + raw],
      ['writable-stability', 'isStable', raw => raw.replace('readonly', '')]]) {
      const member = cls.members.find(node => node.name?.getText(source) === name), from = member.getText(source), to = mutate(from);
      assert.notEqual(from, to); const sources = new Map(model.sources);
      sources.set(declaration.path, source.text.slice(0, member.getStart(source)) + to + source.text.slice(member.end));
      assert.throws(() => tooltipSelectZonePublicDeclarations({...model, sources})); controls.push({line: model.line, id, result: 'rejected'});
    }
  }
  const corruptions = [
    [TOOLTIP, 'optional-tooltip-service', 'private _ngZone: NgZone', 'private _ngZone?: NgZone'],
    [TOOLTIP, 'lost-tooltip-service-type', 'private _ngZone: NgZone', 'private _ngZone: any'],
    [SELECT, 'optional-select-service', 'protected _ngZone: NgZone', 'protected _ngZone?: NgZone'],
    [SELECT, 'lost-select-stability-field', '      this._ngZone.onStable,', '      observableOf(),'],
    [LEAF, 'wrong-inherited-forwarding', 'afterSelectRender(this._ngZone, this._injector)', 'afterSelectRender(undefined, this._injector)'],
    ['projects/ngx-material-legacy/legacy-tooltip/internal/after-tooltip-render.ts', 'changed-tooltip-render-helper', 'if (zone.isStable)', 'if (true)'],
    ['projects/ngx-material-legacy/legacy-select/internal/after-select-render.ts', 'changed-select-render-helper', 'if (zone.isStable)', 'if (true)'],
    [review.fresh_original_reports[0].path, 'forged-tooltip-report', '"schema_version": 1', '"schema_version": 2'],
    [review.fresh_original_reports[1].path, 'forged-select-report', '"schema_version": 1', '"schema_version": 2'],
    ['tests/test_tooltip_render_runtime.py', 'weakened-original-tooltip-assertion', "report['mutation_rejections'], 52", "report['mutation_rejections'], 0"],
  ];
  for (const [path, id, from, to] of corruptions) {
    const changed = Buffer.from(change(read(path).toString(), from, to));
    assert.throws(() => reviewTooltipSelectZoneUses({root, readMember: member => member === path ? changed : read(member)})); controls.push({id, result: 'rejected'});
  }
  const runtimeFaults = results.reduce((sum, row) => sum + row.faults.length, 0); assert.equal(results.length, 10); assert.equal(runtimeFaults, 40); assert.equal(controls.length, 16);
  const report = {schema_version: 1, line: review.line, node: process.version, diagnostic_compiler: ts.version, cases: review.cases,
    sources: review.sources, originals: review.originals, fresh_unchanged_original_producer_reports: review.fresh_original_reports,
    preserved_original_programs: review.preserved_original_programs, public_namespace_capsule_sha256: loaded.capsule_hash,
    public_declarations_and_types: types, runtime_results: results, controls,
    producers: ['scripts/tooltip-select-zone-use-review.mjs', 'tests/tooltip_select_zone_use_probe.mjs', 'tests/tooltip_select_zone_use_subject.mjs',
      'scripts/form-menu-zone-use-review.mjs', 'scripts/menu-snack-zone-use-review.mjs'].map(path => ({path, sha256: hash(read(path))})),
    limits: review.limits, source_imports_reviewed: 2, authored_ledger_integration: 'pending finite integration batch', actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: review.line, source_imports: 2, genuine_zone_subjects: results.length, supplement_cases: 60, supplement_faults: runtimeFaults,
    source_declaration_evidence_controls: controls.length, fresh_original_subjects: 20, fresh_original_faults: 92, actual_native_packed_or_floor_qualified: false}));
} finally {loaded.dispose();}
