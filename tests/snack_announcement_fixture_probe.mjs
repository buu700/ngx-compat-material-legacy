/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {snackAnnouncementLifetimeFixture} from '../scripts/snack-announcement-lifetime-fixture.mjs';
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
const emitted = ts.transpileModule(snackAnnouncementLifetimeFixture, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true}, reportDiagnostics: true});
assert.equal(emitted.diagnostics.length, 0);
const loaded = prepareMaterialPublicSubjects(root), results = [], strictTypes = [], portalSubjects = [];
try {
  const worker = readFileSync(join(root, 'tests/snack_announcement_fixture_subject.mjs'), 'utf8');
  for (const model of loaded.models.filter(model => model.line !== 'original')) {
    // Reuse whole, authenticated public modules; no private class extraction.
    const receipt = JSON.parse(readFileSync(join(root,'compatibility/rc/dialog-public-container-source-proof.json')))
      .actual_minimum_peer_members.find(row => row.line === model.line);
    assert.equal(receipt.package, '@angular/cdk'); assert.equal(receipt.sri_rehashed, true);
    assert.equal(receipt.version, model.packages.get('@angular/cdk').version);
    const members = receipt.members.filter(row => /\/(?:portal\.mjs|portal\.d\.ts|_portal-directives-chunk\.d\.ts)$/.test(row.member));
    assert.equal(members.length,3);
    const identity = Object.fromEntries(['line','package','version','archive_sha256','integrity','sri_rehashed']
      .map(key => [key,receipt[key]]));
    identity.members = members;
    assert.equal(hash(JSON.stringify(identity)), {
      main:'60e38f9854827ea502197e53922d47bfa746e60952cfd1b6756f6f79a06d2895',
      '21.x':'d57ff4f91b5ea59fabe8d699b513bd00b411ed0b14541f6922c9b74b4c150b63',
    }[model.line], 'authenticated finite public portal subject changed');
    for (const member of members) {
      const bytes = readFileSync(join(root,member.path)); assert.equal(hash(bytes), member.sha256);
      assert.equal(bytes.length, member.bytes);
      const target = join(model.root,'node_modules/@angular/cdk',member.member.slice('package/'.length));
      mkdirSync(dirname(target),{recursive:true}); writeFileSync(target,bytes);
    }
    portalSubjects.push({line:model.line, version:receipt.version, archive_sha256:receipt.archive_sha256,
      integrity:receipt.integrity, whole_public_module_members:members});
    const header = `import {Component, Directive, ViewChild, TemplateRef, ViewContainerRef, signal,
      inject, Injector, InjectionToken, EmbeddedViewRef, afterNextRender} from '@angular/core';
      import {TemplatePortal} from '@angular/cdk/portal';
      import {Subject} from 'rxjs';
      declare class MatSnackBarConfig {politeness: 'assertive' | 'polite' | 'off';}
      declare class MatLegacySnackBarConfig extends MatSnackBarConfig {}
      declare class MatLegacySnackBarContainer {
        attachTemplatePortal<C>(portal: TemplatePortal<C>): EmbeddedViewRef<C>;
        readonly _onAnnounce: Subject<void>; _animationState: string; enter(): void;
      }
      declare const LEGACY_ANIMATIONS_TEST_OVERRIDE: InjectionToken<'enabled' | 'di-disabled' | 'reduced-motion'>;\n`;
    const fixture = join(model.root, 'snack-announcement-types.ts');
    const options = {strict:true, noEmit:true, skipLibCheck:false, types:[], target:compiler.ScriptTarget.ES2022,
      module:compiler.ModuleKind.ESNext, moduleResolution:compiler.ModuleResolutionKind.Bundler,
      experimentalDecorators:true, lib:['lib.es2022.d.ts','lib.dom.d.ts']};
    const check = source => {
      writeFileSync(fixture, header + source);
      return compiler.getPreEmitDiagnostics(compiler.createProgram([fixture], options));
    };
    const diagnostics = check(snackAnnouncementLifetimeFixture);
    assert.deepEqual(diagnostics.map(d => compiler.flattenDiagnosticMessageText(d.messageText, '\n')), []);
    const badPortal = snackAnnouncementLifetimeFixture.replace('new TemplatePortal(this.message, this.outlet)',
      "new TemplatePortal('invalid', this.outlet)");
    assert.notEqual(badPortal, snackAnnouncementLifetimeFixture);
    assert.ok(check(badPortal).some(d => d.code === 2345), 'genuine TemplatePortal requires a public TemplateRef');
    strictTypes.push({line:model.line, compiler:compiler.version, negative_checks:1,
      genuine_core_and_cdk_portal_declarations:true, legacy_container_and_config_declarations_protocol:true});
    if (typesOnly) continue;
    const zone = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'snack-announcement-fixture-payload.json'), JSON.stringify({fixture: emitted.outputText, containerTemplate: readFileSync(join(root,'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.html'),'utf8')}));
    const path = join(model.root, 'snack-announcement-fixture-subject.mjs'); writeFileSync(path, worker);
    for (const mode of ['zoneful', 'zoneless']) for (const production of [false, true]) {
      for (const variant of ['live', 'missing-announcement', 'late-announcement']) {
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
    shared_fixture_sha256: hash(snackAnnouncementLifetimeFixture), worker_sha256: hash(worker),
    public_namespace_capsule_sha256: loaded.capsule_hash, results, strict_types:strictTypes, portal_subjects:portalSubjects,
    scope: typesOnly ? 'Strict genuine public Core/CDK declarations and explicit owned declaration protocols only; no runtime cases execute in this mode.' : 'Complete shared fixture; genuine current public Angular component/module/query/embedded-view/automatic render/node DI and complete public CDK TemplatePortal/CdkPortalOutlet. Current owned container HTML is JIT-compiled under a container/config protocol. Initial app tick only; operations start outside NgZone. Container/config/renderer/DOM are protocols; actual Node timers exercise unchanged fixture waits and a protocol 150ms announcement. Missing live announcement fails and uncanceled timers produce late movement/emission/completion. No actual legacy container/native browser/CSS/packed/AOT/consumer/Node/Rx floor qualification.'};
  if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({subjects: typesOnly ? 0 : 8, cases: results.length, strict_compiler: compiler.version, actual_legacy_container_executed: false, native_executed: false}));
} finally {loaded.dispose();}
