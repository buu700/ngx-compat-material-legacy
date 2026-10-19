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
import {reviewSliderZoneUse, emitSliderZoneClass, changeSliderZoneMember, sliderZonePublicDeclarations, SLIDER_ZONE_SOURCE as SOURCE} from '../scripts/slider-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewSliderZoneUse({root}), change = (raw, from, to) => {assert.equal(raw.split(from).length, 2); return raw.replace(from, to);};
const fault = (member, from, to) => emitSliderZoneClass(changeSliderZoneMember(review.raw, member, from, to));
const payload = {...review.payload, faults: {
  insideRegistration: fault('constructor', '_ngZone.runOutsideAngular(', '_ngZone.run('),
  noReentry: fault('_pointerDown', 'this._ngZone.run(', 'this._ngZone.runOutsideAngular('),
  noMouseRemove: fault('ngOnDestroy', "element.removeEventListener('mousedown', this._pointerDown, activeEventOptions);", ''),
  noTouchRemove: fault('ngOnDestroy', "element.removeEventListener('touchstart', this._pointerDown, activeEventOptions);", ''),
  noGlobalMoveRemove: fault('_removeGlobalEvents', "document.removeEventListener('mousemove', this._pointerMove, activeEventOptions);", ''),
  noDisabledGuard: fault('_pointerDown', 'this.disabled || ', ''),
  noActiveGuard: fault('_pointerDown', 'this._isSliding || ', ''),
  noPrimaryGuard: fault('_pointerDown', '(!isTouchEvent(event) && event.button !== 0)', 'false'),
}};
const loaded = prepareMaterialPublicSubjects(root), results = [], types = [], controls = [];
try {
  const worker = read('tests/slider_zone_use_subject.mjs');
  for (const model of loaded.models) {
    const declaration = sliderZonePublicDeclarations(model);
    const fixture = `import{NgZone}from'@angular/core';${review.typed.helpers}
class Receipt{constructor(private _ngZone:NgZone){}[name:string]:any;${review.typed.pointerDown}}
declare const zone:NgZone;new Receipt(zone);const value:number=zone.run(()=>1);const outside:string=zone.runOutsideAngular(()=>'value');
// @ts-expect-error A public required zone cannot be omitted.
new Receipt();
// @ts-expect-error A public zone type is required.
new Receipt({});
// @ts-expect-error Inside callback must be callable.
zone.run(1);
// @ts-expect-error Outside callback must be callable.
zone.runOutsideAngular(1);
// @ts-expect-error Callback return type is preserved.
const bad:string=zone.run(()=>1);
// @ts-expect-error Pointer helpers require the browser event shape.
getPointerPositionOnPage({},undefined);
// @ts-expect-error Matching touch helper requires a browser TouchList.
findMatchingTouch({},1);
// @ts-expect-error Touch host remains an HTMLElement.
getTouchIdForSlider({} as TouchEvent,{});
`;
    const path = join(model.root, 'slider-zone-types.ts'); writeFileSync(path, fixture);
    const program = ts.createProgram([path], {strict: true, noEmit: true, skipLibCheck: false, types: [], target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({...declaration, fixture_sha256: hash(fixture), negative_checks: 8, surrounding_owned_state_is_explicit_protocol: true});
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'slider-zone-use-payload.json'), JSON.stringify(payload));
    const workerPath = join(model.root, 'slider-zone-use-subject.mjs'); writeFileSync(workerPath, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, ['--max-old-space-size=384', workerPath, model.line, mode, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
      const observed = JSON.parse(stdout.trim().split('\n').at(-1)); assert.equal(observed.cases.length, 8);
      assert.ok(observed.cases.every(row => row.result === 'pass'));
      results.push({line: model.line, mode, production, framework_version: model.packages.get('@angular/core').version,
        zone_subject: zoneSubject, borrowed_dependencies: model.borrowed, ...observed});
    }
    const source = ts.createSourceFile(declaration.path, model.sources.get(declaration.path), ts.ScriptTarget.Latest, true);
    const cls = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'NgZone');
    for (const [id, name, mutate] of [['deprecated-inside-method', 'run', raw => '/** @deprecated */\n' + raw],
      ['wrong-outside-return', 'runOutsideAngular', raw => raw.replace(/:\s*T;$/, ': string;')]]) {
      const member = cls.members.find(node => node.name?.getText(source) === name), from = member.getText(source), to = mutate(from);
      assert.notEqual(from, to); const sources = new Map(model.sources);
      sources.set(declaration.path, source.text.slice(0, member.getStart(source)) + to + source.text.slice(member.end));
      assert.throws(() => sliderZonePublicDeclarations({...model, sources})); controls.push({line: model.line, id, result: 'rejected'});
    }
  }
  const corruptions = [
    [SOURCE, 'optional-service', 'private _ngZone: NgZone', 'private _ngZone?: NgZone'],
    [SOURCE, 'lost-service-type', 'private _ngZone: NgZone', 'private _ngZone: any'],
    [SOURCE, 'inside-registration-member', '\n    _ngZone.runOutsideAngular(', '\n    _ngZone.run('],
    [SOURCE, 'escaped-constructor-service', '\n    _ngZone.runOutsideAngular(', '\n    const leaked = _ngZone;\n    _ngZone.runOutsideAngular('],
    [SOURCE, 'changed-pointer-guard', '(!isTouchEvent(event) && event.button !== 0)', 'false'],
    [SOURCE, 'wrong-teardown-handler', "element.removeEventListener('mousedown', this._pointerDown, activeEventOptions);", "element.removeEventListener('mousedown', this._pointerUp, activeEventOptions);"],
    [SOURCE, 'changed-pointer-helper', "return event.type[0] === 't';", "return event.type[0] === 'm';"],
    [review.originals[0].path, 'forged-original-reference', 'Copyright Google LLC All Rights Reserved.', 'Changed reference'],
    [review.originals[1].path, 'forged-archive-capsule', '"schema_version": 1', '"schema_version": 2'],
  ];
  for (const [path, id, from, to] of corruptions) {
    const changed = Buffer.from(change(read(path).toString(), from, to));
    assert.throws(() => reviewSliderZoneUse({root, readMember: member => member === path ? changed : read(member)})); controls.push({id, result: 'rejected'});
  }
  const compressedPath = review.originals[2].path, altered = Buffer.from(read(compressedPath)); altered[altered.length - 1] ^= 1;
  assert.throws(() => reviewSliderZoneUse({root, readMember: path => path === compressedPath ? altered : read(path)})); controls.push({id: 'corrupted-original-runtime-member', result: 'rejected'});
  const runtimeFaults = results.reduce((sum, row) => sum + row.faults.length, 0); assert.equal(results.length, 10); assert.equal(runtimeFaults, 78); assert.equal(controls.length, 16);
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const report = {schema_version: 1, line, node: process.version, diagnostic_compiler: ts.version, case: review.case, sources: review.sources, originals: review.originals,
    public_namespace_capsule_sha256: loaded.capsule_hash, public_declarations_and_types: types, runtime_results: results, controls,
    producers: ['scripts/slider-zone-use-review.mjs', 'tests/slider_zone_use_probe.mjs', 'tests/slider_zone_use_subject.mjs', 'scripts/form-menu-zone-use-review.mjs'].map(path => ({path, sha256: hash(read(path))})),
    limits: review.limits, source_imports_reviewed: 1, authored_ledger_integration: 'pending finite integration batch', actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line, source_imports: 1, genuine_zone_subjects: results.length, protocol_cases: 80, behavioral_faults: runtimeFaults,
    source_declaration_reference_controls: controls.length, actual_native_packed_or_floor_qualified: false}));
} finally {loaded.dispose();}
