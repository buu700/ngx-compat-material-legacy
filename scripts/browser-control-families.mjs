#!/usr/bin/env node
/**
 * Chromium PR-slice for legacy control families: input, list, and slider.
 *
 * Asserts honest family/state cells: input default+focused, list default+disabled,
 * slider default+disabled. Supports --zoneless (no Zone.js; provideZoneless
 * ChangeDetection). Does not fan success into unexecuted engines or states.
 * Does not claim G10.
 *
 *   node scripts/browser-control-families.mjs --tarball <path>
 *   node scripts/browser-control-families.mjs --tarball <path> --zoneless
 */
import {createHash} from 'node:crypto';
import {spawnSync as __spawnSyncForWs} from 'node:child_process';
if (typeof globalThis.WebSocket !== 'function') {
  // Local Node 20 shells need the experimental flag; CI/Chainman Node 22+ has WebSocket.
  const relaunch = __spawnSyncForWs(process.execPath, ['--experimental-websocket', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(relaunch.status ?? 1);
}

import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let reportPath = join(root, 'compatibility/rc/reports/browser-control-families.json');
const esbuild = createRequire(join(root, 'package.json'))('esbuild');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = null;
let zoneless = false;
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--zoneless') {
    zoneless = true;
    reportPath = join(root, 'compatibility/rc/reports/browser-control-families-zoneless.json');
    continue;
  }
  if (process.argv[i] === '--tarball') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) fail(2, '--tarball requires a path');
    tarball = resolve(value);
    i += 1;
    continue;
  }
  fail(2, `Unknown argument: ${process.argv[i]}`);
}
if (!tarball) fail(2, '--tarball is required');

