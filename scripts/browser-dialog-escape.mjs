#!/usr/bin/env node
/**
 * Open one legacy dialog in headless Chromium and close it with Escape.
 *
 *   node scripts/browser-dialog-escape.mjs --tarball <path>
 */
import {dialogTitleLifetimeFixture, legacyDialogTitleLifetimeNativeOkay} from './dialog-title-lifetime-fixture.mjs';
import {npmToolingOptions} from './npm-tooling-options.mjs';
import {browserPeerVersions,browserLibraryLine,readBrowserPackedPackage,browserConsumerDependencies,browserCompilerOptions} from './browser-peer-versions.mjs';
import {createHash} from 'node:crypto';
import {legacySelectFontNativeOkay, observeLegacySelectFontNative} from './legacy-select-font-native-contract.mjs';
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
let reportPath = join(root, 'compatibility/rc/reports/browser-dialog-escape.json');
const esbuild = createRequire(join(root, 'package.json'))('esbuild');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = null;
let describeInstall = false;
let reducedMotion = false;
let zoneless = false;
let csp = false;
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--describe-install') {describeInstall = true;continue;}
  if (process.argv[i] === '--reduced-motion') {
    reducedMotion = true;
    reportPath = join(root, 'compatibility/rc/reports/browser-dialog-reduced-motion.json');
    continue;
  }
  if (process.argv[i] === '--zoneless') {
    zoneless = true;
    reportPath = join(root, 'compatibility/rc/reports/browser-dialog-zoneless.json');
    continue;
  }
  if (process.argv[i] === '--csp') {
    csp = true;
    reportPath = join(root, 'compatibility/rc/reports/browser-dialog-csp.json');
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

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-dialog-browser-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-dialog-browser',
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
`}import {CSP_NONCE, ChangeDetectionStrategy, Component, NgModule, NgZone, TemplateRef, ViewChild, inject, signal${zoneless ? ', provideZonelessChangeDetection' : ', provideZoneChangeDetection'}} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MAT_LEGACY_DIALOG_DATA, MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';

${dialogTitleLifetimeFixture}

@Component({
  standalone: false,
  selector: 'dialog-body',
  template: '<p id="dialog-body">Open</p>',
})
export class DialogBody {}

@Component({
  standalone: false,
  selector: 'lab-root',
  template: '<button id="open" type="button" (click)="open()">Open</button><lab-dialog-title-lifetime></lab-dialog-title-lifetime><mat-select id="choice" style="font-size:20px"><mat-option id="option-a" value="a">A</mat-option></mat-select>',
})
export class LabRoot {
  readonly angularZoneEntered = (() => { const zone = inject(NgZone); const entered = zone.run(() => NgZone.isInAngularZone()); (window as unknown as {__closeoutAngularZoneEntered: boolean}).__closeoutAngularZoneEntered = entered; return entered; })();
  private dialog = inject(MatLegacyDialog);
  open() { this.dialog.open(DialogBody); }
  @ViewChild(DialogTitleLifetimeLab) titleLifetime!: DialogTitleLifetimeLab;
  ngAfterViewInit() {
    (window as unknown as {__dialogTitleLifetime: () => Promise<unknown>}).__dialogTitleLifetime = () => this.titleLifetime.run();
  }
}

@NgModule({
  imports: [BrowserModule, MatLegacyDialogModule, MatLegacySelectModule],
  declarations: [LabRoot, DialogBody, DialogTitleLifetimeLab, DialogTitleLifetimeBody],
  bootstrap: [LabRoot],
  providers: [...((window as unknown as {__cspNonce?: string}).__cspNonce ? [{provide: CSP_NONCE, useValue: (window as unknown as {__cspNonce: string}).__cspNonce}] : []), ${zoneless ? 'provideZonelessChangeDetection(), ' : ''}{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: false}}],
})
export class LabModule {}

platformBrowserDynamic().bootstrapModule(LabModule${zoneless ? '' : ', {applicationProviders: [provideZoneChangeDetection()]}'}).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err);
  document.body.appendChild(node);
});
`);
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
  compilerOptions: browserCompilerOptions(versions),
  files: ['src/main.ts'],
  angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
}, null, 2));
const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
});
if (compiled.status !== 0) fail(1, `${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-2500));

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
const cspNonce = 'rc07csp';
const cspHeader = `default-src 'none'; script-src 'nonce-${cspNonce}'; style-src 'nonce-${cspNonce}'`;
const violationListener = `<script nonce="${cspNonce}">window.__cspViolations=[];document.addEventListener('securitypolicyviolation',event=>{window.__cspViolations.push(event.violatedDirective+' '+(event.sample||event.blockedURI||''));});</script>`;
writeFileSync(join(consumer, 'dist/index.html'), csp
  ? `<!doctype html><html><body><lab-root></lab-root>${violationListener}<script nonce="${cspNonce}">window.__cspNonce=${JSON.stringify(cspNonce)};</script><script nonce="${cspNonce}" src="/app.js"></script></body></html>\n`
  : `<!doctype html><html><body><lab-root></lab-root><script src="/app.js"></script></body></html>\n`);
writeFileSync(join(consumer, 'dist/missing.html'), `<!doctype html><html><body><lab-root></lab-root>${violationListener}<script nonce="${cspNonce}" src="/app.js"></script></body></html>\n`);

const server = createServer((req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, '');
  try {
    const body = readFileSync(join(consumer, 'dist', file));
    const headers = {'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html'};
    if (csp) headers['content-security-policy'] = cspHeader;
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const {port} = server.address();
const pageUrl = `http://127.0.0.1:${port}/${csp ? 'missing.html' : ''}`;
const chromeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-chrome-'));
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
for (let i = 0; i < 80; i += 1) {
  try {
    const endpoint=announcedChromeEndpoint(chromeLog,requestedDebugPort);
    if(!endpoint){await sleep(100);continue;}
    const observed=await jsonGet(`http://127.0.0.1:${endpoint.port}/json/version`);
    if(!debuggerMatchesChild(observed,endpoint))throw Error('debugger does not belong to the browser child');
    version=observed;debugPort=endpoint.port;break;
  } catch {
    await sleep(250);
  }
}
if (!version) {
  chrome.kill();
  fail(1, `Chromium did not open a debugging port\n${chromeLog.slice(-1000)}`);
}
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
  const result = await send('Runtime.evaluate', {expression, returnByValue: true});
  return result.result?.value;
}
if (csp) {
  let missingViolations = [];
  let nonceViolations = [];
  let stylesWithNonce = 0;
  let cspOpened = false;
  let cspError = null;
  let cspAngularZoneEntered = null;
  try {
    await send('Runtime.enable');
    await send('Page.enable');
    for (let i = 0; i < 50 && !(await evaluate('!!document.getElementById("open") || (window.__cspViolations || []).length')); i += 1) await sleep(100);
    missingViolations = await evaluate('window.__cspViolations || []');
    await send('Page.navigate', {url: `http://127.0.0.1:${port}/`});
    for (let i = 0; i < 50 && !(await evaluate('!!document.getElementById("open")')); i += 1) await sleep(100);
    cspAngularZoneEntered = await evaluate('window.__closeoutAngularZoneEntered');
    await evaluate('document.getElementById("open").click()');
    for (let i = 0; i < 50 && !(await evaluate('!!document.getElementById("dialog-body")')); i += 1) await sleep(100);
    cspOpened = await evaluate('!!document.getElementById("dialog-body")');
    stylesWithNonce = await evaluate(`Array.from(document.querySelectorAll('style')).filter(style => style.nonce === ${JSON.stringify(cspNonce)}).length`);
    nonceViolations = await evaluate('window.__cspViolations || []');
  } catch (err) {
    cspError = String(err);
  } finally {
    ws.close();
    chrome.kill();
    server.close();
  }
  const missingDetected = missingViolations.some(item => String(item).includes('style-src'));
  const nonceClean = cspError === null && cspOpened && stylesWithNonce > 0 && nonceViolations.length === 0;
  const cspReport = {
    schema_version: 1,
    role: 'strict CSP nonce for the dialog page',
    tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
    browser: version.Browser,
    policy: cspHeader,
    missing_nonce_violations: missingViolations,
    missing_nonce_detected: missingDetected,
    styles_with_nonce: stylesWithNonce,
    nonce_violations: nonceViolations,
    dialog_opened_with_nonce: cspOpened,
    nonce_clean: nonceClean,
    angular_zone_entered: cspAngularZoneEntered,
    matrix_updated: false,
    error: cspError,
    limitations: [
      'style-src allows only the nonce. unsafe-inline is not enabled.',
      'The missing-nonce page must report a style-src violation.',
      'This is not RC-07-A04.',
    ],
  };
  mkdirSync(dirname(reportPath), {recursive: true});
  writeFileSync(reportPath, JSON.stringify(cspReport, null, 2) + '\n');
  console.log(JSON.stringify({
    missing_nonce_detected: missingDetected,
    styles_with_nonce: stylesWithNonce,
    nonce_violations: nonceViolations.length,
    dialog_opened_with_nonce: cspOpened,
  }, null, 2));
  if (!missingDetected || !nonceClean || cspAngularZoneEntered !== !zoneless) process.exit(1);
  process.exit(0);
}
let opened = false;
let closed = false;
let focusBefore = null;
let focusWhileOpen = null;
let focusAfter = null;
let outsideClosed = false;
let selectOpened = false;
let selectClosed = false;
let selectFontGeometry = null;
let dialogMotion = null;
let dialogTitleLifetime = null;
let dialogTitleLifetimeError = null;
let zoneGlobal = null;
let angularZoneEntered = null;
let error = null;
let diagnostic = null;
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errors=[];window.addEventListener("error",e=>window.__errors.push(String(e.message)));',
  });
  await send('Emulation.setEmulatedMedia', {
    features: [{name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no'}],
  });
  await send('Page.reload', {ignoreCache: true});
  for (let i = 0; i < 50 && !(await evaluate('!!document.getElementById("open") || !!document.getElementById("bootstrap-error")')); i += 1) await sleep(100);
  diagnostic = await evaluate('({errors: window.__errors || [], text: document.body.innerText, html: document.body.innerHTML.slice(0, 500)})');
  if (await evaluate('!!document.getElementById("bootstrap-error")')) throw new Error('bootstrap failed');
  zoneGlobal = await evaluate('typeof Zone');
  angularZoneEntered = await evaluate('window.__closeoutAngularZoneEntered');
  await evaluate(`(() => {
    window.__dialogTransitions = [];
    document.addEventListener('transitionend', event => {
      const target = event.target;
      if (target && target.classList && target.classList.contains('mat-dialog-container')) {
        window.__dialogTransitions.push(event.propertyName);
      }
    }, true);
  })()`);
  await evaluate('document.getElementById("open").focus()');
  focusBefore = await evaluate('document.activeElement && document.activeElement.id');
  await evaluate('document.getElementById("open").click()');
  for (let i = 0; i < 50 && !(await evaluate('!!document.getElementById("dialog-body")')); i += 1) await sleep(100);
  opened = await evaluate('!!document.getElementById("dialog-body")');
  for (let i = 0; i < 40; i += 1) {
    dialogMotion = await evaluate(`(() => {
      const el = document.querySelector('mat-dialog-container');
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        noop: el.classList.contains('_mat-animation-noopable'),
        enter_duration: el.style.getPropertyValue('--mat-legacy-dialog-enter-duration'),
        transition_duration: style.transitionDuration,
        events: window.__dialogTransitions || [],
      };
    })()`);
    if (dialogMotion && (dialogMotion.events.includes('opacity') || dialogMotion.events.includes('transform'))) break;
    await sleep(50);
  }
  for (let i = 0; i < 20 && await evaluate('document.activeElement && document.activeElement.id === "open"'); i += 1) await sleep(50);
  focusWhileOpen = await evaluate('document.activeElement && (document.activeElement.id || document.activeElement.tagName)');
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  for (let i = 0; i < 50 && await evaluate('!!document.getElementById("dialog-body")'); i += 1) await sleep(100);
  closed = !(await evaluate('!!document.getElementById("dialog-body")'));
  focusAfter = await evaluate('document.activeElement && document.activeElement.id');
  await evaluate('document.getElementById("open").click()');
  for (let i = 0; i < 50 && !(await evaluate('!!document.querySelector(".cdk-overlay-backdrop")')); i += 1) await sleep(100);
  const backdrop = await evaluate(`(() => {
    const el = document.querySelector('.cdk-overlay-backdrop');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {x: rect.x + 2, y: rect.y + 2};
  })()`);
  if (backdrop) {
    await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: backdrop.x, y: backdrop.y, button: 'left', clickCount: 1});
    await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: backdrop.x, y: backdrop.y, button: 'left', clickCount: 1});
  }
  for (let i = 0; i < 50 && await evaluate('!!document.getElementById("dialog-body")'); i += 1) await sleep(100);
  outsideClosed = !(await evaluate('!!document.getElementById("dialog-body")'));
  await evaluate('document.querySelector("#choice .mat-select-trigger").click()');
  for (let i = 0; i < 50 && !(await evaluate('!!document.querySelector(".cdk-overlay-pane .mat-select-panel #option-a")')); i += 1) await sleep(100);
  selectOpened = await evaluate('!!document.querySelector(".cdk-overlay-pane .mat-select-panel #option-a")');
  selectFontGeometry = await observeLegacySelectFontNative({evaluate});
  for (let i = 0; i < 40 && !legacySelectFontNativeOkay(selectFontGeometry); i += 1) {
    await sleep(50);
    selectFontGeometry = await observeLegacySelectFontNative({evaluate});
  }
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  for (let i = 0; i < 50 && await evaluate('!!document.querySelector(".cdk-overlay-pane .mat-select-panel")'); i += 1) await sleep(100);
  selectClosed = !(await evaluate('!!document.querySelector(".cdk-overlay-pane .mat-select-panel")'));
  await evaluate(`(() => {
    window.__dialogTitleLifetimeResult = null; window.__dialogTitleLifetimeError = null;
    Promise.resolve().then(() => window.__dialogTitleLifetime()).then(
      value => {window.__dialogTitleLifetimeResult = value;},
      error => {window.__dialogTitleLifetimeError = String(error);});
    return true;
  })()`);
  for (let i = 0; i < 240 && !(await evaluate('!!window.__dialogTitleLifetimeResult || !!window.__dialogTitleLifetimeError')); i += 1) await sleep(50);
  dialogTitleLifetime = await evaluate('window.__dialogTitleLifetimeResult');
  dialogTitleLifetimeError = await evaluate('window.__dialogTitleLifetimeError');
} catch (err) {
  error = String(err);
} finally {
  ws.close();
  chrome.kill();
  server.close();
}
const transitionOnContainer = !!(dialogMotion && dialogMotion.noop === false && dialogMotion.enter_duration === '150ms' && (dialogMotion.events || []).some(name => name === 'opacity' || name === 'transform'));
const reducedNoop = !!(dialogMotion && dialogMotion.noop === true && (dialogMotion.events || []).length === 0 && String(dialogMotion.transition_duration).startsWith('0s'));
const report = {
  schema_version: 1,
  role: zoneless ? 'zoneless legacy dialog' : reducedMotion ? 'legacy dialog under prefers-reduced-motion' : 'one legacy dialog Escape in Chromium',
  reduced_motion: reducedMotion,
  zoneless,
  tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  browser: version.Browser,
  opened,
  closed_by_escape: opened && closed,
  focus_before: focusBefore,
  focus_while_open: focusWhileOpen,
  focus_after: focusAfter,
  focus_restored_to_open_button: focusBefore === 'open' && focusWhileOpen !== 'open' && focusAfter === 'open',
  closed_by_backdrop_click: outsideClosed,
  select_panel_opened: selectOpened,
  select_panel_closed_by_escape: selectOpened && selectClosed,
  select_font_geometry: selectFontGeometry,
  select_font_geometry_ok: legacySelectFontNativeOkay(selectFontGeometry),
  dialog_motion: dialogMotion,
  dialog_title_lifetime: dialogTitleLifetime,
  dialog_title_lifetime_error: dialogTitleLifetimeError,
  dialog_title_lifetime_ok: legacyDialogTitleLifetimeNativeOkay(dialogTitleLifetime),
  dialog_transition_on_container: transitionOnContainer,
  dialog_noop_under_reduced_motion: reducedMotion ? reducedNoop : null,
  zone_global: zoneGlobal,
  angular_zone_entered: angularZoneEntered,
  bundle_has_zone: bundleHasZone,
  bundle_has_partial_declarations: bundleDeclares,
  bundle_imports_angular_compiler: bundleCompilerImport,
  matrix_updated: false,
  error,
  diagnostic: opened && closed && (reducedMotion ? reducedNoop : transitionOnContainer) ? null : diagnostic,
  limitations: [
    'Dialog and one select panel. The declared matrix stays not-executed.',
    reducedMotion
      ? 'This run emulates prefers-reduced-motion: reduce. Zero-duration and interrupted motion are not covered.'
      : 'This run enables dialog motion and emulates prefers-reduced-motion: no. Reduced motion is a separate run.',
    zoneless ? 'Zone.js is not installed. The click opens the dialog without a forced detectChanges. This is not the zoneless matrix.' : 'This run loads zone.js.',
    'The app source does not import @angular/compiler. The linker runs while bundling.',
    'This is not RC-07-A03.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  browser: version.Browser,
  opened,
  closed_by_escape: report.closed_by_escape,
  focus_restored_to_open_button: report.focus_restored_to_open_button,
  closed_by_backdrop_click: report.closed_by_backdrop_click,
  select_panel_opened: report.select_panel_opened,
  select_panel_closed_by_escape: report.select_panel_closed_by_escape,
  dialog_transition_on_container: report.dialog_transition_on_container,
  dialog_title_lifetime_ok: report.dialog_title_lifetime_ok,
  dialog_noop_under_reduced_motion: report.dialog_noop_under_reduced_motion,
  zone_global: report.zone_global,
}, null, 2));
const motionOk = reducedMotion ? report.dialog_noop_under_reduced_motion : report.dialog_transition_on_container;
const zoneOk = zoneless ? zoneGlobal === 'undefined' && bundleHasZone === false && angularZoneEntered === false : zoneGlobal === 'function' && bundleHasZone === true && angularZoneEntered === true;
if (!report.dialog_title_lifetime_ok || !report.closed_by_escape || !report.focus_restored_to_open_button || !report.closed_by_backdrop_click || !report.select_panel_closed_by_escape || !report.select_font_geometry_ok || !motionOk || !zoneOk) process.exit(1);
