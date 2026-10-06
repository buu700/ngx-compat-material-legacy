#!/usr/bin/env node
/**
 * Engine-free consumption of one packed library.
 *
 * The consumer installs declared peers and does not install @angular/animations
 * or @angular/platform-browser/animations. Strict templates, testing imports,
 * and a button harness run in that install. Injected engine imports fail the
 * packed scan before install.
 *
 *   node scripts/engine-free-consumer.mjs --tarball <path>
 *
 * Coordinator mode writes reports/engine-free-consumer.json for this run.
 * Standalone mode still writes the diagnostic fixed report on success and
 * does not grant acceptance.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {coordinatorRequest, lineForPackageVersion, readPackedIdentity, writeAcceptanceReport} from './packed-consumer-evidence.mjs';
import {
  ENGINE_SPECIFIER,
  FORBIDDEN_SPECS,
  NPM_INSTALL_ARGS,
  classifyEngineHits,
  engineFreeCaseIds,
  installUsesLegacyPeerDeps,
  loadExportKeys,
  manifestEngineDeps,
  recipeKeys,
  stripComments,
  testingSlugs,
} from './engine-free-consumer-evidence.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixedReportPath = join(root, 'compatibility/rc/reports/engine-free-consumer.json');

const PINS = {
  22: {angular: '22.1.7', material: '22.1.7', typescript: '6.0.3', zone: '0.16.3'},
  21: {angular: '21.2.23', material: '21.2.14', typescript: '5.9.2', zone: '0.15.1'},
};

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function isolatedEnv(extra = {}) {
  const env = {...process.env, ...extra, NODE_OPTIONS: ''};
  delete env.NODE_PATH;
  return env;
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {encoding: 'utf8', ...opts});
}

function writeFixed(payload) {
  mkdirSync(dirname(fixedReportPath), {recursive: true});
  writeFileSync(fixedReportPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function listTexts(tarball) {
  const listing = run('tar', ['-tzf', tarball]);
  if (listing.status !== 0) fail(1, listing.stderr || 'tar listing failed');
  const files = [];
  for (const name of listing.stdout.split('\n')) {
    if (!/\.(mjs|cjs|js|d\.ts)$/.test(name)) continue;
    const extracted = run('tar', ['-xOf', tarball, name], {maxBuffer: 32 * 1024 * 1024});
    if (extracted.status !== 0) fail(1, `unable to read ${name}`);
    files.push({name, text: extracted.stdout});
  }
  return files;
}

function readManifest(tarball) {
  const extracted = run('tar', ['-xOf', tarball, 'package/package.json']);
  if (extracted.status !== 0 || !extracted.stdout) fail(1, 'Tarball has no package/package.json');
  return JSON.parse(extracted.stdout);
}

function observed(caseId, ok, detail = {}) {
  return {case_id: caseId, result: ok ? 'pass' : 'fail', ...detail, failure: ok ? null : (detail.failure || 'observation failed')};
}

function strictProject(file) {
  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      experimentalDecorators: true,
      strict: true,
      skipLibCheck: false,
      lib: ['ES2022', 'DOM'],
      rootDir: 'src',
      outDir: `out-${file.replace(/\W/g, '-')}`,
      types: [],
    },
    files: [`src/${file}`],
    angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
  };
}

function compileStrict(consumer, file, source) {
  mkdirSync(join(consumer, 'src'), {recursive: true});
  writeFileSync(join(consumer, 'src', file), source);
  const configName = `tsconfig.${file.replace(/\W/g, '-')}.json`;
  writeFileSync(join(consumer, configName), JSON.stringify(strictProject(file), null, 2));
  const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  const compiled = run(process.execPath, [ngc, '-p', configName], {
    cwd: consumer,
    timeout: 180000,
    env: isolatedEnv(),
  });
  const config = JSON.parse(readFileSync(join(consumer, configName), 'utf8'));
  const ok = compiled.status === 0 && config.compilerOptions.skipLibCheck === false && !config.compilerOptions.paths;
  return {
    ok,
    exit_code: compiled.status,
    skipLibCheck: config.compilerOptions.skipLibCheck,
    paths: config.compilerOptions.paths || null,
    stderr_tail: `${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-1200),
  };
}

function runButtonHarness(consumer) {
  const source = `import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'http://localhost/', pretendToBeVisual: true});
const win = dom.window as any;
(globalThis as any).window = win;
(globalThis as any).document = win.document;
(globalThis as any).HTMLElement = win.HTMLElement;
(globalThis as any).Node = win.Node;
(globalThis as any).Element = win.Element;
(globalThis as any).Event = win.Event;
(globalThis as any).MouseEvent = win.MouseEvent;
(globalThis as any).KeyboardEvent = win.KeyboardEvent;
(globalThis as any).DocumentFragment = win.DocumentFragment;
(globalThis as any).getComputedStyle = win.getComputedStyle.bind(win);
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(() => cb(Date.now()), 0);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
(globalThis as any).MutationObserver = win.MutationObserver;
Object.defineProperty(globalThis, 'navigator', {configurable: true, writable: true, value: win.navigator});

import 'zone.js';
import '@angular/compiler';
import {Component} from '@angular/core';
import {BrowserDynamicTestingModule, platformBrowserDynamicTesting} from '@angular/platform-browser-dynamic/testing';
import {getTestBed, TestBed} from '@angular/core/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyButtonHarness} from '@ngx-compat/material-legacy/legacy-button/testing';

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

@Component({
  standalone: true,
  imports: [MatLegacyButtonModule],
  template: '<button mat-button id="h">Go</button>',
})
class Host {}

async function main() {
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const button = await loader.getHarness(MatLegacyButtonHarness.with({selector: '#h'}));
  const text = await button.getText();
  const out = {ok: text === 'Go', text, animations: 'absent'};
  console.log(JSON.stringify(out));
  if (!out.ok) throw new Error(JSON.stringify(out));
}
main().catch((err: unknown) => {
  console.error(err);
  throw err;
});
`;
  writeFileSync(join(consumer, 'src/jsdom.d.ts'), `declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: object);
    readonly window: any;
  }
}
`);
  writeFileSync(join(consumer, 'src/runtime-button.ts'), source);
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      experimentalDecorators: true,
      strict: true,
      skipLibCheck: false,
      lib: ['ES2022', 'DOM'],
      rootDir: 'src',
      outDir: 'out-runtime',
      types: [],
      importHelpers: true,
      useDefineForClassFields: false,
    },
    files: ['src/jsdom.d.ts', 'src/runtime-button.ts'],
    angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
  };
  writeFileSync(join(consumer, 'tsconfig.runtime-button.json'), JSON.stringify(config, null, 2));
  const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  const compiled = run(process.execPath, [ngc, '-p', 'tsconfig.runtime-button.json'], {
    cwd: consumer,
    timeout: 180000,
    env: isolatedEnv(),
  });
  if (compiled.status !== 0) {
    return {ok: false, failure: `runtime compile failed\n${(compiled.stdout || '').slice(-800)}\n${(compiled.stderr || '').slice(-800)}`};
  }
  const executed = run(process.execPath, ['out-runtime/runtime-button.js'], {
    cwd: consumer,
    timeout: 120000,
    env: isolatedEnv(),
  });
  let parsed = null;
  try {
    const lines = (executed.stdout || '').trim().split('\n').filter(Boolean);
    parsed = JSON.parse(lines[lines.length - 1]);
  } catch {
    parsed = null;
  }
  const ok = executed.status === 0 && parsed && parsed.ok === true && parsed.text === 'Go';
  return {
    ok,
    parsed,
    failure: ok ? null : `runtime button failed\n${(executed.stderr || '').slice(-800)}`,
  };
}

function probeTestingEntries(consumer, slugs) {
  const script = `
    import {createRequire} from 'node:module';
    import {pathToFileURL} from 'node:url';
    import {readFileSync} from 'node:fs';
    import {JSDOM} from 'jsdom';
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'http://localhost/'});
    const define = (key, value) => {
      Object.defineProperty(globalThis, key, {configurable: true, writable: true, value});
    };
    define('window', dom.window);
    define('document', dom.window.document);
    define('HTMLElement', dom.window.HTMLElement);
    define('Node', dom.window.Node);
    define('navigator', dom.window.navigator);
    await import('zone.js');
    await import('@angular/compiler');
    const require = createRequire(pathToFileURL(process.cwd() + '/'));
    const specs = JSON.parse(process.env.SPECS);
    const out = [];
    for (const spec of specs) {
      const resolved = require.resolve(spec);
      const text = readFileSync(resolved, 'utf8');
      if (text.includes("@angular/animations") || text.includes("@angular/platform-browser/animations")) {
        out.push({spec, ok: false, resolved, failure: 'resolved file references the animation engine'});
        continue;
      }
      if (!resolved.includes('/@ngx-compat/material-legacy/')) {
        out.push({spec, ok: false, resolved, failure: 'testing entry resolved outside the packed library'});
        continue;
      }
      try {
        await import(pathToFileURL(resolved).href);
        out.push({spec, ok: true, resolved, failure: null});
      } catch (error) {
        out.push({spec, ok: false, resolved, failure: String(error && error.stack || error).slice(0, 800)});
      }
    }
    process.stdout.write(JSON.stringify(out));
  `;
  const specs = slugs.map(slug => `@ngx-compat/material-legacy/${slug}/testing`);
  const probe = run(process.execPath, ['--input-type=module', '-e', script], {
    cwd: consumer,
    timeout: 180000,
    env: isolatedEnv({SPECS: JSON.stringify(specs)}),
  });
  if (probe.status !== 0) {
    return slugs.map(slug => ({
      slug,
      ok: false,
      failure: `testing import probe failed\n${(probe.stderr || probe.stdout || '').slice(-600)}`,
    }));
  }
  let parsed = [];
  try {
    parsed = JSON.parse(probe.stdout);
  } catch {
    return slugs.map(slug => ({slug, ok: false, failure: 'testing probe did not return JSON'}));
  }
  return slugs.map(slug => {
    const spec = `@ngx-compat/material-legacy/${slug}/testing`;
    const row = parsed.find(item => item.spec === spec);
    return {slug, ok: Boolean(row && row.ok), resolved: row ? row.resolved : null, failure: row ? row.failure : 'missing probe row'};
  });
}

function acceptanceCases(state) {
  const cases = [];
  cases.push(observed('engine-free-consumer/engine-absence/manifest', state.manifestHits.length === 0, {
    hits: state.manifestHits,
    failure: 'packed manifest declares the animation engine',
  }));
  cases.push(observed('engine-free-consumer/engine-absence/packed-runtime', state.hits.runtime.length === 0, {
    hits: state.hits.runtime,
    failure: 'packed runtime references the animation engine',
  }));
  cases.push(observed('engine-free-consumer/engine-absence/packed-declarations', state.hits.declarations.length === 0, {
    hits: state.hits.declarations,
    failure: 'packed declarations reference the animation engine',
  }));
  cases.push(observed('engine-free-consumer/engine-absence/packed-testing', state.hits.testing.length === 0, {
    hits: state.hits.testing,
    failure: 'packed testing code references the animation engine',
  }));
  cases.push(observed('engine-free-consumer/engine-absence/no-recipe-entry', state.recipes.length === 0, {
    recipes: state.recipes,
    failure: 'an animations recipe entry is present',
  }));
  for (const spec of FORBIDDEN_SPECS) {
    const unresolved = state.unresolved.includes(spec);
    cases.push(observed(`engine-free-consumer/engine-absence/unresolved/${spec}`, unresolved, {
      failure: `${spec} resolved inside the required consumer`,
    }));
    const installed = state.installed.includes(spec);
    cases.push(observed(`engine-free-consumer/engine-absence/not-installed/${spec}`, !installed, {
      failure: `${spec} is installed in the required consumer`,
    }));
  }
  cases.push(observed('engine-free-consumer/strict-consumer/legacy-button-template', Boolean(state.button && state.button.ok), {
    stderr_tail: state.button ? state.button.stderr_tail : null,
    failure: 'strict legacy button template did not compile',
  }));
  cases.push(observed('engine-free-consumer/strict-consumer/legacy-checkbox-template', Boolean(state.checkbox && state.checkbox.ok), {
    stderr_tail: state.checkbox ? state.checkbox.stderr_tail : null,
    failure: 'strict legacy checkbox template did not compile',
  }));
  const projects = [state.button, state.checkbox, state.runtimeProject].filter(Boolean);
  const skipOk = projects.length === 3 && projects.every(item => item.skipLibCheck === false || item.ok);
  cases.push(observed('engine-free-consumer/strict-consumer/skip-lib-check-false', Boolean(
    state.button && state.button.skipLibCheck === false && state.checkbox && state.checkbox.skipLibCheck === false && state.runtimeSkipLibCheck === false,
  ), {
    failure: 'a required consumer program relied on skipLibCheck',
  }));
  cases.push(observed('engine-free-consumer/strict-consumer/no-legacy-peer-deps', state.legacyPeerDeps === false, {
    args: state.installArgs,
    failure: 'the required consumer used legacy-peer-deps',
  }));
  cases.push(observed('engine-free-consumer/strict-consumer/runtime-button', Boolean(state.runtime && state.runtime.ok), {
    failure: state.runtime && state.runtime.failure ? state.runtime.failure : 'button runtime did not run',
  }));
  for (const row of state.testing || []) {
    cases.push(observed(`engine-free-consumer/testing-entrypoints/${row.slug}`, row.ok, {
      resolved: row.resolved || null,
      failure: row.failure || 'testing entry did not import',
    }));
  }
  cases.push(observed('engine-free-consumer/testing-entrypoints/legacy-button-harness', Boolean(
    state.runtime && state.runtime.ok && state.runtime.parsed && state.runtime.parsed.text === 'Go',
  ), {
    failure: 'owned button harness did not run without the animation engine',
  }));
  return cases;
}

function emit(coordinator, tarball, cases, expectedIds, code) {
  if (!coordinator || coordinator.error) return;
  writeAcceptanceReport({
    checkId: 'engine-free-consumer',
    request: coordinator,
    cases,
    expectedIds,
    library: {sha256: sha256File(tarball), bytes: lstatSync(tarball).size},
    assertionName: 'engine-free-observations.json',
    assertionBody: {forbidden: FORBIDDEN_SPECS},
    command: ['node', 'scripts/engine-free-consumer.mjs', '--tarball', tarball],
  });
  if (code !== 0) return;
}

function main() {
  let tarball = '';
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === '--tarball') {
      const value = process.argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, '--tarball requires a path');
      tarball = resolve(value);
      i += 1;
      continue;
    }
    fail(2, `Unknown argument: ${arg}`);
  }
  const keys = loadExportKeys();
  const expectedIds = engineFreeCaseIds(keys);
  console.log(`engine-free-consumer: derived ${expectedIds.length} cases before reading the candidate`);
  const coordinator = coordinatorRequest('engine-free-consumer');
  if (coordinator && coordinator.error) {
    console.error(`engine-free-consumer: refusing acceptance report: ${coordinator.error}`);
    process.exit(2);
  }
  if (!tarball) fail(2, '--tarball is required');
  if (!existsSync(tarball)) fail(2, `Missing tarball: ${tarball}`);
  if (installUsesLegacyPeerDeps(NPM_INSTALL_ARGS)) fail(2, 'install arguments include legacy-peer-deps');

  const identity = readPackedIdentity(tarball);
  const line = lineForPackageVersion(identity.version);
  const major = Number(String(identity.version).split('.')[0]);
  const pins = PINS[major];
  if (!pins || !line) fail(1, `unsupported packed version ${identity.version}`);
  const manifest = readManifest(tarball);
  const manifestHits = manifestEngineDeps(manifest);
  const files = listTexts(tarball);
  const hits = classifyEngineHits(files);
  const recipes = recipeKeys(Object.keys(manifest.exports || {}));
  const blocked = manifestHits.length || hits.runtime.length || hits.declarations.length || hits.testing.length || recipes.length;
  if (blocked) {
    const cases = acceptanceCases({
      manifestHits,
      hits,
      recipes,
      unresolved: [],
      installed: [],
      button: null,
      checkbox: null,
      runtime: null,
      runtimeSkipLibCheck: true,
      testing: testingSlugs(keys).map(slug => ({slug, ok: false, failure: 'skipped because the packed library references the engine'})),
      legacyPeerDeps: false,
      installArgs: NPM_INSTALL_ARGS,
    });
    if (coordinator) {
      writeFixed({schema_version: 1, role: 'required consumer engine resolution', result: 'fail', blocked: true});
      emit(coordinator, tarball, cases, expectedIds, 1);
    }
    fail(1, `Packed library is not engine-free: manifest=${manifestHits.join(',') || '-'} runtime=${hits.runtime.length} declarations=${hits.declarations.length} testing=${hits.testing.length} recipes=${recipes.join(',') || '-'}`);
  }

  const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-engine-free-'));
  const installTarball = join(consumer, 'library.tgz');
  writeFileSync(installTarball, readFileSync(tarball));
  const peers = {
    '@angular/cdk': pins.material,
    '@angular/common': pins.angular,
    '@angular/compiler': pins.angular,
    '@angular/compiler-cli': pins.angular,
    '@angular/core': pins.angular,
    '@angular/forms': pins.angular,
    '@angular/material': pins.material,
    '@angular/platform-browser': pins.angular,
    '@angular/platform-browser-dynamic': pins.angular,
    '@ngx-compat/material-legacy': `file:${installTarball}`,
    jsdom: '26.1.0',
    rxjs: '7.8.2',
    tslib: '2.8.1',
    typescript: pins.typescript,
    'zone.js': pins.zone,
  };
  for (const spec of FORBIDDEN_SPECS) {
    if (spec in peers) fail(2, `consumer dependency list includes ${spec}`);
  }
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({
    name: 'ngx-compat-engine-free-consumer',
    private: true,
    dependencies: peers,
  }, null, 2));
  writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
  const install = run('npm', NPM_INSTALL_ARGS, {
    cwd: consumer,
    timeout: 180000,
    env: isolatedEnv(),
  });
  if (install.status !== 0) {
    if (coordinator) writeFixed({schema_version: 1, role: 'required consumer engine resolution', result: 'fail', step: 'install'});
    fail(1, `npm install failed\n${(install.stderr || install.stdout || '').slice(-2000)}`);
  }

  const unresolved = [];
  for (const spec of FORBIDDEN_SPECS) {
    const probe = run(process.execPath, ['-e', 'require(process.env.SPEC)'], {
      cwd: consumer,
      env: isolatedEnv({SPEC: spec}),
    });
    const message = `${probe.stderr || ''}${probe.stdout || ''}`;
    if (probe.status === 0 || (!message.includes('Cannot find module') && !message.includes('ERR_MODULE_NOT_FOUND'))) {
      unresolved.push(`RESOLVED:${spec}`);
    } else {
      unresolved.push(spec);
    }
  }
  const installed = [];
  if (existsSync(join(consumer, 'node_modules/@angular/animations'))) installed.push('@angular/animations');
  if (existsSync(join(consumer, 'node_modules/@angular/platform-browser/animations'))) {
    installed.push('@angular/platform-browser/animations');
  }
  const legacyRoot = join(consumer, 'node_modules/@ngx-compat/material-legacy');
  if (!existsSync(join(legacyRoot, 'package.json')) || legacyRoot.includes(`${sep}dist${sep}ngx-material-legacy`)) {
    fail(1, 'packed library did not install inside the consumer');
  }

  const button = compileStrict(
    consumer,
    'button.ts',
    `import {Component, NgModule} from '@angular/core';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
@Component({standalone: false, selector: 'engine-free-button', template: '<button mat-button id="h">Go</button>'})
export class EngineFreeButton {}
@NgModule({imports: [MatLegacyButtonModule], declarations: [EngineFreeButton]})
export class EngineFreeButtonModule {}
`,
  );
  const checkbox = compileStrict(
    consumer,
    'checkbox.ts',
    `import {Component, NgModule} from '@angular/core';
import {MatLegacyCheckboxModule} from '@ngx-compat/material-legacy/legacy-checkbox';
@Component({standalone: false, selector: 'engine-free-checkbox', template: '<mat-checkbox [checked]="true">Agree</mat-checkbox>'})
export class EngineFreeCheckbox {}
@NgModule({imports: [MatLegacyCheckboxModule], declarations: [EngineFreeCheckbox]})
export class EngineFreeCheckboxModule {}
`,
  );
  const runtime = runButtonHarness(consumer);
  const testing = probeTestingEntries(consumer, testingSlugs(keys));
  const runtimeConfig = JSON.parse(readFileSync(join(consumer, 'tsconfig.runtime-button.json'), 'utf8'));
  const state = {
    manifestHits,
    hits,
    recipes,
    unresolved: unresolved.filter(item => !item.startsWith('RESOLVED:')),
    installed,
    button,
    checkbox,
    runtime,
    runtimeSkipLibCheck: runtimeConfig.compilerOptions.skipLibCheck,
    testing,
    legacyPeerDeps: installUsesLegacyPeerDeps(NPM_INSTALL_ARGS),
    installArgs: NPM_INSTALL_ARGS,
  };
  if (unresolved.some(item => item.startsWith('RESOLVED:'))) {
    state.unresolved = [];
  }
  const cases = acceptanceCases(state);
  const failed = cases.filter(item => item.result !== 'pass');
  const digest = sha256File(tarball);
  writeFixed({
    schema_version: 1,
    role: 'required consumer engine resolution',
    captured_at: new Date().toISOString(),
    tarball_sha256: digest,
    line,
    package_dependency_fields_checked: ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'],
    packed_import_hits: [...hits.runtime, ...hits.declarations, ...hits.testing],
    consumer_dependencies: Object.keys(peers),
    unresolved: state.unresolved,
    installed_engine: installed,
    legacy_peer_deps: false,
    strict_templates: {button: button.ok, checkbox: checkbox.ok},
    runtime_button: Boolean(runtime.ok),
    testing_entries: testing.map(item => ({slug: item.slug, ok: item.ok})),
    limitations: [
      'Does not claim G04.',
      'The isolated Material-16 oracle is outside this consumer and is the only place a historical engine is allowed.',
      'Removing an application animation provider is not migration authority.',
    ],
  });
  if (coordinator) emit(coordinator, tarball, cases, expectedIds, failed.length ? 1 : 0);
  if (failed.length) {
    for (const item of failed) {
      console.error(`FAIL ${item.case_id}\n${String(item.failure || '').slice(0, 500)}`);
    }
    process.exit(1);
  }
  if (coordinator && line !== '21.x') {
    console.error('engine-free acceptance roster is reviewed for 21.x only');
    process.exit(1);
  }
  console.log(JSON.stringify({ok: true, unresolved: state.unresolved, tarball_sha256: digest, cases: cases.length}, null, 2));
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entry) main();
