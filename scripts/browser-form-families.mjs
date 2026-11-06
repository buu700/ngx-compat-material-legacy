#!/usr/bin/env node
/**
 * Chromium PR-slice for legacy form families: chips and form-field.
 *
 * Asserts chip selection and form-field focus/float-label/hint visibility,
 * and writes a detail report. Supports --zoneless (no Zone.js; provideZoneless
 * ChangeDetection). Does not fan success into unexecuted engines or states.
 * Does not claim G10.
 *
 *   node scripts/browser-form-families.mjs --tarball <path>
 *   node scripts/browser-form-families.mjs --tarball <path> --zoneless
 */
import {npmToolingOptions} from './npm-tooling-options.mjs';
import {browserPeerVersions,browserLibraryLine,readBrowserPackedPackage,browserConsumerDependencies,browserCompilerOptions} from './browser-peer-versions.mjs';
import {createHash} from 'node:crypto';
import {legacyFormFieldOutlineNativeOkay, legacyFormFieldOutlineSequenceOkay, observeLegacyFormFieldOutlineNative} from './legacy-form-field-outline-native-contract.mjs';
import {legacyChipBlurNativeOkay, observeLegacyChipBlurNative} from './legacy-chip-blur-native-contract.mjs';
import {chipFocusLifecycleNativeOkay} from './chip-focus-lifecycle-native-contract.mjs';
import {chipFocusLifecycleFixtureMembers} from './chip-focus-lifecycle-fixture.mjs';
import {announcedChromeEndpoint,debuggerMatchesChild} from './chromium-debug-endpoint.mjs';
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
let reportPath = join(root, 'compatibility/rc/reports/browser-form-families.json');
const esbuild = createRequire(join(root, 'package.json'))('esbuild');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = null;
let describeInstall = false;
let zoneless = false;
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--describe-install') {describeInstall = true;continue;}
  if (process.argv[i] === '--zoneless') {
    zoneless = true;
    reportPath = join(root, 'compatibility/rc/reports/browser-form-families-zoneless.json');
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
const expectedLine = browserLibraryLine(JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'), 'utf8')));
const versions = browserPeerVersions(readBrowserPackedPackage(tarball), {rxjsProfile: 'current', expectedLine});
if (describeInstall) {
  console.log(JSON.stringify({versions, dependencies: browserConsumerDependencies(versions, {zoneless, librarySpec: `file:${tarball}`}), compilerOptions: browserCompilerOptions(versions)}));
  process.exit(0);
}

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

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-form-families-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-form-families-browser',
  private: true,
  dependencies: browserConsumerDependencies(versions, {zoneless, librarySpec: `file:${installTarball}`}),
}, null, 2));
writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
const env = {...process.env, NODE_OPTIONS: ''};
delete env.NODE_PATH;
const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], npmToolingOptions({
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
}, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock']));
if (install.status !== 0) fail(1, (install.stderr || install.stdout || 'npm install failed').slice(-2000));
const installed = realpathSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'));
if (relative(realpathSync(consumer), installed).startsWith('..')) fail(1, `Library resolved outside the consumer: ${installed}`);

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(join(consumer, 'src/main.ts'), `${zoneless ? '' : `import 'zone.js';
`}import {Component, NgModule, NgZone, ViewChild, inject${zoneless ? ', provideZonelessChangeDetection' : ', provideZoneChangeDetection'}} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyChip, MatLegacyChipsModule} from '@ngx-compat/material-legacy/legacy-chips';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';

@Component({
  standalone: false,
  selector: 'lab-root',
  template: \`
    <mat-chip-list id="chip-list" #labChips="matChipList" [formControl]="chipControl" selectable>
      <mat-chip id="chip-a" #focusLifecycleChip="matChip" data-chip-focus-lifecycle>Alpha</mat-chip>
      <mat-chip id="chip-b">Beta</mat-chip>
    </mat-chip-list>
    <output id="chip-form-state" [attr.data-focused]="labChips.focused" [attr.data-touched]="chipControl.touched"></output>

    <mat-form-field id="ff" appearance="fill" floatLabel="auto">
      <mat-label>Name</mat-label>
      <input id="ff-input" data-chip-focus-outside matInput [(ngModel)]="name" required>
      <mat-hint id="ff-hint">Hint text</mat-hint>
    </mat-form-field>
    <div id="outline-wrapper" [style.display]="outlineVisible ? '' : 'none'" [dir]="outlineDirection">
      <mat-form-field id="ff-outline" appearance="outline" floatLabel="always">
        <mat-label>Outline</mat-label>
        <span matPrefix *ngIf="outlinePrefix">USD&nbsp;</span>
        <input matInput value="Value">
      </mat-form-field>
    </div>
    <button id="outline-prefix" type="button" (click)="outlinePrefix = true">Add prefix</button>
    <button id="outline-hide" type="button" (click)="outlineVisible = false; outlinePrefix = false">Hide and remove prefix</button>
    <button id="outline-show" type="button" (click)="outlineVisible = true">Show</button>
    <button id="outline-rtl" type="button" (click)="outlineDirection = 'rtl'">RTL</button>
  \`,
})
export class LabRoot {
  readonly angularZoneEntered = (() => { const zone = inject(NgZone); const entered = zone.run(() => NgZone.isInAngularZone()); (window as unknown as {__closeoutAngularZoneEntered: boolean}).__closeoutAngularZoneEntered = entered; return entered; })();
  readonly chipControl = new FormControl<string | null>(null);
${chipFocusLifecycleFixtureMembers()}
  ngAfterViewInit(): void {
    (window as unknown as {__chipFocusLifecycle: () => unknown}).__chipFocusLifecycle =
      () => this.runChipFocusLifecycle();
  }
  name = '';
  outlineVisible = true;
  outlinePrefix = false;
  outlineDirection: 'ltr' | 'rtl' = 'ltr';
}

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    MatLegacyChipsModule,
    MatLegacyFormFieldModule,
    MatLegacyInputModule,
  ],
  declarations: [LabRoot],
  bootstrap: [LabRoot],
  providers: [${zoneless ? 'provideZonelessChangeDetection(), ' : ''}{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
})
export class LabModule {}

platformBrowserDynamic().bootstrapModule(LabModule${zoneless ? '' : ', {applicationProviders: [provideZoneChangeDetection()]}'}).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err);
  document.body.appendChild(node);
});
`);
// Prefer TS 5.8 like the dialog consumer; fall back if 6.x was preferred elsewhere.
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
  compilerOptions: browserCompilerOptions(versions),
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
const chromeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-chrome-form-'));
const requestedDebugPort = Number(process.env.CDP_PORT || '0');
let debugPort = 0;
const chrome = spawn(chromeBin, [

  '--headless=new',
  '--remote-debugging-port=' + String(requestedDebugPort),
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
    const endpoint=announcedChromeEndpoint(chromeLog,requestedDebugPort);
    if(!endpoint){await sleep(100);continue;}
    const observed=await jsonGet(`http://127.0.0.1:${endpoint.port}/json/version`);
    if(!debuggerMatchesChild(observed,endpoint))throw Error('debugger does not belong to the browser child');
    version=observed;debugPort=endpoint.port;break;
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
async function evaluate(expression, awaitPromise = false) {
  const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise});
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
  chips: {list_present: false, chip_clicked: false, chip_selected_class: false},
  'form-field': {
    present: false,
    hint_visible: false,
    input_focused: false,
    focused_class: false,
    label_floating: false,
  },
};
let error = null;
let diagnostic = null;
let zoneGlobal = null;
let angularZoneEntered = null;

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errors=[];window.addEventListener("error",e=>window.__errors.push(String(e.message)));',
  });
  await send('Page.reload', {ignoreCache: true});
  await waitFor('!!document.getElementById("chip-a") || !!document.getElementById("bootstrap-error")');
  diagnostic = await evaluate('({errors: window.__errors || [], text: document.body.innerText, html: document.body.innerHTML.slice(0, 800)})');
  if (await evaluate('!!document.getElementById("bootstrap-error")')) throw new Error('bootstrap failed');

  // Chips: list present; focus chip-a; Space toggles selection (legacy chip key path).
  families.chips.list_present = await waitFor('!!document.querySelector("mat-chip-list .mat-chip-list-wrapper #chip-a")');
  await evaluate('document.getElementById("chip-a").focus()');
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32});
  families.chips.chip_clicked = true; // key-activated selection
  families.chips.chip_selected_class = await waitFor(
    '!!document.getElementById("chip-a")?.classList.contains("mat-chip-selected")',
  );
  families.chips.focus_lifecycle = await evaluate(
    'window.__chipFocusLifecycle()', true,
  );
  families.chips.blur = await observeLegacyChipBlurNative({evaluate,waitFor});

  // Form-field: present with hint; focus input; assert focused class and floating label.
  families['form-field'].present = await waitFor('!!document.querySelector("mat-form-field#ff")');
  families['form-field'].hint_visible = await waitFor(
    '!!document.getElementById("ff-hint") && getComputedStyle(document.getElementById("ff-hint")).display !== "none"',
  );
  await evaluate(`(() => {
    const input = document.getElementById("ff-input");
    input.focus();
    input.click();
    input.dispatchEvent(new Event("focusin", {bubbles: true}));
  })()`);
  families['form-field'].input_focused = await evaluate('document.activeElement && document.activeElement.id === "ff-input"');
  families['form-field'].focused_class = await waitFor(
    '!!document.querySelector("mat-form-field#ff.mat-focused, mat-form-field#ff.mat-form-field-should-float")',
  );
  // Float label: after focus, label should float (mat-form-field-should-float or label transform).
  families['form-field'].label_floating = await waitFor(
    '!!document.querySelector("mat-form-field#ff.mat-form-field-should-float, mat-form-field#ff.mat-focused .mat-form-field-label")',
  );

  const outlineRows = [];
  async function recordOutline() {
    let observation = await observeLegacyFormFieldOutlineNative({evaluate});
    for (let i = 0; i < 40 && !legacyFormFieldOutlineNativeOkay(observation); i += 1) {
      await sleep(50);
      observation = await observeLegacyFormFieldOutlineNative({evaluate});
    }
    outlineRows.push(observation);
  }
  await recordOutline();
  await evaluate(`document.getElementById('outline-prefix').click()`);
  await waitFor(`!!document.querySelector('#ff-outline .mat-form-field-prefix')`);
  await recordOutline();
  await evaluate(`document.getElementById('outline-hide').click()`);
  families['form-field'].outline_hidden = await waitFor(`getComputedStyle(document.getElementById('outline-wrapper')).display === 'none'`);
  await evaluate(`document.getElementById('outline-show').click()`);
  await waitFor(`getComputedStyle(document.getElementById('outline-wrapper')).display !== 'none'`);
  await recordOutline();
  await evaluate(`document.getElementById('outline-rtl').click()`);
  await waitFor(`getComputedStyle(document.getElementById('ff-outline')).direction === 'rtl'`);
  await recordOutline();
  families['form-field'].outline_geometry = outlineRows;

  zoneGlobal = await evaluate('typeof Zone === "undefined" ? "undefined" : typeof Zone');
  angularZoneEntered = await evaluate('window.__closeoutAngularZoneEntered');
} catch (err) {
  error = String(err);
} finally {
  ws.close();
  chrome.kill();
  server.close();
}

