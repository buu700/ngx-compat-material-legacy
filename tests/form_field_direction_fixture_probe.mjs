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
import {formFieldDirectionLifetimeFixture} from '../scripts/form-field-direction-lifetime-fixture.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const ts = createRequire(import.meta.url)('typescript'), root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const compilerPath = process.env.CLOSEOUT_TYPESCRIPT_ROOT ?
  join(resolve(process.env.CLOSEOUT_TYPESCRIPT_ROOT), 'lib/typescript.js') : createRequire(import.meta.url).resolve('typescript');
const compiler = createRequire(import.meta.url)(compilerPath);
if (process.env.CLOSEOUT_TYPESCRIPT_ROOT) assert.equal(compiler.version,
  JSON.parse(readFileSync(join(resolve(process.env.CLOSEOUT_TYPESCRIPT_ROOT), 'package.json'))).version);
const typesOnly = process.argv.includes('--types-only');
const reportPath = process.argv.slice(2).find(argument => !argument.startsWith('--'));
const emitted = ts.transpileModule(formFieldDirectionLifetimeFixture, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true}, reportDiagnostics: true});
assert.equal(emitted.diagnostics.length, 0);
const loaded = prepareMaterialPublicSubjects(root), results = [], strictTypes = [];
try {
  const worker = readFileSync(join(root, 'tests/form_field_direction_fixture_subject.mjs'), 'utf8');
  for (const model of loaded.models.filter(model => model.line !== 'original')) {
    const header = `import {Component, Directive, ViewChild, TemplateRef, ViewContainerRef, signal,
      inject, Injector, afterNextRender} from '@angular/core';
      import {Directionality, Dir} from '@angular/cdk/bidi';
      declare class MatLegacyFormField {updateOutlineGap(): void;}\n`;
    const fixture = join(model.root, 'field-direction-types.ts');
    const options = {strict:true, noEmit:true, skipLibCheck:false, types:[], target:compiler.ScriptTarget.ES2022,
      module:compiler.ModuleKind.ESNext, moduleResolution:compiler.ModuleResolutionKind.Bundler,
      experimentalDecorators:true, lib:['lib.es2022.d.ts','lib.dom.d.ts']};
    const check = source => {
      writeFileSync(fixture, header + source);
      return compiler.getPreEmitDiagnostics(compiler.createProgram([fixture], options));
    };
    const diagnostics = check(formFieldDirectionLifetimeFixture);
    assert.deepEqual(diagnostics.map(d => compiler.flattenDiagnosticMessageText(d.messageText, '\n')), []);
    const invalidDirection = formFieldDirectionLifetimeFixture.replaceAll("direction.change.emit('rtl')", "direction.change.emit('invalid')");
    assert.notEqual(invalidDirection, formFieldDirectionLifetimeFixture);
    assert.ok(check(invalidDirection).some(d => d.code === 2345), 'genuine Dir event type rejects an invalid direction');
    strictTypes.push({line:model.line, compiler:compiler.version, negative_checks:1,
      genuine_core_and_cdk_declarations:true, legacy_field_declaration_protocol:true});
    if (typesOnly) continue;
    const zone = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'field-direction-fixture-payload.json'), JSON.stringify({fixture: emitted.outputText}));
    const path = join(model.root, 'field-direction-fixture-subject.mjs'); writeFileSync(path, worker);
    for (const mode of ['zoneful', 'zoneless']) for (const production of [false, true]) {
      for (const variant of ['live', 'missing-subscription', 'late-frame']) {
        const output = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=512', path, mode, String(production), variant],
          {cwd: model.root, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024}));
        results.push({line: model.line, mode, production, zone_subject: zone, borrowed: model.borrowed, ...output});
      }
    }
  }
  assert.equal(results.length, typesOnly ? 0 : 24);
  const report = {schema_version: 1, node: process.version, compiler: ts.version,
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))),
    types_only: typesOnly, strict_compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)),
    shared_fixture_sha256: hash(formFieldDirectionLifetimeFixture), worker_sha256: hash(worker),
    public_namespace_capsule_sha256: loaded.capsule_hash, results, strict_types:strictTypes,
    scope: typesOnly ? 'Strict genuine public Core/CDK declarations and explicit owned declaration protocols only; no runtime cases execute in this mode.' : 'Complete shared fixture; genuine current public Angular component/module/query/embedded-view/automatic render/node DI and CDK Dir. Initial app tick only; no manual embedded-view detectChanges or subsequent app tick. Field, renderer/DOM and RAF/cancellation are protocols. Missing live subscription fails; retained frames produce two late updates. No actual legacy field/native clock/CSS/packed/AOT/consumer/Node/Rx floor qualification.'};
  if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({subjects: typesOnly ? 0 : 8, cases: results.length, strict_compiler: compiler.version, actual_legacy_field_executed: false, native_executed: false}));
} finally {loaded.dispose();}
