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
import {reviewChipZoneUse, emitChipZoneClass, changeChipZoneMethod, chipZonePublicDeclarations} from '../scripts/chip-zone-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const review = reviewChipZoneUse({root}), current = review.current;
const mutant = (name, from, to) => emitChipZoneClass(changeChipZoneMethod(current, name, from, to));
const payload = {...review.payload, mutations: {
  prior: review.payload.original,
  noDestroyCancel: mutant('ngOnDestroy', 'this._blurSubscription?.unsubscribe();', ''),
  noFocusCancel: mutant('focus', 'this._blurSubscription?.unsubscribe();', ''),
  noReplaceCancel: mutant('_blur', 'this._blurSubscription?.unsubscribe();', ''),
  noEntryGuard: mutant('_blur', 'if (this._isDestroyed) return;', ''),
  noFallback: mutant('_blur', 'if (this._ngZone.isStable) {\n      Promise.resolve().then(apply);\n    }', ''),
  noZoneRun: mutant('_blur', 'this._ngZone.run(() => {\n        this._hasFocus = false;\n        this._onBlur.next({chip: this});\n      });',
    '(() => {\n        this._hasFocus = false;\n        this._onBlur.next({chip: this});\n      })();'),
  lateFocusLatch: mutant('focus', 'this._hasFocus = true;\n      this._elementRef.nativeElement.focus();',
    'this._elementRef.nativeElement.focus();\n      this._hasFocus = true;'),
}};
const loaded = prepareMaterialPublicSubjects(root), results = [], types = [], controls = [];
try {
  const worker = read('tests/chip_zone_use_subject.mjs');
  for (const model of loaded.models) {
    const declarations = chipZonePublicDeclarations(model);
    const fixture = `import {NgZone} from '@angular/core';import {Subject,Subscription} from 'rxjs';import {take} from 'rxjs/operators';
export class Receipt{private _isDestroyed=false;private _blurSubscription?:Subscription;_hasFocus=true;
readonly _onBlur=new Subject<{chip:Receipt}>();constructor(private _ngZone:NgZone){}
${review.blur_method}}
declare const zone:NgZone;new Receipt(zone)._blur();const inside:number=zone.run(()=>1);
// @ts-expect-error The required public service contract cannot be omitted.
new Receipt({});
// @ts-expect-error Public stability is readonly.
zone.isStable=true;
// @ts-expect-error The run callback must be callable.
zone.run(1);
// @ts-expect-error The run callback result remains typed.
const badResult:string=zone.run(()=>1);
// @ts-expect-error Blur notification preserves chip identity.
new Receipt(zone)._onBlur.next({chip:1});
// @ts-expect-error The request lifetime remains private.
new Receipt(zone)._blurSubscription;
`;
    const path = join(model.root, 'chip-zone-type-contract.ts'); writeFileSync(path, fixture);
    const program = ts.createProgram([path], {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noEmit: true, skipLibCheck: false,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    types.push({...declarations, fixture_sha256: hash(fixture), strict_compile: true, negative_checks: 6});
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'chip-zone-use-payload.json'), JSON.stringify(payload));
    const workerPath = join(model.root, 'chip-zone-use-subject.mjs'); writeFileSync(workerPath, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, ['--max-old-space-size=384', workerPath, model.line, mode, String(production)],
        {cwd: model.root, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
      const observed = JSON.parse(stdout.trim().split('\n').at(-1));
      assert.equal(observed.cases.length, 10); assert.ok(observed.cases.every(row => row.result === 'pass'));
      results.push({line: model.line, mode, production, framework_version: model.packages.get('@angular/core').version,
        zone_subject: zoneSubject, borrowed_dependencies: model.borrowed, ...observed});
    }
    for (const [id, from, to] of [['readonly-stability', 'readonly isStable: boolean', 'isStable: boolean'],
      ['stability-type', 'readonly isStable: boolean', 'readonly isStable: string']]) {
      const sources = new Map(model.sources), original = sources.get(declarations.path);
      assert.equal(original.split(from).length, 2); sources.set(declarations.path, original.replace(from, to));
      assert.throws(() => chipZonePublicDeclarations({...model, sources}));
      controls.push({line: model.line, id, result: 'rejected'});
    }
  }
  const chipPath = 'projects/ngx-material-legacy/legacy-chips/chip.ts';
  for (const [id, from, to] of [
    ['optional-service', 'private _ngZone: NgZone', 'private _ngZone?: NgZone'],
    ['lost-service-type', 'private _ngZone: NgZone', 'private _ngZone: any'],
    ['private-member', 'this._ngZone.isStable', 'this._ngZone._isStable'],
    ['new-receiver-escape', 'this._chipRipple = new RippleRenderer', 'const escapedZone = _ngZone;\n    this._chipRipple = new RippleRenderer'],
  ]) {
    assert.equal(current.split(from).length, 2); const changed = Buffer.from(current.replace(from, to));
    assert.throws(() => reviewChipZoneUse({root, readMember: path => path === chipPath ? changed : read(path)}));
    controls.push({id, result: 'rejected'});
  }
  assert.equal(results.length, 10);
  const mutations = results.flatMap(result => result.mutations); assert.equal(mutations.length, 76);
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const report = {schema_version: 1, line, node: process.version, diagnostic_compiler: ts.version,
    namespace_capsule_sha256: loaded.capsule_hash, case: review.case, sources: review.sources,
    originals: review.originals, current_focus_contract: review.focus, public_declarations_and_types: types,
    runtime_results: results, controls, source_imports_reviewed: 1,
    producer: ['scripts/chip-zone-use-review.mjs', 'tests/chip_zone_use_probe.mjs', 'tests/chip_zone_use_subject.mjs']
      .map(path => ({path, sha256: hash(read(path))})),
    limits: review.limits + ' Public application root providers execute with document/renderer protocols; this is not a native bootstrap or compiled legacy component factory. Diagnostic compilers and borrowed host RxJS/tslib do not qualify all advertised minima. NgZone is a real constructor dependency; no erased-only or nominal token-payload proof is inferred.',
    authored_ledger_integration: 'pending finite integration batch', actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line, source_imports: 1, genuine_zone_subjects: results.length,
    current_protocol_cases: results.reduce((total, result) => total + result.cases.length, 0),
    runtime_mutations_rejected: mutations.length, source_declaration_controls: controls.length,
    actual_native_packed_or_floor_qualified: false}));
} finally { loaded.dispose(); }
