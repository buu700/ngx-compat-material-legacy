#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Chromium PR-slice for additional legacy overlay/form families beyond
 * dialog/select: menu, snack-bar, tooltip, autocomplete, tabs.
 *
 * Opens each control, asserts user-visible open/close or selection, and
 * writes a detail report. Supports --zoneless (no Zone.js; provideZoneless
 * ChangeDetection). Does not fan success into unexecuted engines or states.
 * Does not claim G10.
 *
 *   node scripts/browser-overlay-families.mjs --tarball <path>
 *   node scripts/browser-overlay-families.mjs --tarball <path> --zoneless
 */
import {npmToolingOptions} from './npm-tooling-options.mjs';
import {browserPeerVersions,browserLibraryLine,readBrowserPackedPackage,browserConsumerDependencies,browserCompilerOptions} from './browser-peer-versions.mjs';
import {createHash} from 'node:crypto';
import {snackMotionFixture} from './snack-motion-fixture.mjs';
import {tooltipAriaLifetimeFixture} from './tooltip-aria-lifetime-fixture.mjs';
import {observeTabPaginationNative,tabPaginationNativeOkay} from './tab-pagination-native-contract.mjs';
import {observeLegacyInkBarNative,legacyInkBarSelectionSequenceOkay} from './legacy-ink-bar-native-contract.mjs';
import {legacyTooltipMessageSequenceOkay, observeLegacyTooltipNative,
  legacyTooltipAriaLifetimeNativeOkay, observeLegacyTooltipAriaLifetimeNative} from './legacy-tooltip-native-contract.mjs';
