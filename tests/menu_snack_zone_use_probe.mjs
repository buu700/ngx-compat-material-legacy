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
import {reviewMenuSnackZoneUses, emitMenuSnackZoneClass, changeSnackZoneMethod, menuSnackZonePublicDeclarations,
  MENU_ZONE_SOURCE as MENU, SNACK_ZONE_SOURCE as SNACK} from '../scripts/menu-snack-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewMenuSnackZoneUses({root}), change = (raw, from, to) => {assert.equal(raw.split(from).length, 2); return raw.replace(from, to);};
const fault = (method, from, to) => emitMenuSnackZoneClass(changeSnackZoneMethod(review.payload.snackRaw, method, from, to), true);
const payload = {menu: review.payload.menu, snack: review.payload.snack, faults: {
  stringOutside: fault('onAnimationEnd', '\n        this._ngZone.run(', '\n        this._ngZone.runOutsideAngular('),
  stateOutside: fault('onAnimationEnd', '\n      this._ngZone.run(', '\n      this._ngZone.runOutsideAngular('),
  notifyOutside: fault('_notifyEnter', 'this._ngZone.run(', 'this._ngZone.runOutsideAngular('),
  exitOutside: fault('exit', 'this._ngZone.run(', 'this._ngZone.runOutsideAngular('),
  insideAnnouncement: fault('_screenReaderAnnounce', 'this._ngZone.runOutsideAngular(', 'this._ngZone.run('),
  noCancel: fault('ngOnDestroy', '    clearTimeout(this._announceTimeoutId);', ''),
}};
const loaded = prepareMaterialPublicSubjects(root), results = [], types = [], controls = [];
try {
  const worker = read('tests/menu_snack_zone_use_subject.mjs');
  for (const model of loaded.models) {
    const declaration = menuSnackZonePublicDeclarations(model);
    const fixture = `import{NgZone}from'@angular/core';import{FocusOrigin}from'@angular/cdk/a11y';
import{Observable,Subject,Subscription}from'rxjs';import{take}from'rxjs/operators';
class MenuReceipt{constructor(private _ngZone:NgZone){}[name:string]:any;${review.typedMethods.menu}}
class SnackReceipt{constructor(private _ngZone:NgZone){}[name:string]:any;readonly _onExit=new Subject<void>();${review.typedMethods.snack}}
declare const zone:NgZone;new MenuReceipt(zone).focusFirstItem('touch');new SnackReceipt(zone).exit();
const value:number=zone.run(()=>1);const outside:string=zone.runOutsideAngular(()=>'value');
// @ts-expect-error Required menu service cannot be omitted.
new MenuReceipt();
// @ts-expect-error Menu zone remains typed.
new MenuReceipt({});
// @ts-expect-error Snack zone remains typed.
new SnackReceipt({});
// @ts-expect-error Public stability remains readonly.
zone.isStable=true;
// @ts-expect-error Stable event stream remains readonly.
zone.onStable=new Subject<void>();
// @ts-expect-error Exit notifications retain their void payload.
new SnackReceipt(zone)._onExit.next(true);
// @ts-expect-error Focus origins retain public finite literals.
new MenuReceipt(zone).focusFirstItem('foreign');
// @ts-expect-error Synchronous run preserves callback result type.
const invalid:string=zone.run(()=>1);
`;
    const path = join(model.root, 'menu-snack-zone-types.ts'); writeFileSync(path, fixture);
    const program = ts.createProgram([path], {strict: true, noEmit: true, skipLibCheck: false, types: [], target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({...declaration, fixture_sha256: hash(fixture), negative_checks: 8, surrounding_owned_component_state_is_explicit_protocol: true});
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'menu-snack-zone-use-payload.json'), JSON.stringify(payload));
    const workerPath = join(model.root, 'menu-snack-zone-use-subject.mjs'); writeFileSync(workerPath, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, ['--max-old-space-size=384', workerPath, model.line, mode, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
      const observed = JSON.parse(stdout.trim().split('\n').at(-1)); assert.equal(observed.cases.length, 7);
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
      assert.throws(() => menuSnackZonePublicDeclarations({...model, sources})); controls.push({line: model.line, id, result: 'rejected'});
    }
  }
  const corruptions = [
    [MENU, 'optional-menu-service', 'private _ngZone: NgZone', 'private _ngZone?: NgZone'],
    [MENU, 'lost-menu-overload-type', '    ngZone: NgZone,', '    ngZone: any,', true],
    [MENU, 'discarded-real-menu-stability', 'if (this._ngZone.isStable)', 'if (true)'],
    [SNACK, 'lost-snack-service-type', 'private _ngZone: NgZone', 'private _ngZone: any'],
    [SNACK, 'writable-zone-alias', 'const zone = this._ngZone;', 'let zone = this._ngZone;'],
    [SNACK, 'escaped-zone-alias', 'const zone = this._ngZone;', 'const leaked = this._ngZone;\n    const zone = this._ngZone;'],
    [SNACK, 'inside-announcement-member', 'this._ngZone.runOutsideAngular(', 'this._ngZone.run('],
    [review.fresh_reports[0].path, 'forged-menu-report', '"schema_version": 1', '"schema_version": 2'],
    [review.fresh_reports[1].path, 'forged-snack-report', '"schema_version": 1', '"schema_version": 2'],
    ['tests/test_snack_exit_runtime.py', 'weakened-original-regression-assertion', "report['mutation_rejections'], 54", "report['mutation_rejections'], 0"],
  ];
  for (const [path, id, from, to, firstOnly] of corruptions) {
    const raw = read(path).toString(); if (firstOnly) assert.ok(raw.split(from).length > 1);
    const changed = Buffer.from(firstOnly ? raw.replace(from, to) : change(raw, from, to));
    assert.throws(() => reviewMenuSnackZoneUses({root, readMember: member => member === path ? changed : read(member)}));
    controls.push({id, result: 'rejected'});
  }
  const runtimeFaults = results.reduce((sum, row) => sum + row.faults.length, 0); assert.equal(results.length, 10); assert.equal(runtimeFaults, 46); assert.equal(controls.length, 16);
  const report = {schema_version: 1, line: review.line, node: process.version, diagnostic_compiler: ts.version, cases: review.cases,
    sources: review.sources, originals: review.originals, fresh_unchanged_original_producer_reports: review.fresh_reports,
    preserved_original_programs: review.preserved_original_programs, public_namespace_capsule_sha256: loaded.capsule_hash,
    public_declarations_and_types: types, runtime_results: results, controls,
    producers: ['scripts/menu-snack-zone-use-review.mjs', 'tests/menu_snack_zone_use_probe.mjs', 'tests/menu_snack_zone_use_subject.mjs', 'scripts/form-menu-zone-use-review.mjs']
      .map(path => ({path, sha256: hash(read(path))})), limits: review.limits, source_imports_reviewed: 2,
    authored_ledger_integration: 'pending finite integration batch', actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: review.line, source_imports: 2, genuine_zone_subjects: results.length, supplement_cases: 70,
    supplement_behavioral_faults: runtimeFaults, source_declaration_evidence_controls: controls.length, fresh_original_subjects: 20,
    fresh_original_behavioral_faults: 94, actual_native_packed_or_floor_qualified: false}));
} finally {loaded.dispose();}
