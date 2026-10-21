/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Untouched public SDK defaults and service observations; owned callers remain separate. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, symlinkSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {qualifiedComponentConfigTypes} from '../scripts/component-config-caller-type-evidence.mjs';
import {prepareComponentConfigPublicSubjects} from '../scripts/component-config-caller-public-subjects.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(import.meta.url), ts = require('typescript');
const q = qualifiedComponentConfigTypes({root}), loaded = prepareComponentConfigPublicSubjects(root);
const smoke = process.argv[3] === '--smoke', protocolPath = 'scripts/api-public-node-context.mjs';
const source = ts.createSourceFile(protocolPath, read(protocolPath).toString(), ts.ScriptTarget.Latest, true);
const nodes = source.statements.filter(node => ts.isFunctionDeclaration(node) &&
  ['leaf', 'node', 'renderer'].includes(node.name?.text));
assert.equal(nodes.length, 3);
const protocol = nodes.map(node => 'export ' + node.getText(source)).join('\n');
const result = {schema_version: 1, line: q.source.prior.line, node: process.version,
  typescript: ts.version, prototype_only: smoke, typed_boundary: q.ref, runtime_subjects: [],
  public_default_or_service_differences: [], source_closures: 0, SDK_source_rewrites: false,
  actual_owned_callers_executed: false, actual_native_packed_AOT_or_full_floor_qualified: false,
  g11_claim: 'not-passed'};

try {
  for (const model of loaded.models) {
    if (smoke && model.line !== 'original') continue;
    const zone = realpathSync(dirname(require.resolve('zone.js/package.json')));
    symlinkSync(zone, join(model.root, 'node_modules/zone.js'), 'dir');
    const borrowed = {...model.borrowed,
      'zone.js': {root: zone, version: JSON.parse(readFileSync(join(zone, 'package.json'))).version}};
    writeFileSync(join(model.root, 'render-protocol.mjs'), protocol);
    writeFileSync(join(model.root, 'a11y-node-protocol.mjs'), read('tests/a11y_caller_node_protocol.mjs'));
    writeFileSync(join(model.root, 'component-config-worker.mjs'),
      read('tests/component_config_caller_public_runtime_subject.mjs'));
    for (const mode of smoke ? ['development'] : ['development', 'production']) {
      const child = spawnSync(process.execPath, [join(model.root, 'component-config-worker.mjs'), model.line, mode],
        {cwd: model.root, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024});
      assert.equal(child.status, 0, model.line + ':' + mode + ':' + child.error?.code + '\n' +
        (child.stdout + '\n' + child.stderr).slice(-12000));
      const report = JSON.parse(child.stdout.trim().split('\n').at(-1));
      assert.equal(report.SDK_source_rewrites, false);
      assert.equal(report.actual_owned_callers_executed, false);
      result.runtime_subjects.push({...report, Core: model.packages.get('@angular/core').version,
        Material: model.packages.get('@angular/material').version, borrowed});
    }
  }
  if (!smoke) {
    assert.equal(result.runtime_subjects.length, 6);
    const reference = result.runtime_subjects.find(subject => subject.line === 'original' && subject.mode === 'development');
    for (const subject of result.runtime_subjects) {
      assert.equal(subject.cases.length, 35);
      assert.deepEqual(subject.observations.tokens, reference.observations.tokens);
      assert.equal(subject.observations.childProviderOverridesPreserveOwnerIdentity, true);
      for (const key of ['defaults', 'scroll', 'paginator', 'dataClasses']) {
        if (!isDeepStrictEqual(subject.observations[key], reference.observations[key])) {
          result.public_default_or_service_differences.push({line: subject.line, mode: subject.mode,
            boundary: key, reference: reference.observations[key], current: subject.observations[key]});
        }
      }
      const development = result.runtime_subjects.find(s => s.line === subject.line && s.mode === 'development');
      assert.deepEqual(subject.observations, development.observations, 'development/production public boundary drift');
    }
  }
  const paths = new Set([q.ref.path, ...q.proof.inputs.map(member => member.path),
    'scripts/component-config-caller-type-evidence.mjs', protocolPath,
    'tests/a11y_caller_node_protocol.mjs', 'tests/component_config_caller_public_runtime_subject.mjs',
    'tests/component_config_caller_public_runtime_probe.mjs']);
  result.inputs = [...paths].sort().map(path => ({path, sha256: hash(read(path))}));
  result.scope = 'Actual untouched SDK public tokens/default factories/data classes/MatPaginatorIntl through genuine application/environment injectors. The genuine factories produce actual strategies;public ScrollDispatcher notifications and OverlayRef owner callbacks are explicit consumer payload protocols. Subscription throttle arguments,position updates and disable/unsubscription are observed;no native repositioning or timing pass. DOM/Renderer2 and borrowed Zone/RxJS are recorded protocols. All public default/service differences are retained for source-consumption review,never normalized into an automatic preservation verdict. No current owned constructors/components,generated templates/queries,native behavior,CSS/geometry/motion,CSP,SSR,packed/AOT,full consumer/toolchain/peer floors or G01-G13 pass.';
  assert.ok(process.argv[2]);
  writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: result.line, prototype: smoke, contexts: result.runtime_subjects.length,
    cases: result.runtime_subjects.reduce((count, subject) => count + subject.cases.length, 0),
    public_difference_records: result.public_default_or_service_differences.length,
    actual_owned_callers_executed: false, source_closures: 0}));
} finally {loaded.dispose();}