import {legacySnackMotionNativeOkay, observeLegacySnackMotionNative} from './legacy-snack-motion-native-contract.mjs';
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
let reportPath = join(root, 'compatibility/rc/reports/browser-overlay-families.json');
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
    reportPath = join(root, 'compatibility/rc/reports/browser-overlay-families-zoneless.json');
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

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-overlay-families-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-overlay-families-browser',
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
`}import {Component, Directive, NgModule, NgZone, TemplateRef, ViewChild, ViewContainerRef, inject, signal${zoneless ? ', provideZonelessChangeDetection' : ', provideZoneChangeDetection'}} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyMenuModule} from '@ngx-compat/material-legacy/legacy-menu';
import {MatLegacySnackBar, MatLegacySnackBarContainer, MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {MatLegacyTooltip, MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';
import {MatLegacyAutocompleteModule} from '@ngx-compat/material-legacy/legacy-autocomplete';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';
import {LEGACY_ANIMATIONS_TEST_OVERRIDE} from '@ngx-compat/material-legacy/legacy-core';

${tooltipAriaLifetimeFixture}

${snackMotionFixture}

@Component({
  standalone: false,
  selector: 'lab-root',
  template: \`
    <button id="menu-trigger" type="button" [matMenuTriggerFor]="menu">Menu</button>
    <mat-menu #menu="matMenu">
      <button id="menu-item-a" type="button" mat-menu-item>A</button>
    </mat-menu>

    <button id="snack-open" type="button" (click)="openSnack()">Snack</button>
    <lab-snack-motion></lab-snack-motion>

    <button id="tip-host" type="button" [matTooltip]="tipMessage" [matTooltipShowDelay]="0" [matTooltipHideDelay]="0">Tip</button>
    <button id="tip-change" type="button" (click)="tipMessage = 'A longer tooltip message for repositioning'">Change tooltip</button>
    <lab-tooltip-aria-lifetime></lab-tooltip-aria-lifetime>

    <mat-form-field>
      <input id="ac-input" matInput [matAutocomplete]="auto" placeholder="ac">
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selectedValue = $event.option.value">
        <mat-option id="ac-option-a" value="a">A</mat-option>
      </mat-autocomplete>
    </mat-form-field>
    <output id="ac-selected-value">{{selectedValue}}</output>

    <mat-tab-group id="tabs">
      <mat-tab label="One"><div id="tab-one">One body</div></mat-tab>
      <mat-tab label="Two"><div id="tab-two">Two body</div></mat-tab>
    </mat-tab-group>

    <mat-tab-group id="pagination-tabs" style="width:220px">
      <mat-tab label="Pagination 0"><div>Page 0</div></mat-tab>
      <mat-tab label="Pagination 1"><div>Page 1</div></mat-tab>
      <mat-tab label="Pagination 2"><div>Page 2</div></mat-tab>
      <mat-tab label="Pagination 3"><div>Page 3</div></mat-tab>
      <mat-tab label="Pagination 4"><div>Page 4</div></mat-tab>
      <mat-tab label="Pagination 5"><div>Page 5</div></mat-tab>
    </mat-tab-group>
  \`,
})
export class LabRoot {
  readonly angularZoneEntered = (() => { const zone = inject(NgZone); const entered = zone.run(() => NgZone.isInAngularZone()); (window as unknown as {__closeoutAngularZoneEntered: boolean}).__closeoutAngularZoneEntered = entered; return entered; })();
  selectedValue = '';
  tipMessage = 'Hello tip';
  private snack = inject(MatLegacySnackBar);
  openSnack() {
    this.snack.open('Snack message', 'Dismiss', {duration: 0});
  }
}

@NgModule({
  imports: [
    BrowserModule,
    MatLegacyMenuModule,
    MatLegacySnackBarModule,
    MatLegacyTooltipModule,
    MatLegacyAutocompleteModule,
    MatLegacyFormFieldModule,
    MatLegacyInputModule,
    MatLegacyTabsModule,
  ],
  declarations: [LabRoot, SnackMotionLab, TooltipAriaLifetimeLab, CaptureTooltipForAriaLifetime],
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
const chromeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-chrome-overlay-'));
const requestedDebugPort = Number(process.env.CDP_PORT || '0');
let debugPort = 0;
const chrome = spawn(chromeBin, [

  '--headless=new',
  '--remote-debugging-port=' + String(requestedDebugPort),
  '--user-data-dir=' + chromeDir,
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
  menu: {opened: false, closed_by_escape: false, closed_by_backdrop: false},
  'snack-bar': {opened: false, dismissed: false},
  tooltip: {shown: false, hidden: false},
  autocomplete: {panel_opened: false, typed_filter_visible: false, input_focused: false, option_selected: false, panel_closed_after_select: false},
  tabs: {second_selected: false, second_body_visible: false},
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
  await waitFor('!!document.getElementById("menu-trigger") || !!document.getElementById("bootstrap-error")');
  diagnostic = await evaluate('({errors: window.__errors || [], text: document.body.innerText, html: document.body.innerHTML.slice(0, 800)})');
  if (await evaluate('!!document.getElementById("bootstrap-error")')) throw new Error('bootstrap failed');

  // Menu: open via trigger click, Escape closes.
  await evaluate('document.getElementById("menu-trigger").click()');
  families.menu.opened = await waitFor('!!document.querySelector(".cdk-overlay-pane .mat-menu-panel #menu-item-a")');
  families.menu.first_item_focused = families.menu.opened && await waitFor(
    'document.activeElement===document.querySelector(".cdk-overlay-pane .mat-menu-panel #menu-item-a")',
  );
  // Zoneful: CDP Escape (prior green proof). Zoneless: Escape often fails under CDP; backdrop fallback.
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  let menuClosed = await waitFor('!document.querySelector(".cdk-overlay-pane .mat-menu-panel")', 40, 100);
  if (menuClosed) {
    families.menu.closed_by_escape = true;
    families.menu.closed_by_backdrop = false;
  } else if (zoneless) {
    await evaluate(`(() => {
      const backdrop = document.querySelector('.cdk-overlay-backdrop');
      if (backdrop) backdrop.click();
    })()`);
    menuClosed = await waitFor('!document.querySelector(".cdk-overlay-pane .mat-menu-panel")', 30, 100);
    families.menu.closed_by_escape = false;
    families.menu.closed_by_backdrop = families.menu.opened && menuClosed;
  } else {
    families.menu.closed_by_escape = false;
    families.menu.closed_by_backdrop = false;
  }

  // Snack-bar: open, then dismiss via action button.
  await evaluate('document.getElementById("snack-open").click()');
  families['snack-bar'].opened = await waitFor('!!document.querySelector(".mat-snack-bar-container .mat-simple-snack-bar-content")');
  await evaluate(`(() => {
    const btn = document.querySelector(".mat-snack-bar-container .mat-simple-snackbar-action button, .mat-snack-bar-container button");
    if (btn) btn.click();
  })()`);
  const snackGone = await waitFor('!document.querySelector(".mat-snack-bar-container")');
  families['snack-bar'].dismissed = families['snack-bar'].opened && snackGone;
  families['snack-bar'].enabled_motion = [];
  for (const mode of ['event', 'fallback']) {
    families['snack-bar'].enabled_motion.push(await observeLegacySnackMotionNative({send,evaluate,waitFor},mode));
  }

  // Tooltip: mouseenter host, then mouseleave.
  const tipBox = await evaluate(`(() => {
    const el = document.getElementById("tip-host");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {x: r.x + r.width / 2, y: r.y + r.height / 2};
  })()`);
  if (tipBox) {
    await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: tipBox.x, y: tipBox.y});
    await evaluate(`document.getElementById("tip-host").dispatchEvent(new MouseEvent("mouseenter", {bubbles: true}))`);
  }
  families.tooltip.shown = await waitFor('!!document.querySelector(".mat-tooltip")');
  families.tooltip.message_positions = [await observeLegacyTooltipNative({evaluate})];
  await evaluate(`document.getElementById('tip-change').click()`);
  await waitFor(`document.querySelector('.mat-tooltip')?.textContent.trim() === 'A longer tooltip message for repositioning'`);
  families.tooltip.message_positions.push(await observeLegacyTooltipNative({evaluate}));
  if (tipBox) {
    await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: tipBox.x + 400, y: tipBox.y + 400});
    await evaluate(`document.getElementById("tip-host").dispatchEvent(new MouseEvent("mouseleave", {bubbles: true}))`);
  }
  const tipHidden = await waitFor('!document.querySelector(".mat-tooltip")');
  families.tooltip.hidden = families.tooltip.shown && tipHidden;
  await evaluate(`document.getElementById('tip-aria-run').click()`);
  await waitFor(`document.getElementById('tip-aria-result')?.getAttribute('data-complete') === 'true'`);
  families.tooltip.aria_lifetime = await observeLegacyTooltipAriaLifetimeNative({evaluate});

  // Autocomplete: focus, type, then activate the real option and observe its public selection event.
  await evaluate(`(() => {
    const input = document.getElementById("ac-input");
    input.focus();
    input.click();
    input.dispatchEvent(new Event("focusin", {bubbles: true}));
  })()`);
  families.autocomplete.panel_opened = await waitFor(
    '!!document.querySelector(".cdk-overlay-pane .mat-autocomplete-panel #ac-option-a")',
  );
  await send('Input.insertText', {text: 'a'});
  families.autocomplete.typed_filter_visible = await waitFor(
    '!!document.querySelector(".mat-autocomplete-panel.mat-autocomplete-visible #ac-option-a")',
    30,
    100,
  );
  families.autocomplete.input_focused = await evaluate('document.activeElement && document.activeElement.id === "ac-input"');
  await evaluate('document.getElementById("ac-option-a")?.click()');
  families.autocomplete.option_selected = await waitFor(
    'document.getElementById("ac-selected-value")?.textContent === "a" && document.getElementById("ac-input")?.value === "a"',
  );
  families.autocomplete.panel_closed_after_select = await waitFor(
    '!document.querySelector(".mat-autocomplete-panel #ac-option-a")',
  );

  // Tabs: retain the historical ink positioner through first/second/first selection.
  await waitFor('!!document.querySelector("#tabs .mat-tab-label-active")');
  families.tabs.ink_alignment = [await observeLegacyInkBarNative({evaluate})];
  // Click second label, assert second body visible.
  await evaluate(`(() => {
    const labels = Array.from(document.querySelectorAll("#tabs .mat-tab-label"));
    const second = labels[1];
    if (second) second.click();
  })()`);
  families.tabs.second_selected = await waitFor(
    '!!document.querySelectorAll("#tabs .mat-tab-label")[1]?.classList.contains("mat-tab-label-active")',
  );
  families.tabs.second_body_visible = await waitFor(
    '!!document.getElementById("tab-two") && getComputedStyle(document.getElementById("tab-two")).display !== "none"',
  );
  families.tabs.ink_alignment.push(await observeLegacyInkBarNative({evaluate}));
  await evaluate('document.querySelector("#tabs .mat-tab-label").click()');
  await waitFor('!!document.querySelector("#tabs .mat-tab-label")?.classList.contains("mat-tab-label-active")');
  families.tabs.ink_alignment.push(await observeLegacyInkBarNative({evaluate}));

  families.tabs.pagination = await observeTabPaginationNative({send,evaluate,waitFor});

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
  `pr/main/chromium/${runtime}/menu/default`,
  `pr/main/chromium/${runtime}/snack-bar/default`,
  `pr/main/chromium/${runtime}/tooltip/default`,
  `pr/main/chromium/${runtime}/autocomplete/default`,
  `pr/main/chromium/${runtime}/tabs/default`,
];
const zoneOk = zoneless
  ? (zoneGlobal === 'undefined' && bundleHasZone === false && angularZoneEntered === false)
  : (zoneGlobal === 'function' && bundleHasZone === true && angularZoneEntered === true);
const menuClosedOk = zoneless
  ? (families.menu.closed_by_escape || families.menu.closed_by_backdrop)
  : families.menu.closed_by_escape;
const ok =
  !error
  && zoneOk
  && families.menu.opened && menuClosedOk
  && families.menu.first_item_focused
  && families['snack-bar'].opened && families['snack-bar'].dismissed
  && families['snack-bar'].enabled_motion?.length === 2
  && families['snack-bar'].enabled_motion.every(legacySnackMotionNativeOkay)
  && families.tooltip.shown
  && legacyTooltipMessageSequenceOkay(families.tooltip.message_positions)
  && legacyTooltipAriaLifetimeNativeOkay(families.tooltip.aria_lifetime)
  && families.autocomplete.panel_opened && families.autocomplete.typed_filter_visible && families.autocomplete.input_focused
  && families.autocomplete.option_selected && families.autocomplete.panel_closed_after_select
  && families.tabs.second_selected && families.tabs.second_body_visible
  && legacyInkBarSelectionSequenceOkay(families.tabs.ink_alignment)
  && tabPaginationNativeOkay(families.tabs.pagination);

const report = {
  schema_version: 1,
  role: zoneless
    ? 'zoneless Chromium PR-slice for menu, snack-bar, tooltip, autocomplete, tabs (not full matrix)'
    : 'Chromium PR-slice for menu, snack-bar, tooltip, autocomplete, tabs (not full matrix)',
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
      ? 'Only Chromium main-line zoneless default for the five families above; Zone.js is not installed.'
      : 'Only Chromium main-line zoneful default for the five families above.',
    'Firefox/WebKit, CSP, motion, and other states stay not-executed.',
    'MATERIAL_ANIMATIONS.animationsDisabled=true for deterministic open/close; not enabled-motion proof.',
    'Tooltip hide is best-effort; shown and centered below-host geometry before/after a wider message are required for credit.',
    'Menu focuses first item before Escape; zoneless may fall back to backdrop click if Escape does not detach.',
    'Autocomplete requires panel open, typing, focus, optionSelected, updated input and panel closure after option activation.',
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
if (!ok) process.exit(1);
