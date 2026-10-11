/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete authenticated public modules; host interaction remains a TestElement protocol. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, posix, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {SourceTextModule, SyntheticModule} from 'node:vm';
import {loadHarnessSubjects} from './component-harness-boundary-review.mjs';
import {elementRefSubjects} from './element-ref-use-review.mjs';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const capsuleHash = '64b531c3456538ad4783d9409195cc62c0be32489353d6f2d1eb0de895af041d';

export async function inputHarnessPublicSubjects(root = defaultRoot) {
  const bytes = readFileSync(join(root, 'compatibility/rc/input-harness-public-subjects.json'));
  assert.equal(hash(bytes), capsuleHash, 'input harness capsule changed');
  const capsule = JSON.parse(bytes), harness = await loadHarnessSubjects(root), framework = await elementRefSubjects(root), models = [];
  try {
    for (const subject of capsule.subjects) {
      const sources = new Map(), packages = new Map();
      for (const pkg of subject.packages) {
        for (const member of pkg.members) {
          const compressed = readFileSync(join(root, member.path)); assert.equal(hash(compressed), member.gzip_sha256);
          const raw = gunzipSync(compressed); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes);
          const key = pkg.package + '/' + member.archive_member.replace(/^package\//, ''); assert.ok(!sources.has(key)); sources.set(key, raw.toString());
        }
        const manifest = JSON.parse(sources.get(pkg.package + '/package.json')); assert.equal(manifest.name, pkg.package); assert.equal(manifest.version, pkg.version); packages.set(pkg.package, manifest);
      }
      const testing = harness.models.find(model => model.subject.line === subject.line), core = framework.models.find(model => model.subject.line === subject.line); assert.ok(testing && core);
      const testingSources = new Map(testing.subject.members.map(member => {
        const raw = gunzipSync(readFileSync(join(root, member.path))); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes);
        return [member.archive_member.replace(/^package\//, ''), raw.toString()];
      }));
      const bridges = new Map(), modules = new Map(), edges = [];
      function bridge(spec, namespace) {
        const names = Object.keys(namespace), module = new SyntheticModule(names, function () {for (const name of names) this.setExport(name, namespace[name]);}, {identifier: spec});
        bridges.set(spec, module); return module;
      }
      bridge('@angular/cdk/testing', testing.runtime); bridge('@angular/core', core.runtime);
      function publicRoute(spec) {
        const parts = spec.split('/'), name = parts.slice(0, 2).join('/'), pkg = packages.get(name); assert.ok(pkg, 'unexpected public dependency ' + spec);
        const route = parts.length === 2 ? '.' : './' + parts.slice(2).join('/'), target = pkg.exports[route]?.default; assert.equal(typeof target, 'string');
        return name + '/' + target.replace(/^\.\//, '');
      }
      function moduleFor(key) {
        if (!modules.has(key)) {assert.ok(sources.has(key), 'missing complete runtime source ' + key); modules.set(key, new SourceTextModule(sources.get(key), {identifier: key}));}
        return modules.get(key);
      }
      const linker = (specifier, importer) => {
        if (bridges.has(specifier)) {edges.push({from: importer.identifier, specifier, bridge: specifier}); return bridges.get(specifier);}
        const target = specifier.startsWith('.') ? posix.normalize(posix.join(posix.dirname(importer.identifier), specifier)) : publicRoute(specifier);
        assert.ok(!target.includes('/../')); edges.push({from: importer.identifier, specifier, target}); return moduleFor(target);
      };
      const entry = moduleFor(publicRoute('@angular/material/input/testing')); await entry.link(linker); await entry.evaluate();
      const runtime = entry.namespace; for (const name of ['MatInputHarness', 'MatNativeSelectHarness', 'MatNativeOptionHarness']) assert.equal(typeof runtime[name], 'function');
      if (subject.line === 'original') {
        const legacy = moduleFor(publicRoute('@angular/material/legacy-input/testing')); await legacy.link(linker); await legacy.evaluate();
        for (const name of ['Input', 'NativeSelect', 'NativeOption']) assert.equal(legacy.namespace['MatLegacy' + name + 'Harness'], runtime['Mat' + name + 'Harness']);
      }
      models.push({subject, sources, packages, runtime, testing: testing.runtime, testingSources, testingSubject: testing.subject,
        framework_version: core.subject.version, edges, public_entry: entry.identifier, complete_runtime_modules: [...modules].map(([path]) => ({path, sha256: hash(sources.get(path))}))});
    }
    return {models, capsule_sha256: capsuleHash, rxjs: harness.rxjs, dispose: framework.dispose};
  } catch (error) {framework.dispose(); throw error;}
}

/** The public TestElement/LocatorFactory protocol, with no browser or Angular view. */
export function inputHarnessHost({properties = {}, attributes = {}, label = null, optionHosts = []} = {}) {
  const props = {...properties}, attrs = new Map(Object.entries(attributes)), calls = [];
  const host = {
    async getProperty(name) {calls.push(['property', name]); return props[name];},
    async getAttribute(name) {calls.push(['attribute', name]); return attrs.get(name) ?? null;},
    async setInputValue(value) {calls.push(['setInputValue', value]); props.value = value;},
    async focus() {calls.push(['focus']); props.focused = true;}, async blur() {calls.push(['blur']); props.focused = false;},
    async isFocused() {return !!props.focused;}, async clear() {calls.push(['clear']); props.value = '';},
    async sendKeys(...keys) {calls.push(['sendKeys', ...keys]);},
    async matchesSelector(selector) {calls.push(['matchesSelector', selector]); return selector === '.allowed' || selector === '.ancestor';},
    async selectOptions(...indices) {calls.push(['selectOptions', ...indices]); optionHosts.forEach((option, index) => {option.properties.selected = indices.includes(index);});},
    async text() {return label ?? '';},
  };
  const labelElement = label === null ? null : {async text() {return label;}};
  const locator = {
    rootElement: host,
    documentRootLocatorFactory() {return locator;},
    locatorForOptional(selector) {return async () => {calls.push(['locatorForOptional', selector]); return labelElement;};},
    locatorFor(selector) {return async () => {calls.push(['locatorFor', selector]); return host;};},
    locatorForAll(selector) {return async () => {calls.push(['locatorForAll', typeof selector === 'string' ? selector : 'predicate']);
      assert.equal(typeof selector.filter, 'function'); return selector.filter(optionHosts.map(option => option.harness));};},
    async forceStabilize() {}, async waitForTasksOutsideAngular() {},
  };
  return {host, locator, properties: props, attributes: attrs, calls};
}

export async function loadLegacyInputHarness(model, sourceText) {
  const output = ts.transpileModule(sourceText, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true}}).outputText;
  const owned = new SourceTextModule(output, {identifier: 'owned-legacy-input-harness'}), bridges = new Map();
  for (const [specifier, namespace] of [['@angular/cdk/testing', model.testing], ['@angular/material/input/testing', model.runtime]]) {
    bridges.set(specifier, new SyntheticModule(Object.keys(namespace), function () {for (const name of Object.keys(namespace)) this.setExport(name, namespace[name]);}, {identifier: specifier}));
  }
  await owned.link(specifier => {assert.ok(bridges.has(specifier), 'unreviewed adapter dependency'); return bridges.get(specifier);}); await owned.evaluate();
  const Harness = owned.namespace.MatLegacyInputHarness;
  assert.equal(Object.getPrototypeOf(Harness.prototype), model.runtime.MatInputHarness.prototype);
  assert.equal(Harness.hostSelector, model.runtime.MatInputHarness.hostSelector);
  return {Harness, emitted_js_sha256: hash(output), compiler: ts.version};
}
