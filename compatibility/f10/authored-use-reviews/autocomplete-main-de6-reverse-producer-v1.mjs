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
import {npmToolingOptions} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/npm-tooling-options.mjs';
import {browserPeerVersions,browserLibraryLine,readBrowserPackedPackage,browserConsumerDependencies,browserCompilerOptions} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/browser-peer-versions.mjs';
import {createHash} from 'node:crypto';
import {snackMotionFixture} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/snack-motion-fixture.mjs';
import {tooltipAriaLifetimeFixture} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/tooltip-aria-lifetime-fixture.mjs';
import {observeTabPaginationNative,tabPaginationNativeOkay} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/tab-pagination-native-contract.mjs';
import {observeLegacyInkBarNative,legacyInkBarSelectionSequenceOkay} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/legacy-ink-bar-native-contract.mjs';
import {legacyTooltipMessageSequenceOkay, observeLegacyTooltipNative,
  legacyTooltipAriaLifetimeNativeOkay, observeLegacyTooltipAriaLifetimeNative} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/legacy-tooltip-native-contract.mjs';
import {legacySnackMotionNativeOkay, observeLegacySnackMotionNative} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/legacy-snack-motion-native-contract.mjs';
import {announcedChromeEndpoint,debuggerMatchesChild} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/chromium-debug-endpoint.mjs';
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

const root = '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy';
let reportPath = '/home/parallels/.codex/closeout-state/2026-11-07-recovery/c04-qualification/autocomplete-authored-main/native-zoneful.json';
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
    reportPath = '/home/parallels/.codex/closeout-state/2026-11-07-recovery/c04-qualification/autocomplete-authored-independent/reverse-query-zoneless.json';
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

