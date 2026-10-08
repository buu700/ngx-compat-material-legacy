/** Actual owned label factory and token identity; no packed/native/floor credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const runtimeUrl = name => pathToFileURL(require.resolve(name)).href;
await import(runtimeUrl('@angular/compiler'));
const {Injector, InjectionToken, TemplateRef, ViewContainerRef} = await import(runtimeUrl('@angular/core'));
const {CdkPortal, TemplatePortal} = await import(runtimeUrl('@angular/cdk/portal'));
const peer = await import(runtimeUrl('@angular/material/tabs'));
const folder = 'projects/ngx-material-legacy/legacy-tabs/';
const labelPath = folder + 'tab-label.ts';
const original = readFileSync(resolve(root, labelPath), 'utf8');

async function loadLabel(source) {
  const urls = new Map();
  function emit(path) {
    if (urls.has(path)) return urls.get(path);
    const raw = path === labelPath ? source : readFileSync(resolve(root, path), 'utf8');
    let js = ts.transpileModule(raw, {compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      experimentalDecorators: true, useDefineForClassFields: false,
    }}).outputText;
    if (path === labelPath) {
      for (const name of ['tab-token', 'public-constructor-context']) {
        const spec = './internal/' + name;
        js = js.replaceAll("'" + spec + "'", JSON.stringify(emit(folder + 'internal/' + name + '.ts')));
      }
    }
    js = js.replace(/(['"])(@angular\/[^'"]+)\1/g,
      (_, quote, spec) => JSON.stringify(runtimeUrl(spec)));
    const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
    urls.set(path, url);
    return url;
  }
  const {MAT_TAB} = await import(emit(folder + 'internal/tab-token.ts'));
  const {MatLegacyTabLabel} = await import(emit(labelPath));
  return {MAT_TAB, Label: MatLegacyTabLabel};
}

function observations({MAT_TAB, Label}) {
  const cases = [];
  function check(id, body) {
    try { body(); cases.push({id, result: 'pass'}); }
    catch (error) { cases.push({id, result: 'fail', error: error.message.slice(0, 240)}); }
  }
  function withProviders(providers, body) {
    const template = Object.freeze({templateMarker: true});
    const container = Object.freeze({containerMarker: true});
    const injector = Injector.create({providers: [Label,
      {provide: TemplateRef, useValue: template},
      {provide: ViewContainerRef, useValue: container}, ...providers]});
    try { body(injector.get(Label), template, container); }
    finally { injector.destroy(); }
  }
  check('owned-token-is-distinct', () => {
    assert.ok(MAT_TAB instanceof InjectionToken);
    assert.notEqual(MAT_TAB, peer.MAT_TAB);
    assert.notEqual(MAT_TAB, new InjectionToken('MAT_TAB'));
  });
  check('factory-preserves-supplied-token-and-portal-objects', () => {
    const tab = Object.freeze({customTab: true});
    withProviders([{provide: MAT_TAB, useValue: tab}], (label, template, container) => {
      assert.equal(label._closestTab, tab);
      assert.equal(label.templateRef, template);
      assert.equal(label.viewContainerRef, container);
      assert.ok(label instanceof Label && label instanceof peer.MatTabLabel
        && label instanceof CdkPortal && label instanceof TemplatePortal);
    });
  });
  check('missing-legacy-token-is-optional', () => {
    withProviders([], label => assert.equal(label._closestTab, null));
  });
  check('same-description-token-does-not-resolve', () => {
    withProviders([{provide: new InjectionToken('MAT_TAB'), useValue: {wrongTab: true}}],
      label => assert.equal(label._closestTab, null));
  });
  check('current-peer-token-does-not-resolve-as-legacy', () => {
    withProviders([{provide: peer.MAT_TAB, useValue: {modernTab: true}}],
      label => assert.equal(label._closestTab, null));
  });
  check('manual-constructor-preserves-arguments', () => {
    const template = {}, container = {}, tab = {};
    const label = new Label(template, container, tab);
    assert.equal(label.templateRef, template);
    assert.equal(label.viewContainerRef, container);
    assert.equal(label._closestTab, tab);
  });
  return cases;
}

const cases = observations(await loadLabel(original));
assert.equal(cases.length, 6);
assert.ok(cases.every(item => item.result === 'pass'), JSON.stringify(cases));
const mutations = [];
for (const [id, before, after, expected] of [
  ['wrong-constructor-token', '@Inject(MAT_TAB)', '@Inject(ViewContainerRef)', [
    'factory-preserves-supplied-token-and-portal-objects', 'missing-legacy-token-is-optional',
    'same-description-token-does-not-resolve', 'current-peer-token-does-not-resolve-as-legacy',
  ]],
  ['missing-closest-assignment', 'label._closestTab = closestTab;', '', [
    'factory-preserves-supplied-token-and-portal-objects', 'manual-constructor-preserves-arguments',
  ]],
  ['required-legacy-token', '@Optional() @Inject(MAT_TAB)', '@Inject(MAT_TAB)', [
    'missing-legacy-token-is-optional', 'same-description-token-does-not-resolve',
    'current-peer-token-does-not-resolve-as-legacy',
  ]],
]) {
  assert.equal(original.split(before).length, 2, 'mutation must select exactly its path');
  const modified = original.replace(before, after);
  const failed = observations(await loadLabel(modified)).filter(item => item.result !== 'pass').map(item => item.id);
  assert.deepEqual(failed, expected, id);
  mutations.push({id, source_sha256: sha(modified), rejected_by: failed});
}

const sources = ['internal/tab-token.ts', 'internal/public-constructor-context.ts', 'tab-label.ts', 'tab.ts', 'public-api.ts'].map(name => {
  const path = folder + name, bytes = readFileSync(resolve(root, path));
  return {path, sha256: sha(bytes), bytes: bytes.length};
});
const dependencies = Object.fromEntries(['@angular/core', '@angular/compiler', '@angular/cdk', '@angular/material', 'typescript'].map(name => {
  const bytes = readFileSync(require.resolve(name + '/package.json'));
  return [name, {version: JSON.parse(bytes).version, manifest_sha256: sha(bytes)}];
}));
const report = {role: 'Actual owned source label JIT factory,public Angular injector and exact token/portal objects',
  node: process.version, compiler: ts.version, sources, dependencies, cases, mutations,
  limitations: ['No strict external declarations,AOT,node-view or rendered nearest-tab execution',
    'Host22.1.7 runtime;not minimum21/Node/RxJS or packed qualification',
    'Default node provider and override/nesting native regressions remain required']};
const args = process.argv.slice(2);
if (args.length) {
  assert.equal(args.length, 2); assert.equal(args[0], '--report');
  assert.equal(existsSync(args[1]), false, 'diagnostic report must be new');
  writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({cases: cases.length, passed: cases.length, mutations_rejected: mutations.length,
  node: process.version, compiler: ts.version}));