const runtime = zoneless ? 'zoneless' : 'zoneful';
const cells = [
  `pr/main/chromium/${runtime}/chips/default`,
  `pr/main/chromium/${runtime}/form-field/default`,
];
const zoneOk = zoneless
  ? (zoneGlobal === 'undefined' && bundleHasZone === false && angularZoneEntered === false)
  : (zoneGlobal === 'function' && bundleHasZone === true && angularZoneEntered === true);
const ok =
  !error
  && zoneOk
  && families.chips.list_present && families.chips.chip_clicked && families.chips.chip_selected_class
  && legacyChipBlurNativeOkay(families.chips.blur)
  && chipFocusLifecycleNativeOkay(families.chips.focus_lifecycle)
  && families['form-field'].present && families['form-field'].hint_visible
  && families['form-field'].input_focused && families['form-field'].focused_class
  && families['form-field'].label_floating
  && families['form-field'].outline_hidden
  && legacyFormFieldOutlineSequenceOkay(families['form-field'].outline_geometry);

const report = {
  schema_version: 1,
  role: zoneless
    ? 'zoneless Chromium PR-slice for chips and form-field (not full matrix)'
    : 'Chromium PR-slice for chips and form-field (not full matrix)',
  tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  browser: version.Browser,
  zoneless,
  bundle_has_zone: bundleHasZone,
  zone_global: zoneGlobal,
  angular_zone_entered: angularZoneEntered,
  families,
  credited_cell_ids: ok ? cells : [],
  matrix_updated: false,
  error,
  diagnostic: ok ? null : diagnostic,
  limitations: [
    zoneless
      ? 'Only Chromium main-line zoneless default for chips and form-field; Zone.js is not installed.'
      : 'Only Chromium main-line zoneful default for chips and form-field.',
    'Firefox/WebKit, CSP, motion, invalid/disabled/RTL/density, and other states stay not-executed.',
    'MATERIAL_ANIMATIONS.animationsDisabled=true for deterministic layout; not enabled-motion proof.',
    'Chip credit is list presence + Space toggles mat-chip-selected on focused chip; remove/input/avatar not exercised.',
    'Form-field requires fill/hint/focus plus short-label outlined gap geometry, prefix update, hide/show and RTL in this fixture; error and legacy appearance remain unexecuted.',
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
  angular_zone_entered: angularZoneEntered,
  families,
  credited_cell_ids: report.credited_cell_ids,
}, null, 2));
if (!ok) process.exit(1);
