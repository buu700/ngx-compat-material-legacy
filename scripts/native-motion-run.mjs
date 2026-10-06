#!/usr/bin/env node
/**
 * Build a packed-artifact consumer that never calls detectChanges and run the
 * derived native-motion roster on Chromium, Firefox, and WebKitGTK.
 * WebKitGTK stays sandboxed. Ports 9335/9336 stay off the browser-matrix ports.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256File} from './resolve-run-library.mjs';
import {withChromium, withFirefox, withWebKit} from './browser-required-cells.mjs';
import {assertCase, buttonsFor, deriveMainRoster, ENGINES, RUNTIMES} from './native-motion-roster.mjs';
import {motionSource} from './native-motion-page.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheRoot = '/tmp/ngx-native-motion-strict';
const PORTS = {chromium: 9335, firefox: 9336};
const DRIVERS = {chromium: withChromium, firefox: withFirefox, webkit: withWebKit};

function exactVersion(spec, fallback) {
  const text = String(spec || '').trim();
  const matches = text.match(/\d+\.\d+\.\d+/g) || [];
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return fallback;
  return fallback;
}

function readPackedPackage(tarball) {
  const result = spawnSync('tar', ['-xOzf', tarball, 'package/package.json'], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error((result.stderr || 'unable to read packed package.json').slice(-500));
  return JSON.parse(result.stdout);
}

export function versionsFor(pkg) {
  const peers = pkg.peerDependencies || {};
  const core = exactVersion(peers['@angular/core'], '21.2.23');
  return {
    core,
    cdk: exactVersion(peers['@angular/cdk'], '21.2.14'),
    material: exactVersion(peers['@angular/material'], '21.2.14'),
    rxjs: exactVersion(peers.rxjs, '7.8.2'),
    typescript: '5.9.2',
    zone: '0.15.1',
    tslib: '2.8.1',
    sass: '1.104.1',
  };
}

function themeSource() {
  return `@use '@ngx-compat/material-legacy' as mat with ($theme-ignore-duplication-warnings: true);
$primary: mat.define-palette(mat.$indigo-palette);
$accent: mat.define-palette(mat.$pink-palette, A200, A100, A400);
$warn: mat.define-palette(mat.$red-palette);
$light: mat.define-light-theme((
  color: (primary: $primary, accent: $accent, warn: $warn),
  typography: mat.define-typography-config(),
  density: 0,
));
@include mat.core();
@include mat.legacy-core();
.lab-light { @include mat.all-legacy-component-themes($light); }
`;
}

export function nativeMotionCacheRoot() {
  return cacheRoot;
}

export const NATIVE_MOTION_INSTALL_ARGS = ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'];

export function nativeMotionConsumerSpec(versions, zoneless) {
  const dependencies = {
    '@angular/cdk': versions.cdk,
    '@angular/common': versions.core,
    '@angular/compiler': versions.core,
    '@angular/compiler-cli': versions.core,
    '@angular/core': versions.core,
    '@angular/forms': versions.core,
    '@angular/material': versions.material,
    '@angular/platform-browser': versions.core,
    '@angular/platform-browser-dynamic': versions.core,
    rxjs: versions.rxjs,
    sass: versions.sass,
    tslib: versions.tslib,
    typescript: versions.typescript,
  };
  if (!zoneless) dependencies['zone.js'] = versions.zone;
  return {
    dependencies,
    npmrc: 'install-links=true\nfund=false\naudit=false\n',
    tsconfig: {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'bundler',
        experimentalDecorators: true,
        strict: true,
        skipLibCheck: false,
        lib: ['ES2022', 'DOM'],
        rootDir: 'src',
        outDir: 'out',
        types: [],
        ignoreDeprecations: '6.0',
      },
      files: ['src/main.ts'],
      angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
    },
    source: motionSource(zoneless),
    theme: themeSource(),
  };
}

export function readNativeMotionLinkedTooling() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  let esbuild = 'unresolved';
  try {
    const pkgPath = createRequire(join(root, 'package.json')).resolve('esbuild/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    esbuild = `${pkg.name}@${pkg.version}`;
  } catch {
    esbuild = 'unresolved';
  }
  return {
    page: readFileSync(join(scriptDir, 'native-motion-page.mjs'), 'utf8'),
    template: readFileSync(join(scriptDir, 'native-motion-consumer.ts'), 'utf8'),
    esbuild,
  };
}

export function nativeMotionCacheStamp(identity) {
  return createHash('sha256').update(JSON.stringify({
    dependencies: identity.dependencies,
    npmrc: identity.npmrc,
    tsconfig: identity.tsconfig,
    source: identity.source,
    theme: identity.theme,
    linkedTooling: identity.linkedTooling,
    zoneless: identity.zoneless === true,
    tarball: identity.tarball,
  })).digest('hex');
}

export function assessNativeMotionCache(recorded, expected) {
  if (!recorded || typeof recorded !== 'object' || !expected || typeof expected !== 'object') return false;
  if (recorded.stamp !== expected.stamp) return false;
  if (recorded.npmrc !== expected.npmrc) return false;
  if (JSON.stringify(recorded.tsconfig) !== JSON.stringify(expected.tsconfig)) return false;
  if (JSON.stringify(recorded.dependencies) !== JSON.stringify(expected.dependencies)) return false;
  if (JSON.stringify(recorded.linkedTooling) !== JSON.stringify(expected.linkedTooling)) return false;
  if (recorded.source !== expected.source) return false;
  if (recorded.theme !== expected.theme) return false;
  if (recorded.tarball !== expected.tarball) return false;
  if (recorded.zoneless !== (expected.zoneless === true)) return false;
  const bundles = recorded.bundles;
  return !!bundles && bundles.app === true && bundles.theme === true;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function asJson(raw) {
  if (typeof raw !== 'string') return raw;
  const once = JSON.parse(raw);
  return typeof once === 'string' ? JSON.parse(once) : once;
}

export async function buildConsumer(tarball, zoneless) {
  const versions = versionsFor(readPackedPackage(tarball));
  const spec = nativeMotionConsumerSpec(versions, zoneless);
  const linkedTooling = readNativeMotionLinkedTooling();
  const tarballDigest = sha256File(tarball);
  const identity = {
    dependencies: spec.dependencies,
    npmrc: spec.npmrc,
    tsconfig: spec.tsconfig,
    source: spec.source,
    theme: spec.theme,
    linkedTooling,
    zoneless,
    tarball: tarballDigest,
  };
  const stamp = nativeMotionCacheStamp(identity);
  const expected = {...identity, stamp, zoneless: zoneless === true};
  const consumer = join(cacheRoot, `ngx-motion-strict-${tarballDigest.slice(0, 12)}-${zoneless ? 'zoneless' : 'zoneful'}-${stamp.slice(0, 12)}`);
  const readyPath = join(consumer, 'dist/cache-ready.json');
  if (existsSync(readyPath) && existsSync(join(consumer, 'dist/app.js')) && existsSync(join(consumer, 'dist/theme.css'))) {
    try {
      const recorded = JSON.parse(readFileSync(readyPath, 'utf8'));
      if (assessNativeMotionCache(recorded, expected)) {
        const bundle = readFileSync(join(consumer, 'dist/app.js'), 'utf8');
        return {consumer, bundleHasZone: bundle.includes('Zone.__symbol__')};
      }
    } catch {
      // The directory is not a ready bundle for this identity.
    }
  }
  rmSync(consumer, {recursive: true, force: true});
  mkdirSync(consumer, {recursive: true});
  const installTarball = join(consumer, 'library.tgz');
  writeFileSync(installTarball, readFileSync(tarball));
  const deps = {...spec.dependencies, '@ngx-compat/material-legacy': `file:${installTarball}`};
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({name: 'ngx-native-motion', private: true, dependencies: deps}, null, 2));
  writeFileSync(join(consumer, '.npmrc'), spec.npmrc);
  const env = {...process.env, NODE_OPTIONS: ''};
  delete env.NODE_PATH;
  const install = spawnSync('npm', NATIVE_MOTION_INSTALL_ARGS, {
    cwd: consumer, encoding: 'utf8', timeout: 300000, env,
  });
  if (install.status !== 0) throw new Error((install.stderr || install.stdout || 'npm install failed').slice(-2000));
  mkdirSync(join(consumer, 'src'), {recursive: true});
  writeFileSync(join(consumer, 'src/main.ts'), spec.source);
  writeFileSync(join(consumer, 'src/theme.scss'), spec.theme);
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify(spec.tsconfig, null, 2));
  const sass = createRequire(join(consumer, 'node_modules/sass/package.json'))('sass');
  const css = sass.compile(join(consumer, 'src/theme.scss'), {
    loadPaths: [join(consumer, 'node_modules')],
    style: 'expanded',
    silenceDeprecations: ['if-function', 'global-builtin', 'color-functions', 'import'],
  }).css;
  const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {cwd: consumer, encoding: 'utf8', timeout: 240000, env});
  if (compiled.status !== 0) throw new Error(`${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-4000));
  const linkerRequire = createRequire(join(consumer, 'node_modules/@angular/compiler-cli/package.json'));
  const {transformSync} = linkerRequire('@babel/core');
  const linkerPlugin = linkerRequire('@angular/compiler-cli/linker/babel').default;
  const {needsLinking} = linkerRequire('@angular/compiler-cli/linker');
  const esbuild = createRequire(join(root, 'package.json'))('esbuild');
  await esbuild.build({
    absWorkingDir: consumer,
    entryPoints: ['out/main.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/app.js',
    platform: 'browser',
    logLevel: 'silent',
    plugins: [{
      name: 'ng-linker',
      setup(build) {
        build.onLoad({filter: /\.m?js$/}, args => {
          const contents = readFileSync(args.path, 'utf8');
          if (!contents.includes('ɵɵngDeclare') || !needsLinking(args.path, contents)) return null;
          const linked = transformSync(contents, {
            filename: args.path, compact: false, configFile: false, babelrc: false,
            plugins: [[linkerPlugin, {linkerJitMode: false}]],
          });
          return {contents: linked.code, loader: 'js'};
        });
      },
    }],
  });
  const bundle = readFileSync(join(consumer, 'dist/app.js'), 'utf8');
  const bundleHasZone = bundle.includes('Zone.__symbol__');
  if (bundle.includes('ɵɵngDeclare') || (zoneless && bundleHasZone)) {
    throw new Error(`bundle refused partial=${bundle.includes('ɵɵngDeclare')} zone=${bundleHasZone}`);
  }
  mkdirSync(join(consumer, 'dist'), {recursive: true});
  writeFileSync(join(consumer, 'dist/theme.css'), css);
  writeFileSync(join(consumer, 'dist/index.html'), '<!doctype html><html><head><link rel="stylesheet" href="/theme.css"></head><body><motion-root></motion-root><script src="/app.js"></script></body></html>\n');
  writeFileSync(readyPath, JSON.stringify({
    stamp,
    dependencies: spec.dependencies,
    npmrc: spec.npmrc,
    tsconfig: spec.tsconfig,
    source: spec.source,
    theme: spec.theme,
    linkedTooling,
    zoneless: zoneless === true,
    tarball: tarballDigest,
    bundles: {app: true, theme: true},
  }));
  return {consumer, bundleHasZone};
}

function startServer(consumer) {
  const server = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    const file = path === '/' ? 'index.html' : path.replace(/^\//, '');
    try {
      const body = readFileSync(join(consumer, 'dist', file));
      const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
      res.writeHead(200, {'content-type': type});
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise(resolveListen => {
    server.listen(0, '127.0.0.1', () => resolveListen({server, origin: `http://127.0.0.1:${server.address().port}`}));
  });
}

async function waitReady(driver) {
  let last = '';
  for (let i = 0; i < 90; i += 1) {
    const status = asJson(await driver.evaluate('JSON.stringify({ready: document.documentElement.dataset.labReady || "", error: (document.getElementById("bootstrap-error") || {}).textContent || ""})'));
    last = JSON.stringify(status).slice(0, 500);
    if (status.error) throw new Error(`bootstrap failed: ${status.error}`);
    if (status.ready === '1') return;
    await sleep(100);
  }
  throw new Error(`motion page did not bootstrap: ${last}`);
}

async function clickProbe(driver, button) {
  await driver.evaluate(`document.documentElement.dataset.stepState='running'; var node=document.getElementById(${JSON.stringify(button)}); if(!node) throw new Error('missing ${button}'); node.click();`);
  let last = '';
  for (let i = 0; i < 240; i += 1) {
    const status = asJson(await driver.evaluate('JSON.stringify({step: document.documentElement.dataset.step || "", state: document.documentElement.dataset.stepState || "", value: window.__step || null, error: (document.getElementById("bootstrap-error") || {}).textContent || ""})'));
    last = JSON.stringify(status).slice(0, 500);
    if (status.error) throw new Error(status.error);
    if (status.state === 'done' && status.step === button) return status.value;
    await sleep(50);
  }
  throw new Error(`probe ${button} timed out ${last}`);
}

function absorb(bucket, step) {
  if (!step || step.error) {
    if (step && step.error) console.error(`native-motion probe error: ${step.error}`);
    return;
  }
  const store = (key, observation) => { if (key && observation) bucket[key] = observation; };
  if (step.results && typeof step.results === 'object') {
    for (const [key, observation] of Object.entries(step.results)) store(key, observation);
    return;
  }
  store(step.key, step.observation);
  if (step.notify) store(step.notify.key, step.notify.observation);
}

async function collect(driver, scene, mode, bucket) {
  await waitReady(driver);
  for (const button of buttonsFor(scene, mode)) {
    console.log(`native-motion ${mode} ${button}`);
    absorb(bucket, await clickProbe(driver, button));
  }
}

function evidenceOf(observation) {
  if (!observation || typeof observation !== 'object') return '';
  const parts = [];
  for (const key of ['selector', 'durationMs', 'finalState', 'notifications', 'completions', 'descendantIgnored', 'fallbackCompleted', 'leaks']) {
    if (observation[key] !== undefined) parts.push(`${key}=${observation[key]}`);
  }
  return parts.join(' ') || 'observed';
}

async function runEngine(engine, runtime, origin, bucket, engines) {
  const drive = DRIVERS[engine];
  const port = PORTS[engine];
  const options = port ? {port} : {};
  try {
    await drive(origin, async driver => {
      engines[engine] = driver.browser;
      await collect(driver, 'modes', 'enabled', bucket);
      await driver.goto(`${origin}/?mode=enabled&scene=interrupt`);
      await collect(driver, 'interrupt', 'enabled', bucket);
      await driver.goto(`${origin}/?mode=provider-disabled&scene=modes`);
      await collect(driver, 'modes', 'provider-disabled', bucket);
    }, {...options, startPath: '/?mode=enabled&scene=modes'});
    await drive(origin, async driver => {
      engines[engine] = {...(engines[engine] || {}), ...driver.browser, launched: true};
      await collect(driver, 'modes', 'reduced', bucket);
    }, {...options, reduced: true, startPath: '/?mode=reduced&scene=modes'});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    engines[engine] = {...(engines[engine] || {}), engine, launched: !!(engines[engine] && engines[engine].launched), error: message};
    console.error(`native-motion ${engine} ${runtime} failed: ${message}`);
  }
}

export async function executeNativeMotion(tarball) {
  const roster = deriveMainRoster();
  const collected = {};
  for (const runtime of RUNTIMES) collected[runtime] = {};
  const engines = {};
  for (const runtime of RUNTIMES) {
    console.error(`native-motion building ${runtime}`);
    const built = await buildConsumer(tarball, runtime === 'zoneless');
    if (runtime === 'zoneless' && built.bundleHasZone) throw new Error('zoneless bundle contains Zone');
    const {server, origin} = await startServer(built.consumer);
    try {
      for (const engine of ENGINES) {
        const bucket = {};
        collected[runtime][engine] = bucket;
        await runEngine(engine, runtime, origin, bucket, engines);
      }
    } finally {
      server.close();
    }
  }
  const outcomes = roster.ids.map(id => {
    const parts = id.split('/');
    const observation = collected[parts[3]][parts[2]][parts.slice(5).join('/')];
    const problems = assertCase(id, observation);
    return {id, ok: problems.length === 0, observation, evidence: problems.length === 0 ? evidenceOf(observation) : problems.join('; ')};
  });
  const failed = outcomes.filter(item => !item.ok);
  if (failed.length) {
    console.error(`native-motion failed ${failed.length}`);
    for (const row of failed.slice(0, 24)) console.error(`${row.id} ${row.evidence}`);
  }
  return {outcomes, engines};
}