function resolveChromeBin() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const candidate of [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  fail(1, 'No Chrome/Chromium binary found; set CHROME_BIN');
}
const chromeBin = resolveChromeBin();

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-control-families-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-control-families-browser',
  private: true,
  dependencies: {
    '@angular/animations': '22.1.7',
    '@angular/cdk': '22.1.7',
    '@angular/common': '22.1.7',
    '@angular/compiler': '22.1.7',
    '@angular/compiler-cli': '22.1.7',
    '@angular/core': '22.1.7',
    '@angular/forms': '22.1.7',
    '@angular/material': '22.1.7',
    '@angular/platform-browser': '22.1.7',
    '@angular/platform-browser-dynamic': '22.1.7',
    '@ngx-compat/material-legacy': `file:${installTarball}`,
    rxjs: '7.8.2',
    tslib: '2.8.1',
    typescript: '6.0.3',
    ...(zoneless ? {} : {'zone.js': '0.16.3'}),
  },
}, null, 2));
writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
const env = {...process.env, NODE_OPTIONS: ''};
delete env.NODE_PATH;
const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
});
if (install.status !== 0) fail(1, (install.stderr || install.stdout || 'npm install failed').slice(-2000));
const installed = realpathSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'));
if (relative(realpathSync(consumer), installed).startsWith('..')) fail(1, `Library resolved outside the consumer: ${installed}`);

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(join(consumer, 'src/main.ts'), `${zoneless ? '' : `import 'zone.js';
`}import {Component, NgModule${zoneless ? ', provideZonelessChangeDetection' : ''}} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {FormsModule} from '@angular/forms';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyListModule} from '@ngx-compat/material-legacy/legacy-list';
import {MatLegacySliderModule} from '@ngx-compat/material-legacy/legacy-slider';

@Component({
  standalone: false,
  selector: 'lab-root',
  template: \`
    <mat-form-field id="input-ff" appearance="fill">
      <mat-label>Label</mat-label>
      <input id="plain-input" matInput [(ngModel)]="text" placeholder="Type here">
    </mat-form-field>

    <mat-list id="plain-list">
      <mat-list-item id="list-item-a">Alpha</mat-list-item>
      <mat-list-item id="list-item-disabled" [disabled]="true">Disabled</mat-list-item>
    </mat-list>

    <mat-slider id="slider-default" [(ngModel)]="value" min="0" max="100" step="1" thumbLabel></mat-slider>
    <mat-slider id="slider-disabled" [disabled]="true" [value]="25" min="0" max="100"></mat-slider>
  \`,
})
export class LabRoot {
  text = '';
  value = 40;
}

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    MatLegacyFormFieldModule,
    MatLegacyInputModule,
    MatLegacyListModule,
    MatLegacySliderModule,
  ],
  declarations: [LabRoot],
  bootstrap: [LabRoot],
  providers: [${zoneless ? 'provideZonelessChangeDetection(), ' : ''}{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
})
export class LabModule {}

platformBrowserDynamic().bootstrapModule(LabModule).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err);
  document.body.appendChild(node);
});
`);
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'ES2022',
    moduleResolution: 'bundler',
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true,
    lib: ['ES2022', 'DOM'],
    rootDir: 'src',
    outDir: 'out',
    types: [],
    ignoreDeprecations: '6.0',
  },
  files: ['src/main.ts'],
  angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
}, null, 2));
const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
});
if (compiled.status !== 0) fail(1, `${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-3000));

const linkerRequire = createRequire(join(consumer, 'node_modules/@angular/compiler-cli/package.json'));
const {transformSync} = linkerRequire('@babel/core');
const linkerPlugin = linkerRequire('@angular/compiler-cli/linker/babel').default;
const {needsLinking} = linkerRequire('@angular/compiler-cli/linker');
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
        const source = readFileSync(args.path, 'utf8');
        if (!source.includes('ɵɵngDeclare')) return null;
        if (!needsLinking(args.path, source)) return null;
        const linked = transformSync(source, {
          filename: args.path,
          compact: false,
          configFile: false,
          babelrc: false,
          plugins: [[linkerPlugin, {linkerJitMode: false}]],
        });
        return {contents: linked.code, loader: 'js'};
      });
    },
  }],
});
const bundle = readFileSync(join(consumer, 'dist/app.js'), 'utf8');
const bundleDeclares = bundle.includes('ɵɵngDeclare');
const bundleCompilerImport = /(?:from|require\()\s*['"]@angular\/compiler['"]/.test(bundle);
const bundleHasZone = bundle.includes('Zone.__symbol__');
if (bundleDeclares || bundleCompilerImport || (zoneless && bundleHasZone)) {
  fail(1, `bundle partial=${bundleDeclares} compiler=${bundleCompilerImport} zone=${bundleHasZone}`);
}
writeFileSync(join(consumer, 'dist/index.html'),
  `<!doctype html><html><body><lab-root></lab-root><script src="/app.js"></script></body></html>\n`);

const server = createServer((req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, '');
  try {
    const body = readFileSync(join(consumer, 'dist', file));
    res.writeHead(200, {'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html'});
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const {port} = server.address();
const pageUrl = `http://127.0.0.1:${port}/`;
const chromeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-chrome-control-'));
const debugPort = Number(process.env.CDP_PORT || '9336');
const chrome = spawn(chromeBin, [

  '--headless=new',
  '--remote-debugging-port=' + String(debugPort),
  '--user-data-dir=' + chromeDir,
  '--no-sandbox',
  '--disable-gpu',
  pageUrl,
], {stdio: ['ignore', 'ignore', 'pipe']});
let chromeLog = '';
chrome.stderr.on('data', chunk => { chromeLog += chunk; });

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function jsonGet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}
let version = null;
for (let i = 0; i < 50; i += 1) {
  try {
    version = await jsonGet(`http://127.0.0.1:${debugPort}/json/version`);
    break;
  } catch {
    await sleep(100);
  }
}
if (!version) fail(1, `Chromium did not open a debugging port\n${chromeLog.slice(-1000)}`);
const targets = await jsonGet(`http://127.0.0.1:${debugPort}/json/list`);
const page = targets.find(target => target.type === 'page');
if (!page) fail(1, 'Chromium opened no page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});
let nextId = 0;
const pending = new Map();
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
});
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, {resolve, reject});
    ws.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: false});
  return result.result?.value;
}
async function waitFor(predicateExpr, attempts = 50, delayMs = 100) {
  for (let i = 0; i < attempts; i += 1) {
    if (await evaluate(predicateExpr)) return true;
    await sleep(delayMs);
  }
  return false;
}

