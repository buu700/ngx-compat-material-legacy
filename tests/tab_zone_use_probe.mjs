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
import {reviewTabZoneUses, emitTabZoneClass, changeTabZoneMethod, tabZonePublicDeclarations, HEADER, BODY} from '../scripts/tab-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewTabZoneUses({root}), change = (raw, from, to) => {assert.equal(raw.split(from).length, 2); return raw.replace(from, to);};
const headerFault = (method, from, to) => emitTabZoneClass(changeTabZoneMethod(review.rawHeader, false, method, from, to));
const bodyFault = (method, from, to) => emitTabZoneClass(changeTabZoneMethod(review.rawBody, true, method, from, to), true);
const bodySource = ts.createSourceFile('body.ts', review.rawBody, ts.ScriptTarget.Latest, true);
const factory = bodySource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'tabBodyNgZone');
const swallowed = `function tabBodyNgZone(): NgZone | null {try {assertInInjectionContext(tabBodyNgZone);return inject(NgZone,{optional:true});}catch{return null;}}`;
const payload = {...review.payload, faults: {
  insideMouseleave: emitTabZoneClass(change(review.rawHeader, '\n    _ngZone.runOutsideAngular(', '\n    _ngZone.run(')),
  outsideContent: headerFault('_onContentChanges', 'this._ngZone.run(', 'this._ngZone.runOutsideAngular('),
  outsideViewport: headerFault('ngAfterContentInit', 'this._ngZone.run(', 'this._ngZone.runOutsideAngular('),
  insideResize: headerFault('_itemsResized', 'this._ngZone.runOutsideAngular(', 'this._ngZone.run('),
  noContextGuard: emitTabZoneClass(change(review.rawBody, '    assertInInjectionContext(tabBodyNgZone);', ''), true),
  requiredService: emitTabZoneClass(change(review.rawBody, 'return inject(NgZone, {optional: true});', 'return inject(NgZone);'), true),
  swallowedError: emitTabZoneClass(review.rawBody.slice(0, factory.getStart(bodySource)) + swallowed + review.rawBody.slice(factory.end), true),
  noBodyCancel: bodyFault('ngOnDestroy', '      clearTimeout(this._fallbackTimer);', ''),
  insideBodyTimer: bodyFault('_scheduleTransitionDone', 'this._ngZone.runOutsideAngular(', 'this._ngZone.run('),
  noBodyReentry: bodyFault('_scheduleTransitionDone', 'this._ngZone.run(() => this._finishTransition(transition));', 'this._finishTransition(transition);'),
}};
const loaded = prepareMaterialPublicSubjects(root), results = [], types = [], controls = [];
try {
  const worker = read('tests/tab_zone_use_subject.mjs');
  for (const model of loaded.models) {
    const declaration = tabZonePublicDeclarations(model);
    const fixture = `import{NgZone,Injector,ElementRef,QueryList,inject,assertInInjectionContext}from'@angular/core';
import{FocusKeyManager,FocusOrigin}from'@angular/cdk/a11y';import{Subject,Observable,Observer,EMPTY,merge,of as observableOf}from'rxjs';
import{takeUntil,debounceTime,startWith,switchMap,skip,filter}from'rxjs/operators';
interface MatPaginatedTabHeaderItem{elementRef:ElementRef<HTMLElement>;disabled?:boolean;focus(origin?:FocusOrigin):void;}
declare function ownedHeaderResize(element:Element,zone:NgZone):Observable<ResizeObserverEntry[]>;
declare function afterTabHeaderRender(zone:NgZone,injector:Injector|null):Observable<void>;
class HeaderReceipt{constructor(private _ngZone:NgZone){}[name:string]:any;
private _renderInjector:Injector|null=null;private _items!:QueryList<MatPaginatedTabHeaderItem>;private _destroyed=new Subject<void>();
private _keyManager!:FocusKeyManager<MatPaginatedTabHeaderItem>;
${review.typed.header}}
${review.typed.bodyFactory}
interface LegacyTabTransitionEvent{fromState:string;toState:string;}
class BodyReceipt{[name:string]:any;private readonly _ngZone=tabBodyNgZone();${review.typed.body}}
declare const zone:NgZone;new HeaderReceipt(zone);const maybe:NgZone|null=tabBodyNgZone();const value:number=zone.run(()=>1);
// @ts-expect-error The header zone is a genuine public service.
new HeaderReceipt({});
// @ts-expect-error Outside callback must be callable.
zone.runOutsideAngular(1);
// @ts-expect-error Synchronous callback must be callable.
zone.run(1);
// @ts-expect-error Callback result type is preserved.
const bad:string=zone.run(()=>1);
// @ts-expect-error Optional public zone can be absent.
const always:NgZone=tabBodyNgZone();
// @ts-expect-error Public stability is readonly.
zone.isStable=true;
// @ts-expect-error Helper forwarding retains a genuine public zone.
afterTabHeaderRender({},null);
// @ts-expect-error Owned resize helper retains the browser Element shape.
ownedHeaderResize({},zone);
`;
    const path = join(model.root, 'tab-zone-types.ts'); writeFileSync(path, fixture);
    const program = ts.createProgram([path], {strict: true, noEmit: true, skipLibCheck: false, types: [], target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({...declaration, fixture_sha256: hash(fixture), negative_checks: 8, surrounding_owned_state_is_explicit_protocol: true});
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'tab-zone-use-payload.json'), JSON.stringify(payload));
    const workerPath = join(model.root, 'tab-zone-use-subject.mjs'); writeFileSync(workerPath, worker);
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
    for (const [id, name, mutate] of [['deprecated-outside-method', 'runOutsideAngular', raw => '/** @deprecated */\n' + raw],
      ['wrong-inside-return', 'run', raw => raw.replace(/:\s*T;$/, ': string;')]]) {
      const member = cls.members.find(node => node.name?.getText(source) === name), from = member.getText(source), to = mutate(from);
      assert.notEqual(from, to); const sources = new Map(model.sources);
      sources.set(declaration.path, source.text.slice(0, member.getStart(source)) + to + source.text.slice(member.end));
      assert.throws(() => tabZonePublicDeclarations({...model, sources})); controls.push({line: model.line, id, result: 'rejected'});
    }
  }
  const corruptions = [
    [HEADER, 'optional-header-service', 'private _ngZone: NgZone', 'private _ngZone?: NgZone'],
    [HEADER, 'lost-header-service-type', 'private _ngZone: NgZone', 'private _ngZone: any'],
    [HEADER, 'wrong-owned-resize-forwarding', 'ownedHeaderResize(this._elementRef.nativeElement, this._ngZone)', 'ownedHeaderResize(this._elementRef.nativeElement, undefined)'],
    [BODY, 'required-service-lookup', 'return inject(NgZone, {optional: true});', 'return inject(NgZone);'],
    [BODY, 'mutable-optional-field', 'private readonly _ngZone =', 'private _ngZone ='],
    [BODY, 'suppressed-service-lookup', 'return inject(NgZone, {optional: true});', 'return null;'],
    ['projects/ngx-material-legacy/legacy-tabs/internal/after-tab-header-render.ts', 'changed-historical-render-helper', 'if (zone.isStable)', 'if (true)'],
    [review.reused_header.path, 'forged-header-report', '"schema_version": 1', '"schema_version": 2'],
    [review.fresh_original_motion.path, 'forged-motion-report', '"passed": 47', '"passed": 46'],
    ['tests/tab_body_motion_runtime_probe.mjs', 'weakened-original-motion-assertion', 'assert.equal(result.failed,0,', 'assert.equal(result.failed,1,'],
  ];
  for (const [path, id, from, to] of corruptions) {
    const changed = Buffer.from(change(read(path).toString(), from, to));
    assert.throws(() => reviewTabZoneUses({root, readMember: member => member === path ? changed : read(member)})); controls.push({id, result: 'rejected'});
  }
  const runtimeFaults = results.reduce((sum, row) => sum + row.faults.length, 0); assert.equal(results.length, 10); assert.equal(runtimeFaults, 82); assert.equal(controls.length, 16);
  const report = {schema_version: 1, line: review.line, node: process.version, diagnostic_compiler: ts.version, cases: review.cases,
    sources: review.sources, originals: review.originals, reused_header: review.reused_header, fresh_original_motion: review.fresh_original_motion,
    public_namespace_capsule_sha256: loaded.capsule_hash, public_declarations_and_types: types, runtime_results: results, controls,
    producers: ['scripts/tab-zone-use-review.mjs', 'tests/tab_zone_use_probe.mjs', 'tests/tab_zone_use_subject.mjs', 'scripts/form-menu-zone-use-review.mjs'].map(path => ({path, sha256: hash(read(path))})),
    limits: review.limits, source_imports_reviewed: 2, authored_ledger_integration: 'pending finite integration batch', actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: review.line, source_imports: 2, genuine_zone_subjects: results.length, supplement_cases: 80, supplement_faults: runtimeFaults,
    source_declaration_evidence_controls: controls.length, reused_header_subjects: 10, reused_header_faults: 32, original_body_cases: 47, original_body_faults: 22,
    actual_native_packed_or_floor_qualified: false}));
} finally {loaded.dispose();}
