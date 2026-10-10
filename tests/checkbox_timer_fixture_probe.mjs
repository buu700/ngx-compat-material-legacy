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
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkboxTimerLifetimeFixture, legacyCheckboxTimerLifetimeNativeOkay} from '../scripts/checkbox-timer-lifetime-fixture.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), parser = require('typescript');
const compilerPath = process.env.CLOSEOUT_TYPESCRIPT_ROOT ? join(resolve(process.env.CLOSEOUT_TYPESCRIPT_ROOT), 'lib/typescript.js') : require.resolve('typescript');
const compiler = require(compilerPath), hash = value => createHash('sha256').update(value).digest('hex');
if (process.env.CLOSEOUT_TYPESCRIPT_ROOT) assert.equal(compiler.version, JSON.parse(readFileSync(join(process.env.CLOSEOUT_TYPESCRIPT_ROOT, 'package.json'))).version);
const loaded = prepareMaterialPublicSubjects(root), results = [], strictTypes = [];
try {
  const emitted = parser.transpileModule(checkboxTimerLifetimeFixture, {compilerOptions: {
    target: parser.ScriptTarget.ES2022, module: parser.ModuleKind.CommonJS, experimentalDecorators: true}, reportDiagnostics: true});
  assert.equal(emitted.diagnostics.length, 0);
  const worker = readFileSync(join(root, 'tests/checkbox_timer_fixture_subject.mjs'), 'utf8');
  for (const model of loaded.models.filter(model => model.line !== 'original')) {
    const header = `import {Component, Directive, ViewChild, TemplateRef, ViewContainerRef, signal, inject, Injector, afterNextRender} from '@angular/core';
      declare class MatLegacyCheckbox {checked: boolean;}\n`;
    const fixture = join(model.root, 'checkbox-timer-fixture-types.ts');
    const options = {strict: true, noEmit: true, skipLibCheck: false, types: [], target: compiler.ScriptTarget.ES2022,
      module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler, experimentalDecorators: true,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
    const check = source => {writeFileSync(fixture, header + source); return compiler.getPreEmitDiagnostics(compiler.createProgram([fixture], options));};
    assert.deepEqual(check(checkboxTimerLifetimeFixture).map(d => compiler.flattenDiagnosticMessageText(d.messageText, '\n')), []);
    const invalid = checkboxTimerLifetimeFixture.replace('createEmbeddedView(this.template)', "createEmbeddedView('invalid')");
    assert.notEqual(invalid, checkboxTimerLifetimeFixture);
    const invalidDiagnostics = check(invalid);
    assert.ok(invalidDiagnostics.some(d => d.code === 2769), JSON.stringify(invalidDiagnostics.map(d => ({code: d.code, text: compiler.flattenDiagnosticMessageText(d.messageText, '\n')}))));
    strictTypes.push({line: model.line, compiler: compiler.version, negative_checks: 1,
      genuine_core_declarations: true, owned_checkbox_declaration_protocol: true});
    const zone = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'checkbox-timer-fixture-payload.json'), JSON.stringify({fixture: emitted.outputText, contract: legacyCheckboxTimerLifetimeNativeOkay.toString()}));
    const path = join(model.root, 'checkbox-timer-fixture-subject.mjs'); writeFileSync(path, worker);
    for (const mode of ['zoneful', 'zoneless']) for (const production of [false, true]) for (const variant of ['live', 'old-cleanup', 'late-write', 'untrusted-animation']) {
      const output = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=512', path, mode, String(production), variant],
        {cwd: model.root, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024}));
      results.push({line: model.line, mode, production, zone_subject: zone, borrowed: model.borrowed, ...output});
    }
  }
  assert.equal(results.length, 32);
  const report = {schema_version: 1, node: process.version, parser: parser.version,
    strict_compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)),
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: hash(worker),
    shared_fixture_sha256: hash(checkboxTimerLifetimeFixture), public_namespace_capsule_sha256: loaded.capsule_hash,
    results, strict_types: strictTypes,
    scope: 'Whole shared fixture with genuine public Angular query/node DI/embedded-view scheduled initialization and destruction. Only initial application tick; signal/afterNextRender handles later view initialization. Checkbox, renderer/DOM/input/classList/MutationObserver/computed CSS/trusted event and deterministic timer/performance clock are explicit protocols. Old cleanup, late class writes and untrusted animation fail. No actual legacy checkbox/native CSS/timer/packed/AOT/consumer/Node/Rx floor qualification.'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({subjects: 8, cases: 32, negative_variants: 24, strict_compiler: compiler.version,
    actual_legacy_checkbox_executed: false, native_executed: false}));
} finally {loaded.dispose();}