const consumer = process.env.REUSE_CONSUMER || mkdtempSync(join(tmpdir(), 'ngx-compat-overlay-families-'));
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
const install = process.env.REUSE_CONSUMER ? {status:0} : spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], npmToolingOptions({
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
}, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock']));
if (install.status !== 0) fail(1, (install.stderr || install.stdout || 'npm install failed').slice(-2000));
const installed = realpathSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'));
if (relative(realpathSync(consumer), installed).startsWith('..')) fail(1, `Library resolved outside the consumer: ${installed}`);

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(join(consumer, 'src/main.ts'), `${zoneless ? '' : `import 'zone.js';
`}import {AfterViewInit, ApplicationRef, Component, NgModule, ViewChild, inject${zoneless ? ', provideZonelessChangeDetection' : ', provideZoneChangeDetection'}} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyAutocompleteModule, MatLegacyAutocompleteTrigger} from '@ngx-compat/material-legacy/legacy-autocomplete';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
@Component({standalone:false,selector:'lab-root',template:\`
 <mat-form-field><input id="ac-input" matInput [matAutocomplete]="auto"><mat-autocomplete #auto="matAutocomplete"><mat-option id="ac-option" value="a">A</mat-option></mat-autocomplete></mat-form-field><button id="outside">Outside</button>\`})
export class LabRoot implements AfterViewInit {
 @ViewChild(MatLegacyAutocompleteTrigger) trigger!:MatLegacyAutocompleteTrigger;
 private app=inject(ApplicationRef);
 ngAfterViewInit() {
  const t:any=this.trigger, rows:any[]=[]; const subscriptions:any[]=[];
  const record=(name:string)=>t.panelClosingActions.subscribe((e:any)=>rows.push({name,kind:e===null?'null':'selection',value:e?.source?.value??null}));
  subscriptions.push(record('early'));
  (window as any).lab={t,rows,late:()=>subscriptions.push(record('late')),unsubscribe:()=>subscriptions.splice(0).forEach(s=>s.unsubscribe()),destroy:()=>this.app.components[0].destroy(),
    strategy:()=>{const s=t._positionStrategy;return s?{flex:s._hasFlexibleDimensions,grow:s._growAfterOpen,margin:s._viewportMargin}:null;},
    detach:()=>t._overlayRef.detach(),open:()=>t.openPanel(),close:()=>t.closePanel(),status:()=>({open:t.panelOpen,attached:t._overlayAttached,destroyed:t._componentDestroyed,overlay:t._overlayRef!==null,subs:t._closingActionsSubscription?.closed??null})};
 }
}
@NgModule({imports:[BrowserModule,MatLegacyAutocompleteModule,MatLegacyFormFieldModule,MatLegacyInputModule],declarations:[LabRoot],bootstrap:[LabRoot],providers:[${zoneless ? 'provideZonelessChangeDetection(), ' : ''}{provide:MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}}]})
export class LabModule {}
platformBrowserDynamic().bootstrapModule(LabModule${zoneless ? '' : ', {applicationProviders: [provideZoneChangeDetection()]}'}).catch(err=>{const n=document.createElement('pre');n.id='bootstrap-error';n.textContent=String(err);document.body.appendChild(n)});
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
const babelFile=linkerRequire.resolve('@babel/core/package.json'); const babelVersion=JSON.parse(readFileSync(babelFile,'utf8')).version; if(babelVersion !== '8.0.1') fail(1,'unexpected Babel '+babelVersion); const {transformSync} = linkerRequire('@babel/core');
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


let error=null, obs={};
try {
 await send('Runtime.enable'); await send('Page.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__errors=[];window.addEventListener("error",e=>window.__errors.push(String(e.message)))'});
 await send('Page.reload',{ignoreCache:true});
 if(!await waitFor('!!window.lab || !!document.getElementById("bootstrap-error")')) throw Error('bootstrap timeout');
 if(await evaluate('!!document.getElementById("bootstrap-error")')) throw Error('bootstrap error '+await evaluate('document.getElementById("bootstrap-error").textContent'));
 // First historical regression: early and late listeners both see a single external detach.
 await evaluate('document.getElementById("ac-input").focus()');
 if(!await waitFor('window.lab.status().open')) throw Error('initial open failed');
 await evaluate('window.lab.late()');
 await sleep(400);
 await evaluate('window.lab.detach()');
 obs.detach=await waitFor('!window.lab.status().open');
 obs.detachRows=await evaluate('window.lab.rows.slice()');
 // Second historical regression: retain both subscribers through reopen and actual selection.
 await evaluate('window.lab.open()');
 if(!await waitFor('window.lab.status().open')) throw Error('reopen failed');
 await sleep(300); await evaluate('document.getElementById("ac-option").click()');
 obs.selectClosed=await waitFor('!window.lab.status().open'); obs.selectRows=await evaluate('window.lab.rows.slice()');
 // A focused input must not close for same focus/click; real focus change + outside click must close.
 await evaluate('window.lab.open()'); await waitFor('window.lab.status().open'); await sleep(300);
 await evaluate('document.getElementById("ac-input").focus();document.getElementById("ac-input").click()'); await sleep(100);
 obs.focusRetained=await evaluate('window.lab.status().open');
 await evaluate('document.getElementById("outside").focus();document.getElementById("outside").click()');
 obs.outsideClosed=await waitFor('!window.lab.status().open');obs.outsideRows=await evaluate('window.lab.rows.slice()');
 // Change the native viewport and verify actual CDK query and strategy response on the live trigger.
 await send('Emulation.setDeviceMetricsOverride',{width:600,height:320,deviceScaleFactor:1,mobile:false});
 await sleep(500);await evaluate('window.lab.open()');await waitFor('window.lab.status().open');await sleep(400);
 obs.landscape={query:await evaluate('matchMedia("(max-width: 959.98px) and (orientation: landscape)").matches'),strategy:await evaluate('window.lab.strategy()')};
 await send('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});await sleep(500);
 obs.desktop={query:await evaluate('matchMedia("(max-width: 959.98px) and (orientation: landscape)").matches'),strategy:await evaluate('window.lab.strategy()')};
 // Consumer owns external subscription; unsubscribing then destroying must leave no overlay and no further event.
 await evaluate('window.lab.close();window.lab.open()');await waitFor('window.lab.status().open');await sleep(300);
 await evaluate('window.lab.unsubscribe()'); const before=await evaluate('window.lab.rows.length');
 await evaluate('document.getElementById("outside").focus();document.getElementById("outside").click()');
 obs.unsubscribedClose=await waitFor('!window.lab.status().open');obs.unsubscribedCount=await evaluate('window.lab.rows.length');
 await evaluate('window.lab.open()');await waitFor('window.lab.status().open');await sleep(200);
 await evaluate('window.lab.destroy()');await sleep(300);
 obs.destroy={before,after:await evaluate('window.lab.rows.length'),status:await evaluate('window.lab.status()'),panelCount:await evaluate('document.querySelectorAll(".cdk-overlay-pane .mat-autocomplete-panel").length')};
 obs.errors=await evaluate('window.__errors || []');
} catch(e){error=String(e)} finally {ws.close();chrome.kill();server.close()}
const rows=obs.selectRows||[];const outside=obs.outsideRows||[];
const ok=!error && obs.detach && JSON.stringify(obs.detachRows)==JSON.stringify([{name:'early',kind:'null',value:null},{name:'late',kind:'null',value:null}])
 && obs.selectClosed && rows.length===4 && rows.slice(2).every(x=>x.kind==='selection'&&x.value==='a') && new Set(rows.slice(2).map(x=>x.name)).size===2
 && obs.focusRetained && obs.outsideClosed && outside.length===6 && outside.slice(4).every(x=>x.kind==='null')
 && obs.landscape?.query && obs.landscape?.strategy?.flex===true && obs.landscape.strategy.grow===true && obs.landscape.strategy.margin===8
 && obs.desktop?.query===false && obs.desktop?.strategy?.flex===false && obs.desktop.strategy.grow===false && obs.desktop.strategy.margin===0
 && obs.unsubscribedClose && obs.unsubscribedCount===obs.destroy?.before && obs.destroy?.before===obs.destroy?.after && obs.destroy?.status?.destroyed && !obs.destroy?.status?.overlay && obs.destroy?.panelCount===0 && obs.errors?.length===0;
const report={schema_version:1,scope:'bounded actual packed legacy autocomplete native AOT; no matrix credit',tarball_sha256:createHash('sha256').update(readFileSync(tarball)).digest('hex'),node:process.version,browser:version.Browser,zoneless,babelVersion,babelFile,bundleHasZone,versions,consumer,ok,error,obs,limitations:['Chrome only; no historical family-suite claim','animations disabled','External subscribers were explicitly unsubscribed before destroy','Real viewport emulation, internal strategy fields used for observations, no pixel/style review']};
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!ok)process.exitCode=1;