const families = {
  input: {present: false, focused: false},
  list: {present: false, disabled_class: false},
  slider: {present: false, disabled_class: false, value_reflected: false},
};
let error = null;
let diagnostic = null;
let zoneGlobal = null;

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errors=[];window.addEventListener("error",e=>window.__errors.push(String(e.message)));',
  });
  await send('Page.reload', {ignoreCache: true});
  await waitFor('!!document.getElementById("plain-input") || !!document.getElementById("bootstrap-error")');
  diagnostic = await evaluate('({errors: window.__errors || [], text: document.body.innerText, html: document.body.innerHTML.slice(0, 800)})');
  if (await evaluate('!!document.getElementById("bootstrap-error")')) throw new Error('bootstrap failed');

  // Input default: control present under form-field.
  families.input.present = await waitFor('!!document.querySelector("input#plain-input[matinput], input#plain-input")');
  await evaluate(`(() => {
    const input = document.getElementById("plain-input");
    input.focus();
    input.click();
    input.dispatchEvent(new Event("focusin", {bubbles: true}));
  })()`);
  families.input.focused = await waitFor(
    'document.activeElement && document.activeElement.id === "plain-input"',
  );

  // List default + disabled state cell.
  families.list.present = await waitFor(
    '!!document.querySelector("mat-list#plain-list mat-list-item#list-item-a")',
  );
  families.list.disabled_class = await waitFor(
    '!!document.querySelector("mat-list-item#list-item-disabled.mat-list-item-disabled, mat-list-item#list-item-disabled[disabled]")',
  );

  // Slider default + disabled state cell.
  families.slider.present = await waitFor('!!document.querySelector("mat-slider#slider-default")');
  families.slider.value_reflected = await waitFor(
    '!!document.querySelector("mat-slider#slider-default .mat-slider-thumb-label-text") && ' +
    'document.querySelector("mat-slider#slider-default .mat-slider-thumb-label-text").textContent.trim() !== ""',
  );
  families.slider.disabled_class = await waitFor(
    '!!document.querySelector("mat-slider#slider-disabled.mat-slider-disabled")',
  );

  zoneGlobal = await evaluate('typeof Zone === "undefined" ? "undefined" : typeof Zone');
} catch (err) {
  error = String(err);
} finally {
  ws.close();
  chrome.kill();
  server.close();
}

const runtime = zoneless ? 'zoneless' : 'zoneful';
const cells = [
  `pr/main/chromium/${runtime}/input/default`,
  `pr/main/chromium/${runtime}/input/focused`,
  `pr/main/chromium/${runtime}/list/default`,
  `pr/main/chromium/${runtime}/list/disabled`,
  `pr/main/chromium/${runtime}/slider/default`,
  `pr/main/chromium/${runtime}/slider/disabled`,
];
const zoneOk = zoneless
  ? (zoneGlobal === 'undefined' && bundleHasZone === false)
  : true;
const ok =
  !error
  && zoneOk
  && families.input.present && families.input.focused
  && families.list.present && families.list.disabled_class
  && families.slider.present && families.slider.disabled_class && families.slider.value_reflected;

const report = {
  schema_version: 1,
  role: zoneless
    ? 'zoneless Chromium PR-slice for input/list/slider (not full matrix)'
    : 'Chromium PR-slice for input/list/slider (not full matrix)',
  tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  browser: version.Browser,
  zoneless,
  bundle_has_zone: bundleHasZone,
  zone_global: zoneGlobal,
  families,
  credited_cell_ids: ok ? cells : [],
  matrix_updated: false,
  error,
  diagnostic: ok ? null : diagnostic,
  limitations: [
    zoneless
      ? 'Only Chromium main-line zoneless input/list/slider default+focused/disabled cells; Zone.js is not installed.'
      : 'Only Chromium main-line zoneful input/list/slider default+focused/disabled cells.',
    'Firefox/WebKit, CSP, motion, invalid/RTL/density/dark, and other states stay not-executed.',
    'MATERIAL_ANIMATIONS.animationsDisabled=true for deterministic layout; not enabled-motion proof.',
    'Input credit is presence + focus; typing/validation/textarea not exercised.',
    'List credit is item presence + disabled class on disabled mat-list-item; selection-list/nav-list not exercised.',
    'Slider credit is presence + thumb label value + disabled class; drag/keyboard range motion not exercised.',
    'Success is not copied to unexecuted cells.',
    'Does not claim G10.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  browser: version.Browser,
  ok,
  zoneless,
  bundle_has_zone: bundleHasZone,
  zone_global: zoneGlobal,
  families,
  credited_cell_ids: report.credited_cell_ids,
}, null, 2));
process.exit(ok ? 0 : 1);
